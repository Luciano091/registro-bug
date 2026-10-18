import { useState } from 'react';
import { AlertCircle, Check, Minus, Plus, X } from 'lucide-react';

export interface SelectedOption {
  opcaoId: number;
  grupoId: number;
  grupoNome: string;
  nome: string;
  preco: number;
  quantidade: number;
}

export default function OrderProductOptionsModal({
  product,
  onClose,
  onConfirm,
}: {
  product: any;
  onClose: () => void;
  onConfirm: (options: SelectedOption[]) => void;
}) {
  const groups = (product.grupos_opcoes || []).filter((group: any) => group.ativo !== false);
  const [selected, setSelected] = useState<SelectedOption[]>([]);
  const [error, setError] = useState('');

  const groupCount = (groupId: number) =>
    selected
      .filter((item) => item.grupoId === groupId)
      .reduce((sum, item) => sum + item.quantidade, 0);

  const toggle = (group: any, option: any) => {
    setError('');
    const exists = selected.some((item) => item.opcaoId === option.id);
    if (exists) {
      setSelected((items) => items.filter((item) => item.opcaoId !== option.id));
      return;
    }

    const value: SelectedOption = {
      opcaoId: option.id,
      grupoId: group.id,
      grupoNome: group.nome,
      nome: option.nome,
      preco: option.preco_adicional || 0,
      quantidade: 1,
    };

    if (group.maximo === 1) {
      setSelected((items) => [...items.filter((item) => item.grupoId !== group.id), value]);
    } else if (groupCount(group.id) < group.maximo) {
      setSelected((items) => [...items, value]);
    }
  };

  const changeOptionQuantity = (group: any, optionId: number, delta: number) => {
    setError('');
    setSelected((items) =>
      items.map((item) => {
        if (item.opcaoId !== optionId) return item;
        const next = item.quantidade + delta;
        if (next < 1 || (delta > 0 && groupCount(group.id) >= group.maximo)) return item;
        return { ...item, quantidade: next };
      })
    );
  };

  const confirm = () => {
    for (const group of groups) {
      const minimum = Math.max(group.minimo || 0, group.obrigatorio ? 1 : 0);
      const count = groupCount(group.id);
      if (count < minimum) {
        setError(`Escolha pelo menos ${minimum} opção(ões) em “${group.nome}”.`);
        return;
      }
      if (count > group.maximo) {
        setError(`Escolha no máximo ${group.maximo} opção(ões) em “${group.nome}”.`);
        return;
      }
    }
    onConfirm(selected);
  };

  const basePrice = (product.promocao_ativa && product.preco_promocao ? product.preco_promocao : product.preco) || 0;
  const total = basePrice + selected.reduce((sum, item) => sum + (Number(item.preco) || 0) * item.quantidade, 0);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/60 backdrop-blur-sm p-3 md:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-2xl md:rounded-3xl bg-white shadow-2xl border border-slate-200/80 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-5 py-4 md:px-6 md:py-4.5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-200/60">
                Personalizar item
              </span>
              {product.categoria && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-500 bg-slate-100">
                  {product.categoria}
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-heading leading-tight truncate">
              {product.nome}
            </h2>
            {product.descricao && (
              <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {product.descricao}
              </p>
            )}
            <p className="mt-1.5 text-xs text-slate-500 font-medium">
              Preço base:{' '}
              <span className="text-slate-800 font-bold">
                {basePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
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

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-slate-50/50 custom-scrollbar">
          {groups.map((group: any) => {
            const minimum = Math.max(group.minimo || 0, group.obrigatorio ? 1 : 0);
            const currentCount = groupCount(group.id);
            const isMissingRequired = minimum > 0 && currentCount < minimum;
            const isSatisfied = minimum > 0 && currentCount >= minimum;
            const isSingleChoice = group.maximo === 1;

            return (
              <section
                key={group.id}
                className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-all"
              >
                <header className="flex items-center justify-between px-4 py-3 bg-slate-50/90 border-b border-slate-100 gap-2">
                  <div className="min-w-0">
                    <b className="text-sm font-bold text-slate-900 block truncate">{group.nome}</b>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">
                      {minimum
                        ? minimum === group.maximo
                          ? `Escolha exatamente ${minimum}`
                          : `Escolha de ${minimum} até ${group.maximo}`
                        : `Escolha até ${group.maximo}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 ${
                      isMissingRequired
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : isSatisfied
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isMissingRequired && <AlertCircle size={12} className="text-amber-500" />}
                    {isSatisfied && <Check size={12} className="text-emerald-500" />}
                    <span>
                      {minimum ? (isSatisfied ? 'Concluído' : 'Obrigatório') : 'Opcional'} · {currentCount}/{group.maximo}
                    </span>
                  </span>
                </header>

                <div className="divide-y divide-slate-100">
                  {group.opcoes
                    .filter((option: any) => option.ativo !== false)
                    .map((option: any) => {
                      const item = selected.find((val) => val.opcaoId === option.id);
                      const active = !!item;
                      const canAddMore = currentCount < group.maximo;

                      return (
                        <div
                          key={option.id}
                          className={`flex min-h-12 items-center justify-between gap-3 px-4 py-2.5 transition-colors ${
                            active ? 'bg-orange-50/35' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggle(group, option)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left group cursor-pointer"
                          >
                            {isSingleChoice ? (
                              <div
                                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-all ${
                                  active
                                    ? 'border-brand-500 bg-brand-500 shadow-xs'
                                    : 'border-slate-300 bg-white group-hover:border-slate-400'
                                }`}
                              >
                                {active && <div className="h-2 w-2 rounded-full bg-white" />}
                              </div>
                            ) : (
                              <div
                                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-all ${
                                  active
                                    ? 'border-brand-500 bg-brand-500 text-white shadow-xs'
                                    : 'border-slate-300 bg-white group-hover:border-slate-400'
                                }`}
                              >
                                {active && <Check size={13} strokeWidth={3} className="text-white" />}
                              </div>
                            )}

                            <span
                              className={`truncate text-sm transition-colors ${
                                active ? 'font-semibold text-slate-900' : 'font-medium text-slate-700 group-hover:text-slate-900'
                              }`}
                            >
                              {option.nome}
                            </span>
                          </button>

                          {item && group.maximo > 1 && (
                            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 shrink-0 shadow-xs">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  changeOptionQuantity(group, option.id, -1);
                                }}
                                disabled={item.quantidade <= 1}
                                className="h-6 w-6 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-colors"
                                title="Diminuir"
                              >
                                <Minus size={13} />
                              </button>
                              <b className="w-5 text-center text-xs font-bold text-slate-900 tabular-nums">
                                {item.quantidade}
                              </b>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  changeOptionQuantity(group, option.id, 1);
                                }}
                                disabled={!canAddMore}
                                className="h-6 w-6 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-colors"
                                title="Aumentar"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          )}

                          <span className="shrink-0 text-right">
                            {option.preco_adicional > 0 ? (
                              <span className="inline-block text-xs font-bold text-brand-600 bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded-md">
                                + R${' '}
                                {(option.preco_adicional * (item ? item.quantidade : 1))
                                  .toFixed(2)
                                  .replace('.', ',')}
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">Incluso</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </section>
            );
          })}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-5 py-3.5 md:px-6 md:py-4 bg-white border-t border-slate-100 flex items-center justify-between gap-4 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Subtotal do item
            </span>
            <strong className="text-xl md:text-2xl font-black text-slate-900 font-heading leading-tight">
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
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
              type="button"
              onClick={confirm}
              className="premium-btn px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-brand-500/20 active:scale-95 transition-all !text-white"
            >
              <Check size={16} className="!text-white" />
              <span className="!text-white">Adicionar</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
