import { useEffect, useState } from 'react';
import { Check, Edit2, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import api from '../services/api';

type Option = { id?: number; nome: string; preco_adicional: number; ativo: boolean; ordem: number };
type Group = { id: number; nome: string; minimo: number; maximo: number; obrigatorio: boolean; ativo: boolean; ordem: number; opcoes: Option[] };
const emptyForm = () => ({ id: 0, nome: '', minimo: 0, maximo: 1, obrigatorio: false, ativo: true, ordem: 0, opcoes: [{ nome: '', preco_adicional: 0, ativo: true, ordem: 0 }] });

export default function ProductOptionsModal({ product, onClose, onSaved }: { product: any; onClose: () => void; onSaved: () => void }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<number[]>((product.grupos_opcoes || []).map((group: Group) => group.id));
  const [form, setForm] = useState<any>(emptyForm());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try { const { data } = await api.get('/grupos-opcoes'); setGroups(data); }
    catch (err: any) { setError(err.response?.data?.detail || 'Não foi possível carregar os grupos.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const edit = (group?: Group) => {
    setForm(group ? { ...group, opcoes: group.opcoes.map(option => ({ ...option })) } : emptyForm());
    setEditing(true); setError('');
  };
  const updateOption = (index: number, key: string, value: string | number) => setForm((current: any) => ({ ...current, opcoes: current.opcoes.map((option: Option, idx: number) => idx === index ? { ...option, [key]: value } : option) }));
  const saveGroup = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    const payload = { ...form, opcoes: form.opcoes.filter((option: Option) => option.nome.trim()).map((option: Option, index: number) => ({ nome: option.nome, preco_adicional: Number(option.preco_adicional) || 0, ativo: option.ativo, ordem: index })) };
    if (!payload.opcoes.length) { setError('Adicione pelo menos uma opção.'); setSaving(false); return; }
    try {
      if (form.id) await api.put(`/grupos-opcoes/${form.id}`, payload); else await api.post('/grupos-opcoes', payload);
      setEditing(false); await load();
    } catch (err: any) { setError(err.response?.data?.detail || 'Não foi possível salvar o grupo.'); }
    finally { setSaving(false); }
  };
  const removeGroup = async (group: Group) => {
    if (!window.confirm(`Excluir o grupo “${group.nome}”?`)) return;
    try { await api.delete(`/grupos-opcoes/${group.id}`); setSelected(ids => ids.filter(id => id !== group.id)); await load(); }
    catch (err: any) { setError(err.response?.data?.detail || 'Não foi possível excluir o grupo.'); }
  };
  const saveAssignment = async () => {
    setSaving(true); setError('');
    try { await api.put(`/produtos/${product.id}/grupos-opcoes`, { grupo_ids: selected }); onSaved(); onClose(); }
    catch (err: any) { setError(err.response?.data?.detail || 'Não foi possível vincular os grupos.'); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm md:items-center md:p-4">
    <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-slate-950 shadow-2xl md:rounded-3xl">
      <header className="flex items-start justify-between border-b border-white/10 p-5 md:p-6"><div><span className="text-xs font-bold uppercase tracking-widest text-brand-400">Personalização do produto</span><h2 className="mt-1 text-2xl font-bold text-white">{product.nome}</h2><p className="mt-1 text-sm text-slate-400">Vincule tamanhos, sabores, pontos e adicionais.</p></div><button onClick={onClose} className="rounded-full bg-white/5 p-2 text-slate-300"><X /></button></header>
      <div className="flex-1 overflow-y-auto p-5 md:p-6">
        {error && <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        {editing ? <form onSubmit={saveGroup} className="space-y-4 rounded-2xl border border-brand-500/20 bg-slate-900 p-5">
          <div className="flex items-center justify-between"><h3 className="font-bold text-white">{form.id ? 'Editar grupo' : 'Novo grupo'}</h3><button type="button" onClick={() => setEditing(false)} className="text-sm text-slate-400">Cancelar</button></div>
          <input required value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })} placeholder="Ex.: Escolha o tamanho" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-brand-500" />
          <div className="grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Mínimo<input type="number" min="0" value={form.minimo} onChange={event => setForm({ ...form, minimo: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label><label className="text-xs text-slate-400">Máximo<input type="number" min="1" value={form.maximo} onChange={event => setForm({ ...form, maximo: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label></div>
          <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={form.obrigatorio} onChange={event => setForm({ ...form, obrigatorio: event.target.checked, minimo: event.target.checked && form.minimo === 0 ? 1 : form.minimo })} /> Escolha obrigatória</label>
          <div className="space-y-2"><span className="text-sm font-semibold text-slate-200">Opções</span>{form.opcoes.map((option: Option, index: number) => <div key={index} className="grid grid-cols-[1fr_110px_36px] gap-2"><input required value={option.nome} onChange={event => updateOption(index, 'nome', event.target.value)} placeholder="Nome" className="min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" /><input type="number" min="0" step="0.01" value={option.preco_adicional} onChange={event => updateOption(index, 'preco_adicional', Number(event.target.value))} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" /><button type="button" onClick={() => setForm((current: any) => ({ ...current, opcoes: current.opcoes.filter((_: Option, idx: number) => idx !== index) }))} className="text-red-400"><Trash2 size={17} /></button></div>)}</div>
          <button type="button" onClick={() => setForm((current: any) => ({ ...current, opcoes: [...current.opcoes, { nome: '', preco_adicional: 0, ativo: true, ordem: current.opcoes.length }] }))} className="flex items-center gap-2 text-sm font-semibold text-brand-400"><Plus size={16} /> Adicionar opção</button>
          <button disabled={saving} className="premium-btn flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold">{saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar grupo</button>
        </form> : <>
          <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-white">Grupos disponíveis</h3><button onClick={() => edit()} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-semibold text-brand-400"><Plus size={16} /> Criar grupo</button></div>
          {loading ? <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : <div className="space-y-3">{groups.map(group => { const checked = selected.includes(group.id); return <div key={group.id} className={`rounded-2xl border p-4 ${checked ? 'border-brand-500/40 bg-brand-500/10' : 'border-white/10 bg-white/[.03]'}`}><div className="flex items-start gap-3"><button onClick={() => setSelected(ids => checked ? ids.filter(id => id !== group.id) : [...ids, group.id])} className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border ${checked ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-600'}`}>{checked && <Check size={15} />}</button><div className="min-w-0 flex-1"><strong className="text-white">{group.nome}</strong><p className="mt-1 text-xs text-slate-400">{group.obrigatorio ? 'Obrigatório' : 'Opcional'} · {group.minimo} a {group.maximo} escolhas · {group.opcoes.length} opções</p><p className="mt-2 truncate text-xs text-slate-500">{group.opcoes.map(option => option.nome).join(' · ')}</p></div><button onClick={() => edit(group)} className="p-2 text-slate-400 hover:text-white"><Edit2 size={17} /></button><button onClick={() => removeGroup(group)} className="p-2 text-slate-400 hover:text-red-400"><Trash2 size={17} /></button></div></div>; })}{!groups.length && <p className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-slate-400">Crie o primeiro grupo de opções.</p>}</div>}
        </>}
      </div>
      {!editing && <footer className="border-t border-white/10 p-4 md:p-5"><button onClick={saveAssignment} disabled={saving} className="premium-btn flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold">{saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Aplicar ao produto</button></footer>}
    </div>
  </div>;
}
