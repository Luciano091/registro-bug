import { useState } from 'react';
import { Check, X } from 'lucide-react';

export default function OrderProductOptionsModal({ product, onClose, onConfirm }: { product: any; onClose: () => void; onConfirm: (options: any[]) => void }) {
  const groups = (product.grupos_opcoes || []).filter((group: any) => group.ativo);
  const [selected, setSelected] = useState<any[]>([]);
  const [error, setError] = useState('');
  const count = (groupId: number) => selected.filter(item => item.grupoId === groupId).length;

  const toggle = (group: any, option: any) => {
    const exists = selected.some(item => item.opcaoId === option.id);
    if (exists) return setSelected(items => items.filter(item => item.opcaoId !== option.id));
    const value = { opcaoId: option.id, grupoId: group.id, grupoNome: group.nome, nome: option.nome, preco: option.preco_adicional, quantidade: 1 };
    if (group.maximo === 1) setSelected(items => [...items.filter(item => item.grupoId !== group.id), value]);
    else if (count(group.id) < group.maximo) setSelected(items => [...items, value]);
    setError('');
  };

  const confirm = () => {
    for (const group of groups) {
      const minimum = Math.max(group.minimo || 0, group.obrigatorio ? 1 : 0);
      if (count(group.id) < minimum) {
        setError(`Selecione ${minimum} opção(ões) em “${group.nome}”.`);
        return;
      }
    }
    onConfirm(selected);
  };

  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4">
    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl">
      <div className="flex items-start justify-between">
        <div><span className="text-xs font-bold uppercase tracking-widest text-brand-400">Personalizar item</span><h2 className="mt-1 text-xl font-bold text-white">{product.nome}</h2></div>
        <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-slate-300"><X size={20} /></button>
      </div>
      <div className="mt-5 space-y-4">
        {groups.map((group: any) => <section key={group.id} className="overflow-hidden rounded-2xl border border-white/10">
          <header className="bg-white/5 px-4 py-3"><b className="text-white">{group.nome}</b><p className="text-xs text-slate-400">{group.obrigatorio ? 'Obrigatório' : 'Opcional'} · até {group.maximo}</p></header>
          <div className="divide-y divide-white/5 px-4">
            {group.opcoes.filter((option: any) => option.ativo).map((option: any) => {
              const active = selected.some(item => item.opcaoId === option.id);
              return <button key={option.id} onClick={() => toggle(group, option)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
                <span className="flex items-center gap-3 text-sm text-slate-200"><i className={`grid h-5 w-5 place-items-center rounded border ${active ? 'border-brand-500 bg-brand-500' : 'border-slate-600'}`}>{active && <Check size={13} />}</i>{option.nome}</span>
                <span className="text-xs text-slate-400">{option.preco_adicional ? `+ R$ ${option.preco_adicional.toFixed(2).replace('.', ',')}` : 'Incluso'}</span>
              </button>;
            })}
          </div>
        </section>)}
      </div>
      {error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <button onClick={confirm} className="premium-btn mt-5 w-full rounded-xl py-3 font-bold">Adicionar ao pedido</button>
    </div>
  </div>;
}
