import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Gift, Clock, Star, Send, CheckSquare, Square, RefreshCw,
  ShieldCheck, XCircle, Sparkles, DollarSign,
  CheckCircle2, Loader2, ArrowLeft
} from 'lucide-react';
import api from '../services/api';

interface ClientTarget {
  nome: string;
  primeiro_nome: string;
  telefone: string;
  telefone_limpo: string;
  chat_id: string;
  saldo_cashback: number;
  total_pedidos: number;
  total_gasto: number;
  ultimo_pedido?: string | null;
  dias_ausente: number;
  tags: string[];
}

interface QueueStatus {
  pending_count: number;
  sent_today: number;
  intervalo_segundos: number;
}

interface FilterCounts {
  total: number;
  cashback: number;
  inactive_15: number;
  inactive_30: number;
  vip_sumido: number;
}

type FilterType = 'cashback' | 'inactive_15' | 'inactive_30' | 'vip_sumido' | 'all';

const TEMPLATES: Record<FilterType, string> = {
  cashback: 'Oi {nome}! Passando para avisar que você tem R$ {saldo} de saldo de cashback esperando por você aqui na BisBurger. Que tal aproveitar hoje no seu jantar? 🛵💨',
  inactive_15: 'Oi {nome}! Faz um tempinho que você não pede aquele BisBurger caprichado 🍔 Que tal aproveitar hoje no seu jantar? 🛵💨',
  inactive_30: 'Oi {nome}! Estamos com saudades de você por aqui na BisBurger! 🍔 Preparamos tudo com muito carinho, bora pedir um lanche hoje? 🛵💨',
  vip_sumido: 'Oi {nome}! Passando para matar a saudade de um dos nossos clientes mais especiais 🍔 Hoje a chapa tá quente, que tal garantir seu burger favorito? 🛵💨',
  all: 'Oi {nome}! Passando para lembrar do seu BisBurger favorito 🍔 Bora garantir seu jantar hoje? 🛵💨',
};

export default function CustomerRecovery({ onBackToInbox }: { onBackToInbox?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [clients, setClients] = useState<ClientTarget[]>([]);
  const [counts, setCounts] = useState<FilterCounts>({ total: 0, cashback: 0, inactive_15: 0, inactive_30: 0, vip_sumido: 0 });
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ pending_count: 0, sent_today: 0, intervalo_segundos: 35 });
  
  const [activeFilter, setActiveFilter] = useState<FilterType>('cashback');
  const [messageTemplate, setMessageTemplate] = useState<string>(TEMPLATES.cashback);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/whatsapp/campaigns/targets');
      setClients(data.clients || []);
      setCounts(data.counts || { total: 0, cashback: 0, inactive_15: 0, inactive_30: 0, vip_sumido: 0 });
      setQueueStatus(data.queue_status || { pending_count: 0, sent_today: 0, intervalo_segundos: 35 });
    } catch (err) {
      console.error('Erro ao carregar clientes para recuperação:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Atualiza status da fila em tempo real caso haja mensagens pendentes
  useEffect(() => {
    if (queueStatus.pending_count === 0) return;
    const timer = setInterval(() => {
      void loadData(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [queueStatus.pending_count, loadData]);

  // Altera o template padrão ao trocar o filtro se o usuário não tiver customizado muito
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setMessageTemplate(TEMPLATES[filter]);
    setSelectedPhones(new Set());
  };

  // Clientes filtrados
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Filtro de categoria
      if (activeFilter === 'cashback' && !c.tags.includes('cashback')) return false;
      if (activeFilter === 'inactive_15' && !c.tags.includes('inactive_15')) return false;
      if (activeFilter === 'inactive_30' && !c.tags.includes('inactive_30')) return false;
      if (activeFilter === 'vip_sumido' && !c.tags.includes('vip_sumido')) return false;

      // Filtro de busca textual
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = c.nome.toLowerCase().includes(query);
        const matchesPhone = c.telefone.includes(query);
        if (!matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [clients, activeFilter, searchTerm]);

  // Selecionar/deselecionar individual
  const toggleSelect = (phone: string) => {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  // Selecionar todos os visíveis
  const selectAll = () => {
    const all = new Set(filteredClients.map((c) => c.telefone_limpo));
    setSelectedPhones(all);
  };

  // Selecionar os primeiros 15 recomendados (lote seguro)
  const selectTop15 = () => {
    const top15 = new Set(filteredClients.slice(0, 15).map((c) => c.telefone_limpo));
    setSelectedPhones(top15);
  };

  const clearSelection = () => {
    setSelectedPhones(new Set());
  };

  // Monta mensagem personalizada para um cliente
  const buildMessage = (client: ClientTarget) => {
    const saldoStr = client.saldo_cashback.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return messageTemplate
      .replace(/{nome}/g, client.primeiro_nome || client.nome.split(' ')[0] || 'Cliente')
      .replace(/{saldo}/g, saldoStr);
  };

  // Primeiro cliente selecionado para a prévia visual
  const previewClient = useMemo(() => {
    if (selectedPhones.size > 0) {
      const firstSelected = clients.find((c) => selectedPhones.has(c.telefone_limpo));
      if (firstSelected) return firstSelected;
    }
    return filteredClients[0] || clients[0] || {
      nome: 'Eduarda Costa',
      primeiro_nome: 'Eduarda',
      telefone: '(82) 99821-8008',
      telefone_limpo: '5582998218008',
      chat_id: '',
      saldo_cashback: 4.50,
      total_pedidos: 5,
      total_gasto: 150,
      dias_ausente: 22,
      tags: ['cashback', 'inactive_15', 'vip_sumido'],
    };
  }, [selectedPhones, clients, filteredClients]);

  // Disparar campanha
  const handleStartCampaign = async () => {
    const selectedClientsList = clients.filter((c) => selectedPhones.has(c.telefone_limpo));
    if (selectedClientsList.length === 0) return;

    setSending(true);
    try {
      const targets = selectedClientsList.map((c) => ({
        telefone: c.telefone_limpo,
        nome: c.nome,
        chat_id: c.chat_id,
        texto: buildMessage(c),
      }));

      await api.post('/whatsapp/campaigns/send', { targets });
      setShowConfirmModal(false);
      setSelectedPhones(new Set());
      await loadData(true);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao iniciar campanha de recuperação.');
    } finally {
      setSending(false);
    }
  };

  // Cancelar envios pendentes
  const handleCancelQueue = async () => {
    if (!window.confirm('Deseja cancelar o envio das mensagens restantes na fila?')) return;
    setCancelling(true);
    try {
      await api.post('/whatsapp/campaigns/cancel');
      await loadData(true);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao cancelar fila.');
    } finally {
      setCancelling(false);
    }
  };

  const selectedCount = selectedPhones.size;
  const estimatedMinutes = Math.ceil((selectedCount * 35) / 60);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-slate-50 p-4 md:p-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            {onBackToInbox && (
              <button
                onClick={onBackToInbox}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                title="Voltar ao Atendimento"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-orange-600">
                <Sparkles size={20} />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                  Recuperação de Clientes
                </h1>
                <p className="text-xs text-slate-500 md:text-sm">
                  Disparo inteligente e humanizado via WhatsApp para reativar clientes e gerar pedidos.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar lista</span>
          </button>
        </div>
      </div>

      {/* Banner de status da fila se houver envios acontecendo */}
      {queueStatus.pending_count > 0 && (
        <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"></span>
            </span>
            <div>
              <strong className="text-sm font-bold text-amber-900">
                Campanha em andamento: {queueStatus.pending_count} mensagem(ns) na fila
              </strong>
              <p className="text-xs text-amber-700">
                Enviando 1 a cada ~35 segundos pelo notebook com WhatsApp conectado. {queueStatus.sent_today} já enviada(s) hoje.
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelQueue}
            disabled={cancelling}
            className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
          >
            <XCircle size={14} />
            <span>Pausar / Cancelar restantes</span>
          </button>
        </div>
      )}

      {/* Cards de Filtros Inteligentes */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Filtro 1: Saldo de Cashback */}
        <button
          onClick={() => handleFilterChange('cashback')}
          className={`relative flex flex-col rounded-2xl p-4 text-left transition-all ${
            activeFilter === 'cashback'
              ? 'border-2 border-emerald-500 bg-emerald-50/70 shadow-sm'
              : 'border border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`grid h-8 w-8 place-items-center rounded-lg ${activeFilter === 'cashback' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
              <Gift size={16} />
            </span>
            <span className="text-xl font-extrabold text-slate-800">{counts.cashback}</span>
          </div>
          <strong className="mt-3 text-xs font-bold text-slate-900 sm:text-sm">Cashback Parado</strong>
          <span className="text-[11px] text-slate-500">Clientes com saldo acumulado</span>
        </button>

        {/* Filtro 2: Inativos +15 dias */}
        <button
          onClick={() => handleFilterChange('inactive_15')}
          className={`relative flex flex-col rounded-2xl p-4 text-left transition-all ${
            activeFilter === 'inactive_15'
              ? 'border-2 border-amber-500 bg-amber-50/70 shadow-sm'
              : 'border border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`grid h-8 w-8 place-items-center rounded-lg ${activeFilter === 'inactive_15' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
              <Clock size={16} />
            </span>
            <span className="text-xl font-extrabold text-slate-800">{counts.inactive_15}</span>
          </div>
          <strong className="mt-3 text-xs font-bold text-slate-900 sm:text-sm">Sem pedir há +15 dias</strong>
          <span className="text-[11px] text-slate-500">Compraram mas esfriaram</span>
        </button>

        {/* Filtro 3: Inativos +30 dias */}
        <button
          onClick={() => handleFilterChange('inactive_30')}
          className={`relative flex flex-col rounded-2xl p-4 text-left transition-all ${
            activeFilter === 'inactive_30'
              ? 'border-2 border-red-500 bg-red-50/70 shadow-sm'
              : 'border border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`grid h-8 w-8 place-items-center rounded-lg ${activeFilter === 'inactive_30' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'}`}>
              <Clock size={16} />
            </span>
            <span className="text-xl font-extrabold text-slate-800">{counts.inactive_30}</span>
          </div>
          <strong className="mt-3 text-xs font-bold text-slate-900 sm:text-sm">Sem pedir há +30 dias</strong>
          <span className="text-[11px] text-slate-500">Em risco de esquecer a loja</span>
        </button>

        {/* Filtro 4: VIPs Sumidos */}
        <button
          onClick={() => handleFilterChange('vip_sumido')}
          className={`relative flex flex-col rounded-2xl p-4 text-left transition-all ${
            activeFilter === 'vip_sumido'
              ? 'border-2 border-orange-500 bg-orange-50/70 shadow-sm'
              : 'border border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`grid h-8 w-8 place-items-center rounded-lg ${activeFilter === 'vip_sumido' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'}`}>
              <Star size={16} />
            </span>
            <span className="text-xl font-extrabold text-slate-800">{counts.vip_sumido}</span>
          </div>
          <strong className="mt-3 text-xs font-bold text-slate-900 sm:text-sm">VIPs Sumidos</strong>
          <span className="text-[11px] text-slate-500">3+ compras, ausentes +20d</span>
        </button>
      </div>

      {/* Seção Central: Editor de Mensagem e Prévia no WhatsApp */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Editor de Mensagem */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">Mensagem que será enviada</h2>
            <div className="flex gap-1.5 text-[11px] text-slate-500">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700">{'{nome}'}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700">{'{saldo}'}</span>
            </div>
          </div>

          <textarea
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            rows={4}
            className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:bg-white"
            placeholder="Digite a mensagem personalizada..."
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-600" />
              <span>Intervalo seguro: <strong>1 mensagem a cada 35 segundos</strong></span>
            </div>
            <button
              onClick={() => setMessageTemplate(TEMPLATES[activeFilter])}
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              Restaurar texto padrão deste filtro
            </button>
          </div>
        </div>

        {/* Prévia do WhatsApp */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#efeae2] p-5 shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between border-b border-black/5 pb-2">
            <span className="text-xs font-bold text-slate-700">Prévia no WhatsApp</span>
            <span className="text-[11px] text-slate-500">Para: <strong>{previewClient.nome}</strong></span>
          </div>

          <div className="my-3 flex justify-end">
            <div className="max-w-[92%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3.5 py-2.5 shadow-sm">
              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-800 sm:text-sm">
                {buildMessage(previewClient)}
              </p>
              <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                <span>Agora</span>
                <CheckCircle2 size={11} className="text-blue-500" />
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500">
            * O nome e o saldo de cashback serão preenchidos automaticamente para cada pessoa.
          </div>
        </div>
      </div>

      {/* Lista de Clientes com Seleção */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <CheckSquare size={14} /> Selecionar todos ({filteredClients.length})
            </button>
            <button
              onClick={selectTop15}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <Sparkles size={14} /> Selecionar primeiros 15 (Lote seguro)
            </button>
            {selectedCount > 0 && (
              <button
                onClick={clearSelection}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Limpar seleção
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Tabela de Destinatários */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="w-10 p-3 text-center">Sel.</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">Último Pedido</th>
                <th className="p-3">Histórico</th>
                <th className="p-3">Cashback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Loader2 size={24} className="mx-auto mb-2 animate-spin text-brand-500" />
                    Carregando clientes para recuperação...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = selectedPhones.has(client.telefone_limpo);
                  return (
                    <tr
                      key={client.telefone_limpo}
                      onClick={() => toggleSelect(client.telefone_limpo)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-orange-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(client.telefone_limpo);
                          }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          {isSelected ? (
                            <CheckSquare size={17} className="text-brand-600" />
                          ) : (
                            <Square size={17} />
                          )}
                        </button>
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <strong>{client.nome}</strong>
                          {client.tags.includes('vip_sumido') && (
                            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                              VIP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{client.telefone}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            client.dias_ausente >= 30
                              ? 'bg-red-100 text-red-700'
                              : client.dias_ausente >= 15
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {client.dias_ausente === 0 ? 'Comprou hoje' : `${client.dias_ausente} dias atrás`}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {client.total_pedidos} pedido(s) • R$ {client.total_gasto.toFixed(2)}
                      </td>
                      <td className="p-3 font-semibold">
                        {client.saldo_cashback > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            <DollarSign size={11} /> R$ {client.saldo_cashback.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Ação Fixa / Inferior */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-600">
            <strong>{selectedCount}</strong> cliente(s) selecionado(s).
            {selectedCount > 0 && (
              <span className="ml-1 text-slate-500">
                (Tempo de disparo seguro: ~{estimatedMinutes} min)
              </span>
            )}
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={selectedCount === 0 || queueStatus.pending_count > 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-brand transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={15} />
            <span>Disparar para {selectedCount} selecionado(s)</span>
          </button>
        </div>
      </div>

      {/* Modal de Confirmação do Disparo */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => !sending && setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-600">
                <Send size={22} />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Iniciar Disparo Controlado?</h3>
                <p className="text-xs text-slate-500">
                  {selectedCount} cliente(s) receberão sua mensagem.
                </p>
              </div>
            </div>

            <div className="mb-5 space-y-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Total de destinatários:</span>
                <strong>{selectedCount} clientes</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Intervalo entre envios:</span>
                <strong>~35 segundos por cliente</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tempo total estimado:</span>
                <strong>~{estimatedMinutes} minutos</strong>
              </div>
              <div className="border-t border-slate-200 pt-2 text-[11px] leading-relaxed text-slate-500">
                🛡️ <strong>100% Seguro:</strong> As mensagens serão despachadas de forma pausada diretamente pelo seu notebook para simular atendimento humano real e evitar bloqueios.
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={sending}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={handleStartCampaign}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white shadow-brand transition hover:bg-brand-600 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Iniciando...</span>
                  </>
                ) : (
                  <span>Sim, Iniciar Disparos</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
