import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, ChefHat, Clock3, Flame, Play, Printer, RefreshCw, Settings2, CheckCircle2, X } from 'lucide-react';
import api from '../services/api';
import { can, readSession } from '../services/session';

type Station = { id: number; nome: string; cor: string; ordem: number; ativo: boolean };
type Option = { grupo: string; opcao: string; quantidade: number };
type Item = { id: number; origem: 'pedido' | 'comanda'; produto_nome: string; quantidade: number; observacao?: string; opcoes: Option[]; status: string; setor_producao_id?: number; criado_em: string; iniciado_em?: string };
type Ticket = { chave: string; referencia: string; cliente?: string; tipo: string; mesa?: string; criado_em: string; itens: Item[] };
type Product = { id: number; nome: string; categoria: string; setor_producao_id?: number | null };

const statusLabel: Record<string, string> = { pendente: 'Aguardando', enviado: 'Aguardando', em_preparo: 'Em preparo', pronto: 'Pronto' };
const nextStatus = (status: string) => status === 'pendente' || status === 'enviado' ? 'em_preparo' : status === 'em_preparo' ? 'pronto' : 'finalizado';

function elapsed(date: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

function beep() {
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx(); const gain = ctx.createGain(); const osc = ctx.createOscillator();
  osc.frequency.value = 880; gain.gain.setValueAtTime(.12, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .35);
  osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .35);
}

export default function Kitchen() {
  const [stations, setStations] = useState<Station[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stationId, setStationId] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [newStation, setNewStation] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('ritmesaKdsSound') === 'on');
  const known = useRef<Set<string> | null>(null);
  const manager = can(readSession(), 'cozinha.gerenciar');

  const load = useCallback(async (quiet = false) => {
    try {
      const [stationResponse, queueResponse] = await Promise.all([
        api.get('/cozinha/setores'), api.get('/cozinha/fila', { params: stationId ? { setor_id: stationId } : {} }),
      ]);
      setStations(stationResponse.data);
      const incoming: Ticket[] = queueResponse.data;
      const ids = new Set(incoming.flatMap(ticket => ticket.itens.filter(item => ['pendente', 'enviado'].includes(item.status)).map(item => `${item.origem}-${item.id}`)));
      if (soundEnabled && known.current && [...ids].some(id => !known.current?.has(id))) beep();
      known.current = ids; setTickets(incoming);
    } finally { if (!quiet) setLoading(false); }
  }, [stationId, soundEnabled]);

  useEffect(() => {
    void load();
    const update = () => void load(true);
    window.addEventListener('ritmesa:operation-update', update);
    const poll = window.setInterval(update, 30000);
    return () => { window.removeEventListener('ritmesa:operation-update', update); window.clearInterval(poll); };
  }, [load]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  const counts = useMemo(() => ({
    waiting: tickets.flatMap(t => t.itens).filter(i => ['pendente', 'enviado'].includes(i.status)).length,
    preparing: tickets.flatMap(t => t.itens).filter(i => i.status === 'em_preparo').length,
    ready: tickets.flatMap(t => t.itens).filter(i => i.status === 'pronto').length,
  }), [tickets]);

  async function advance(item: Item) {
    const key = `${item.origem}-${item.id}`; setBusy(key);
    try { await api.put(`/cozinha/itens/${item.origem}/${item.id}/status`, { status: nextStatus(item.status) }); await load(true); }
    finally { setBusy(null); }
  }

  async function openSettings() {
    setSettings(true); const { data } = await api.get('/produtos'); setProducts(data);
  }
  async function addStation() {
    if (!newStation.trim()) return;
    await api.post('/cozinha/setores', { nome: newStation.trim(), cor: '#f97316', ordem: stations.length, ativo: true });
    setNewStation(''); await load(true);
  }
  async function assign(productId: number, value: string) {
    const setor = value ? Number(value) : null;
    setProducts(current => current.map(p => p.id === productId ? { ...p, setor_producao_id: setor } : p));
    await api.put(`/cozinha/produtos/${productId}/setor`, { setor_producao_id: setor });
  }
  function printTicket(event: React.MouseEvent<HTMLButtonElement>) {
    const card = event.currentTarget.closest('.kds-ticket');
    card?.classList.add('print-target'); document.body.classList.add('printing-kds-ticket');
    const cleanup = () => { card?.classList.remove('print-target'); document.body.classList.remove('printing-kds-ticket'); };
    window.addEventListener('afterprint', cleanup, { once: true }); window.print(); window.setTimeout(cleanup, 1000);
  }

  return <div className="kds-page min-h-full p-4 md:p-8 lg:p-10">
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between mb-7">
      <div><div className="flex items-center gap-2 text-orange-600 font-bold uppercase text-xs tracking-[.16em]"><ChefHat size={17}/> Produção em tempo real</div><h1 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 mt-2">Painel de cozinha</h1><p className="text-slate-500 mt-1">Pedidos do balcão, delivery e salão em uma única fila.</p></div>
      <div className="flex flex-wrap gap-2">{!soundEnabled && <button onClick={() => { localStorage.setItem('ritmesaKdsSound','on'); setSoundEnabled(true); beep(); }} className="px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 font-semibold flex items-center gap-2"><BellRing size={18}/> Ativar som</button>}<button onClick={() => load()} className="px-4 py-3 rounded-xl border border-slate-200 bg-white font-semibold flex items-center gap-2"><RefreshCw size={18}/> Atualizar</button>{manager && <button onClick={openSettings} className="px-4 py-3 rounded-xl bg-slate-900 text-white kds-inverse font-semibold flex items-center gap-2"><Settings2 size={18}/> Setores</button>}</div>
    </header>

    <section className="grid grid-cols-3 gap-2 md:gap-4 mb-5">
      {[{value:counts.waiting,label:'Aguardando',Icon:BellRing,color:'text-amber-600'}, {value:counts.preparing,label:'Em preparo',Icon:Flame,color:'text-orange-600'}, {value:counts.ready,label:'Prontos',Icon:CheckCircle2,color:'text-emerald-600'}].map(({value,label,Icon,color}) => <div key={label} className="bg-white border border-slate-200 rounded-2xl p-3 md:p-5 shadow-sm"><div className={`${color} flex items-center gap-2 text-xs md:text-sm font-semibold`}><Icon size={18}/><span>{label}</span></div><strong className="block text-2xl md:text-3xl text-slate-900 mt-2">{value}</strong></div>)}
    </section>

    <div className="flex gap-2 overflow-x-auto pb-3 mb-4 snap-x">
      <button onClick={() => setStationId(null)} className={`shrink-0 px-5 py-2.5 rounded-full font-semibold border ${stationId === null ? 'bg-orange-500 border-orange-500 text-white kds-inverse' : 'bg-white border-slate-200 text-slate-600'}`}>Todos</button>
      {stations.filter(s => s.ativo).map(s => <button key={s.id} onClick={() => setStationId(s.id)} className={`shrink-0 px-5 py-2.5 rounded-full font-semibold border flex items-center gap-2 ${stationId === s.id ? 'bg-slate-900 border-slate-900 text-white kds-inverse' : 'bg-white border-slate-200 text-slate-600'}`}><i className="w-2.5 h-2.5 rounded-full" style={{background:s.cor}}/>{s.nome}</button>)}
    </div>

    {loading ? <div className="py-24 text-center text-slate-500">Carregando produção...</div> : tickets.length === 0 ? <div className="bg-white border border-dashed border-slate-300 rounded-3xl py-20 text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={42}/><h2 className="font-bold text-xl text-slate-900 mt-4">Produção em dia</h2><p className="text-slate-500 mt-1">Nenhum item aguardando neste setor.</p></div> :
      <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">{tickets.map(ticket => {
        const age = Math.floor((now - new Date(ticket.criado_em).getTime()) / 60000); const urgent = age >= 20;
        return <article key={ticket.chave} className={`kds-ticket bg-white rounded-2xl border-2 overflow-hidden shadow-sm ${urgent ? 'border-red-300' : 'border-slate-200'}`}>
          <div className={`p-4 flex items-start justify-between ${urgent ? 'bg-red-50' : 'bg-slate-50'}`}><div><div className="flex items-center gap-2"><strong className="text-xl text-slate-900">{ticket.referencia}</strong><span className="text-[10px] uppercase tracking-wide font-bold px-2 py-1 bg-white rounded-full border border-slate-200">{ticket.tipo}</span></div><p className="text-sm text-slate-500 mt-1">{ticket.cliente || 'Cliente não informado'}</p></div><div className={`flex items-center gap-1.5 font-bold ${urgent ? 'text-red-600' : 'text-slate-600'}`}><Clock3 size={17}/>{elapsed(ticket.criado_em, now)}</div></div>
          <div className="divide-y divide-slate-100">{ticket.itens.map(item => { const key = `${item.origem}-${item.id}`; return <div key={key} className="p-4"><div className="flex gap-3 justify-between"><div className="min-w-0"><div className="flex items-start gap-2"><span className="grid place-items-center shrink-0 w-8 h-8 rounded-lg bg-orange-100 text-orange-700 font-bold">{item.quantidade}x</span><div><h3 className="font-bold text-lg text-slate-900">{item.produto_nome}</h3>{item.opcoes.map((o, index) => <p key={index} className="text-sm text-slate-500">+ {o.quantidade > 1 ? `${o.quantidade}x ` : ''}{o.opcao}</p>)}{item.observacao && <p className="mt-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-900 text-sm font-semibold">Obs.: {item.observacao}</p>}</div></div></div><span className={`shrink-0 h-fit px-2 py-1 rounded-full text-xs font-bold ${item.status === 'pronto' ? 'bg-emerald-100 text-emerald-700' : item.status === 'em_preparo' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>{statusLabel[item.status]}</span></div>
            <button disabled={busy === key} onClick={() => advance(item)} className={`mt-4 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${item.status === 'pronto' ? 'bg-emerald-600 text-white kds-inverse' : item.status === 'em_preparo' ? 'bg-orange-500 text-white kds-inverse' : 'bg-slate-900 text-white kds-inverse'}`}>{item.status === 'pronto' ? <CheckCircle2 size={19}/> : <Play size={19}/>} {item.status === 'pronto' ? 'Retirar da tela' : item.status === 'em_preparo' ? 'Marcar como pronto' : 'Iniciar preparo'}</button>
          </div>})}</div>
          <button onClick={printTicket} className="print:hidden w-full py-3 border-t border-slate-200 text-slate-500 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50"><Printer size={17}/> Imprimir ficha</button>
        </article>})}</section>}

    {settings && <div className="fixed inset-0 z-[80] bg-slate-950/60 p-3 md:p-8 flex items-center justify-center print:hidden"><div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"><header className="p-5 border-b flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-900">Setores de produção</h2><p className="text-sm text-slate-500">Separe cozinha, bar, chapa ou montagem.</p></div><button onClick={() => setSettings(false)} className="p-2 rounded-full bg-slate-100"><X/></button></header><div className="p-5 overflow-y-auto space-y-6"><div><label className="text-sm font-bold text-slate-700">Novo setor</label><div className="flex gap-2 mt-2"><input value={newStation} onChange={e => setNewStation(e.target.value)} placeholder="Ex.: Bar" className="field flex-1"/><button onClick={addStation} className="px-5 rounded-xl bg-orange-500 text-white kds-inverse font-bold">Adicionar</button></div><div className="flex flex-wrap gap-2 mt-3">{stations.map(s => <span key={s.id} className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-semibold flex items-center gap-2"><i className="w-2 h-2 rounded-full" style={{background:s.cor}}/>{s.nome}</span>)}</div></div><div><h3 className="font-bold text-slate-900 mb-3">Destino dos produtos</h3><div className="space-y-2">{products.map(product => <label key={product.id} className="flex items-center gap-3 p-3 border rounded-xl"><span className="min-w-0 flex-1"><strong className="block truncate text-slate-900">{product.nome}</strong><small className="text-slate-500">{product.categoria}</small></span><select value={product.setor_producao_id || ''} onChange={e => assign(product.id, e.target.value)} className="field !w-auto"><option value="">Sem setor</option>{stations.filter(s=>s.ativo).map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}</select></label>)}</div></div></div></div></div>}
  </div>;
}
