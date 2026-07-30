import { useState, useEffect } from 'react';
import { Save, Store, Phone, MapPin, Clock } from 'lucide-react';
import api from '../services/api';

const Settings = () => {
  const [config, setConfig] = useState({
    nome_empresa: 'Carregando...',
    telefone: '',
    endereco: '',
    taxa_entrega: 0,
    tempo_medio_preparo: 0
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/configuracao');
        setConfig(response.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (e: any) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
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
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-heading drop-shadow-sm">Configurações</h2>
          <p className="text-zinc-400 mt-1">Gerencie as informações da sua hamburgueria.</p>
        </div>
        <button 
          onClick={handleSave}
          className="premium-btn px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <Save size={20} />
          <span>Salvar Alterações</span>
        </button>
      </header>

      <div className="relative overflow-hidden bg-dark-800/40 backdrop-blur-md border border-white/5 shadow-xl rounded-2xl p-6 md:p-8 flex-1">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-brand-500 to-rose-500"></div>
        <h3 className="text-xl font-bold font-heading text-white border-b border-white/5 pb-3 mb-6">Dados do Estabelecimento</h3>
        
        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
              <Store className="text-brand-400" size={18} /> Nome da Hamburgueria
            </label>
            <input 
              type="text" name="nome_empresa"
              value={config.nome_empresa} onChange={handleChange}
              className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                <Phone className="text-brand-400" size={18} /> Telefone Principal
              </label>
              <input 
                type="text" name="telefone"
                value={config.telefone} onChange={handleChange}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white"
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                <Clock className="text-brand-400" size={18} /> Tempo Médio de Preparo (min)
              </label>
              <input 
                type="number" name="tempo_medio_preparo"
                value={config.tempo_medio_preparo} onChange={handleChange}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
              <MapPin className="text-brand-400" size={18} /> Endereço
            </label>
            <textarea 
              name="endereco" rows={2}
              value={config.endereco} onChange={handleChange}
              className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white resize-none"
            ></textarea>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Settings;
