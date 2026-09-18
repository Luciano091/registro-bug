import { useState, useEffect } from 'react';

import { Search, Clock, Printer, CheckCircle2, Loader2, MessageCircle, X, Eye, MapPin, RotateCcw } from 'lucide-react';
import api from '../services/api';
import { useAppData } from '../contexts/AppDataContext';
import { can, readSession } from '../services/session';
import { PrinterService } from "../services/PrinterService";

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

const Orders = () => {
  const [filter, setFilter] = useState('Hoje');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState<number | null>(null);
  const [cancelModalOrderId, setCancelModalOrderId] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelEstornado, setCancelEstornado] = useState(false);
  const [receivedMethod, setReceivedMethod] = useState('PIX');
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const canConfirmPayment = can(readSession(), 'caixa.operar');
  const { orders: cachedOrders, ordersLoaded, refreshOrders, updateOrderStatus: optimisticUpdateStatus } = useAppData();
  const orders = cachedOrders;

  useEffect(() => {
    if (!ordersLoaded) void refreshOrders();
  }, [ordersLoaded, refreshOrders]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    if (newStatus === 'Cancelado') { setCancelModalOrderId(id); setCancelMotivo(''); setCancelEstornado(false); return; }
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
      const businessName = localStorage.getItem('estabelecimentoNome') || 'Estabelecimento';
      const orderNumber = shortOrderNumber(passedOrder.numero);
      
      let text = `--------------------------------\n`;
      text += `         ${businessName.toUpperCase()}\n`;
      text += `--------------------------------\n\n`;
      
      text += `PEDIDO #${orderNumber}\n`;
      text += `Cliente: ${passedOrder.cliente}\n`;
      if (passedOrder.telefone) text += `Tel: ${passedOrder.telefone}\n`;
      
      const date = new Date(passedOrder.data);
      text += `Data: ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}\n\n`;
      
      text += `[ITENS DO PEDIDO]\n`;
      passedOrder.itens?.forEach((item: any) => {
        const productName = item.produto_nome || item.produto?.nome || 'Produto';
        const itemTotal = item.subtotal || (item.quantidade * (item.produto?.preco || 0));
        text += `${item.quantidade}x ${productName} - R$ ${itemTotal.toFixed(2)}\n`;
        item.opcoes?.forEach((option: any) => { text += `  + ${option.quantidade}x ${option.opcao_nome}\n`; });
        if (item.observacao) text += `  Obs.: ${item.observacao}\n`;
      });
      
      text += `\n[RESUMO]\n`;
      if (passedOrder.taxa_entrega > 0) text += `Taxa de Entrega: R$ ${passedOrder.taxa_entrega.toFixed(2)}\n`;
      if (passedOrder.taxa_servico > 0) text += `Taxa de Servico: R$ ${passedOrder.taxa_servico.toFixed(2)}\n`;
      if (passedOrder.desconto > 0) text += `Desconto: R$ ${passedOrder.desconto.toFixed(2)}\n`;
      text += `TOTAL: R$ ${passedOrder.total?.toFixed(2) || '0.00'}\n\n`;
      
      text += `[PAGAMENTO]\n`;
      text += `Forma: ${passedOrder.forma_pagamento || 'Nao informado'}\n`;
      text += `Status: ${passedOrder.pagamento_confirmado_em ? 'PAGO' : 'PENDENTE'}\n\n`;
      
      text += `[ENTREGA]\n`;
      if (passedOrder.tipo_entrega === 'Delivery' || passedOrder.tipo_entrega === 'Entrega') {
        text += `Tipo: Delivery\n`;
        text += `Endereco: ${passedOrder.endereco || 'Nao informado'}\n`;
      } else if (passedOrder.tipo_entrega === 'Salão' || passedOrder.tipo_entrega === 'Mesa') {
        text += `Tipo: Mesa/Salao\n`;
        text += `Mesa: ${passedOrder.observacao || 'Local'}\n`;
      } else {
        text += `Tipo: Retirada no Balcao\n`;
      }
      
      text += `\n\n        Obrigado pela\n         preferencia!\n\n`;
      text += `--------------------------------\n\n\n\n\n`;
      
      await PrinterService.printReceipt(text);
      
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
    const matchesSearch = order.cliente.toLowerCase().includes(search.toLowerCase()) || 
                          order.numero.includes(search);
    if (!matchesSearch) return false;

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

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white font-heading drop-shadow-sm">Pedidos</h2>
        <p className="text-zinc-300 mt-1">Gerencie e acompanhe os pedidos em andamento.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
        <div className="flex items-center gap-2 p-1 bg-dark-800/50 backdrop-blur-md border border-white/5 rounded-xl overflow-x-auto custom-scrollbar shadow-lg">
          {['Hoje', 'Ontem', 'Semana', 'Mês', 'Todos'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${filter === f ? 'bg-white/10 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
            >
              {f}
            </button>
          ))}
          <div className="h-6 w-px bg-white/10 mx-1 shrink-0"></div>
          <input 
            type="month"
            value={filter.includes('-') ? filter : ''}
            onChange={(e) => setFilter(e.target.value || 'Mês')}
            className={`bg-dark-900/50 border border-white/10 text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:border-brand-500/50 transition-all ${filter.includes('-') ? 'text-brand-400 border-brand-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)]' : 'text-zinc-300'}`}
            title="Selecionar um mês específico"
          />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou nº..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full md:w-72 bg-dark-800/50 backdrop-blur-md border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all shadow-lg"
          />
        </div>
      </div>

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
                        {order.estornado ? 'Devolução registrada' : order.pagamento_confirmado_em ? 'Recebido' : order.status === 'Cancelado' ? 'Cancelado' : 'A receber'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`px-2.5 py-1 rounded-full border text-xs font-medium flex items-center gap-1.5 w-max ${statusColors[order.status] || statusColors['Recebido']}`}>
                          {statusIcons[order.status] || statusIcons['Recebido']}
                          <span className="hidden sm:inline">{order.status}</span>
                        </div>
                        
                        {/* Invisible by default, shows on hover to change status quickly */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <select 
                            className="bg-dark-900 border border-white/10 hover:border-brand-500/50 text-zinc-200 text-xs rounded-md px-2 py-1 outline-none cursor-pointer"
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          >
                            {Object.keys(statusColors).map(s => (
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
                    {selectedOrder.estornado ? 'Devolução registrada' : selectedOrder.pagamento_confirmado_em ? 'Recebido' : 'A receber'}
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
