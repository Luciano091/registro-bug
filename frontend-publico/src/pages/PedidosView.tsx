import { useState, useEffect } from 'react';
import { Receipt, Clock, CheckCircle2, ChefHat, Bike, MapPin, Navigation, ChevronDown } from 'lucide-react';
import api, { getEstablishmentSlug } from '../services/api';

type OrderItem = { id: number; quantidade: number; produto_nome?: string; produto?: { nome: string }; subtotal: number; opcoes?: { id: number; opcao_nome: string; quantidade: number }[] };
type Order = {
  id: number; numero: string; data: string; status: string; tipo_entrega: string; total: number; itens?: OrderItem[];
  entrega?: { status: string; latitude?: number | null; longitude?: number | null; localizacao_atualizada_em?: string | null; entregador?: { nome: string; veiculo?: string; placa?: string } | null } | null;
};

const money = (value: number) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const isDeliveryOrder = (order: Order) => ['delivery', 'entrega'].includes((order.tipo_entrega || '').toLowerCase());
const isCompletedOrder = (order: Order) => ['Finalizado', 'Concluído', 'Entregue', 'Cancelado'].includes(order.status);

const OrderProgress = ({ order }: { order: Order }) => {
  const stages = ['Recebido', 'Em preparo', 'Pronto', ...(isDeliveryOrder(order) ? ['Em rota', 'Entregue'] : ['Concluído'])];
  const ranks: Record<string, number> = { Novo: 0, Recebido: 0, 'Em preparo': 1, Pronto: 2, 'Saiu entrega': 3, Finalizado: stages.length - 1, Concluído: stages.length - 1, Entregue: stages.length - 1 };
  const current = ranks[order.status] ?? 0;
  return <div className="mt-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }} aria-label="Etapas do pedido">
    {stages.map((step, index) => {
      const active = current >= index;
      const done = active && isCompletedOrder(order);
      return <div key={step} className="text-center"><div className={`mx-auto h-1.5 rounded-full ${done ? 'bg-emerald-500' : active ? 'bg-orange-500' : 'bg-zinc-200'}`} /><span className={`mt-1.5 block text-[10px] font-semibold leading-tight ${done ? 'text-emerald-700' : active ? 'text-zinc-700' : 'text-zinc-400'}`}>{step}</span></div>;
    })}
  </div>;
};

const DriverInfo = ({ order, historical = false }: { order: Order; historical?: boolean }) => {
  const driver = order.entrega?.entregador;
  if (!driver) return null;
  const displayName = historical ? driver.nome.trim().split(/\s+/)[0] : driver.nome;
  return <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
    <div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600"><Bike size={18} /></div><div className="min-w-0 flex-1"><span className="block text-xs font-semibold text-zinc-500">Entregador responsável</span><strong className="block truncate text-sm text-zinc-900">{displayName}</strong>{!historical && <span className="text-xs text-zinc-500">{driver.veiculo || 'Veículo'}{driver.placa ? ` · ${driver.placa}` : ''}</span>}</div></div>
    {!historical && order.entrega?.status === 'em_rota' && order.entrega.latitude != null && order.entrega.longitude != null && <a href={`https://www.google.com/maps/search/?api=1&query=${order.entrega.latitude},${order.entrega.longitude}`} target="_blank" rel="noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"><Navigation size={18} />Ver localização no mapa</a>}
    {!historical && order.entrega?.status === 'em_rota' && <p className="mt-2 flex items-center justify-center gap-1 text-xs text-zinc-500"><MapPin size={13} />{order.entrega.localizacao_atualizada_em ? 'Localização atualizada recentemente' : 'Aguardando sinal de localização'}</p>}
  </div>;
};

export const PedidosView = () => {
  const [pedidos, setPedidos] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const idsStr = localStorage.getItem('meus_pedidos');
        let codigos: unknown[] = [];
        try {
          const parsed = idsStr ? JSON.parse(idsStr) : [];
          codigos = Array.isArray(parsed) ? parsed : [];
        } catch { codigos = []; }

        // Pedidos da conta são compartilhados entre dispositivos. Os códigos
        // locais preservam o acompanhamento de compras feitas sem login.
        const localRequests = codigos
          .filter((codigo: unknown) => typeof codigo === 'string')
          .map((codigo: string) => api.get<Order>(`/public/${getEstablishmentSlug()}/acompanhamento/${encodeURIComponent(codigo)}`).catch(() => null));
        const accountRequest = localStorage.getItem('cliente_token')
          ? api.get<Order[]>(`/public/${getEstablishmentSlug()}/clientes/me/pedidos`).catch(() => ({ data: [] as Order[] }))
          : Promise.resolve({ data: [] as Order[] });
        const [accountResponse, resultados] = await Promise.all([
          accountRequest,
          Promise.all(localRequests),
        ]);

        const localOrders = resultados
          .filter(r => r && r.data)
          .map(r => r!.data);
        const uniqueOrders = new Map<number, Order>();
        [...accountResponse.data, ...localOrders].forEach(order => uniqueOrders.set(order.id, order));
        const pedidosValidos = Array.from(uniqueOrders.values())
          .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
          
        setPedidos(pedidosValidos);
      } catch (error) {
        console.error("Erro ao buscar pedidos", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPedidos();
    const interval = window.setInterval(fetchPedidos, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const getStatusInfo = (status: string, isDelivery: boolean) => {
    switch(status) {
      case 'Novo':
      case 'Recebido': return { icon: <Clock size={18} />, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100', label: 'Pedido recebido' };
      case 'Em preparo': return { icon: <ChefHat size={18} />, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100', label: 'Em preparo' };
      case 'Pronto': return { icon: <CheckCircle2 size={18} />, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', label: isDelivery ? 'Pronto para entrega' : 'Pronto para retirada' };
      case 'Saiu entrega': return { icon: <Bike size={18} />, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100', label: 'Saiu para entrega' };
      case 'Finalizado':
      case 'Concluído':
      case 'Entregue': return { icon: <CheckCircle2 size={18} />, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', label: isDelivery ? 'Pedido entregue' : 'Pedido concluído' };
      case 'Cancelado': return { icon: <Receipt size={18} />, color: 'text-red-700', bg: 'bg-red-50 border-red-100', label: 'Pedido cancelado' };
      default: return { icon: <Clock size={18} />, color: 'text-zinc-600', bg: 'bg-zinc-50 border-zinc-200', label: status };
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div></div>;
  }

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center min-h-[60vh]">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
          <Receipt size={32} className="text-zinc-400" />
        </div>
        <h2 className="text-xl font-heading font-bold text-zinc-900 mb-2">Nenhum Pedido</h2>
        <p className="text-zinc-500 text-sm">
          Você ainda não fez nenhum pedido conosco. Que tal explorar nosso cardápio e matar essa fome?
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4 md:space-y-4 md:p-6">
      <h2 className="mb-5 px-1 text-2xl font-heading font-bold text-zinc-900">Meus pedidos</h2>
      
      {pedidos.map(pedido => {
        const delivery = isDeliveryOrder(pedido);
        const completed = isCompletedOrder(pedido);
        const expanded = expandedOrders[pedido.id] === true;
        const info = getStatusInfo(pedido.status, delivery);
        const date = new Date(pedido.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        
        return (
          <article key={pedido.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Pedido #{pedido.numero.split('-').pop() || pedido.numero}</span>
                <p className="mt-1 text-xs text-zinc-500">{date} · {delivery ? 'Entrega' : 'Retirada'}</p>
              </div>
              <strong className="shrink-0 font-price text-lg font-bold text-zinc-900">{money(pedido.total)}</strong>
            </div>

            <div className={`mt-3 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${info.bg} ${info.color}`}>
              {info.icon}
              <span className="text-sm font-bold">{info.label}</span>
            </div>

            {!completed && <><DriverInfo order={pedido} /><OrderProgress order={pedido} /></>}

            {completed && <>
              <button type="button" aria-expanded={expanded} aria-controls={expanded ? `detalhes-pedido-${pedido.id}` : undefined} onClick={() => setExpandedOrders(current => ({ ...current, [pedido.id]: !current[pedido.id] }))} className="mt-3 flex min-h-10 w-full items-center justify-between border-t border-zinc-100 pt-3 text-sm font-semibold text-brand-600">
                {expanded ? 'Ocultar detalhes' : 'Ver detalhes'} <ChevronDown size={18} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
              {expanded && <div id={`detalhes-pedido-${pedido.id}`} className="mt-3 border-t border-zinc-100 pt-3">
                {pedido.status !== 'Cancelado' && <OrderProgress order={pedido} />}
                <h3 className="mt-5 text-sm font-bold text-zinc-900">Itens do pedido</h3>
                <ul className="mt-2 divide-y divide-zinc-100">
                  {(pedido.itens || []).map(item => <li key={item.id} className="flex justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0"><span className="font-medium text-zinc-800">{item.quantidade}× {item.produto_nome || item.produto?.nome || 'Produto'}</span>
                      {item.opcoes?.map(opcao => <span key={opcao.id} className="block pl-5 text-xs text-zinc-500">{opcao.quantidade}× {opcao.opcao_nome}</span>)}
                    </div>
                    <span className="shrink-0 font-semibold text-zinc-800">{money(item.subtotal)}</span>
                  </li>)}
                </ul>
                <DriverInfo order={pedido} historical />
              </div>}
            </>}
          </article>
        );
      })}
    </div>
  );
};
