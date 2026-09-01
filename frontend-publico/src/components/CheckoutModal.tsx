import { useState } from 'react';
import { X, Trash2, MapPin, CreditCard, ChevronRight, ShoppingCart, MessageSquare } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useNetwork } from '../contexts/NetworkContext';
import { saveOfflineOrder } from '../services/db';
import api from '../services/api';

interface CheckoutModalProps {
  onClose: () => void;
  lojaAberta?: boolean;
}

export const CheckoutModal = ({ onClose, lojaAberta = true }: CheckoutModalProps) => {
  const { items, cartTotal, removeItem, updateQuantity, updateObservacao, clearCart } = useCart();
  const { isOnline } = useNetwork();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  const [nome, setNome] = useState(localStorage.getItem('user_nome') || '');
  const [telefone, setTelefone] = useState(localStorage.getItem('user_telefone') || '');
  const [tipoPedido, setTipoPedido] = useState<'entrega' | 'retirada'>('entrega');
  const [endereco, setEndereco] = useState(localStorage.getItem('user_endereco') || '');
  const [pagamento, setPagamento] = useState('');
  const [showObsFor, setShowObsFor] = useState<string | null>(null);

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

            localStorage.setItem('user_nome', nome);
      localStorage.setItem('user_telefone', telefone);
      if (tipoPedido === 'entrega') localStorage.setItem('user_endereco', endereco);

      if (!isOnline) {
        await saveOfflineOrder(orderUuid, pedidoData);
      } else {
        try {
          const response = await api.post('/pedidos', pedidoData);
          if (response.data && response.data.id) {
            const saved = JSON.parse(localStorage.getItem('meus_pedidos') || '[]');
            saved.push(response.data.id);
            localStorage.setItem('meus_pedidos', JSON.stringify(saved));
          }
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
      <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl flex flex-col h-[90vh] md:h-[80vh] shadow-2xl shadow-black border border-zinc-200">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-heading font-bold text-zinc-900 tracking-wide">
            {step === 1 ? 'Seu Pedido' : step === 2 ? 'Finalizar Pedido' : 'Pedido Confirmado'}
          </h2>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 p-2 rounded-full hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-4 md:p-6 bg-zinc-50">
          {step === 3 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 space-y-4 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-brand-500/20 text-brand-500 rounded-full flex items-center justify-center mb-4">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 font-heading">Pedido Recebido!</h3>
              <p className="text-zinc-500 max-w-sm">
                Seu pedido já está com a Burger-House. Em breve você receberá atualizações sobre ele no seu WhatsApp!
              </p>
              <button 
                onClick={onClose}
                className="mt-8 w-full max-w-xs bg-brand-500 hover:bg-brand-600 text-zinc-900 p-4 rounded-xl font-bold transition-colors shadow-lg shadow-brand-500/20 active:scale-[0.98]"
              >
                Voltar ao Cardápio
              </button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                  <div className="flex gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-zinc-900 text-sm leading-tight">{item.quantidade}x {item.nome}</h3>
                        <button onClick={() => removeItem(item.id)} className="text-zinc-600 hover:text-red-400">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {item.adicionais.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {item.adicionais.map((add, idx) => (
                            <div key={idx} className="text-xs text-zinc-500 flex items-center gap-1">
                              <span className="text-brand-500">+</span> {add.quantidade}x {add.nome}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 bg-zinc-100 rounded-lg p-1 border border-zinc-200">
                          <button 
                            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-900 rounded-md hover:bg-white/5 transition-colors"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            -
                          </button>
                          <span className="font-bold text-zinc-900 text-sm w-4 text-center">{item.quantidade}</span>
                          <button 
                            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-900 rounded-md hover:bg-white/5 transition-colors"
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
                  
                  {/* Observation toggle and input */}
                  {item.observacao ? (
                    <div className="mt-3">
                      <input 
                        type="text"
                        value={item.observacao}
                        onChange={(e) => updateObservacao(item.id, e.target.value)}
                        placeholder="Ex: Tirar cebola..."
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/50"
                      />
                    </div>
                  ) : showObsFor === item.id ? (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <input 
                        type="text"
                        autoFocus
                        value={item.observacao || ''}
                        onChange={(e) => updateObservacao(item.id, e.target.value)}
                        placeholder="Ex: Tirar cebola, sem salada..."
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/50"
                        onBlur={() => { if (!item.observacao) setShowObsFor(null); }}
                      />
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowObsFor(item.id)}
                      className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-brand-400 transition-colors"
                    >
                      <MessageSquare size={12} />
                      Adicionar observação
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Form */}
              <div>
                <label className="block text-sm font-bold text-zinc-600 mb-2">Qual o seu nome?</label>
                <input 
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-600 mb-2">Seu WhatsApp</label>
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
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-600 mb-2">Como deseja receber?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setTipoPedido('entrega')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-colors ${tipoPedido === 'entrega' ? 'bg-brand-500/10 border-brand-500 text-brand-500' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-200'}`}
                  >
                    <MapPin size={20} />
                    <span className="text-sm font-bold">Entrega</span>
                  </button>
                  <button 
                    onClick={() => setTipoPedido('retirada')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-colors ${tipoPedido === 'retirada' ? 'bg-brand-500/10 border-brand-500 text-brand-500' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-200'}`}
                  >
                    <ShoppingCart size={20} />
                    <span className="text-sm font-bold">Retirar no balcão</span>
                  </button>
                </div>
              </div>

              {tipoPedido === 'entrega' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-bold text-zinc-600 mb-2">Endereço de entrega</label>
                  <textarea 
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, bairro e ponto de referência"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/50 resize-none h-24"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-zinc-600 mb-2">Forma de pagamento</label>
                <div className="grid grid-cols-2 gap-3">
                  {['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'].map(metodo => (
                    <button 
                      key={metodo}
                      onClick={() => setPagamento(metodo)}
                      className={`p-3 rounded-xl border flex items-center gap-2 transition-colors ${pagamento === metodo ? 'bg-brand-500/10 border-brand-500 text-brand-500' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-200'}`}
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
          <div className="p-4 md:p-6 bg-zinc-50 border-t border-zinc-200 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-500 font-medium">Total do pedido</span>
              <span className="font-price font-bold text-xl text-zinc-900 tracking-tight">
                {cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            
            {step === 1 ? (
              <button 
                onClick={() => {
                  if (!lojaAberta) {
                    alert("A loja está fechada. Não é possível realizar pedidos no momento.");
                    return;
                  }
                  setStep(2);
                }}
                disabled={!lojaAberta}
                className={`w-full ${!lojaAberta ? 'bg-zinc-700 cursor-not-allowed' : 'bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20 active:scale-[0.98]'} text-zinc-900 p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors`}
              >
                <span>{!lojaAberta ? 'Loja Fechada' : 'Confirmar Pedido'}</span>
                {lojaAberta && <ChevronRight size={18} />}
              </button>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(1)}
                  className="px-4 py-4 rounded-xl font-bold text-zinc-500 bg-white/5 hover:bg-white/10 hover:text-zinc-900 transition-colors"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleFinalizeOrder}
                  disabled={!isFormValid() || isSubmitting}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 disabled:cursor-not-allowed text-zinc-900 p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-500/20 active:scale-[0.98]"
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
