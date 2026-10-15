import { useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';

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
  const groups = (product.grupos_opcoes || []).filter((group: any) => group.ativo);
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
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
              Personalizar item
            </span>
            <h2 className="mt-1 text-xl font-bold text-white">{product.nome}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-slate-300 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {groups.map((group: any) => {
            const minimum = Math.max(group.minimo || 0, group.obrigatorio ? 1 : 0);
            const currentCount = groupCount(group.id);
            const isMissingRequired = minimum > 0 && currentCount < minimum;

            return (
              <section key={group.id} className="overflow-hidden rounded-2xl border border-white/10">
                <header className="flex items-center justify-between bg-white/5 px-4 py-3">
                  <div>
                    <b className="text-sm text-white">{group.nome}</b>
                    <p className="text-xs text-slate-400">
                      {minimum ? `Escolha de ${minimum} até ${group.maximo}` : `Escolha até ${group.maximo}`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      isMissingRequired
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {minimum ? 'Obrigatório' : 'Opcional'} · {currentCount}/{group.maximo}
                  </span>
                </header>

                <div className="divide-y divide-white/5 px-4">
                  {group.opcoes
                    .filter((option: any) => option.ativo)
                    .map((option: any) => {
                      const item = selected.find((val) => val.opcaoId === option.id);
                      const active = !!item;
                      const canAddMore = currentCount < group.maximo;

                      return (
                        <div
                          key={option.id}
                          className="flex min-h-12 items-center justify-between gap-3 py-2.5"
                        >
                          <button
                            type="button"
                            onClick={() => toggle(group, option)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left group"
                          >
                            <i
                              className={`grid h-5 w-5 shrink-0 place-items-center ${
                                group.maximo === 1 ? 'rounded-full' : 'rounded-md'
                              } border transition-colors ${
                                active
                                  ? 'border-brand-500 bg-brand-500 text-white'
                                  : 'border-slate-600 group-hover:border-slate-500'
                              }`}
                            >
                              {active && <Check size={13} />}
                            </i>
                            <span className="truncate text-sm font-medium text-slate-200">
                              {option.nome}
                            </span>
                          </button>

                          {item && group.maximo > 1 && (
                            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-1.5 py-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  changeOptionQuantity(group, option.id, -1);
                                }}
                                disabled={item.quantidade <= 1}
                                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Diminuir"
                              >
                                <Minus size={13} />
                              </button>
                              <b className="w-5 text-center text-xs font-bold text-white tabular-nums">
                                {item.quantidade}
                              </b>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  changeOptionQuantity(group, option.id, 1);
                                }}
                                disabled={!canAddMore}
                                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Aumentar"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          )}

                          <span className="shrink-0 text-xs text-slate-400">
                            {option.preco_adicional > 0
                              ? `+ R$ ${(
                                  option.preco_adicional * (item ? item.quantidade : 1)
                                )
                                  .toFixed(2)
                                  .replace('.', ',')}`
                              : 'Incluso'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </section>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300 border border-red-500/20">
            {error}
          </p>
        )}

        <button
          onClick={confirm}
          className="premium-btn mt-5 flex w-full items-center justify-between rounded-xl px-5 py-3 font-bold shadow-lg shadow-brand-500/20"
        >
          <span>Adicionar ao pedido</span>
          <span className="text-sm font-extrabold">
            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </button>
      </div>
    </div>
  );
}
