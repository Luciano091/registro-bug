import { useEffect, useState } from 'react';
import { AlertCircle, Edit2, Loader2, Plus, Save, TicketPercent, X } from 'lucide-react';
import api from '../services/api';

const empty = {
  id: 0,
  codigo: '',
  descricao: '',
  tipo: 'percentual',
  valor: '',
  pedido_minimo: '',
  inicio: '',
  fim: '',
  limite_usos: '',
  ativo: true,
  usos: 0,
  reiniciar_usos: false,
};

export default function CouponsModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setItems((await api.get('/cupons')).data);
    } catch {
      setError('Não foi possível carregar os cupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const edit = (item?: any) => {
    setForm(
      item
        ? {
            ...item,
            valor: String(item.valor),
            pedido_minimo: String(item.pedido_minimo || ''),
            limite_usos: item.limite_usos ? String(item.limite_usos) : '',
            inicio: item.inicio?.slice(0, 16) || '',
            fim: item.fim?.slice(0, 16) || '',
            reiniciar_usos: false,
          }
        : empty
    );
    setEditing(true);
    setError('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      codigo: form.codigo.trim().toUpperCase(),
      descricao: form.descricao || null,
      tipo: form.tipo,
      valor: Number(form.valor),
      pedido_minimo: Number(form.pedido_minimo) || 0,
      inicio: form.inicio || null,
      fim: form.fim || null,
      limite_usos: form.limite_usos ? Number(form.limite_usos) : null,
      ativo: form.ativo,
      reiniciar_usos: Boolean(form.reiniciar_usos),
    };
    try {
      if (form.id) await api.put(`/cupons/${form.id}`, payload);
      else await api.post('/cupons', payload);
      setEditing(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Não foi possível salvar o cupom.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-900/60 backdrop-blur-sm p-3 md:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl rounded-2xl md:rounded-3xl bg-white shadow-2xl border border-slate-200/80 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-5 py-4 md:px-6 md:py-4.5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
          <div className="min-w-0 pr-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-200/60 mb-1">
              <TicketPercent size={13} /> Campanhas de desconto
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-heading leading-tight truncate">
              Cupons de Desconto
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Crie códigos promocionais para seus clientes utilizarem no checkout.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            title="Fechar"
            type="button"
          >
            <X size={20} />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 space-y-4 custom-scrollbar">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {editing ? (
            <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 font-heading">
                  {form.id ? 'Editar cupom' : 'Novo cupom'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Voltar para lista
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código do cupom *
                  </label>
                  <input
                    required
                    value={form.codigo}
                    onChange={(event) =>
                      setForm({ ...form, codigo: event.target.value.toUpperCase() })
                    }
                    placeholder="PRIMEIRACOMPRA"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm font-bold uppercase text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição (opcional)
                  </label>
                  <input
                    value={form.descricao}
                    onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                    placeholder="Ex.: 10% na primeira compra"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-700">
                  Tipo de desconto
                  <select
                    value={form.tipo}
                    onChange={(event) => setForm({ ...form, tipo: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
                  >
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor fixo (R$)</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Valor do desconto *
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      {form.tipo === 'percentual' ? '%' : 'R$'}
                    </span>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.valor}
                      onChange={(event) => setForm({ ...form, valor: event.target.value })}
                      placeholder="0,00"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
                    />
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-700">
                  Pedido mínimo (R$)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.pedido_minimo}
                    onChange={(event) => setForm({ ...form, pedido_minimo: event.target.value })}
                    placeholder="0,00 (sem mínimo)"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Limite total de usos
                  <input
                    type="number"
                    min="1"
                    value={form.limite_usos}
                    onChange={(event) => setForm({ ...form, limite_usos: event.target.value })}
                    placeholder="Sem limite"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  Válido a partir de
                  <input
                    type="datetime-local"
                    value={form.inicio}
                    onChange={(event) => setForm({ ...form, inicio: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Válido até
                  <input
                    type="datetime-local"
                    value={form.fim}
                    onChange={(event) => setForm({ ...form, fim: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(event) => setForm({ ...form, ativo: event.target.checked })}
                  className="rounded accent-brand-500 w-4 h-4 cursor-pointer"
                />
                <span>Cupom ativo</span>
              </label>

              {form.id > 0 && form.usos > 0 && (
                <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 rounded accent-brand-500 w-4 h-4 cursor-pointer"
                    checked={form.reiniciar_usos}
                    onChange={(event) =>
                      setForm({ ...form, reiniciar_usos: event.target.checked })
                    }
                  />
                  <span>
                    <strong className="block font-bold">Reiniciar contador de usos</strong>
                    Zera os {form.usos} usos anteriores ao salvar, permitindo reabrir a campanha com este código.
                  </span>
                </label>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="premium-btn px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-brand-500/20 active:scale-95 transition-all !text-white"
                >
                  {saving ? (
                    <Loader2 className="animate-spin !text-white" size={16} />
                  ) : (
                    <Save size={16} className="!text-white" />
                  )}
                  <span className="!text-white">Salvar cupom</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="font-bold text-sm text-slate-800">
                  Cupons cadastrados ({items.length})
                </h3>
                <button
                  onClick={() => edit()}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-brand-600 border border-orange-200/60 px-3.5 py-2 text-xs font-bold transition-colors"
                >
                  <Plus size={15} /> Novo cupom
                </button>
              </div>

              {loading ? (
                <div className="grid place-items-center py-16 text-slate-400">
                  <Loader2 className="animate-spin text-brand-500" size={28} />
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((item) => {
                    const exhausted = item.limite_usos != null && item.usos >= item.limite_usos;
                    return (
                      <div
                        key={item.id}
                        onClick={() => edit(item)}
                        className="group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-400 hover:shadow-xs"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-brand-600 bg-orange-50 border border-orange-200/70 px-2.5 py-0.5 rounded-lg tracking-wider">
                              {item.codigo}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                !item.ativo
                                  ? 'bg-slate-100 text-slate-500 border border-slate-200/80'
                                  : exhausted
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {!item.ativo ? 'Inativo' : exhausted ? 'Esgotado' : 'Ativo'}
                            </span>
                          </div>

                          <p className="mt-1.5 text-xs text-slate-700 font-semibold">
                            {item.tipo === 'percentual'
                              ? `${item.valor}% de desconto`
                              : `${Number(item.valor).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })} de desconto`}
                            {item.pedido_minimo > 0 && (
                              <span className="text-slate-500 font-normal">
                                {' '}
                                · Pedido mín.{' '}
                                {Number(item.pedido_minimo).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </span>
                            )}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {item.usos}
                            {item.limite_usos ? `/${item.limite_usos}` : ''} usos realizados
                            {item.descricao && ` · ${item.descricao}`}
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            edit(item);
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                          title="Editar cupom"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    );
                  })}

                  {!items.length && (
                    <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500 bg-white">
                      Nenhum cupom cadastrado. Clique em "Novo cupom" para criar uma promoção.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
