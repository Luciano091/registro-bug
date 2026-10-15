import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, ChevronRight, X, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useNetwork } from '../contexts/NetworkContext';
import { useAppData } from '../contexts/AppDataContext';
import { saveOfflineOrder } from '../services/db';
import { v4 as uuidv4 } from 'uuid';
import OrderProductOptionsModal from '../components/OrderProductOptionsModal';

const NewOrder = () => {
  const { isOnline } = useNetwork();
  const { produtos: produtosCache, produtosLoaded, refreshProdutos, addOptimisticOrder, refreshOrders, refreshDashboard, dashboardResumo } = useAppData();
  const location = useLocation();
  const prefill = location.state?.prefill;

  const [cliente, setCliente] = useState(prefill?.nome || '');
  const [telefone, setTelefone] = useState(prefill?.telefone || '');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [deliveryConfig, setDeliveryConfig] = useState<any>(null);
  const [deliveryQuote, setDeliveryQuote] = useState<any>(null);
  const [taxaManual, setTaxaManual] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState('Delivery');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [cashbackDisponivel, setCashbackDisponivel] = useState(0);
  const [usarCashback, setUsarCashback] = useState(false);

  useEffect(() => {
    const fetchCliente = async () => {
      const cleanPhone = telefone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        try {
          const { data } = await api.get(`/admin/clientes/busca?telefone=${cleanPhone}`);
          if (data) {
            if (!cliente) setCliente(data.nome);
            if (!endereco && data.endereco) setEndereco(data.endereco);
            setCashbackDisponivel(data.saldo_cashback || 0);
          }
        } catch (e) {
          setCashbackDisponivel(0);
        }
      } else {
        setCashbackDisponivel(0);
      }
    };
    const t = setTimeout(fetchCliente, 600);
    return () => clearTimeout(t);
  }, [telefone]);
  
  const [itens, setItens] = useState<{ id: number, produto: any, quantidade: number, opcoes: any[], precoUnitario: number }[]>([]);
  const [optionsProduct, setOptionsProduct] = useState<any | null>(null);
  const produtosDisponiveveis = produtosCache.filter((p: any) => p.ativo !== false);
  
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!produtosLoaded) refreshProdutos();
  }, [produtosLoaded, refreshProdutos]);

  useEffect(() => {
    api.get('/configuracao/entrega').then(({ data }) => setDeliveryConfig(data)).catch(() => undefined);
  }, []);

  const handleAddProduct = (produto: any) => {
    if ((produto.grupos_opcoes || []).some((group: any) => group.ativo)) {
      setOptionsProduct(produto);
      return;
    }
    const existing = itens.find(i => i.produto.id === produto.id);
    const requestedQtd = existing ? existing.quantidade + 1 : 1;
    
    if (produto.controlar_estoque && requestedQtd > produto.estoque) {
      alert(`Estoque insuficiente! Restam apenas ${produto.estoque} unidades de ${produto.nome}.`);
      return;
    }

    if (existing) {
      setItens(itens.map(i => i.produto.id === produto.id ? { ...i, quantidade: requestedQtd } : i));
    } else {
      const preco = produto.promocao_ativa && produto.preco_promocao ? produto.preco_promocao : produto.preco;
      setItens([...itens, { id: Date.now(), produto, quantidade: 1, opcoes: [], precoUnitario: preco }]);
    }
  };

  const addConfiguredProduct = (opcoes: any[]) => {
    const produto = optionsProduct;
    const base = produto.promocao_ativa && produto.preco_promocao ? produto.preco_promocao : produto.preco;
    const extras = opcoes.reduce((sum, option) => sum + option.preco * option.quantidade, 0);
    setItens(current => [...current, { id: Date.now(), produto, quantidade: 1, opcoes, precoUnitario: base + extras }]);
    setOptionsProduct(null);
  };

  const handleRemoveProduct = (id: number) => {
    setItens(itens.filter(i => i.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setItens(itens.map(i => {
      if (i.id === id) {
        const newQtd = i.quantidade + delta;
        
        if (delta > 0 && i.produto.controlar_estoque && newQtd > i.produto.estoque) {
          alert(`Estoque insuficiente! Restam apenas ${i.produto.estoque} unidades de ${i.produto.nome}.`);
          return i;
        }

        return newQtd > 0 ? { ...i, quantidade: newQtd } : i;
      }
      return i;
    }));
  };

  const subtotal = itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
  const deliveryFee = tipoEntrega === 'Delivery' ? (deliveryConfig?.entrega_modo === 'distancia' ? Number(taxaManual) || 0 : deliveryQuote?.taxa || 0) : 0;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (tipoEntrega !== 'Delivery' || !deliveryConfig || deliveryConfig.entrega_modo === 'distancia' || (deliveryConfig.entrega_modo === 'bairro' && !bairro)) { setDeliveryQuote(null); return; }
    const timer = window.setTimeout(() => api.post('/configuracao/entrega/cotar', { subtotal, bairro: bairro || undefined }).then(({ data }) => setDeliveryQuote(data)).catch((error) => setDeliveryQuote({ atendido: false, mensagem: error.response?.data?.detail || 'Não foi possível calcular a entrega.' })), 250);
    return () => window.clearTimeout(timer);
  }, [tipoEntrega, deliveryConfig, bairro, subtotal]);

  const handleSubmitOrder = async () => {
    if (tipoEntrega === 'Delivery') {
      if (!isOnline) return alert('Pedidos para entrega precisam de conexão para validar a taxa.');
      if (deliveryConfig?.entrega_habilitada === false) return alert('As entregas estão desativadas nas configurações do estabelecimento.');
      if (deliveryConfig?.entrega_modo !== 'distancia' && !deliveryQuote?.atendido) return alert(deliveryQuote?.mensagem || 'Informe uma área de entrega válida.');
      if (deliveryConfig?.entrega_modo === 'distancia' && taxaManual === '') return alert('Informe a taxa combinada para esta entrega.');
    }
    setIsSubmitting(true);
    try {
      const orderUuid = uuidv4();
      const pedidoData = {
        uuid: orderUuid,
        cliente,
        telefone: telefone || undefined,
        endereco: endereco || undefined,
        bairro: bairro || undefined,
        taxa_entrega_manual: tipoEntrega === 'Delivery' && deliveryConfig?.entrega_modo === 'distancia' ? Number(taxaManual) : undefined,
        tipo_entrega: tipoEntrega,
        forma_pagamento: formaPagamento,
        cashback_usado: usarCashback && cashbackDisponivel > 0 ? (total > cashbackDisponivel ? cashbackDisponivel : total) : 0,
        itens: itens.map(item => ({
          produto_id: item.produto.id,
          quantidade: item.quantidade,
          opcoes: item.opcoes.map(option => ({ opcao_id: option.opcaoId, quantidade: option.quantidade }))
        }))
      };

      if (!isOnline) {
        await saveOfflineOrder(orderUuid, pedidoData);
        alert('Pedido salvo neste aparelho. Ele aparecerá em Pedidos após o envio quando a conexão voltar.');
      } else {
        try {
          const { data } = await api.post('/pedidos', pedidoData);
          addOptimisticOrder(data);
          void refreshOrders();
          void refreshProdutos();
          void refreshDashboard();
        } catch (error: any) {
          if (!error.response || error.message === 'Network Error') {
            await saveOfflineOrder(orderUuid, pedidoData);
            alert('Não foi possível confirmar a resposta do servidor. O pedido ficou salvo neste aparelho para reenviar automaticamente. Mantenha o painel aberto e evite cadastrar o mesmo pedido novamente.');
          } else {
            const detail = error.response?.data?.detail;
            alert(detail || 'O pedido não foi salvo. Revise os dados e tente novamente.');
            return;
          }
        }
      }
      setCliente(''); setTelefone(''); setEndereco(''); setBairro(''); setTaxaManual(''); setItens([]); setShowCheckout(false);
    } catch (error: any) {
      console.error(error);
      alert('Não foi possível salvar o pedido neste aparelho. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categorias = ['Todos', ...Array.from(new Set(produtosDisponiveveis.map(p => p.categoria)))];

  let filtered = produtosDisponiveveis;
  if (activeCategory !== 'Todos') {
    filtered = filtered.filter(p => p.categoria === activeCategory);
  }
  if (search) {
    filtered = filtered.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 min-h-screen text-slate-900 flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-heading drop-shadow-sm">Novo Pedido</h2>
          <p className="mt-1 text-sm text-zinc-400">O número do pedido aparece após a confirmação.</p>
        </div>
      </header>

      {dashboardResumo?.alertas_estoque && dashboardResumo.alertas_estoque.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col gap-2 mb-6">
          <div className="flex items-center gap-2 text-red-500 font-bold mb-1">
            <AlertTriangle size={20} />
            <h4>Alerta de Estoque Crítico</h4>
          </div>
          <div className="flex flex-wrap gap-3">
            {dashboardResumo.alertas_estoque.map((alerta: any) => (
              <div key={alerta.id} className="bg-dark-900/50 rounded-xl p-3 flex gap-4 items-center border border-red-500/10">
                <span className="text-white font-medium">{alerta.nome}</span>
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">Restam {alerta.estoque}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass border border-white/10 rounded-3xl w-full max-w-4xl animate-in zoom-in-95 shadow-2xl flex flex-col md:flex-row overflow-hidden bg-zinc-900">
            
            {/* Esquerda: Informações do Cliente */}
            <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-white/5">
              <div className="flex justify-between items-center mb-6 md:hidden">
                <h3 className="text-2xl font-bold font-heading">Finalizar Pedido</h3>
                <button onClick={() => setShowCheckout(false)} className="text-zinc-400"><X size={24} /></button>
              </div>
              <h3 className="text-2xl font-bold mb-6 hidden md:block font-heading">Dados do Cliente</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">Nome do Cliente *</label>
                  <input required value={cliente} onChange={e => setCliente(e.target.value)} placeholder="João da Silva"
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">Telefone / WhatsApp</label>
                  <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999"
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600"
                  />
                  {cashbackDisponivel > 0 && (
                    <label className="mt-3 flex items-center gap-2 cursor-pointer p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <input type="checkbox" checked={usarCashback} onChange={e => setUsarCashback(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
                      <span className="text-sm text-emerald-400 font-medium">Usar saldo de Cashback (R$ {cashbackDisponivel.toFixed(2)})</span>
                    </label>
                  )}
                </div>
                
                <div className="pt-4">
                  <label className="block text-sm text-zinc-300 mb-2">Tipo de Entrega</label>
                  <div className="flex gap-2 p-1 bg-dark-900 border border-white/5 rounded-xl">
                    <button 
                      onClick={() => setTipoEntrega('Retirada')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tipoEntrega === 'Retirada' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400'}`}
                    >
                      Retirada
                    </button>
                    <button 
                      onClick={() => setTipoEntrega('Delivery')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tipoEntrega === 'Delivery' ? 'bg-brand-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'text-zinc-400'}`}
                    >
                      Delivery
                    </button>
                  </div>
                </div>

                {tipoEntrega === 'Delivery' && (
                  <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                    {deliveryConfig?.entrega_modo === 'bairro' && <div><label className="block text-sm text-zinc-300 mb-1">Bairro *</label><select value={bairro} onChange={event => setBairro(event.target.value)} className="w-full rounded-xl border border-white/10 bg-dark-900 px-4 py-3 text-white outline-none focus:border-brand-500/50"><option value="">Selecione...</option>{deliveryConfig.areas.filter((area:any) => area.ativo).map((area:any) => <option key={area.id} value={area.bairro}>{area.bairro} · {area.taxa.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</option>)}</select></div>}
                    <label className="block text-sm text-zinc-300 mb-1">Endereço de Entrega *</label>
                    <textarea 
                      required
                      value={endereco} 
                      onChange={e => setEndereco(e.target.value)} 
                      placeholder="Rua, Número, Bairro, Referência..."
                      rows={3}
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all resize-none text-white placeholder-zinc-600 custom-scrollbar"
                    />
                    {deliveryConfig?.entrega_modo === 'distancia' && <div><label className="block text-sm text-zinc-300 mb-1">Taxa combinada (R$) *</label><input type="number" min="0" step="0.01" value={taxaManual} onChange={event => setTaxaManual(event.target.value)} className="w-full rounded-xl border border-white/10 bg-dark-900 px-4 py-3 text-white outline-none focus:border-brand-500/50" /><p className="mt-1 text-xs text-zinc-500">Use este campo para pedidos recebidos por telefone, quando o GPS do cliente não está disponível.</p></div>}
                    {deliveryConfig?.entrega_modo !== 'distancia' && deliveryQuote && <p className={`rounded-xl border p-3 text-sm ${deliveryQuote.atendido ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>{deliveryQuote.atendido ? `Taxa calculada: ${(deliveryQuote.taxa || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}` : deliveryQuote.mensagem}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Direita: Pagamento e Total */}
            <div className="flex-1 p-8 bg-black/20 flex flex-col">
              <div className="flex justify-between items-center mb-6 hidden md:flex">
                <h3 className="text-2xl font-bold font-heading">Pagamento</h3>
                <button onClick={() => setShowCheckout(false)} className="text-zinc-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10"><X size={20} /></button>
              </div>
              <h3 className="text-2xl font-bold mb-6 md:hidden font-heading">Pagamento</h3>

              <div className="space-y-3 mb-8 flex-1">
                <label className="block text-sm text-zinc-300 mb-1">Forma de Pagamento</label>
                {['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'].map(metodo => (
                  <label key={metodo} onClick={() => setFormaPagamento(metodo)} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formaPagamento === metodo ? 'border-brand-500 bg-brand-500/10 shadow-[0_0_10px_rgba(249,115,22,0.15)]' : 'border-white/10 bg-dark-900 hover:border-white/20'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formaPagamento === metodo ? 'border-brand-500' : 'border-zinc-600'}`}>
                      {formaPagamento === metodo && <div className="w-2.5 h-2.5 bg-brand-500 rounded-full" />}
                    </div>
                    <span className={formaPagamento === metodo ? 'text-white font-medium' : 'text-zinc-300'}>{metodo}</span>
                  </label>
                ))}
              </div>

              <div className="border-t border-white/10 pt-6 mt-auto">
                {tipoEntrega === 'Delivery' && <div className="mb-3 flex justify-between text-sm text-zinc-400"><span>Taxa de entrega</span><strong className="text-zinc-200">{deliveryFee.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>}
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-zinc-300 text-sm mb-1">Total a Pagar</p>
                    <p className="text-3xl font-bold gradient-text font-heading">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                </div>
                
                <button 
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || !cliente || (tipoEntrega === 'Delivery' && !endereco)}
                  className="w-full premium-btn py-4 rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {isSubmitting ? 'Processando...' : 'Confirmar Pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="order-workspace flex flex-col gap-4 lg:h-[calc(100vh-9rem)]">
          <div className="flex shrink-0 flex-col justify-between gap-4 xl:flex-row">
            <div className="min-w-0 flex flex-1 gap-2 p-1.5 bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
              {categorias.map(cat => (
                <button 
                  key={cat as string} 
                  onClick={() => setActiveCategory(cat as string)} 
                  className={`px-3.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap font-medium ${
                    activeCategory === cat 
                      ? 'bg-brand-500 text-white font-bold shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {cat as string}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar produto..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="w-full md:w-64 bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all shadow-sm" 
              />
            </div>
          </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(produto => {
                const configurable = (produto.grupos_opcoes || []).some((group: any) => group.ativo);
                const line = itens.find(i => i.produto.id === produto.id && i.opcoes.length === 0);
                const count = configurable ? 0 : (line?.quantidade || 0);
                const totalNoPedido = itens.filter(i => i.produto.id === produto.id).reduce((sum, i) => sum + i.quantidade, 0);

                return (
                  <div key={produto.id} className="product-tile glass-card p-4 rounded-xl flex flex-col justify-between group border border-slate-200 bg-white hover:border-brand-400 hover:shadow-md transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-50 text-brand-600 border border-brand-200/70">
                          {produto.categoria}
                        </span>
                        {totalNoPedido > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-500 text-white shadow-sm" title="Quantidade deste produto já no pedido">
                            {totalNoPedido} no pedido
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm font-heading group-hover:text-brand-600 transition-colors line-clamp-2">{produto.nome}</h4>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                      <span className="font-bold text-slate-900 text-sm">{produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      {count === 0 ? (
                        <button onClick={() => handleAddProduct(produto)} className="text-brand-600 hover:text-brand-700 p-1.5 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 rounded-lg transition-colors">
                          <Plus size={16} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5">
                          <button onClick={() => updateQuantity(line!.id, -1)} className="p-1 hover:text-brand-600 text-slate-600 transition-colors"><Minus size={14} /></button>
                          <span className="font-extrabold w-4 text-center text-xs text-slate-900 tabular-nums">{count}</span>
                          <button onClick={() => updateQuantity(line!.id, 1)} className="p-1 hover:text-brand-600 text-slate-600 transition-colors"><Plus size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full lg:w-80 glass-card rounded-2xl flex flex-col overflow-hidden h-[600px] lg:h-full shrink-0 border border-slate-200 bg-white shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 font-heading">Resumo do Pedido</h3>
              <span className="bg-brand-50 text-brand-600 border border-brand-200 text-xs font-bold px-2.5 py-1 rounded-lg">
                {itens.reduce((acc, i) => acc + i.quantidade, 0)} {itens.reduce((acc, i) => acc + i.quantidade, 0) === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {itens.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <p className="text-sm font-medium">Nenhum item adicionado</p>
                  <p className="text-xs text-slate-400 mt-1">Selecione produtos ao lado para montar o pedido</p>
                </div>
              ) : (
                itens.map((item) => (
                  <div key={item.id} className="bg-slate-50/80 hover:bg-slate-50 p-3 rounded-xl border border-slate-200 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md bg-brand-500 text-white font-extrabold text-xs shrink-0 shadow-sm">
                            {item.quantidade}x
                          </span>
                          <p className="font-bold text-slate-900 text-sm leading-tight truncate">{item.produto.nome}</p>
                        </div>
                        {item.opcoes.length > 0 && (
                          <p className="mt-1 pl-7 text-[11px] text-slate-500 line-clamp-2">
                            {item.opcoes.map(option => (option.quantidade > 1 ? `${option.quantidade}x ${option.nome}` : option.nome)).join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900 text-sm block">
                          {(item.precoUnitario * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        {item.quantidade > 1 && (
                          <span className="text-[10px] text-slate-400 block">
                            {item.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} un
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-1">
                      <span className="text-[11px] font-medium text-slate-500">Quantidade:</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)} 
                          className="h-7 w-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 flex items-center justify-center transition-colors shadow-sm"
                          title="Diminuir quantidade"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-extrabold text-slate-900 w-6 text-center tabular-nums">{item.quantidade}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)} 
                          className="h-7 w-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 flex items-center justify-center transition-colors shadow-sm"
                          title="Aumentar quantidade"
                        >
                          <Plus size={14} />
                        </button>
                        <button 
                          onClick={() => handleRemoveProduct(item.id)} 
                          className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center ml-1 transition-colors"
                          title="Remover produto do pedido"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-600 text-sm font-semibold">Total do Pedido</span>
                <span className="text-2xl font-black text-brand-600 font-heading">
                  {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <button 
                onClick={() => setShowCheckout(true)} 
                disabled={itens.length === 0} 
                className="w-full premium-btn py-3 rounded-xl font-bold flex justify-center items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-500/20"
              >
                Avançar <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {optionsProduct && <OrderProductOptionsModal product={optionsProduct} onClose={() => setOptionsProduct(null)} onConfirm={addConfiguredProduct} />}
    </div>
  );
};

export default NewOrder;
