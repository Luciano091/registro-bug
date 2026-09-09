import { useMemo, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

interface ProductModalProps { produto: any; onClose: () => void; lojaAberta?: boolean; onLojaFechada?: () => void }
type Selection = { opcaoId: number; grupoId: number; grupoNome: string; nome: string; preco: number; quantidade: number };

export const ProductModal = ({ produto, onClose, lojaAberta = true, onLojaFechada }: ProductModalProps) => {
  const { addItem } = useCart();
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [selected, setSelected] = useState<Selection[]>([]);
  const [error, setError] = useState('');
  const groups = useMemo(() => (produto.grupos_opcoes || []).filter((group: any) => group.ativo), [produto]);
  const basePrice = produto.is_promocao && produto.preco_promocao ? produto.preco_promocao : produto.preco;
  const groupCount = (groupId: number) => selected.filter(item => item.grupoId === groupId).reduce((sum, item) => sum + item.quantidade, 0);

  const validate = () => {
    for (const group of groups) {
      const minimum = Math.max(group.minimo || 0, group.obrigatorio ? 1 : 0);
      const count = groupCount(group.id);
      if (count < minimum) return `Escolha pelo menos ${minimum} opção(ões) em “${group.nome}”.`;
      if (count > group.maximo) return `Escolha no máximo ${group.maximo} opção(ões) em “${group.nome}”.`;
    }
    return '';
  };

  const toggle = (group: any, option: any) => {
    setError('');
    const current = selected.find(item => item.opcaoId === option.id);
    if (current) return setSelected(items => items.filter(item => item.opcaoId !== option.id));
    const newItem = { opcaoId: option.id, grupoId: group.id, grupoNome: group.nome, nome: option.nome, preco: option.preco_adicional, quantidade: 1 };
    if (group.maximo === 1) setSelected(items => [...items.filter(item => item.grupoId !== group.id), newItem]);
    else if (groupCount(group.id) < group.maximo) setSelected(items => [...items, newItem]);
  };

  const changeOptionQuantity = (group: any, optionId: number, delta: number) => {
    setError('');
    setSelected(items => items.map(item => {
      if (item.opcaoId !== optionId) return item;
      const next = item.quantidade + delta;
      if (next < 1 || groupCount(group.id) + delta > group.maximo) return item;
      return { ...item, quantidade: next };
    }));
  };

  const add = () => {
    if (!lojaAberta) { onLojaFechada?.(); return; }
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    addItem({
      id: crypto.randomUUID(), produtoId: produto.id, nome: produto.nome, precoBase: basePrice,
      quantidade,
      adicionais: selected.map(({ opcaoId, grupoNome, nome, preco, quantidade: qty }) => ({ opcaoId, grupoNome, nome, preco, quantidade: qty })),
      observacao,
    });
    onClose();
  };

  const total = (basePrice + selected.reduce((sum, item) => sum + item.preco * item.quantidade, 0)) * quantidade;

  return <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
    <div className="absolute inset-0 bg-zinc-900/55 backdrop-blur-sm" onClick={onClose} />
    <div className="relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-w-2xl md:rounded-3xl">
      {produto.imagem_url && <div className="h-48 shrink-0 bg-orange-50 md:h-56"><img src={produto.imagem_url} alt={produto.nome} className="h-full w-full object-contain p-3" /></div>}
      <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 rounded-full bg-white p-2.5 text-zinc-700 shadow"><X size={20} /></button>
      <div className="flex-1 overflow-y-auto p-5 md:p-6">
        <div className="pr-10"><h2 className="text-2xl font-bold text-zinc-900">{produto.nome}</h2>{produto.descricao && <p className="mt-2 text-sm leading-relaxed text-zinc-500">{produto.descricao}</p>}<strong className="mt-3 block text-lg text-brand-600">{basePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
        <div className="mt-6 space-y-5">
          {groups.map((group: any) => {
            const minimum = Math.max(group.minimo || 0, group.obrigatorio ? 1 : 0);
            const count = groupCount(group.id);
            return <section key={group.id} className="overflow-hidden rounded-2xl border border-zinc-200">
              <header className="flex items-start justify-between gap-3 bg-zinc-50 px-4 py-3">
                <div><h3 className="font-bold text-zinc-900">{group.nome}</h3><p className="text-xs text-zinc-500">{minimum ? `Escolha de ${minimum} até ${group.maximo}` : `Escolha até ${group.maximo}`}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${minimum && count < minimum ? 'bg-orange-100 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>{minimum ? 'Obrigatório' : 'Opcional'} · {count}/{group.maximo}</span>
              </header>
              <div className="divide-y divide-zinc-100 px-4">
                {group.opcoes.filter((option: any) => option.ativo).map((option: any) => {
                  const item = selected.find(value => value.opcaoId === option.id);
                  return <div key={option.id} className="flex min-h-14 items-center justify-between gap-3 py-2.5">
                    <button type="button" onClick={() => toggle(group, option)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className={`grid h-5 w-5 shrink-0 place-items-center ${group.maximo === 1 ? 'rounded-full' : 'rounded-md'} border ${item ? 'border-brand-500 bg-brand-500 text-white' : 'border-zinc-300'}`}>{item && <Check size={13} />}</span>
                      <span className="truncate text-sm font-medium text-zinc-800">{option.nome}</span>
                    </button>
                    {item && group.maximo > 1 && <div className="flex items-center gap-2 rounded-lg bg-zinc-100 p-1"><button type="button" onClick={() => changeOptionQuantity(group, option.id, -1)} className="p-1"><Minus size={14} /></button><b className="text-xs">{item.quantidade}</b><button type="button" onClick={() => changeOptionQuantity(group, option.id, 1)} className="p-1"><Plus size={14} /></button></div>}
                    <span className="shrink-0 text-sm text-zinc-500">{option.preco_adicional > 0 ? `+ ${option.preco_adicional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'Incluso'}</span>
                  </div>;
                })}
              </div>
            </section>;
          })}
        </div>
        <div className="mt-6"><label className="text-sm font-bold text-zinc-900">Observação</label><textarea value={observacao} maxLength={500} onChange={event => setObservacao(event.target.value)} placeholder="Ex.: sem cebola, carne ao ponto" className="mt-2 h-20 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-base outline-none focus:border-brand-500" /></div>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      </div>
      <footer className="flex items-center gap-3 border-t border-zinc-200 bg-white p-4 md:p-5">
        <div className="flex items-center rounded-xl bg-zinc-100 p-1"><button onClick={() => setQuantidade(Math.max(1, quantidade - 1))} className="p-2"><Minus size={17} /></button><b className="w-7 text-center">{quantidade}</b><button onClick={() => setQuantidade(quantidade + 1)} className="p-2"><Plus size={17} /></button></div>
        <button onClick={add} disabled={!lojaAberta} className="flex min-h-12 flex-1 items-center justify-between rounded-xl bg-brand-500 px-4 font-bold text-white disabled:bg-zinc-400"><span>{lojaAberta ? 'Adicionar' : 'Loja fechada'}</span><span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></button>
      </footer>
    </div>
  </div>;
};
