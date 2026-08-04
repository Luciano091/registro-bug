import { useState, useEffect, useRef } from 'react';
import { Send, Search, User, Clock, Check, CheckCheck, MessageCircle, ShoppingCart } from 'lucide-react';
import api from '../services/api';

import { useAppData } from '../contexts/AppDataContext';
import { useNavigate } from 'react-router-dom';

const renderMessageText = (text: string) => {
  if (!text) return text;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/80 transition-colors">
          {part}
        </a>
      );
    }
    return part;
  });
};

const WhatsApp = () => {
  const { chats, refreshChats, markChatAsRead } = useAppData();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: force an initial refresh if needed, but context already handles polling
    refreshChats();
    markChatAsRead(0); // clear badge when entering screen
  }, [refreshChats, markChatAsRead]);

  useEffect(() => {
    if (selectedChat) {
      const updatedChat = chats.find(c => c.id === selectedChat.id);
      if (updatedChat) setSelectedChat(updatedChat);
    }
  }, [chats]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.mensagens]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;

    const texto = message;
    setMessage('');

    try {
      await api.post(`/whatsapp/send?telefone=${selectedChat.telefone}&texto=${encodeURIComponent(texto)}`);
      // Update locally for optimistic UI
      const newMessage = {
        id: Date.now(),
        direcao: 'out',
        texto: texto,
        data: new Date().toISOString(),
        status: 'sent'
      };
      
      setSelectedChat((prev: any) => ({
        ...prev,
        mensagens: [...prev.mensagens, newMessage]
      }));
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem.');
    }
  };

  const filteredChats = chats.filter(chat => 
    (chat.nome || chat.telefone).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-5rem)] md:h-full max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex h-full bg-dark-950 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
      {/* Sidebar de Chats */}
      <div className="w-1/3 border-r border-white/5 bg-dark-900 flex flex-col min-w-[300px]">
        <div className="p-4 bg-black/20 border-b border-white/5">
          <h2 className="text-xl font-bold text-white mb-4">Mensagens</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar conversa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-dark-800/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-brand-500/50 text-zinc-200"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredChats.map(chat => {
            const lastMessage = chat.mensagens[chat.mensagens.length - 1];
            return (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full text-left p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 ${selectedChat?.id === chat.id ? 'bg-white/10' : ''}`}
              >
                <div className="w-12 h-12 rounded-full bg-dark-800 flex items-center justify-center flex-shrink-0 text-zinc-400">
                  <User size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-sm font-semibold text-zinc-200 truncate">
                      {chat.nome || chat.telefone}
                    </h3>
                    <span className="text-xs text-zinc-500">
                      {lastMessage ? new Date(lastMessage.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">
                    {lastMessage ? (lastMessage.direcao === 'out' ? `Você: ${lastMessage.texto}` : lastMessage.texto) : 'Nenhuma mensagem'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Área Principal de Chat */}
      <div className="flex-1 bg-[#0b141a] flex flex-col relative z-0">
        {selectedChat ? (
          <>
            {/* Header do Chat */}
            <div className="relative z-10 px-6 py-4 bg-dark-900/80 backdrop-blur-md border-b border-white/5 flex items-center gap-4 shadow-md">
              <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-zinc-400 shadow-inner">
                <User size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{selectedChat.nome || selectedChat.telefone}</h3>
                <p className="text-xs text-zinc-400">{selectedChat.telefone}</p>
              </div>
              <button 
                onClick={() => navigate('/novo-pedido', { state: { prefill: { nome: selectedChat.nome || '', telefone: selectedChat.telefone } } })}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-colors ml-auto"
              >
                <ShoppingCart size={18} />
                <span className="hidden sm:inline">Criar Pedido</span>
              </button>
            </div>

            {/* Mensagens */}
            <div ref={scrollContainerRef} className="relative z-10 flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {selectedChat.mensagens.map((msg: any, index: number) => {
                const isOut = msg.direcao === 'out';
                return (
                  <div key={msg.id || index} className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}>
                    <div 
                      className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-lg backdrop-blur-sm ${
                        isOut 
                          ? 'bg-brand-600/90 text-white rounded-tr-none' 
                          : 'bg-dark-800/90 text-zinc-200 border border-white/5 rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{renderMessageText(msg.texto)}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={`text-[10px] ${isOut ? 'text-brand-200' : 'text-zinc-500'}`}>
                          {new Date(msg.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {isOut && (
                          <span className="text-brand-300">
                            {msg.status === 'read' ? <CheckCheck size={12} className="text-blue-300" /> : 
                             msg.status === 'delivered' ? <CheckCheck size={12} /> : 
                             msg.status === 'sent' ? <Check size={12} /> : 
                             <Clock size={12} />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            <div className="relative z-10 p-4 bg-dark-900/80 backdrop-blur-md border-t border-white/5">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-dark-800 border border-white/10 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-brand-500/50 text-zinc-200 shadow-inner"
                />
                <button 
                  type="submit"
                  disabled={!message.trim()}
                  className="bg-brand-500 hover:bg-brand-600 text-white w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-zinc-500">
            <div className="w-24 h-24 rounded-full bg-dark-800/50 flex items-center justify-center mb-4">
              <MessageCircle size={48} className="text-zinc-600" />
            </div>
            <h3 className="text-xl font-medium text-zinc-400">Suas conversas do WhatsApp</h3>
            <p className="text-sm mt-2 max-w-md text-center">
              Selecione um contato na barra lateral para ver o histórico e enviar mensagens pelo número oficial do Burger Hause.
            </p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default WhatsApp;
