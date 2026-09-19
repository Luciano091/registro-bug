import { useState, useEffect } from 'react';
import { Search, MessageSquare, Send, Phone, MoreVertical, CheckCheck, AlertCircle, Bot } from 'lucide-react';
import api from '../services/api';

const statusColors: any = {
  'novo': 'bg-emerald-500 text-white',
  'recebido': 'bg-emerald-500 text-white',
  'enviado': 'bg-emerald-500 text-white',
  'em_preparo': 'bg-amber-500 text-white',
  'pronto': 'bg-blue-500 text-white',
  'servido': 'bg-slate-500 text-white',
  'entregue': 'bg-slate-500 text-white',
};
const statusLabels: any = {
  'novo': 'Nova',
  'recebido': 'Nova',
  'enviado': 'Nova',
  'em_preparo': 'Em preparo',
  'pronto': 'Pronto',
  'servido': 'Entregue',
  'entregue': 'Entregue',
};

export default function Inbox() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/pedidos').then(res => {
      setPedidos(res.data);
      if (res.data.length > 0) setSelectedPedido(res.data[0]);
    }).finally(() => setLoading(false));
  }, []);

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#f0f2f5]">
      {/* Sidebar List */}
      <div className="w-1/3 min-w-[300px] bg-white flex flex-col border-r border-slate-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-500 p-2 rounded-xl text-white">
              <MessageSquare size={20} />
            </div>
            <h2 className="font-bold text-slate-800">Atendimento AI</h2>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">IA Ativa</span>
          </div>
        </div>
        
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input placeholder="Pesquisar cliente..." className="w-full bg-slate-100 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 ring-brand-500/20" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-slate-400 text-sm">Carregando conversas...</div>
          ) : pedidos.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">Nenhum pedido hoje.</div>
          ) : (
            pedidos.map(pedido => (
              <div 
                key={pedido.id} 
                onClick={() => setSelectedPedido(pedido)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${selectedPedido?.id === pedido.id ? 'bg-slate-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <strong className="text-slate-800 text-sm truncate pr-2">{pedido.cliente_nome || 'Cliente avulso'}</strong>
                  <span className="text-xs text-slate-400 shrink-0">{formatTime(pedido.data)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-slate-500 truncate max-w-[60%]">
                    {pedido.itens?.length ? `${pedido.itens[0].produto_nome}...` : 'Pedido via sistema'}
                  </p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[pedido.status] || 'bg-slate-200 text-slate-600'}`}>
                    {statusLabels[pedido.status] || pedido.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedPedido ? (
        <div className="flex-1 flex flex-col bg-[#efeae2] relative">
          {/* Top Bar */}
          <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold shrink-0">
                {(selectedPedido.cliente_nome || 'C')[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <strong className="block text-slate-800 truncate">{selectedPedido.cliente_nome || 'Cliente avulso'}</strong>
                <span className="text-xs text-slate-500 truncate">{selectedPedido.telefone || 'Sem telefone'} • Pedido #{selectedPedido.id}</span>
              </div>
            </div>
            <div className="flex gap-4 text-slate-400 shrink-0">
              <Phone size={20} className="cursor-pointer hover:text-slate-600 hidden sm:block" />
              <MoreVertical size={20} className="cursor-pointer hover:text-slate-600" />
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-amber-100 text-amber-800 text-xs px-4 py-2 flex items-center justify-center gap-2 border-b border-amber-200 z-10">
            <AlertCircle size={14} className="shrink-0" />
            <span className="truncate">WhatsApp desconectado. Tela em modo de demonstração.</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex justify-center mb-6">
              <span className="bg-white/60 text-slate-500 text-xs px-3 py-1 rounded-lg shadow-sm">
                Hoje, {formatTime(selectedPedido.data)}
              </span>
            </div>

            {/* Simulated Interaction */}
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm max-w-md">
                <p className="text-sm text-slate-800">
                  Olá! Recebemos seu pedido #{selectedPedido.id} no nosso sistema. <br/><br/>
                  Total: <strong>R$ {selectedPedido.total.toFixed(2)}</strong>.
                </p>
                <div className="text-right mt-1"><span className="text-[10px] text-slate-400">{formatTime(selectedPedido.data)}</span></div>
              </div>
            </div>

            {(selectedPedido.status === 'em_preparo' || selectedPedido.status === 'pronto' || selectedPedido.status === 'servido' || selectedPedido.status === 'entregue') && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm max-w-md">
                  <p className="text-sm text-slate-800">👨‍🍳 Oba! O status do seu pedido mudou para: <strong>{statusLabels[selectedPedido.status]}</strong>!</p>
                  <div className="text-right mt-1"><CheckCheck size={14} className="inline text-blue-500 mr-1" /><span className="text-[10px] text-slate-400">Atualização do KDS</span></div>
                </div>
              </div>
            )}

            {selectedPedido.status === 'entregue' && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm max-w-md">
                  <p className="text-sm text-slate-800">Pedido entregue! Agradecemos a preferência. 🥰</p>
                  <div className="text-right mt-1"><span className="text-[10px] text-slate-400">Mensagem final</span></div>
                </div>
              </div>
            )}

          </div>

          {/* Input Bar */}
          <div className="bg-white p-3 sm:p-4 flex items-center gap-3 shrink-0 z-10">
            <input disabled placeholder="Aguardando conexão com WhatsApp..." className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none cursor-not-allowed" />
            <button disabled className="bg-slate-200 text-slate-400 p-3 rounded-xl cursor-not-allowed shrink-0">
              <Send size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
          <div className="text-center text-slate-400">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
            <p>Selecione um atendimento na lista lateral.</p>
          </div>
        </div>
      )}
    </div>
  );
}
