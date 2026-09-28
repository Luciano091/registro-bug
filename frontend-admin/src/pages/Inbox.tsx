import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft, Bot, CheckCheck, Clock3, MessageCircle, Phone, RefreshCw,
  Search, Send, UserRound, Wifi, WifiOff,
} from 'lucide-react';
import api from '../services/api';

type Gateway = {
  online: boolean;
  connection: string;
  connected_number?: string | null;
  needs_qr: boolean;
  last_seen_at?: string | null;
};

type Conversation = {
  id: number;
  chat_id: string;
  telefone?: string | null;
  nome?: string | null;
  atendimento_modo: 'bot' | 'human';
  handoff_requested: boolean;
  nao_lidas: number;
  ultima_mensagem?: string | null;
  ultima_interacao: string;
};

type Message = {
  id: number;
  direcao: 'in' | 'out';
  remetente: 'cliente' | 'bot' | 'humano';
  texto: string;
  status: string;
  criado_em: string;
  erro?: string | null;
};

type ConversationDetail = Conversation & { mensagens: Message[] };

const formatTime = (value?: string | null) => value
  ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  : '--:--';

const displayPhone = (conversation: Conversation) => {
  const number = conversation.telefone || conversation.chat_id.split('@')[0];
  return number.length > 15 ? 'Contato do WhatsApp' : `+${number}`;
};

export default function Inbox() {
  const [gateway, setGateway] = useState<Gateway>({ online: false, connection: 'offline', needs_qr: false });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadInbox = useCallback(async () => {
    try {
      const { data } = await api.get('/whatsapp/inbox');
      setGateway(data.gateway);
      setConversations(data.conversations || []);
      setSelectedId(current => current ?? data.conversations?.[0]?.id ?? null);
      setError(null);
    } catch {
      setError('Não foi possível atualizar as conversas.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (id: number) => {
    try {
      const { data } = await api.get(`/whatsapp/inbox/${id}`);
      setSelected(data);
      if (data.nao_lidas > 0) {
        await api.post(`/whatsapp/inbox/${id}/read`);
        setConversations(items => items.map(item => item.id === id ? { ...item, nao_lidas: 0 } : item));
      }
    } catch {
      setError('Não foi possível abrir esta conversa.');
    }
  }, []);

  useEffect(() => {
    void loadInbox();
    const timer = window.setInterval(() => void loadInbox(), 4000);
    return () => window.clearInterval(timer);
  }, [loadInbox]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    void loadConversation(selectedId);
    const timer = window.setInterval(() => void loadConversation(selectedId), 2500);
    return () => window.clearInterval(timer);
  }, [loadConversation, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.mensagens.length]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return conversations;
    return conversations.filter(item =>
      `${item.nome || ''} ${item.telefone || ''} ${item.ultima_mensagem || ''}`.toLowerCase().includes(normalized),
    );
  }, [conversations, query]);

  const updateMode = async (mode: 'bot' | 'human') => {
    if (!selected) return;
    await api.post(`/whatsapp/inbox/${selected.id}/mode`, { modo: mode });
    setSelected(current => current ? {
      ...current,
      atendimento_modo: mode,
      handoff_requested: mode === 'human',
    } : current);
    await loadInbox();
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!selected || !text || sending) return;
    setSending(true);
    try {
      await api.post(`/whatsapp/inbox/${selected.id}/messages`, { texto: text });
      setDraft('');
      await loadConversation(selected.id);
      await loadInbox();
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] min-h-[620px] overflow-hidden bg-slate-100 md:h-screen">
      <section className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-slate-200 bg-white md:w-[360px] md:min-w-[320px]`}>
        <header className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900"><MessageCircle className="text-emerald-600" size={21} /> WhatsApp</h1>
              <p className="mt-0.5 text-xs text-slate-500">Atendimento dentro da Ritmesa</p>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${gateway.online ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {gateway.online ? <Wifi size={13} /> : <WifiOff size={13} />}
              {gateway.online ? 'Conectado' : gateway.needs_qr ? 'Ler QR Code' : 'Offline'}
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar conversa..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-sm outline-none focus:border-brand-400" />
            <button onClick={() => void loadInbox()} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Atualizar"><RefreshCw size={15} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {loading ? <p className="p-6 text-center text-sm text-slate-400">Carregando conversas...</p> : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400"><MessageCircle className="mx-auto mb-3 opacity-30" size={38} /><p className="text-sm">Nenhuma conversa recebida.</p></div>
          ) : filtered.map(item => (
            <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${selectedId === item.id ? 'bg-orange-50/70' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold ${item.handoff_requested ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{(item.nome || 'C')[0].toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-slate-900">{item.nome || 'Cliente do WhatsApp'}</strong><span className="shrink-0 text-[11px] text-slate-400">{formatTime(item.ultima_interacao)}</span></div>
                  <div className="mt-1 flex items-center justify-between gap-2"><p className="truncate text-xs text-slate-500">{item.ultima_mensagem || 'Nova conversa'}</p>{item.nao_lidas > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">{item.nao_lidas}</span>}</div>
                  {item.handoff_requested && <span className="mt-2 inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">Aguardando atendente</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selected ? (
        <section className={`${selectedId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-[#efeae2]`}>
          <header className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setSelectedId(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Voltar"><ArrowLeft size={20} /></button>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{(selected.nome || 'C')[0].toUpperCase()}</div>
              <div className="min-w-0"><strong className="block truncate text-sm text-slate-900 sm:text-base">{selected.nome || 'Cliente do WhatsApp'}</strong><span className="block truncate text-xs text-slate-500">{displayPhone(selected)}</span></div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selected.telefone && <a href={`tel:+${selected.telefone}`} className="hidden rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 sm:block" aria-label="Ligar"><Phone size={18} /></a>}
              {selected.atendimento_modo === 'human' ? (
                <button onClick={() => void updateMode('bot')} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"><Bot size={16} /> <span className="hidden sm:inline">Devolver ao robô</span></button>
              ) : (
                <button onClick={() => void updateMode('human')} className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-orange-600"><UserRound size={16} /> <span className="hidden sm:inline">Assumir atendimento</span></button>
              )}
            </div>
          </header>

          {!gateway.online && <div className="flex items-center justify-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700"><WifiOff size={14} /> O notebook do WhatsApp está offline. Mensagens ficarão na fila.</div>}
          {selected.handoff_requested && <div className="flex items-center justify-center gap-2 border-b border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-800"><UserRound size={14} /> O cliente pediu atendimento humano.</div>}

          <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
            {selected.mensagens.map(message => {
              const outgoing = message.direcao === 'out';
              return (
                <div key={message.id} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[70%] ${outgoing ? 'rounded-tr-sm bg-[#d9fdd3]' : 'rounded-tl-sm bg-white'}`}>
                    {outgoing && <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-emerald-700">{message.remetente === 'bot' ? 'Robô' : 'Atendente'}</span>}
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{message.texto}</p>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400"><span>{formatTime(message.criado_em)}</span>{outgoing && (message.status === 'queued' || message.status === 'dispatching' ? <Clock3 size={11} /> : <CheckCheck className={message.status === 'sent' ? 'text-blue-500' : 'text-red-500'} size={13} />)}</div>
                    {message.erro && <p className="mt-1 text-[10px] text-red-600">Falha: {message.erro}</p>}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3 sm:p-4">
            <textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Digite sua mensagem..." rows={1} className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-400" />
            <button disabled={!draft.trim() || sending} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Enviar"><Send size={19} /></button>
          </form>
        </section>
      ) : (
        <section className="hidden flex-1 items-center justify-center bg-slate-100 md:flex"><div className="text-center text-slate-400"><MessageCircle className="mx-auto mb-3 opacity-25" size={52} /><p>Selecione uma conversa.</p></div></section>
      )}

      {error && <button onClick={() => setError(null)} className="fixed bottom-6 right-6 z-50 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-xl">{error}</button>}
    </div>
  );
}
