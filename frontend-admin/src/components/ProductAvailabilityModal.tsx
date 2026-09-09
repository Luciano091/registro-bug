import { useState } from 'react';
import { CalendarClock, Save, X } from 'lucide-react';
import api from '../services/api';

const weekdays = [['0', 'Seg'], ['1', 'Ter'], ['2', 'Qua'], ['3', 'Qui'], ['4', 'Sex'], ['5', 'Sáb'], ['6', 'Dom']];

export default function ProductAvailabilityModal({ product, onClose, onSaved }: { product: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    dias_semana: product.dias_semana || '0,1,2,3,4,5,6', horario_inicio: product.horario_inicio || '', horario_fim: product.horario_fim || '',
    disponivel_delivery: product.disponivel_delivery !== false, disponivel_retirada: product.disponivel_retirada !== false, disponivel_salao: product.disponivel_salao !== false,
    is_promocao: !!product.is_promocao, preco_promocao: product.preco_promocao ?? '', promocao_inicio: product.promocao_inicio?.slice(0, 16) || '', promocao_fim: product.promocao_fim?.slice(0, 16) || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const days = form.dias_semana.split(',').filter(Boolean);
  const toggleDay = (day: string) => setForm({ ...form, dias_semana: (days.includes(day) ? days.filter(value => value !== day) : [...days, day]).sort().join(',') });
  const save = async () => {
    if (!form.dias_semana) return setError('Selecione ao menos um dia.');
    if (form.is_promocao && (!form.preco_promocao || Number(form.preco_promocao) >= product.preco)) return setError('Informe um preço promocional menor que o preço normal.');
    setSaving(true); setError('');
    try {
      const payload = {
        nome: product.nome, categoria: product.categoria, categoria_id: product.categoria_id, descricao: product.descricao, imagem_url: product.imagem_url,
        preco_compra: product.preco_compra, preco: product.preco, ativo: product.ativo, controlar_estoque: product.controlar_estoque, estoque: product.estoque,
        ...form, preco_promocao: form.is_promocao ? Number(form.preco_promocao) : null,
        horario_inicio: form.horario_inicio || null, horario_fim: form.horario_fim || null,
        promocao_inicio: form.is_promocao && form.promocao_inicio ? form.promocao_inicio : null,
        promocao_fim: form.is_promocao && form.promocao_fim ? form.promocao_fim : null,
      };
      await api.put(`/produtos/${product.id}`, payload); onSaved(); onClose();
    } catch (err: any) { setError(err.response?.data?.detail || 'Não foi possível salvar as regras.'); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4"><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 p-5 md:p-6"><header className="flex items-start justify-between"><div><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-400"><CalendarClock size={15} /> Disponibilidade</span><h2 className="mt-1 text-2xl font-bold text-white">{product.nome}</h2></div><button onClick={onClose} className="rounded-full bg-white/5 p-2 text-slate-300"><X /></button></header>{error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}<section className="mt-6"><h3 className="font-bold text-white">Dias e horário</h3><div className="mt-3 grid grid-cols-7 gap-1">{weekdays.map(([id, label]) => <button type="button" key={id} onClick={() => toggleDay(id)} className={`rounded-lg py-2 text-xs font-bold ${days.includes(id) ? 'bg-brand-500 text-white' : 'bg-white/5 text-slate-400'}`}>{label}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-3"><input type="time" value={form.horario_inicio} onChange={event => setForm({ ...form, horario_inicio: event.target.value })} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white" /><input type="time" value={form.horario_fim} onChange={event => setForm({ ...form, horario_fim: event.target.value })} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white" /></div><p className="mt-2 text-xs text-slate-500">Sem horário preenchido, o produto fica disponível durante todo o dia selecionado.</p></section><section className="mt-6"><h3 className="font-bold text-white">Canais de venda</h3><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">{[['disponivel_delivery', 'Delivery'], ['disponivel_retirada', 'Retirada'], ['disponivel_salao', 'Salão']].map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-sm text-slate-300"><input type="checkbox" checked={(form as any)[key]} onChange={event => setForm({ ...form, [key]: event.target.checked })} /> {label}</label>)}</div></section><section className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4"><label className="flex items-center gap-2 font-bold text-white"><input type="checkbox" checked={form.is_promocao} onChange={event => setForm({ ...form, is_promocao: event.target.checked })} /> Programar promoção</label>{form.is_promocao && <div className="mt-4 space-y-3"><label className="block text-xs text-slate-400">Preço promocional<input type="number" step="0.01" min="0" value={form.preco_promocao} onChange={event => setForm({ ...form, preco_promocao: event.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white" /></label><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs text-slate-400">Começa em<input type="datetime-local" value={form.promocao_inicio} onChange={event => setForm({ ...form, promocao_inicio: event.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white" /></label><label className="text-xs text-slate-400">Termina em<input type="datetime-local" value={form.promocao_fim} onChange={event => setForm({ ...form, promocao_fim: event.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white" /></label></div></div>}</section><button onClick={save} disabled={saving} className="premium-btn mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold"><Save size={18} /> {saving ? 'Salvando...' : 'Salvar regras'}</button></div></div>;
}
