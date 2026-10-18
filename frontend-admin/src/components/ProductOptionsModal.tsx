import { useEffect, useState } from 'react';
import { AlertCircle, Check, Edit2, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import api from '../services/api';

type Option = {
  id?: number;
  nome: string;
  preco_adicional: number;
  ativo: boolean;
  ordem: number;
  produto_vinculado_id?: number | null;
};

type Group = {
  id: number;
  nome: string;
  minimo: number;
  maximo: number;
  obrigatorio: boolean;
  ativo: boolean;
  ordem: number;
  opcoes: Option[];
};

const emptyForm = () => ({
  id: 0,
  nome: '',
  minimo: 0,
  maximo: 1,
  obrigatorio: false,
  ativo: true,
  ordem: 0,
  opcoes: [{ nome: '', preco_adicional: 0, ativo: true, ordem: 0, produto_vinculado_id: null }],
});

export default function ProductOptionsModal({
  product,
  onClose,
  onSaved,
}: {
  product: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<number[]>((product.grupos_opcoes || []).map((group: Group) => group.id));
  const [form, setForm] = useState<any>(emptyForm());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);

  const load = async () => {
    try {
      const [{ data: groupData }, { data: productData }] = await Promise.all([
        api.get('/grupos-opcoes'),
        api.get('/produtos'),
      ]);
      setGroups(groupData);
      setAllProducts(productData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Não foi possível carregar os grupos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const edit = (group?: Group) => {
    setForm(group ? { ...group, opcoes: group.opcoes.map((option) => ({ ...option })) } : emptyForm());
    setEditing(true);
    setError('');
  };

  const updateOption = (index: number, key: string, value: string | number | null) =>
    setForm((current: any) => ({
      ...current,
      opcoes: current.opcoes.map((option: Option, idx: number) =>
        idx === index ? { ...option, [key]: value } : option
      ),
    }));

  const saveGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      opcoes: form.opcoes
        .filter((option: Option) => option.nome.trim())
        .map((option: Option, index: number) => ({
          nome: option.nome,
          preco_adicional: Number(option.preco_adicional) || 0,
          ativo: option.ativo,
          ordem: index,
          produto_vinculado_id: option.produto_vinculado_id || null,
        })),
    };

    if (!payload.opcoes.length) {
      setError('Adicione pelo menos uma opção.');
      setSaving(false);
      return;
    }

    try {
      if (form.id) await api.put(`/grupos-opcoes/${form.id}`, payload);
      else await api.post('/grupos-opcoes', payload);
      setEditing(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Não foi possível salvar o grupo.');
    } finally {
      setSaving(false);
    }
  };

  const removeGroup = async (group: Group) => {
    if (!window.confirm(`Excluir o grupo “${group.nome}”?`)) return;
    try {
      await api.delete(`/grupos-opcoes/${group.id}`);
      setSelected((ids) => ids.filter((id) => id !== group.id));
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Não foi possível excluir o grupo.');
    }
  };

  const saveAssignment = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/produtos/${product.id}/grupos-opcoes`, { grupo_ids: selected });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Não foi possível vincular os grupos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/60 backdrop-blur-sm p-3 md:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl rounded-2xl md:rounded-3xl bg-white shadow-2xl border border-slate-200/80 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-5 py-4 md:px-6 md:py-4.5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
          <div className="min-w-0 pr-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-200/60 mb-1">
              Personalização do produto
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-heading leading-tight truncate">
              {product.nome}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Vincule tamanhos, sabores, pontos e adicionais para este produto.
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 space-y-4 custom-scrollbar">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {editing ? (
            <form onSubmit={saveGroup} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 font-heading">
                  {form.id ? 'Editar grupo de opções' : 'Novo grupo de opções'}
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
                  Nome do grupo *
                </label>
                <input
                  required
                  value={form.nome}
                  onChange={(event) => setForm({ ...form, nome: event.target.value })}
                  placeholder="Ex.: Escolha o ponto da carne, Molhos, Adicionais..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-700">
                  Mínimo de escolhas
                  <input
                    type="number"
                    min="0"
                    value={form.minimo}
                    onChange={(event) => setForm({ ...form, minimo: Number(event.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Máximo de escolhas
                  <input
                    type="number"
                    min="1"
                    value={form.maximo}
                    onChange={(event) => setForm({ ...form, maximo: Number(event.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.obrigatorio}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      obrigatorio: event.target.checked,
                      minimo: event.target.checked && form.minimo === 0 ? 1 : form.minimo,
                    })
                  }
                  className="rounded accent-brand-500 w-4 h-4 cursor-pointer"
                />
                <span>Escolha obrigatória no pedido</span>
              </label>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Itens / Opções deste grupo
                  </span>
                </div>

                {form.opcoes.map((option: Option, index: number) => (
                  <div key={index} className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        required
                        value={option.nome}
                        onChange={(event) => updateOption(index, 'nome', event.target.value)}
                        placeholder="Nome da opção (Ex.: Bacon Extra)"
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500"
                      />
                      <div className="relative w-36 shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          R$
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={option.preco_adicional}
                          onChange={(event) =>
                            updateOption(index, 'preco_adicional', Number(event.target.value))
                          }
                          placeholder="0,00"
                          className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 tabular-nums"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current: any) => ({
                            ...current,
                            opcoes: current.opcoes.filter((_: Option, idx: number) => idx !== index),
                          }))
                        }
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="Remover opção"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <select
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-brand-500"
                      value={option.produto_vinculado_id || ''}
                      onChange={(e) =>
                        updateOption(
                          index,
                          'produto_vinculado_id',
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    >
                      <option value="">Nenhum produto vinculado ao estoque (Texto livre)</option>
                      {allProducts
                        .filter((p) => !p.is_combo)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setForm((current: any) => ({
                      ...current,
                      opcoes: [
                        ...current.opcoes,
                        {
                          nome: '',
                          preco_adicional: 0,
                          ativo: true,
                          ordem: current.opcoes.length,
                          produto_vinculado_id: null,
                        },
                      ],
                    }))
                  }
                  className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 py-1 transition-colors"
                >
                  <Plus size={15} /> Adicionar outra opção
                </button>
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
                  <span className="!text-white">Salvar grupo</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="font-bold text-sm text-slate-800">
                  Grupos de opções disponíveis
                </h3>
                <button
                  onClick={() => edit()}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-brand-600 border border-orange-200/60 px-3.5 py-2 text-xs font-bold transition-colors"
                >
                  <Plus size={15} /> Criar grupo
                </button>
              </div>

              {loading ? (
                <div className="grid place-items-center py-16 text-slate-400">
                  <Loader2 className="animate-spin text-brand-500" size={28} />
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => {
                    const checked = selected.includes(group.id);
                    return (
                      <div
                        key={group.id}
                        className={`rounded-2xl border p-4 transition-all ${
                          checked
                            ? 'border-brand-500/60 bg-orange-50/30 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setSelected((ids) =>
                                checked ? ids.filter((id) => id !== group.id) : [...ids, group.id]
                              )
                            }
                            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-all cursor-pointer ${
                              checked
                                ? 'border-brand-500 bg-brand-500 text-white shadow-xs'
                                : 'border-slate-300 bg-white hover:border-slate-400'
                            }`}
                          >
                            {checked && <Check size={14} strokeWidth={3} className="text-white" />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <strong className="text-sm font-bold text-slate-900 truncate">
                                {group.nome}
                              </strong>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  group.obrigatorio
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                                }`}
                              >
                                {group.obrigatorio ? 'Obrigatório' : 'Opcional'}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {group.minimo} a {group.maximo} escolhas · {group.opcoes.length}{' '}
                              {group.opcoes.length === 1 ? 'opção' : 'opções'}
                            </p>

                            {group.opcoes.length > 0 && (
                              <p className="mt-2 text-xs text-slate-500 truncate">
                                {group.opcoes
                                  .map(
                                    (option) =>
                                      `${option.nome}${
                                        option.preco_adicional > 0
                                          ? ` (+R$ ${Number(option.preco_adicional)
                                              .toFixed(2)
                                              .replace('.', ',')})`
                                          : ''
                                      }`
                                  )
                                  .join(' · ')}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => edit(group)}
                              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Editar grupo"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => removeGroup(group)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Excluir grupo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {!groups.length && (
                    <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500 bg-white">
                      Nenhum grupo de opções cadastrado. Clique em "Criar grupo" para começar.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!editing && (
          <footer className="px-5 py-3.5 md:px-6 md:py-4 bg-white border-t border-slate-100 flex items-center justify-between gap-4 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
            <div className="text-xs text-slate-500">
              <strong className="text-slate-900 font-bold">{selected.length}</strong>{' '}
              {selected.length === 1 ? 'grupo vinculado' : 'grupos vinculados'} a este produto
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveAssignment}
                disabled={saving}
                className="premium-btn px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-brand-500/20 active:scale-95 transition-all !text-white"
              >
                {saving ? (
                  <Loader2 className="animate-spin !text-white" size={16} />
                ) : (
                  <Check size={16} className="!text-white" />
                )}
                <span className="!text-white">Aplicar ao produto</span>
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
