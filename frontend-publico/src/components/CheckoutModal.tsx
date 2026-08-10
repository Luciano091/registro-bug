import { useState } from 'react';
import { X, Trash2, MapPin, CreditCard, ChevronRight, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useNetwork } from '../contexts/NetworkContext';
import { saveOfflineOrder } from '../services/db';
import api from '../services/api';

interface CheckoutModalProps {
  onClose: () => void;
}

export const CheckoutModal = ({ onClose }: CheckoutModalProps) => {
  const { items, cartTotal, removeItem, updateQuantity, clearCart } = useCart();
  const { isOnline } = useNetwork();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipoPedido, setTipoPedido] = useState<'entrega' | 'retirada'>('entrega');
  const [endereco, setEndereco] = useState('');
  const [pagamento, setPagamento] = useState('');

  const handleFinalizeOrder = async () => {
    setIsSubmitting(true);
    try {
      const orderUuid = crypto.randomUUID();
      const pedidoData = {
        uuid: orderUuid,
        cliente: nome,
        telefone: telefone,
        endereco: tipoPedido === 'entrega' ? endereco : undefined,
        tipo_entrega: tipoPedido === 'entrega' ? 'Delivery' : 'Retirada',
        forma_pagamento: pagamento,
        itens: items.map(item => ({
          produto_id: item.produtoId,
          quantidade: item.quantidade,
          observacao: item.observacao
        }))
      };

      if (!isOnline) {
        await saveOfflineOrder(orderUuid, pedidoData);
      } else {
        try {
          await api.post('/pedidos', pedidoData);
        } catch (error: any) {
          console.error("Erro ao salvar pedido na API:", error);
          const detail = error.response?.data?.detail;
          if (detail && detail.includes("Caixa está fechado")) {
            alert(`Atenção: Seu pedido não foi salvo no sistema do restaurante pois o caixa está fechado.`);
          } else {
            await saveOfflineOrder(orderUuid, pedidoData);
          }
        }
      }

      clearCart();
      setStep(3); // Mostra tela de sucesso
    } catch (e) {
      alert("Ocorreu um erro ao processar seu pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    if (!nome.trim()) return false;
    if (telefone.replace(/\D/g, '').length < 10) return false;
    if (tipoPedido === 'entrega' && !endereco.trim()) return false;
    if (!pagamento) return false;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full md:max-w-md bg-[#141416] rounded-t-3xl md:rounded-3xl flex flex-col h-[90vh] md:h-[80vh] shadow-2xl shadow-black border border-white/5">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-heading font-bold text-white tracking-wide">
            {step === 1 ? 'Seu Pedido' : step === 2 ? 'Finalizar Pedido' : 'Pedido Confirmado'}
          </h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-4 md:p-6 bg-[#0F0F11]">
          {step === 3 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 space-y-4 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-brand-500/20 text-brand-500 rounded-full flex items-center justify-center mb-4">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h3 className="text-2xl font-bold text-white font-heading">Pedido Recebido!</h3>
              <p className="text-zinc-400 max-w-sm">
                Seu pedido já está com o restaurante. Em breve você receberá atualizações sobre ele no seu WhatsApp!
              </p>
              <button 
                onClick={onClose}
                className="mt-8 w-full max-w-xs bg-brand-500 hover:bg-brand-600 text-white p-4 rounded-xl font-bold transition-colors shadow-lg shadow-brand-500/20 active:scale-[0.98]"
              >
                Voltar ao Cardápio
              </button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="bg-[#18181A] p-4 rounded-2xl border border-white/5 flex gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-sm leading-tight">{item.quantidade}x {item.nome}</h3>
                      <button onClick={() => removeItem(item.id)} className="text-zinc-600 hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    {item.adicionais.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.adicionais.map((add, idx) => (
                          <div key={idx} className="text-xs text-zinc-400 flex items-center gap-1">
                            <span className="text-brand-500">+</span> {add.quantidade}x {add.nome}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {item.observacao && (
                      <div className="mt-2 text-xs text-zinc-500 italic bg-white/5 p-2 rounded-lg">
                        Obs: {item.observacao}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 bg-[#202022] rounded-lg p-1 border border-white/5">
                        <button 
                          className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          -
                        </button>
                        <span className="font-bold text-white text-sm w-4 text-center">{item.quantidade}</span>
                        <button 
                          className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          +
                        </button>
                      </div>
                      <span className="font-price font-bold text-brand-400">
                        {((item.precoBase + item.adicionais.reduce((s, a) => s + a.preco, 0)) * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Form */}
              <div>
                <label className="block text-sm font-bold text-zinc-300 mb-2">Qual o seu nome?</label>
                <input 
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full bg-[#18181A] border border-white/10 rounded-xl p-3.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-300 mb-2">Seu WhatsApp</label>
                <input 
                  type="tel"
                  value={telefone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 11) {
                      val = val.replace(/^(\d{2})(\d)/g, '($1) $2');
                      val = val.replace(/(\d)(\d{4})$/, '$1-$2');
                      setTelefone(val);
                    }
                  }}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[#18181A] border border-white/10 rounded-xl p-3.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-300 mb-2">Como deseja receber?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setTipoPedido('entrega')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-colors ${tipoPedido === 'entrega' ? 'bg-brand-500/10 border-brand-500 text-brand-500' : 'bg-[#18181A] border-white/5 text-zinc-400 hover:border-white/10'}`}
                  >
                    <MapPin size={20} />
                    <span className="text-sm font-bold">Entrega</span>
                  </button>
                  <button 
                    onClick={() => setTipoPedido('retirada')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-colors ${tipoPedido === 'retirada' ? 'bg-brand-500/10 border-brand-500 text-brand-500' : 'bg-[#18181A] border-white/5 text-zinc-400 hover:border-white/10'}`}
                  >
                    <ShoppingCart size={20} />
                    <span className="text-sm font-bold">Retirar no balcão</span>
                  </button>
                </div>
              </div>

              {tipoPedido === 'entrega' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-bold text-zinc-300 mb-2">Endereço de entrega</label>
                  <textarea 
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, bairro e ponto de referência"
                    className="w-full bg-[#18181A] border border-white/10 rounded-xl p-3.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-500/50 resize-none h-24"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-zinc-300 mb-2">Forma de pagamento</label>
                <div className="grid grid-cols-2 gap-3">
                  {['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'].map(metodo => (
                    <button 
                      key={metodo}
                      onClick={() => setPagamento(metodo)}
                      className={`p-3 rounded-xl border flex items-center gap-2 transition-colors ${pagamento === metodo ? 'bg-brand-500/10 border-brand-500 text-brand-500' : 'bg-[#18181A] border-white/5 text-zinc-400 hover:border-white/10'}`}
                    >
                      <CreditCard size={16} />
                      <span className="text-sm font-bold">{metodo}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 3 && (
          <div className="p-4 md:p-6 bg-[#18181A] border-t border-white/5 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 font-medium">Total do pedido</span>
              <span className="font-price font-bold text-xl text-white tracking-tight">
                {cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            
            {step === 1 ? (
              <button 
                onClick={() => setStep(2)}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-500/20 active:scale-[0.98]"
              >
                <span>Confirmar Pedido</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(1)}
                  className="px-4 py-4 rounded-xl font-bold text-zinc-400 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleFinalizeOrder}
                  disabled={!isFormValid() || isSubmitting}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 disabled:cursor-not-allowed text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-500/20 active:scale-[0.98]"
                >
                  <span>{isSubmitting ? 'Enviando...' : 'Finalizar Pedido'}</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
