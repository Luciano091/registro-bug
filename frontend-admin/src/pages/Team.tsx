import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Plus, ShieldCheck, UserRound, UsersRound, X } from 'lucide-react';
import api from '../services/api';
import { readSession } from '../services/session';
import DriverAppDownload from '../components/DriverAppDownload';

type TeamUser = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  criado_em: string;
  ultimo_acesso_em?: string | null;
};

const profiles = [
  ['proprietario', 'Proprietário', 'Acesso integral à unidade e à equipe.'],
  ['gerente', 'Gerente', 'Gestão da operação, equipe, caixa e relatórios.'],
  ['caixa', 'Caixa', 'Pedidos, recebimentos, caixa e indicadores.'],
  ['atendente', 'Atendente', 'Criação e acompanhamento de pedidos.'],
  ['garcom', 'Garçom', 'Atendimento e pedidos do salão.'],
  ['cozinha', 'Cozinha', 'Fila de produção e atualização de preparo.'],
  ['entregador', 'Entregador', 'Entregas atribuídas e andamento da rota.'],
] as const;

const profileName = (value: string) => profiles.find(([id]) => id === value)?.[1] || value;

export default function Team() {
  const session = readSession();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'atendente' });

  const availableProfiles = useMemo(
    () => profiles.filter(([id]) => session?.perfil === 'proprietario' || id !== 'proprietario'),
    [session?.perfil],
  );

  const load = async () => {
    try {
      const { data } = await api.get('/usuarios');
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Não foi possível carregar a equipe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/usuarios', form);
      setForm({ nome: '', email: '', senha: '', perfil: 'atendente' });
      setOpen(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Não foi possível cadastrar o usuário.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (user: TeamUser) => {
    setError('');
    try {
      const { data } = await api.put(`/usuarios/${user.id}`, { ativo: !user.ativo });
      setUsers((current) => current.map((item) => item.id === user.id ? data : item));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Não foi possível alterar este acesso.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-5 md:p-10">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">Equipe</h1>
          <p className="mt-1 text-sm text-slate-500">Gerencie acessos e funções da sua unidade.</p>
        </div>
        <button onClick={() => setOpen(true)} className="premium-btn flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold">
          <Plus size={18} /> Novo acesso
        </button>
      </header>

      {error && <div className="my-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      {loading ? (
        <div className="py-24 grid place-items-center text-slate-500"><Loader2 className="animate-spin mb-3" /> Carregando equipe...</div>
      ) : (
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5"><div className="flex items-center gap-2"><UsersRound className="text-slate-400" size={18} /><h2 className="font-bold text-slate-800">Acessos da unidade</h2></div><span className="text-xs font-semibold text-slate-400">{users.length} {users.length === 1 ? 'pessoa' : 'pessoas'}</span></div>
          <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_100px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 md:grid"><span>Pessoa</span><span>Função</span><span>Último acesso</span><span className="text-right">Status</span></div>
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <article key={user.id} className={`grid gap-3 px-4 py-4 transition hover:bg-slate-50 md:grid-cols-[minmax(0,2fr)_1fr_1fr_100px] md:items-center md:gap-4 ${user.ativo ? '' : 'opacity-60'}`}>
                <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><UserRound size={19} /></div><div className="min-w-0"><h3 className="truncate font-bold text-slate-800">{user.nome}</h3><p className="truncate text-xs text-slate-500">{user.email}</p></div></div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><ShieldCheck size={15} className="text-slate-400" /> {profileName(user.perfil)}</div>
                <span className="text-xs text-slate-500">{user.ultimo_acesso_em ? new Date(user.ultimo_acesso_em).toLocaleDateString('pt-BR') : 'Ainda não acessou'}</span>
                <div className="flex items-center justify-between gap-2 md:justify-end"><span className={`flex items-center gap-1.5 text-xs font-semibold ${user.ativo ? 'text-emerald-700' : 'text-slate-500'}`}><i className={`h-1.5 w-1.5 rounded-full ${user.ativo ? 'bg-emerald-500' : 'bg-slate-400'}`} />{user.ativo ? 'Ativo' : 'Inativo'}</span><button onClick={() => toggle(user)} disabled={session?.id === user.id} className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-30 ${user.ativo ? 'border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>{user.ativo ? 'Desativar' : 'Ativar'}</button></div>
              </article>
            ))}
            {users.length === 0 && <div className="px-6 py-12 text-center text-sm text-slate-400">Nenhum acesso cadastrado.</div>}
          </div>
        </section>
      )}

      <div className="mt-5"><DriverAppDownload compact /></div>

      {open && (
        <div className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-sm p-4 grid place-items-center" onMouseDown={() => setOpen(false)}>
          <form onSubmit={create} onMouseDown={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-4 mb-6">
              <div><h2 className="text-2xl font-heading font-bold text-slate-900">Novo acesso</h2><p className="text-sm text-slate-500 mt-1">Cadastre uma pessoa e escolha a função dela.</p></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg bg-slate-100 text-slate-500"><X size={19} /></button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Nome
                <input required minLength={2} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">E-mail
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Senha inicial
                <input required type="password" minLength={8} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Função
                <select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500 bg-white">
                  {availableProfiles.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                {availableProfiles.find(([id]) => id === form.perfil)?.[2]}
              </div>
            </div>
            <button disabled={saving} className="premium-btn w-full mt-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2">
              {saving ? <Loader2 size={19} className="animate-spin" /> : <Check size={19} />} Criar acesso
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
