import { useEffect, useState } from 'react';
import { AlertCircle, Edit2, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import api from '../services/api';

const weekdays = [
  ['0', 'Seg'],
  ['1', 'Ter'],
  ['2', 'Qua'],
  ['3', 'Qui'],
  ['4', 'Sex'],
  ['5', 'Sáb'],
  ['6', 'Dom'],
];

const empty = {
  id: 0,
  nome: '',
  descricao: '',
  ordem: 0,
  ativo: true,
  dias_semana: '0,1,2,3,4,5,6',
  horario_inicio: '',
  horario_fim: '',
};

export default function CategoriesModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setItems((await api.get('/categorias')).data);
    } catch {
      setError('Não foi possível carregar as categorias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedDays = form.dias_semana.split(',').filter(Boolean);

  const toggleDay = (day: string) =>
    setForm({
      ...form,
      dias_semana: (selectedDays.includes(day)
        ? selectedDays.filter((value: string) => value !== day)
        : [...selectedDays, day]
      )
        .sort()
        .join(','),
    });

  const handleDelete = async (e: any, id: number) => {
    e.stopPropagation();
    if (
      !confirm(
        'Tem certeza que deseja excluir esta categoria definitivamente? Os produtos não serão excluídos; eles serão movidos para a categoria Outros.'
      )
    )
      return;
    try {
      await api.delete(`/categorias/${id}`);
      await load();
      onChanged();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao excluir categoria');
    }
  };

  const edit = (item?: any) => {
    setForm(
      item
        ? {
            ...item,
            horario_inicio: item.horario_inicio || '',
            horario_fim: item.horario_fim || '',
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
    if (!form.dias_semana) {
      setError('Selecione ao menos um dia da semana.');
      setSaving(false);
      return;
    }
    try {
      const payload = {
        ...form,
        horario_inicio: form.horario_inicio || null,
        horario_fim: form.horario_fim || null,
      };
      if (form.id) await api.put(`/categorias/${form.id}`, payload);
      else await api.post('/categorias', payload);
      setEditing(false);
      await load();
      onChanged();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Não foi possível salvar a categoria.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/60 backdrop-blur-sm p-3 md:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl rounded-2xl md:rounded-3xl bg-white shadow-2xl border border-slate-200/80 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-5 py-4 md:px-6 md:py-4.5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
          <div className="min-w-0 pr-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-200/60 mb-1">
              Organização e horários
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-heading leading-tight truncate">
              Categorias do Cardápio
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Organize os produtos em categorias e configure horários de exibição.
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
                  {form.id ? 'Editar categoria' : 'Nova categoria'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Voltar para lista
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da categoria *
                </label>
                <input
                  required
                  value={form.nome}
                  onChange={(event) => setForm({ ...form, nome: event.target.value })}
                  placeholder="Ex.: Hambúrgueres Artesanais, Bebidas, Sobremesas..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={form.descricao || ''}
                  onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                  placeholder="Descrição opcional exibida para os clientes no cardápio..."
                  className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dias disponíveis no cardápio
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {weekdays.map(([id, label]) => {
                    const isSelected = selectedDays.includes(id);
                    return (
                      <button
                        type="button"
                        key={id}
                        onClick={() => toggleDay(id)}
                        className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-brand-500 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-700">
                  Horário de Início
                  <input
                    type="time"
                    value={form.horario_inicio}
                    onChange={(event) =>
                      setForm({ ...form, horario_inicio: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Horário de Término
                  <input
                    type="time"
                    value={form.horario_fim}
                    onChange={(event) =>
                      setForm({ ...form, horario_fim: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="text-xs font-semibold text-slate-700">
                  Ordem de exibição
                  <input
                    type="number"
                    min="0"
                    value={form.ordem}
                    onChange={(event) =>
                      setForm({ ...form, ordem: Number(event.target.value) })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
                  />
                </label>

                <label className="mt-4 flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(event) => setForm({ ...form, ativo: event.target.checked })}
                    className="rounded accent-brand-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Categoria ativa</span>
                </label>
              </div>

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
                  <span className="!text-white">Salvar categoria</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="font-bold text-sm text-slate-800">
                  Categorias cadastradas ({items.length})
                </h3>
                <button
                  onClick={() => edit()}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-brand-600 border border-orange-200/60 px-3.5 py-2 text-xs font-bold transition-colors"
                >
                  <Plus size={15} /> Nova categoria
                </button>
              </div>

              {loading ? (
                <div className="grid place-items-center py-16 text-slate-400">
                  <Loader2 className="animate-spin text-brand-500" size={28} />
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => edit(item)}
                      className="group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-400 hover:shadow-xs"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-bold text-slate-900 truncate">
                            {item.nome}
                          </strong>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              item.ativo
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200/80'
                            }`}
                          >
                            {item.ativo ? 'Ativa' : 'Oculta'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Ordem {item.ordem} ·{' '}
                          {item.horario_inicio && item.horario_fim
                            ? `${item.horario_inicio} às ${item.horario_fim}`
                            : 'Dia inteiro'}
                        </p>
                        {item.descricao && (
                          <p className="mt-1 text-xs text-slate-400 line-clamp-1 italic">
                            {item.descricao}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            edit(item);
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Editar categoria"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, item.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Excluir categoria"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {!items.length && (
                    <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500 bg-white">
                      Nenhuma categoria cadastrada. Clique em "Nova categoria" para começar.
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
