import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Plus, ShieldCheck, UserRound, X } from 'lucide-react';
import api from '../services/api';
import { readSession } from '../services/session';

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
    <div className="p-5 md:p-10 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-7 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Acessos da unidade</span>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 mt-2">Equipe</h1>
          <p className="text-slate-500 mt-2">Cada pessoa entra com seu e-mail e vê somente o necessário para sua função.</p>
        </div>
        <button onClick={() => setOpen(true)} className="premium-btn px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
          <Plus size={19} /> Novo acesso
        </button>
      </header>

      {error && <div className="my-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      {loading ? (
        <div className="py-24 grid place-items-center text-slate-500"><Loader2 className="animate-spin mb-3" /> Carregando equipe...</div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-7">
          {users.map((user) => (
            <article key={user.id} className={`bg-white border rounded-2xl p-5 shadow-sm ${user.ativo ? 'border-slate-200' : 'border-slate-200 opacity-65'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 grid place-items-center text-slate-600"><UserRound size={21} /></div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${user.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {user.ativo ? 'Ativo' : 'Desativado'}
                </span>
              </div>
              <h2 className="font-heading font-bold text-lg text-slate-900 mt-4 truncate">{user.nome}</h2>
              <p className="text-sm text-slate-500 truncate mt-1">{user.email}</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mt-4"><ShieldCheck size={16} className="text-brand-600" /> {profileName(user.perfil)}</div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">{user.ultimo_acesso_em ? `Último acesso ${new Date(user.ultimo_acesso_em).toLocaleDateString('pt-BR')}` : 'Ainda não acessou'}</span>
                <button
                  onClick={() => toggle(user)}
                  disabled={session?.id === user.id}
                  className={`text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-40 ${user.ativo ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}
                >
                  {user.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

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
