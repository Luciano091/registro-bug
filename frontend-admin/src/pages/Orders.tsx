import { useState, useEffect, useRef } from 'react';

import { Search, Clock, Printer, CheckCircle2, Loader2, MessageCircle, X, Eye, MapPin, RotateCcw, Columns3, List, ChevronRight, Truck, AlertTriangle, Package, GripVertical, SlidersHorizontal } from 'lucide-react';
import api from '../services/api';
import { useAppData } from '../contexts/AppDataContext';
import { can, readSession } from '../services/session';
import { PrinterService } from "../services/PrinterService";
import { formatOrderReceipt } from '../services/orderReceipt';
import { PrinterControl } from '../components/PrinterControl';

const PAYMENT_METHODS = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'];

const statusColors: any = {
  'Recebido': 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)] backdrop-blur-md',
  'Em preparo': 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)] backdrop-blur-md',
  'Pronto': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] backdrop-blur-md',
  'Saiu entrega': 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)] backdrop-blur-md',
  'Finalizado': 'bg-white/5 text-zinc-300 border-white/10 backdrop-blur-md',
  'Cancelado': 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)] backdrop-blur-md',
};

const statusIcons: any = {
  'Recebido': <Clock size={16} />,
  'Em preparo': <Loader2 size={16} className="animate-spin" />,
  'Pronto': <CheckCircle2 size={16} />,
  'Saiu entrega': <MapPin size={16} />,
  'Finalizado': <CheckCircle2 size={16} />,
  'Cancelado': <X size={16} />,
};

const shortOrderNumber = (number: string) => number.split('-').pop() || number;
const isDeliveryOrder = (order: any) => ['delivery', 'entrega'].includes((order.tipo_entrega || '').toLowerCase());
const allowedTransitions: Record<string, string[]> = {
  Novo: ['Em preparo', 'Cancelado'],
  Recebido: ['Em preparo', 'Cancelado'],
  'Em preparo': ['Pronto', 'Cancelado'],
  Pronto: ['Saiu entrega', 'Finalizado', 'Cancelado'],
  'Saiu entrega': ['Finalizado', 'Cancelado'],
  Finalizado: [],
  Concluído: [],
  Entregue: [],
  Cancelado: [],
};
const nextStatusFor = (order: any) => {
  if (['Novo', 'Recebido'].includes(order.status)) return 'Em preparo';
  if (order.status === 'Em preparo') return 'Pronto';
  if (order.status === 'Pronto') return isDeliveryOrder(order) ? 'Saiu entrega' : 'Finalizado';
  if (order.status === 'Saiu entrega') return 'Finalizado';
  return null;
};
const nextStatusLabel = (status: string | null) => status === 'Em preparo' ? 'Iniciar preparo' : status === 'Pronto' ? 'Marcar pronto' : status === 'Saiu entrega' ? 'Saiu para entrega' : status === 'Finalizado' ? 'Finalizar' : '';
const orderAgeMinutes = (order: any) => order.data ? Math.max(0, Math.floor((Date.now() - new Date(order.data).getTime()) / 60000)) : 0;
const isLateOrder = (order: any) => !['Finalizado', 'Concluído', 'Entregue', 'Cancelado'].includes(order.status) && orderAgeMinutes(order) >= 30;
const orderItemsSummary = (order: any) => {
  const items = (order.itens || []).map((item: any) => `${item.quantidade}x ${item.produto_nome || item.produto?.nome || 'Produto'}`);
  if (items.length <= 2) return items.join(' · ');
  return `${items.slice(0, 2).join(' · ')} +${items.length - 2}`;
};
const formatElapsed = (value?: string) => {
  if (!value) return 'Agora';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  return new Date(value).toLocaleDateString('pt-BR');
};

const flowColumns = [
  { key: 'Recebido', title: 'Recebidos', statuses: ['Novo', 'Recebido'], accent: 'border-blue-400', badge: 'bg-blue-50 text-blue-700' },
  { key: 'Em preparo', title: 'Em preparo', statuses: ['Em preparo'], accent: 'border-amber-400', badge: 'bg-amber-50 text-amber-700' },
  { key: 'Pronto', title: 'Prontos', statuses: ['Pronto'], accent: 'border-emerald-400', badge: 'bg-emerald-50 text-emerald-700' },
  { key: 'Saiu entrega', title: 'Em entrega', statuses: ['Saiu entrega'], accent: 'border-purple-400', badge: 'bg-purple-50 text-purple-700' },
  { key: 'Finalizado', title: 'Finalizados', statuses: ['Finalizado', 'Concluído', 'Entregue'], accent: 'border-slate-300', badge: 'bg-slate-100 text-slate-600' },
];

const Orders = () => {
  const [filter, setFilter] = useState('Hoje');
  const [viewMode, setViewMode] = useState<'flow' | 'list'>(() => localStorage.getItem('orders_view_mode') === 'list' ? 'list' : 'flow');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState<number | null>(null);
  const [cancelModalOrderId, setCancelModalOrderId] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelEstornado, setCancelEstornado] = useState(false);
  const [receivedMethod, setReceivedMethod] = useState('PIX');
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'todos' | 'atrasados' | 'pagamento' | 'impressao'>('todos');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [, setClock] = useState(Date.now());
  const canConfirmPayment = can(readSession(), 'caixa.operar');
  const canUpdateOrders = can(readSession(), 'pedidos.atualizar');
  const { orders: cachedOrders, ordersLoaded, refreshOrders, updateOrderStatus: optimisticUpdateStatus, pendingPrintOrderId } = useAppData();
  const orders = cachedOrders;

  useEffect(() => {
    if (!ordersLoaded) void refreshOrders();
  }, [ordersLoaded, refreshOrders]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filtersRef.current?.contains(event.target as Node)) setFiltersOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [filtersOpen]);

  const changeViewMode = (mode: 'flow' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('orders_view_mode', mode);
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    const currentOrder = orders.find(order => order.id === id);
    if (!currentOrder || newStatus === currentOrder.status) return;
    if (newStatus === 'Cancelado') { setCancelModalOrderId(id); setCancelMotivo(''); setCancelEstornado(false); return; }
    if (!(allowedTransitions[currentOrder.status] || []).includes(newStatus)) {
      alert(`Não é possível mover o pedido de "${currentOrder.status}" para "${newStatus}".`);
      return;
    }
    try {
      optimisticUpdateStatus(id, newStatus);
      await api.put(`/pedidos/${id}/status?status=${encodeURIComponent(newStatus)}`);
      refreshOrders();
    } catch (error: any) {
      console.error(error);
      void refreshOrders();
      alert(error.response?.data?.detail || 'Não foi possível alterar o status. Atualize os pedidos e tente novamente.');
    }
  };

  const confirmCancellation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cancelModalOrderId || cancelMotivo.trim().length < 3) return;
    try {
      await api.post(`/pedidos/${cancelModalOrderId}/cancelar`, {
        motivo: cancelMotivo.trim(),
        estornado: cancelEstornado,
      });
      setCancelModalOrderId(null);
      await refreshOrders();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Não foi possível cancelar o pedido.');
    }
  };

  const getOrderDetails = async (order: any) => {
    const { data } = await api.get(`/pedidos/${order.id}`);
    return data;
  };

  const openOrderDetails = async (order: any) => {
    setDetailLoading(order.id);
    try {
      const detail = await getOrderDetails(order);
      setReceivedMethod(detail.forma_pagamento || 'PIX');
      setSelectedOrder(detail);
    } catch (error) {
      console.error(error);
      alert('Não foi possível carregar os detalhes do pedido.');
    } finally {
      setDetailLoading(null);
    }
  };

  const confirmPayment = async () => {
    if (!selectedOrder || confirmingPayment) return;
    setConfirmingPayment(true);
    try {
      const { data } = await api.post(`/pedidos/${selectedOrder.id}/pagamento/confirmar`, { forma_pagamento: receivedMethod });
      setSelectedOrder(data);
      await refreshOrders();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Não foi possível confirmar o recebimento.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handlePrintReceipt = async (passedOrder: any) => {
    try {
      // A listagem usa PedidoResumo e nao carrega os itens. Busque o pedido
      // completo em qualquer ponto de impressao para nunca gerar cupom vazio.
      const order = await getOrderDetails(passedOrder);
      if (!order.itens?.length) {
        throw new Error('Este pedido não possui itens para impressão.');
      }
      const businessName = localStorage.getItem('estabelecimentoNome') || 'Estabelecimento';
      await PrinterService.printReceipt(formatOrderReceipt(order, businessName));
      
    } catch (err: any) {
      alert("Erro ao imprimir: " + err.message);
    }
  };
  const handleWhatsApp = async (summaryOrder: any) => {

    if (!summaryOrder.telefone) {
      alert('Este pedido não possui telefone cadastrado.');
      return;
    }
    const whatsappWindow = window.open('', 'whatsapp_admin_tab');
    const passedOrder = await getOrderDetails(summaryOrder).catch(error => {
      console.error(error);
      whatsappWindow?.close();
      alert('Não foi possível carregar os itens do pedido.');
      return null;
    });
    if (!passedOrder) return;

    const orderNumber = shortOrderNumber(passedOrder.numero);
    
    const businessName = localStorage.getItem('estabelecimentoNome') || 'nosso estabelecimento';
    let text = `Olá ${passedOrder.cliente}! Aqui é do *${businessName}*. 🍽️\n\n`;
    text += `Recebemos o seu Pedido #${orderNumber}.\n\n`;
    
    text += `*Resumo do Pedido:*\n`;
    passedOrder.itens?.forEach((item: any) => {
      const productName = item.produto_nome || item.produto?.nome || 'Produto';
      const itemTotal = item.subtotal || (item.quantidade * (item.produto?.preco || 0));
      text += `${item.quantidade}x ${productName} - R$ ${itemTotal.toFixed(2)}\n`;
      item.opcoes?.forEach((option: any) => { text += `  + ${option.quantidade}x ${option.opcao_nome}\n`; });
      if (item.observacao) text += `  Obs.: ${item.observacao}\n`;
    });
    
    text += `\n*Total:* R$ ${passedOrder.total?.toFixed(2) || '0.00'}\n`;
    text += `*Pagamento:* ${passedOrder.forma_pagamento || 'Não informado'}\n`;
    
    if (passedOrder.tipo_entrega === 'Delivery' || passedOrder.tipo_entrega === 'Entrega') {
      text += `*Endereço de Entrega:* ${passedOrder.endereco || 'Não informado'}\n`;
    } else if (passedOrder.tipo_entrega === 'Salão' || passedOrder.tipo_entrega === 'Mesa') {
      text += `*Mesa/Salão:* ${passedOrder.observacao || 'Atendimento local'}\n`;
    } else {
      text += `*Retirada:* No balcão da lanchonete\n`;
    }
    
    text += `\n*Status atual:* ${passedOrder.status}\n\n`;
    text += `Qualquer dúvida, é só nos chamar!`;

    const encodedText = encodeURIComponent(text);
    
    // Detecta se é celular ou computador para usar o link correto
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
    const phone = `55${passedOrder.telefone.replace(/\D/g, '')}`;
    
    // O web.whatsapp.com direto permite reutilizar a aba de forma muito mais confiável no computador
    const whatsappUrl = `${baseUrl}?phone=${phone}&text=${encodedText}`;
    if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
    else window.open(whatsappUrl, 'whatsapp_admin_tab');
  };

  const filteredOrders = orders.filter(order => {
    const normalizedSearch = search.toLowerCase();
    const matchesSearch = String(order.cliente || '').toLowerCase().includes(normalizedSearch) ||
                          String(order.numero || '').includes(search);
    if (!matchesSearch) return false;

    if (quickFilter === 'atrasados' && !isLateOrder(order)) return false;
    if (quickFilter === 'pagamento' && (order.pagamento_confirmado_em || order.estornado || order.status === 'Cancelado')) return false;
    if (quickFilter === 'impressao' && order.id !== pendingPrintOrderId) return false;

    if (filter === 'Todos') return true;

    if (!order.data) return true; // Fallback if no date

    const orderDate = new Date(order.data);
    const today = new Date();
    
    if (filter === 'Hoje') {
      return orderDate.toDateString() === today.toDateString();
    }
    if (filter === 'Ontem') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return orderDate.toDateString() === yesterday.toDateString();
    }
    if (filter === 'Semana') {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return orderDate >= lastWeek;
    }
    if (filter === 'Mês') {
      return orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
    }
    
    if (filter.includes('-')) {
      const [year, month] = filter.split('-');
      return orderDate.getFullYear() === parseInt(year) && orderDate.getMonth() + 1 === parseInt(month);
    }

    return true;
  });

  const handleDrop = (event: React.DragEvent, column: typeof flowColumns[number]) => {
    event.preventDefault();
    const orderId = draggedOrderId;
    setDraggedOrderId(null);
    setDragOverColumn(null);
    if (!orderId || !canUpdateOrders) return;
    const order = orders.find(item => item.id === orderId);
    if (!order) return;
    const targetStatus = column.key === 'Recebido' ? 'Recebido' : column.key === 'Finalizado' ? 'Finalizado' : column.key;
    if (targetStatus !== order.status) void handleStatusChange(orderId, targetStatus);
  };

  return (
    <div className={`p-6 md:p-10 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col ${viewMode === 'flow' ? 'max-w-[1600px]' : 'max-w-6xl'}`}>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-heading drop-shadow-sm">Pedidos</h2>
          <p className="text-zinc-300 mt-1">Gerencie e acompanhe os pedidos em andamento.</p>
        </div>
        <div className="flex max-w-full flex-nowrap items-center gap-2">
          <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Visualização dos pedidos">
            <button type="button" aria-pressed={viewMode === 'flow'} onClick={() => changeViewMode('flow')} className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${viewMode === 'flow' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
              <Columns3 size={16} /> Fluxo
            </button>
            <button type="button" aria-pressed={viewMode === 'list'} onClick={() => changeViewMode('list')} className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${viewMode === 'list' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
              <List size={16} /> Lista
            </button>
          </div>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="search"
              aria-label="Buscar pedido por cliente ou número"
              placeholder="Nome ou nº do pedido"
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm transition-all focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-200"
            />
          </div>
          <div ref={filtersRef} className="relative">
            <button type="button" onClick={() => setFiltersOpen(open => !open)} aria-expanded={filtersOpen} aria-controls="orders-filters" className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold shadow-sm transition ${filtersOpen || quickFilter !== 'todos' || filter !== 'Hoje' ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              <SlidersHorizontal size={16} /> Filtros <span className="text-xs font-medium opacity-75">· {filter.includes('-') ? filter.split('-').reverse().join('/') : filter}{quickFilter !== 'todos' ? ' +1' : ''}</span>
            </button>
            {filtersOpen && <div id="orders-filters" className="absolute left-0 top-full z-30 mt-2 w-[calc(100vw-3rem)] space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:left-auto sm:right-0 sm:w-[420px] xl:left-0 xl:right-auto xl:w-[520px]">
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">Período</p>
                <div className="flex flex-wrap items-center gap-2">
                  {['Hoje', 'Ontem', 'Semana', 'Mês', 'Todos'].map(f => (
                    <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${filter === f ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{f}</button>
                  ))}
                  <input type="month" aria-label="Selecionar um mês específico" value={filter.includes('-') ? filter : ''} onChange={event => setFilter(event.target.value || 'Mês')} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 outline-none hover:border-orange-300" />
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">Situação</p>
                <div className="flex flex-wrap items-center gap-2" aria-label="Filtros rápidos">
                  {[['todos', 'Todos'], ['atrasados', 'Atrasados'], ['pagamento', 'Pagamento pendente'], ['impressao', 'Falha de impressão']].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setQuickFilter(id as typeof quickFilter)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${quickFilter === id ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {id === 'atrasados' && <AlertTriangle className="mr-1 inline-block" size={13} />}{label}{id === 'impressao' && pendingPrintOrderId ? ' • 1' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>}
          </div>
        </div>
        <PrinterControl />
      </div>

      {viewMode === 'flow' ? (
        <div className="flex min-h-[430px] flex-1 gap-4 overflow-x-auto pb-3 custom-scrollbar" aria-label="Fluxo de pedidos">
          {flowColumns.map(column => {
            const columnOrders = filteredOrders.filter(order => column.statuses.includes(order.status));
            const columnTotal = columnOrders.reduce((total, order) => total + Number(order.total || 0), 0);
            return (
            <section key={column.key} onDragOver={event => { event.preventDefault(); setDragOverColumn(column.key); }} onDragLeave={() => setDragOverColumn(null)} onDrop={event => handleDrop(event, column)} className={`min-w-[255px] xl:min-w-[180px] flex-1 self-start overflow-hidden rounded-2xl border border-slate-200 border-t-4 ${column.accent} bg-slate-50/80 shadow-sm transition ${dragOverColumn === column.key ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}>
                <div className="border-b border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-800">{column.title}</h3>
                    <span className={`grid min-w-6 place-items-center rounded-full px-1.5 py-0.5 text-xs font-bold ${column.badge}`}>{columnOrders.length}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-400">R$ {columnTotal.toFixed(2).replace('.', ',')}</p>
                </div>

                <div className="max-h-[calc(100vh-340px)] space-y-3 overflow-y-auto p-3 custom-scrollbar">
                  {!ordersLoaded ? (
                    <div className="py-10 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 animate-spin" size={20} />Carregando...</div>
                  ) : columnOrders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-8 text-center text-xs text-slate-400">Nenhum pedido nesta etapa</div>
                  ) : columnOrders.map(order => {
                    const nextStatus = nextStatusFor(order);
                    const nextLabel = nextStatusLabel(nextStatus);
                    const isFinished = column.key === 'Finalizado';
                    const late = isLateOrder(order);
                    const customerInfo = <>
                      <span className="block truncate text-sm font-semibold text-slate-800">{order.cliente}</span>
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                        {isDeliveryOrder(order) ? <><Truck size={12} /> Entrega</> : order.tipo_entrega === 'Mesa' || order.tipo_entrega === 'Salão' ? 'Mesa / Salão' : 'Retirada'}
                      </span>
                    </>;
                    return (
                      <article
                        key={order.id}
                        role={isFinished ? 'button' : undefined}
                        tabIndex={isFinished ? 0 : undefined}
                        aria-label={isFinished ? `Abrir detalhes do pedido ${shortOrderNumber(order.numero)}` : undefined}
                        onClick={isFinished ? () => void openOrderDetails(order) : undefined}
                        onKeyDown={isFinished ? event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            void openOrderDetails(order);
                          }
                        } : undefined}
                        draggable={canUpdateOrders && !isFinished}
                        onDragStart={() => setDraggedOrderId(order.id)}
                        onDragEnd={() => { setDraggedOrderId(null); setDragOverColumn(null); }}
                        className={`rounded-xl border bg-white p-3.5 shadow-sm transition hover:border-orange-200 hover:shadow-md ${canUpdateOrders && !isFinished ? 'cursor-grab active:cursor-grabbing' : ''} ${isFinished ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2' : ''} ${late ? 'border-red-300' : order.origem === 'ifood' ? 'border-red-200' : 'border-slate-200'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-base text-slate-900">#{shortOrderNumber(order.numero)}</strong>
                              {canUpdateOrders && !isFinished && <GripVertical className="text-slate-300" size={15} />}{order.origem === 'ifood' && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">iFood</span>}
                            </div>
                            <span className={`mt-0.5 block text-[11px] ${late ? 'font-bold text-red-600' : 'text-slate-400'}`}>{late ? `Atrasado • ${formatElapsed(order.data)}` : formatElapsed(order.data)}</span>
                          </div>
                          <strong className="shrink-0 text-sm text-orange-600">R$ {Number(order.total || 0).toFixed(2).replace('.', ',')}</strong>
                        </div>

                        {isFinished
                          ? <div className="mt-3 block w-full text-left">{customerInfo}</div>
                          : <button type="button" onClick={() => void openOrderDetails(order)} className="mt-3 block w-full text-left">{customerInfo}</button>}

                        {orderItemsSummary(order) && <div className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-500"><Package size={13} className="mt-0.5 shrink-0 text-slate-400" /><span className="line-clamp-2">{orderItemsSummary(order)}</span></div>}

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className={`text-[10px] font-bold ${order.estornado ? 'text-slate-400' : order.pagamento_confirmado_em ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {order.estornado ? 'DEVOLVIDO' : order.pagamento_confirmado_em ? 'PAGAMENTO RECEBIDO' : 'PAGAMENTO PENDENTE'}
                          </span>
                          {isFinished
                            ? <span className="text-[11px] font-semibold text-slate-500">Ver detalhes</span>
                            : <button type="button" onClick={() => void openOrderDetails(order)} className="text-[11px] font-semibold text-slate-500 hover:text-orange-600">Ver detalhes</button>}
                        </div>

                        {!isFinished && canUpdateOrders && (
                          <div className="mt-3 flex gap-2">
                            {nextStatus ? (
                              <button type="button" onClick={() => void handleStatusChange(order.id, nextStatus)} className="flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-orange-500 px-2 text-xs font-bold text-white hover:bg-orange-600">
                                {nextLabel} <ChevronRight size={14} />
                              </button>
                            ) : order.status === 'Pronto' && isDeliveryOrder(order) ? (
                              <button type="button" onClick={() => window.location.assign('/entregas')} className="flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-purple-600 px-2 text-xs font-bold text-white hover:bg-purple-700">
                                Gerenciar entrega <ChevronRight size={14} />
                              </button>
                            ) : null}
                            <button type="button" aria-label={`Cancelar pedido ${shortOrderNumber(order.numero)}`} title="Cancelar pedido" onClick={() => void handleStatusChange(order.id, 'Cancelado')} className="grid min-h-9 min-w-9 place-items-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                              <X size={15} />
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
      <div className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden min-h-[400px]">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/20">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-300 uppercase tracking-wider">Pedido</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-300 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-300 uppercase tracking-wider">Entrega</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-300 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-300 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!ordersLoaded ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-400">
                    <Loader2 className="mx-auto mb-2 animate-spin" size={20} /> Carregando pedidos...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-400">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className={`hover:bg-white/5 transition-colors group ${order.origem === 'ifood' ? 'bg-red-500/5' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-brand-500/70 text-sm font-bold">#</span>
                        <span className="font-bold text-white text-lg">{shortOrderNumber(order.numero)}</span>
                        {order.origem === 'ifood' && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">iFood</span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 mt-1 block">Há pouco tempo</span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => void openOrderDetails(order)}
                        className="group/name flex items-center gap-2 text-left w-full focus:outline-none"
                      >
                        <div className="font-medium text-zinc-200 group-hover/name:text-brand-400 group-hover/name:underline transition-all">
                          {order.cliente}
                        </div>
                        {detailLoading === order.id ? <Loader2 size={14} className="animate-spin text-brand-400" /> : <Eye size={14} className="text-zinc-600 group-hover/name:text-brand-400 opacity-0 group-hover/name:opacity-100 transition-opacity" />}
                      </button>
                      {order.telefone && (
                        <div className="text-xs text-zinc-400 mt-0.5">{order.telefone}</div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      {order.tipo_entrega === 'Retirada' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 text-xs font-medium border border-amber-500/20">
                          Retirada no Local
                        </span>
                      ) : order.tipo_entrega === 'Salão' || order.tipo_entrega === 'Mesa' ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs font-medium border border-purple-500/20 mb-1">
                            Salão / Mesa
                          </span>
                          {order.observacao && (
                            <p className="text-xs text-zinc-300 whitespace-normal break-words">
                              {order.observacao.includes('Mesa') ? order.observacao : 'Atendimento local'}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium text-brand-400 bg-brand-500/10 mb-1">
                            Delivery
                          </span>
                          <p className="text-xs text-zinc-300 whitespace-normal break-words">
                            {order.endereco || 'Endereço não informado'}
                          </p>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-brand-400">
                        R$ {order.total.toFixed(2)}
                      </span>
                      <span className={`mt-1 block text-[11px] font-semibold ${order.estornado ? 'text-zinc-400' : order.pagamento_confirmado_em ? 'text-emerald-400' : order.status === 'Cancelado' ? 'text-zinc-400' : 'text-amber-400'}`}>
                        {order.estornado ? 'Devolução registrada' : order.pagamento_confirmado_em ? 'Pagamento recebido' : order.status === 'Cancelado' ? 'Cancelado' : 'Pagamento pendente'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`px-2.5 py-1 rounded-full border text-xs font-medium flex items-center gap-1.5 w-max ${statusColors[order.status] || statusColors['Recebido']}`}>
                          {statusIcons[order.status] || statusIcons['Recebido']}
                          <span className="hidden sm:inline">{order.status}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {canUpdateOrders && nextStatusFor(order) && <button type="button" onClick={() => void handleStatusChange(order.id, nextStatusFor(order) as string)} className="rounded-lg bg-orange-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-orange-600">{nextStatusLabel(nextStatusFor(order))}</button>}
                          <select 
                            aria-label={`Próxima etapa do pedido ${shortOrderNumber(order.numero)}`}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none hover:border-orange-300"
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          >
                            {[order.status, ...(allowedTransitions[order.status] || [])].filter((status, index, values) => values.indexOf(status) === index).map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        
                        <button 
                          onClick={() => void handleWhatsApp(order)}
                          className="opacity-0 group-hover:opacity-100 transition-all text-[#25D366] hover:text-[#128C7E] bg-[#25D366]/10 p-1.5 rounded-full hover:bg-[#25D366]/20 border border-[#25D366]/20"
                          title="Enviar Mensagem no WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); void handlePrintReceipt(order); }}
                          className="opacity-0 group-hover:opacity-100 transition-all text-slate-500 hover:text-slate-700 bg-slate-500/10 p-1.5 rounded-full hover:bg-slate-500/20 border border-slate-500/20"
                          title="Imprimir Cupom Térmico (ESC/POS)"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/20">
              <div>
                <h3 className="text-xl font-bold font-heading text-white flex items-center gap-2">
                  Pedido #{shortOrderNumber(selectedOrder.numero)}
                  {selectedOrder.origem === 'ifood' && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full ml-2">iFood</span>
                  )}
                </h3>
                <p className="text-sm text-zinc-300 mt-0.5">{selectedOrder.cliente}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => void handlePrintReceipt(selectedOrder)}
                  className="p-2 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 hover:text-white rounded-full transition-colors border border-slate-500/20"
                  title="Imprimir Cupom Térmico (ESC/POS)"
                >
                  <Printer size={20} />
                </button>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  aria-label="Fechar detalhes"
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-300 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
                <div className="bg-dark-900 p-3 rounded-xl border border-white/5">
                  <span className="text-zinc-400 block text-xs mb-1">Telefone</span>
                  <span className="text-zinc-200 font-medium">{selectedOrder.telefone || '-'}</span>
                </div>
                <div className="bg-dark-900 p-3 rounded-xl border border-white/5">
                  <span className="text-zinc-400 block text-xs mb-1">Pagamento</span>
                  <span className="text-zinc-200 font-medium">{selectedOrder.forma_pagamento || '-'}</span>
                  <span className={`block mt-1 text-xs font-semibold ${selectedOrder.estornado ? 'text-zinc-400' : selectedOrder.pagamento_confirmado_em ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedOrder.estornado ? 'Devolução registrada' : selectedOrder.pagamento_confirmado_em ? 'Pagamento recebido' : 'Pagamento pendente'}
                  </span>
                </div>
                <div className="col-span-2 bg-dark-900 p-3 rounded-xl border border-white/5">
                  <span className="text-zinc-400 block text-xs mb-1">Entrega ({selectedOrder.tipo_entrega})</span>
                  <span className="text-zinc-200 font-medium">
                    {selectedOrder.endereco || (
                      selectedOrder.tipo_entrega === 'Salão' || selectedOrder.tipo_entrega === 'Mesa' 
                        ? selectedOrder.observacao || 'Atendimento local' 
                        : 'Retirada no Local'
                    )}
                  </span>
                </div>
              </div>

              {!selectedOrder.pagamento_confirmado_em && selectedOrder.status !== 'Cancelado' && canConfirmPayment && (
                <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <h4 className="text-sm font-bold text-white">Confirmar recebimento</h4>
                  <p className="mt-1 text-xs text-zinc-400">Registre somente depois de receber. A venda será lançada no caixa aberto.</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <select value={receivedMethod} onChange={event => setReceivedMethod(event.target.value)} aria-label="Forma de pagamento recebida" className="min-h-10 flex-1 rounded-lg border border-white/10 bg-dark-900 px-3 text-sm text-white">
                      {!PAYMENT_METHODS.includes(receivedMethod) && <option value={receivedMethod}>{receivedMethod}</option>}
                      {PAYMENT_METHODS.map(method => <option key={method} value={method}>{method}</option>)}
                    </select>
                    <button type="button" disabled={confirmingPayment} onClick={confirmPayment} className="min-h-10 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-60">
                      {confirmingPayment ? 'Confirmando...' : 'Confirmar recebimento'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-2">Itens do Pedido</h4>
                {selectedOrder.itens?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-start py-3 border-b border-white/5 last:border-0">
                    <div className="flex items-start gap-3">
                      <div className="bg-white/5 text-zinc-200 px-2 py-1 rounded text-xs font-bold">
                        {item.quantidade}x
                      </div>
                      <div><span className="text-zinc-200 font-medium">{item.produto_nome || item.produto?.nome || 'Produto'}</span>{item.opcoes?.map((option: any) => <p key={option.id} className="mt-1 text-xs text-zinc-500">+ {option.quantidade}x {option.opcao_nome} · {option.grupo_nome}</p>)}{item.observacao && <p className="mt-1 text-xs italic text-amber-400/80">Obs.: {item.observacao}</p>}</div>
                    </div>
                    <span className="text-zinc-300 text-sm">R$ {item.subtotal?.toFixed(2) || (item.quantidade * (item.produto?.preco || 0)).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-brand-500/10 border-t border-brand-500/20 flex justify-between items-center">
              <span className="text-brand-400 font-medium">Total do Pedido</span>
              <span className="text-2xl font-bold text-brand-500">
                R$ {selectedOrder.total?.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {cancelModalOrderId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={confirmCancellation} className="relative w-full max-w-md rounded-3xl border border-white/10 bg-dark-900 p-6 shadow-2xl">
            <button type="button" onClick={() => setCancelModalOrderId(null)} className="absolute right-4 top-4 text-zinc-400 hover:text-white"><X size={20} /></button>
            <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-red-500/10 p-3 text-red-400"><RotateCcw /></div><div><h2 className="text-xl font-bold text-white">Cancelar pedido</h2><p className="text-sm text-zinc-400">O motivo ficará registrado na auditoria.</p></div></div>
            <label className="block text-sm font-semibold text-zinc-300">Motivo do cancelamento<textarea required minLength={3} maxLength={500} value={cancelMotivo} onChange={event => setCancelMotivo(event.target.value)} className="mt-2 h-24 w-full resize-none rounded-xl border border-white/10 bg-dark-950 p-3 text-white outline-none focus:border-red-500" placeholder="Ex.: cliente desistiu do pedido" /></label>
            {cachedOrders.find(order => order.id === cancelModalOrderId)?.pagamento_confirmado_em ? (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[.03] p-4"><input type="checkbox" checked={cancelEstornado} onChange={event => setCancelEstornado(event.target.checked)} className="mt-1 h-4 w-4 accent-red-500" /><span><strong className="block text-sm text-white">Registrar devolução do pagamento</strong><small className="text-zinc-400">Lança a saída no caixa. O reembolso no banco ou maquininha deve estar confirmado.</small></span></label>
            ) : <p className="mt-4 text-sm text-zinc-400">Este pedido ainda não tem pagamento registrado.</p>}
            <div className="mt-6 flex gap-3"><button type="button" onClick={() => setCancelModalOrderId(null)} className="flex-1 rounded-xl bg-white/5 py-3 font-bold text-zinc-300">Voltar</button><button className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white hover:bg-red-600">Confirmar</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Orders;
