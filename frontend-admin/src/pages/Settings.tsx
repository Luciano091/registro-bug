import { useState, useEffect } from 'react';
import { ChevronDown, Save, Store, Phone, MapPin, Clock, Lock, Truck } from 'lucide-react';
import api from '../services/api';
import DriverAppDownload from '../components/DriverAppDownload';
import DeliverySettingsModal from '../components/DeliverySettingsModal';
import { can, readSession } from '../services/session';

const Settings = () => {
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const canManage = can(readSession(), 'configuracoes.gerenciar');
  const [config, setConfig] = useState({
    nome_empresa: 'Carregando...',
    telefone: '',
    endereco: '',
    taxa_entrega: 0,
    tempo_medio_preparo: 0,
    whatsapp_auto_reply_enabled: false,
    whatsapp_auto_reply_text: '',
    senha_admin: '',
    ifood_client_id: '',
    ifood_client_secret: '',
    ifood_merchant_id: '',
    ifood_status: 'desconectado'
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/configuracao');
        const data = response.data;
        data.senha_admin = '';
        setConfig(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (e: any) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setConfig({ ...config, [e.target.name]: value });
  };

  const handleSave = async () => {
    try {
      await api.put('/configuracao', {
        ...config,
        taxa_entrega: parseFloat(config.taxa_entrega as any),
        tempo_medio_preparo: parseInt(config.tempo_medio_preparo as any)
      });
      alert('Configurações salvas com sucesso no banco de dados!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar as configurações.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 p-6 pb-20 duration-700 md:p-10">
      <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-heading drop-shadow-sm">Configurações</h2>
          <p className="text-zinc-300 mt-1">Gerencie as informações do seu estabelecimento.</p>
        </div>
        <button 
          onClick={handleSave}
          className="premium-btn px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <Save size={20} />
          <span>Salvar Alterações</span>
        </button>
      </header>

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600"><Store size={20} /></div>
            <div><h3 className="font-heading text-lg font-bold text-slate-800">Dados do estabelecimento</h3><p className="text-sm text-slate-500">Informações exibidas nos pedidos e canais de atendimento.</p></div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="md:col-span-2"><span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600"><Store size={16} /> Nome do estabelecimento</span><input type="text" name="nome_empresa" value={config.nome_empresa} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
            <label><span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600"><Phone size={16} /> Telefone principal</span><input type="text" name="telefone" value={config.telefone} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
            <label><span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600"><Clock size={16} /> Tempo médio de preparo (min)</span><input type="number" min="0" name="tempo_medio_preparo" value={config.tempo_medio_preparo} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
            <label className="md:col-span-2"><span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600"><MapPin size={16} /> Endereço</span><textarea name="endereco" rows={2} value={config.endereco} onChange={handleChange} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600"><Truck size={20} /></div><div><h3 className="font-bold text-slate-800">Áreas e taxas de entrega</h3><p className="mt-1 text-sm leading-relaxed text-slate-500">Bairros, pedido mínimo, entrega grátis e raio de atendimento.</p></div></div>
            {canManage && <button onClick={() => setDeliveryOpen(true)} className="mt-5 w-fit rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700 transition hover:bg-orange-100">Configurar entregas</button>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Lock size={20} /></div><div><h3 className="font-bold text-slate-800">Segurança</h3><p className="mt-1 text-sm text-slate-500">Altere a senha de acesso administrativo.</p></div></div>
            <label><span className="mb-2 block text-sm font-medium text-slate-600">Nova senha de administrador</span><input type="password" name="senha_admin" value={config.senha_admin || ''} onChange={handleChange} placeholder="Deixe em branco para manter a atual" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
          </section>
        </div>

        <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-sm font-black text-red-600">iFood</div>
            <div className="min-w-0 flex-1"><h3 className="font-bold text-slate-800">Integração iFood</h3><p className="truncate text-sm text-slate-500">Credenciais do Hub de Pedidos.</p></div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${config.ifood_status === 'conectado' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{config.ifood_status === 'conectado' ? 'Conectado' : 'Desconectado'}</span>
            <ChevronDown className="text-slate-400 transition-transform group-open:rotate-180" size={18} />
          </summary>
          <div className="space-y-4 border-t border-slate-100 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label><span className="mb-2 block text-sm font-medium text-slate-600">Client ID</span><input type="text" name="ifood_client_id" value={(config as any).ifood_client_id || ''} onChange={handleChange} placeholder="Ex: a1b2c3d4-..." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-800 outline-none focus:border-orange-400" /></label>
              <label><span className="mb-2 block text-sm font-medium text-slate-600">Client Secret</span><input type="password" name="ifood_client_secret" value={(config as any).ifood_client_secret || ''} onChange={handleChange} placeholder="*****************" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-800 outline-none focus:border-orange-400" /></label>
            </div>
            <label><span className="mb-2 block text-sm font-medium text-slate-600">Merchant ID (ID da loja)</span><input type="text" name="ifood_merchant_id" value={(config as any).ifood_merchant_id || ''} onChange={handleChange} placeholder="Ex: 12345678-..." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-800 outline-none focus:border-orange-400" /></label>
            <div className="flex justify-end border-t border-slate-100 pt-4"><button onClick={async () => { try { await api.post('/ifood/simulate-order'); alert('Pedido iFood simulado com sucesso! Verifique a aba de Pedidos e KDS.'); } catch { alert('Erro ao simular pedido iFood.'); } }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Simular pedido teste</button></div>
          </div>
        </details>

        <DriverAppDownload />
      </div>
      {deliveryOpen && <DeliverySettingsModal onClose={() => setDeliveryOpen(false)} />}
    </div>
  );
};

export default Settings;
