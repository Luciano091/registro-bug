import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ChevronRight, X } from 'lucide-react';
import api from '../services/api';
import { useNetwork } from '../contexts/NetworkContext';
import { useAppData } from '../contexts/AppDataContext';
import { saveOfflineOrder } from '../services/db';
import { v4 as uuidv4 } from 'uuid';

const NewOrder = () => {
  const { isOnline } = useNetwork();
  const { produtos: produtosCache, produtosLoaded, refreshProdutos, addOptimisticOrder, refreshOrders, refreshDashboard } = useAppData();
  const [cliente, setCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState('Delivery');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  
  const [itens, setItens] = useState<{ id: number, produto: any, quantidade: number }[]>([]);
  const produtosDisponiveveis = produtosCache;
  
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!produtosLoaded) refreshProdutos();
  }, [produtosLoaded, refreshProdutos]);

  const handleAddProduct = (produto: any) => {
    const existing = itens.find(i => i.produto.id === produto.id);
    const requestedQtd = existing ? existing.quantidade + 1 : 1;
    
    if (produto.controlar_estoque && requestedQtd > produto.estoque) {
      alert(`Estoque insuficiente! Restam apenas ${produto.estoque} unidades de ${produto.nome}.`);
      return;
    }

    if (existing) {
      setItens(itens.map(i => i.produto.id === produto.id ? { ...i, quantidade: requestedQtd } : i));
    } else {
      setItens([...itens, { id: Date.now(), produto, quantidade: 1 }]);
    }
  };

  const handleRemoveProduct = (id: number) => {
    setItens(itens.filter(i => i.produto.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setItens(itens.map(i => {
      if (i.produto.id === id) {
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

  const subtotal = itens.reduce((acc, item) => acc + (item.produto.preco * item.quantidade), 0);
  const total = subtotal;

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      const orderUuid = uuidv4();
      const pedidoData = {
        uuid: orderUuid,
        cliente,
        telefone: telefone || undefined,
        endereco: endereco || undefined,
        tipo_entrega: tipoEntrega,
        forma_pagamento: formaPagamento,
        itens: itens.map(item => ({
          produto_id: item.produto.id,
          quantidade: item.quantidade
        }))
      };

      // 1. Atualização Otimista Imediata (antes do servidor responder)
      const optimisticOrder = {
        id: Date.now(),
        uuid: orderUuid,
        numero: `OPT-${Date.now()}`,
        cliente,
        telefone,
        endereco,
        tipo_entrega: tipoEntrega,
        forma_pagamento: formaPagamento,
        status: 'Recebido',
        total,
        subtotal,
        taxa_entrega: 0,
        data: new Date().toISOString(),
        itens: itens.map(item => ({ produto_id: item.produto.id, quantidade: item.quantidade, valor_unitario: item.produto.preco, subtotal: item.produto.preco * item.quantidade, produto: item.produto }))
      };
      
      addOptimisticOrder(optimisticOrder);
      
      // 2. Limpar formulário imediatamente para o usuário continuar trabalhando
      setCliente(''); setTelefone(''); setEndereco(''); setItens([]); setShowCheckout(false);
      setIsSubmitting(false);

      // 3. Enviar para o servidor em background
      if (!isOnline) {
        await saveOfflineOrder(orderUuid, pedidoData);
      } else {
        api.post('/pedidos', pedidoData).then(() => {
          refreshOrders();
          refreshProdutos();
          refreshDashboard();
        }).catch(async (error: any) => {
          if (!error.response || error.message === 'Network Error') {
            await saveOfflineOrder(orderUuid, pedidoData);
          } else {
            const detail = error.response?.data?.detail;
            if (detail && detail.includes("Caixa está fechado")) {
              alert(`Atenção: O pedido de ${cliente || 'Cliente'} não foi salvo porque o Caixa está fechado! Abra o caixa.`);
            } else {
              alert(detail || 'Houve um erro ao salvar o pedido.');
            }
          }
        });
      }
    } catch (error: any) {
      console.error(error);
      alert('Erro inesperado ao processar o pedido.');
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 min-h-screen text-zinc-100 flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-heading drop-shadow-sm">Novo Pedido</h2>
          <p className="text-brand-400 font-mono text-sm mt-1">#{new Date().toISOString().slice(0,10).replace(/-/g,'')}-012</p>
        </div>
      </header>

      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass border border-white/10 rounded-3xl w-full max-w-4xl animate-in zoom-in-95 shadow-2xl flex flex-col md:flex-row overflow-hidden bg-zinc-900">
            
            {/* Esquerda: Informações do Cliente */}
            <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-white/5">
              <div className="flex justify-between items-center mb-6 md:hidden">
                <h3 className="text-2xl font-bold font-heading">Finalizar Pedido</h3>
                <button onClick={() => setShowCheckout(false)} className="text-zinc-500"><X size={24} /></button>
              </div>
              <h3 className="text-2xl font-bold mb-6 hidden md:block font-heading">Dados do Cliente</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Nome do Cliente *</label>
                  <input required value={cliente} onChange={e => setCliente(e.target.value)} placeholder="João da Silva"
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Telefone / WhatsApp</label>
                  <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999"
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600"
                  />
                </div>
                
                <div className="pt-4">
                  <label className="block text-sm text-zinc-400 mb-2">Tipo de Entrega</label>
                  <div className="flex gap-2 p-1 bg-dark-900 border border-white/5 rounded-xl">
                    <button 
                      onClick={() => setTipoEntrega('Retirada')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tipoEntrega === 'Retirada' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500'}`}
                    >
                      Retirada
                    </button>
                    <button 
                      onClick={() => setTipoEntrega('Delivery')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tipoEntrega === 'Delivery' ? 'bg-brand-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'text-zinc-500'}`}
                    >
                      Delivery
                    </button>
                  </div>
                </div>

                {tipoEntrega === 'Delivery' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm text-zinc-400 mb-1">Endereço de Entrega *</label>
                    <textarea 
                      required
                      value={endereco} 
                      onChange={e => setEndereco(e.target.value)} 
                      placeholder="Rua, Número, Bairro, Referência..."
                      rows={3}
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all resize-none text-white placeholder-zinc-600 custom-scrollbar"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Direita: Pagamento e Total */}
            <div className="flex-1 p-8 bg-black/20 flex flex-col">
              <div className="flex justify-between items-center mb-6 hidden md:flex">
                <h3 className="text-2xl font-bold font-heading">Pagamento</h3>
                <button onClick={() => setShowCheckout(false)} className="text-zinc-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10"><X size={20} /></button>
              </div>
              <h3 className="text-2xl font-bold mb-6 md:hidden font-heading">Pagamento</h3>

              <div className="space-y-3 mb-8 flex-1">
                <label className="block text-sm text-zinc-400 mb-1">Forma de Pagamento</label>
                {['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'].map(metodo => (
                  <label key={metodo} onClick={() => setFormaPagamento(metodo)} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formaPagamento === metodo ? 'border-brand-500 bg-brand-500/10 shadow-[0_0_10px_rgba(249,115,22,0.15)]' : 'border-white/10 bg-dark-900 hover:border-white/20'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formaPagamento === metodo ? 'border-brand-500' : 'border-zinc-600'}`}>
                      {formaPagamento === metodo && <div className="w-2.5 h-2.5 bg-brand-500 rounded-full" />}
                    </div>
                    <span className={formaPagamento === metodo ? 'text-white font-medium' : 'text-zinc-400'}>{metodo}</span>
                  </label>
                ))}
              </div>

              <div className="border-t border-white/10 pt-6 mt-auto">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-zinc-400 text-sm mb-1">Total a Pagar</p>
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

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-10rem)]">
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 mb-2 justify-between">
            <div className="flex gap-2 p-1 bg-dark-800/50 backdrop-blur-md border border-white/5 rounded-xl overflow-x-auto shadow-lg">
              {categorias.map(cat => (
                <button key={cat as string} onClick={() => setActiveCategory(cat as string)} className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-white/10 text-white font-medium shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
                  {cat as string}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input type="text" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="w-full md:w-64 bg-dark-800/50 backdrop-blur-md border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all shadow-lg" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(produto => {
                const count = itens.find(i => i.produto.id === produto.id)?.quantidade || 0;
                return (
                  <div key={produto.id} className="glass-card p-3 rounded-xl flex flex-col justify-between group">
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-1.5">
                        {produto.categoria}
                      </span>
                      <h4 className="font-bold text-white text-sm font-heading group-hover:text-brand-400 transition-colors line-clamp-2">{produto.nome}</h4>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                      <span className="font-bold text-zinc-300 text-sm">{produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      {count === 0 ? (
                        <button onClick={() => handleAddProduct(produto)} className="text-brand-400 hover:text-brand-300 p-1.5 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors">
                          <Plus size={16} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-dark-900 border border-white/10 rounded-lg px-1.5 py-0.5">
                          <button onClick={() => updateQuantity(produto.id, -1)} className="p-1 hover:text-brand-400 text-zinc-400 transition-colors"><Minus size={14} /></button>
                          <span className="font-bold w-4 text-center text-xs">{count}</span>
                          <button onClick={() => updateQuantity(produto.id, 1)} className="p-1 hover:text-brand-400 text-zinc-400 transition-colors"><Plus size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 glass-card rounded-2xl flex flex-col overflow-hidden h-[600px] lg:h-full shrink-0">
          <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
            <h3 className="text-lg font-bold font-heading">Resumo do Pedido</h3>
            <span className="bg-brand-500/20 text-brand-400 text-xs px-2 py-1 rounded-md">{itens.length} itens</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {itens.map((item) => (
              <div key={item.produto.id} className="flex items-center justify-between bg-dark-900 p-2.5 rounded-xl border border-white/5">
                <p className="font-bold text-zinc-200 text-xs leading-tight line-clamp-1 flex-1 pr-2">{item.produto.nome}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => updateQuantity(item.produto.id, -1)} className="text-zinc-400 hover:text-brand-400"><Minus size={14} /></button>
                  <span className="text-xs font-bold w-4 text-center">{item.quantidade}</span>
                  <button onClick={() => updateQuantity(item.produto.id, 1)} className="text-zinc-400 hover:text-brand-400"><Plus size={14} /></button>
                  <button onClick={() => handleRemoveProduct(item.produto.id)} className="ml-1 text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-white/5 bg-black/20">
            <div className="flex justify-between items-center mb-4">
              <span className="text-zinc-400 text-sm">Total</span>
              <span className="text-2xl font-bold gradient-text font-heading">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <button onClick={() => setShowCheckout(true)} disabled={itens.length === 0} className="w-full premium-btn py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Avançar <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrder;
