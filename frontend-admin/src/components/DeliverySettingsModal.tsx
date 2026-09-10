import { useEffect, useState } from 'react';
import { Check, Loader2, LocateFixed, MapPin, Plus, Trash2, Truck, X } from 'lucide-react';
import api from '../services/api';

type Area = { id?: number; bairro: string; taxa: number; pedido_minimo: number; prazo_adicional_min: number; ativo: boolean };
type DeliveryConfig = {
  entrega_habilitada: boolean;
  entrega_modo: 'fixa' | 'bairro' | 'distancia';
  taxa_fixa: number;
  pedido_minimo: number;
  entrega_gratis_acima: number | null;
  raio_km: number | null;
  taxa_base: number;
  distancia_base_km: number;
  taxa_por_km: number;
  latitude_origem: number | null;
  longitude_origem: number | null;
  areas: Area[];
};

const empty: DeliveryConfig = { entrega_habilitada: true, entrega_modo: 'fixa', taxa_fixa: 0, pedido_minimo: 0, entrega_gratis_acima: null, raio_km: null, taxa_base: 0, distancia_base_km: 0, taxa_por_km: 0, latitude_origem: null, longitude_origem: null, areas: [] };
const number = (value: string) => Math.max(0, Number(value) || 0);

export default function DeliverySettingsModal({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<DeliveryConfig>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.get('/configuracao/entrega').then(({ data }) => setConfig(data)).catch((error) => setMessage({ type: 'error', text: error.response?.data?.detail || 'Não foi possível carregar as regras de entrega.' })).finally(() => setLoading(false));
  }, []);

  const updateArea = (index: number, field: keyof Area, value: string | boolean) => setConfig(current => ({ ...current, areas: current.areas.map((area, itemIndex) => itemIndex === index ? { ...area, [field]: field === 'bairro' || field === 'ativo' ? value : number(String(value)) } : area) }));
  const addArea = () => setConfig(current => ({ ...current, areas: [...current.areas, { bairro: '', taxa: 0, pedido_minimo: 0, prazo_adicional_min: 0, ativo: true }] }));
  const removeArea = (index: number) => setConfig(current => ({ ...current, areas: current.areas.filter((_, itemIndex) => itemIndex !== index) }));

  const locate = () => {
    if (!navigator.geolocation) return setMessage({ type: 'error', text: 'Este aparelho não oferece localização.' });
    setLocating(true); setMessage(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setConfig(current => ({ ...current, latitude_origem: coords.latitude, longitude_origem: coords.longitude })); setLocating(false); setMessage({ type: 'ok', text: 'Localização do estabelecimento registrada.' }); },
      () => { setLocating(false); setMessage({ type: 'error', text: 'Autorize a localização e tente novamente no estabelecimento.' }); },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  };

  const save = async () => {
    setSaving(true); setMessage(null);
    try {
      const payload = { ...config, entrega_gratis_acima: config.entrega_gratis_acima || null, raio_km: config.raio_km || null, areas: config.areas.map(({ id: _id, ...area }) => area) };
      const { data } = await api.put('/configuracao/entrega', payload);
      setConfig(data); setMessage({ type: 'ok', text: 'Regras de entrega salvas e publicadas no cardápio.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Não foi possível salvar as regras.' });
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/70 p-3 backdrop-blur-sm" onMouseDown={onClose}>
    <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl" onMouseDown={event => event.stopPropagation()}>
      <header className="flex items-start justify-between border-b border-slate-200 bg-white p-5 md:p-6"><div className="flex gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-100 text-orange-600"><Truck /></div><div><h2 className="text-2xl font-bold text-slate-900">Configurar entregas</h2><p className="text-sm text-slate-500">Defina onde entrega, quanto cobra e o valor mínimo.</p></div></div><button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500"><X /></button></header>
      {loading ? <div className="grid flex-1 place-items-center py-28 text-slate-500"><Loader2 className="mb-3 animate-spin" />Carregando configurações...</div> : <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
        {message && <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <label className="flex items-center justify-between gap-4"><span><strong className="block text-slate-900">Aceitar pedidos para entrega</strong><small className="text-slate-500">Quando desativado, o checkout permite somente retirada.</small></span><input type="checkbox" checked={config.entrega_habilitada} onChange={event => setConfig({ ...config, entrega_habilitada: event.target.checked })} className="h-5 w-5 accent-orange-500" /></label>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">Como calcular a taxa?</h3><div className="mt-4 grid gap-3 md:grid-cols-3">{[
          ['fixa','Taxa fixa','Um valor para toda entrega.'],['bairro','Por bairro','Taxa e mínimo diferentes por região.'],['distancia','Por distância','Cálculo em linha reta, sem API paga.'],
        ].map(([id,title,description]) => <button key={id} onClick={() => setConfig({ ...config, entrega_modo: id as DeliveryConfig['entrega_modo'] })} className={`rounded-xl border p-4 text-left ${config.entrega_modo === id ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-100' : 'border-slate-200'}`}><strong className="block text-slate-900">{title}</strong><small className="mt-1 block text-slate-500">{description}</small></button>)}</div></section>
        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-3">
          {config.entrega_modo === 'fixa' && <label className="text-sm font-semibold text-slate-700">Taxa fixa (R$)<input type="number" min="0" step="0.01" value={config.taxa_fixa} onChange={event => setConfig({ ...config, taxa_fixa: number(event.target.value) })} className="field mt-2" /></label>}
          <label className="text-sm font-semibold text-slate-700">Pedido mínimo geral (R$)<input type="number" min="0" step="0.01" value={config.pedido_minimo} onChange={event => setConfig({ ...config, pedido_minimo: number(event.target.value) })} className="field mt-2" /></label>
          <label className="text-sm font-semibold text-slate-700">Entrega grátis acima de (R$)<input type="number" min="0" step="0.01" value={config.entrega_gratis_acima ?? ''} placeholder="Sem gratuidade" onChange={event => setConfig({ ...config, entrega_gratis_acima: event.target.value ? number(event.target.value) : null })} className="field mt-2" /></label>
        </section>
        {config.entrega_modo === 'bairro' && <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">Bairros atendidos</h3><p className="text-sm text-slate-500">Somente bairros ativos aparecerão no checkout.</p></div><button onClick={addArea} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />Bairro</button></div><div className="mt-4 space-y-3">{config.areas.map((area,index) => <div key={area.id ?? index} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.5fr_.7fr_.8fr_.7fr_auto]"><input value={area.bairro} onChange={event => updateArea(index,'bairro',event.target.value)} placeholder="Nome do bairro" className="field" /><input type="number" min="0" step="0.01" value={area.taxa} onChange={event => updateArea(index,'taxa',event.target.value)} placeholder="Taxa" className="field" /><input type="number" min="0" step="0.01" value={area.pedido_minimo} onChange={event => updateArea(index,'pedido_minimo',event.target.value)} placeholder="Mínimo" className="field" /><input type="number" min="0" value={area.prazo_adicional_min} onChange={event => updateArea(index,'prazo_adicional_min',event.target.value)} placeholder="Min extras" className="field" /><div className="flex items-center justify-end gap-2"><label className="text-xs text-slate-500"><input type="checkbox" checked={area.ativo} onChange={event => updateArea(index,'ativo',event.target.checked)} className="mr-1 accent-orange-500" />Ativo</label><button onClick={() => removeArea(index)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={17} /></button></div></div>)}{!config.areas.length && <button onClick={addArea} className="w-full rounded-xl border border-dashed border-slate-300 py-8 text-sm font-semibold text-slate-500">Adicionar primeiro bairro</button>}</div></section>}
        {config.entrega_modo === 'distancia' && <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-slate-900">Cálculo por distância</h3><p className="text-sm text-slate-500">Registre a posição estando fisicamente no estabelecimento.</p></div><button onClick={locate} disabled={locating} className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700"><LocateFixed size={18} />{locating ? 'Localizando...' : config.latitude_origem ? 'Atualizar localização' : 'Usar localização atual'}</button></div>{config.latitude_origem != null && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600"><MapPin size={14} />Localização registrada: {config.latitude_origem.toFixed(5)}, {config.longitude_origem?.toFixed(5)}</p>}<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-semibold text-slate-700">Raio máximo (km)<input type="number" min="0.1" step="0.1" value={config.raio_km ?? ''} onChange={event => setConfig({ ...config, raio_km: event.target.value ? number(event.target.value) : null })} className="field mt-2" /></label><label className="text-sm font-semibold text-slate-700">Taxa inicial (R$)<input type="number" min="0" step="0.01" value={config.taxa_base} onChange={event => setConfig({ ...config, taxa_base: number(event.target.value) })} className="field mt-2" /></label><label className="text-sm font-semibold text-slate-700">Distância incluída (km)<input type="number" min="0" step="0.1" value={config.distancia_base_km} onChange={event => setConfig({ ...config, distancia_base_km: number(event.target.value) })} className="field mt-2" /></label><label className="text-sm font-semibold text-slate-700">Adicional por km (R$)<input type="number" min="0" step="0.01" value={config.taxa_por_km} onChange={event => setConfig({ ...config, taxa_por_km: number(event.target.value) })} className="field mt-2" /></label></div></section>}
      </div>}
      <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:justify-end"><button onClick={onClose} className="rounded-xl px-5 py-3 text-sm font-bold text-slate-600">Fechar</button><button onClick={save} disabled={loading || saving} className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}Salvar e publicar</button></footer>
    </div>
  </div>;
}
