import { useEffect, useState } from 'react';
import { Edit2, Loader2, Plus, Save, X } from 'lucide-react';
import api from '../services/api';

const weekdays = [['0', 'Seg'], ['1', 'Ter'], ['2', 'Qua'], ['3', 'Qui'], ['4', 'Sex'], ['5', 'Sáb'], ['6', 'Dom']];
const empty = { id: 0, nome: '', descricao: '', ordem: 0, ativo: true, dias_semana: '0,1,2,3,4,5,6', horario_inicio: '', horario_fim: '' };

export default function CategoriesModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = async () => { try { setItems((await api.get('/categorias')).data); } catch { setError('Não foi possível carregar as categorias.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const selectedDays = form.dias_semana.split(',').filter(Boolean);
  const toggleDay = (day: string) => setForm({ ...form, dias_semana: (selectedDays.includes(day) ? selectedDays.filter((value: string) => value !== day) : [...selectedDays, day]).sort().join(',') });
  const edit = (item?: any) => { setForm(item ? { ...item, horario_inicio: item.horario_inicio || '', horario_fim: item.horario_fim || '' } : empty); setEditing(true); setError(''); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    if (!form.dias_semana) { setError('Selecione ao menos um dia da semana.'); setSaving(false); return; }
    try {
      const payload = { ...form, horario_inicio: form.horario_inicio || null, horario_fim: form.horario_fim || null };
      if (form.id) await api.put(`/categorias/${form.id}`, payload); else await api.post('/categorias', payload);
      setEditing(false); await load(); onChanged();
    } catch (err: any) { setError(err.response?.data?.detail || 'Não foi possível salvar a categoria.'); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 md:items-center md:p-4"><div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-slate-950 md:rounded-3xl"><header className="flex items-start justify-between border-b border-white/10 p-5"><div><span className="text-xs font-bold uppercase tracking-widest text-brand-400">Organização e horários</span><h2 className="mt-1 text-2xl font-bold text-white">Categorias</h2></div><button onClick={onClose} className="rounded-full bg-white/5 p-2 text-slate-300"><X /></button></header><div className="flex-1 overflow-y-auto p-5">{error && <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{editing ? <form onSubmit={save} className="space-y-4"><input required value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })} placeholder="Nome da categoria" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white" /><textarea value={form.descricao || ''} onChange={event => setForm({ ...form, descricao: event.target.value })} placeholder="Descrição opcional" className="h-20 w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white" /><div><label className="text-sm font-semibold text-slate-300">Dias disponíveis</label><div className="mt-2 grid grid-cols-7 gap-1">{weekdays.map(([id, label]) => <button type="button" key={id} onClick={() => toggleDay(id)} className={`rounded-lg py-2 text-xs font-bold ${selectedDays.includes(id) ? 'bg-brand-500 text-white' : 'bg-white/5 text-slate-400'}`}>{label}</button>)}</div></div><div className="grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Início<input type="time" value={form.horario_inicio} onChange={event => setForm({ ...form, horario_inicio: event.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white" /></label><label className="text-xs text-slate-400">Fim<input type="time" value={form.horario_fim} onChange={event => setForm({ ...form, horario_fim: event.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white" /></label></div><div className="grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Ordem<input type="number" min="0" value={form.ordem} onChange={event => setForm({ ...form, ordem: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white" /></label><label className="mt-5 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.ativo} onChange={event => setForm({ ...form, ativo: event.target.checked })} /> Categoria ativa</label></div><div className="flex gap-3"><button type="button" onClick={() => setEditing(false)} className="flex-1 rounded-xl bg-white/5 py-3 font-bold text-slate-300">Cancelar</button><button disabled={saving} className="premium-btn flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-bold">{saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar</button></div></form> : <>{loading ? <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-brand-400" /></div> : <div className="space-y-3">{items.map(item => <button key={item.id} onClick={() => edit(item)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left"><div><strong className="text-white">{item.nome}</strong><p className="mt-1 text-xs text-slate-400">Ordem {item.ordem} · {item.horario_inicio && item.horario_fim ? `${item.horario_inicio} às ${item.horario_fim}` : 'Dia inteiro'} · {item.ativo ? 'Ativa' : 'Oculta'}</p></div><Edit2 size={17} className="text-slate-400" /></button>)}</div>}<button onClick={() => edit()} className="premium-btn mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold"><Plus size={18} /> Nova categoria</button></>}</div></div></div>;
}
