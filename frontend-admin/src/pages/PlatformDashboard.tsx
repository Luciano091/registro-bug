import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronRight, CircleDollarSign, ExternalLink, LogOut, Plus, Search, Store, UserRoundCheck, UsersRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import platformApi from '../services/platformApi';

type Establishment = {
  id: number; nome: string; slug: string; email?: string; telefone?: string; documento?: string;
  logo?: string; plano: string; status: string; data_cadastro: string; trial_ate?: string;
};
type Lead = { id: number; nome: string; estabelecimento: string; telefone: string; email?: string; cidade?: string; status: string; data_cadastro: string };
type Summary = { estabelecimentos: number; ativos: number; em_teste: number; bloqueados: number; leads_novos: number; pedidos_processados: number };

const emptyForm = { nome: '', slug: '', email: '', telefone: '', documento: '', senha_inicial: '', plano: 'Essencial', status: 'trial', trial_ate: '' };

export default function PlatformDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<'estabelecimentos' | 'leads'>('estabelecimentos');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const operationUrl = import.meta.env.VITE_OPERATION_URL || 'https://painel.ritmesa.com.br';
  const loginPath = window.location.hostname.toLowerCase().startsWith('admin.') ? '/login' : '/ritmesa-admin/login';

  const load = async () => {
    const [summaryRes, establishmentRes, leadRes] = await Promise.all([
      platformApi.get('/platform/resumo'),
      platformApi.get('/platform/estabelecimentos'),
      platformApi.get('/platform/leads'),
    ]);
    setSummary(summaryRes.data);
    setEstablishments(establishmentRes.data);
    setLeads(leadRes.data);
  };

  useEffect(() => {
    if (!localStorage.getItem('platformToken')) {
      navigate(loginPath, { replace: true });
      return;
    }
    load().catch(() => undefined);
  }, [navigate]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return establishments;
    return establishments.filter((item) => [item.nome, item.slug, item.email, item.telefone].some((value) => value?.toLowerCase().includes(term)));
  }, [establishments, search]);

  const changeStatus = async (item: Establishment, status: string) => {
    const { data } = await platformApi.put(`/platform/estabelecimentos/${item.id}`, { status });
    setEstablishments((current) => current.map((value) => value.id === item.id ? data : value));
    const { data: updatedSummary } = await platformApi.get('/platform/resumo');
    setSummary(updatedSummary);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await platformApi.post('/platform/estabelecimentos', { ...form, trial_ate: form.trial_ate ? `${form.trial_ate}T23:59:59` : null });
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Não foi possível cadastrar o estabelecimento.');
    } finally {
      setSaving(false);
    }
  };

  const updateLead = async (lead: Lead, status: string) => {
    const { data } = await platformApi.put(`/platform/leads/${lead.id}`, { status });
    setLeads((current) => current.map((value) => value.id === lead.id ? data : value));
    const { data: updatedSummary } = await platformApi.get('/platform/resumo');
    setSummary(updatedSummary);
  };

  const statusStyle = (status: string) => ({
    ativo: 'bg-emerald-50 text-emerald-700 ring-emerald-200', trial: 'bg-amber-50 text-amber-700 ring-amber-200',
    bloqueado: 'bg-red-50 text-red-700 ring-red-200', cancelado: 'bg-slate-100 text-slate-600 ring-slate-200',
  }[status] || 'bg-slate-100 text-slate-600 ring-slate-200');

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5"><div className="brand-mark !h-9 !w-9"><img src="/brand/ritmesa-mark.png" alt="" /></div><div><strong className="block text-base leading-tight text-[#10233f]">Ritmesa</strong><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Administração</span></div></div>
          <button onClick={() => { localStorage.removeItem('platformToken'); navigate(loginPath); }} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"><LogOut size={17} /> <span className="hidden sm:inline">Sair</span></button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-sm font-semibold text-brand-600">Visão da plataforma</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Operação Ritmesa</h1><p className="mt-2 text-sm text-slate-500">Clientes, oportunidades e crescimento em um só lugar.</p></div>
          <button onClick={() => setShowForm(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600"><Plus size={18} /> Novo estabelecimento</button>
        </div>

        <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: 'Estabelecimentos', value: summary?.estabelecimentos ?? '—', Icon: Building2, color: 'text-blue-600 bg-blue-50' },
            { label: 'Ativos', value: summary?.ativos ?? '—', Icon: UserRoundCheck, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Em teste', value: summary?.em_teste ?? '—', Icon: CircleDollarSign, color: 'text-amber-600 bg-amber-50' },
            { label: 'Novos contatos', value: summary?.leads_novos ?? '—', Icon: UsersRound, color: 'text-violet-600 bg-violet-50' },
            { label: 'Pedidos processados', value: summary?.pedidos_processados ?? '—', Icon: Store, color: 'text-brand-600 bg-orange-50' },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}><Icon size={18} /></div><strong className="block text-2xl font-bold tabular-nums">{value}</strong><span className="mt-1 block text-xs font-medium text-slate-500">{label}</span></div>
          ))}
        </section>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button onClick={() => setView('estabelecimentos')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === 'estabelecimentos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Estabelecimentos</button>
              <button onClick={() => setView('leads')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === 'leads' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Interessados {summary?.leads_novos ? `(${summary.leads_novos})` : ''}</button>
            </div>
            {view === 'estabelecimentos' && <label className="relative block"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm sm:w-72" placeholder="Buscar cliente..." /></label>}
          </div>

          {view === 'estabelecimentos' ? (
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <article key={item.id} className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
                  <div className="flex min-w-0 items-center gap-3.5">
                    {item.logo ? <img src={item.logo} alt="" className="h-12 w-12 rounded-xl border border-slate-200 object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-500"><Store size={21} /></div>}
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{item.nome}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${statusStyle(item.status)}`}>{item.status}</span></div><p className="mt-1 truncate text-xs text-slate-500">{item.slug}.ritmesa.com.br · {item.plano}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={item.status} onChange={(e) => changeStatus(item, e.target.value)} className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"><option value="trial">Em teste</option><option value="ativo">Ativo</option><option value="bloqueado">Bloqueado</option><option value="cancelado">Cancelado</option></select>
                    <a href={`${operationUrl}/login?estabelecimento=${item.slug}`} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:text-brand-600">Painel <ExternalLink size={14} /></a>
                    <a href={`https://${item.slug}.ritmesa.com.br`} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:text-brand-600" aria-label="Abrir cardápio"><ExternalLink size={17} /></a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {leads.length === 0 && <div className="p-10 text-center text-sm text-slate-500">Nenhum contato comercial recebido ainda.</div>}
              {leads.map((lead) => <article key={lead.id} className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{lead.estabelecimento}</h2><span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">{lead.status}</span></div><p className="mt-1 text-sm text-slate-600">{lead.nome} · {lead.telefone}{lead.cidade ? ` · ${lead.cidade}` : ''}</p><p className="mt-1 text-xs text-slate-400">{lead.email}</p></div><select value={lead.status} onChange={(e) => updateLead(lead, e.target.value)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"><option value="novo">Novo</option><option value="contatado">Contatado</option><option value="convertido">Convertido</option><option value="descartado">Descartado</option></select></article>)}
            </div>
          )}
        </section>
      </main>

      {showForm && <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"><button onClick={() => setShowForm(false)} className="absolute inset-0 bg-slate-950/55" aria-label="Fechar" /><form onSubmit={save} className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-7"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold">Novo estabelecimento</h2><p className="mt-1 text-sm text-slate-500">Cadastre um novo cliente na plataforma.</p></div><button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{[
        ['nome', 'Nome do estabelecimento', 'BisBurger'], ['slug', 'Endereço do cardápio', 'bisburger'], ['email', 'E-mail do responsável', 'contato@restaurante.com'], ['telefone', 'WhatsApp', '(82) 99999-9999'], ['documento', 'CNPJ ou CPF', '00.000.000/0001-00'], ['senha_inicial', 'Senha inicial do painel', 'Crie uma senha segura'],
      ].map(([name, label, placeholder]) => <label key={name} className="text-sm font-semibold text-slate-700">{label}<input type={name === 'senha_inicial' ? 'password' : 'text'} required={name === 'nome' || name === 'slug' || name === 'senha_inicial'} value={form[name as keyof typeof form]} onChange={(e) => setForm((current) => ({ ...current, [name]: e.target.value }))} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-normal outline-none focus:border-brand-500" /></label>)}<label className="text-sm font-semibold text-slate-700">Plano<select value={form.plano} onChange={(e) => setForm((current) => ({ ...current, plano: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal"><option>Essencial</option><option>Profissional</option><option>Premium</option></select></label><label className="text-sm font-semibold text-slate-700">Período de teste até<input type="date" value={form.trial_ate} onChange={(e) => setForm((current) => ({ ...current, trial_ate: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-normal" /></label></div>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60">{saving ? 'Cadastrando...' : <>Cadastrar <ChevronRight size={17} /></>}</button></div></form></div>}
    </div>
  );
}
