import { useState, useEffect } from 'react';
import { Save, Store, Phone, MapPin, Clock, MessageSquare, Lock } from 'lucide-react';
import api from '../services/api';

const Settings = () => {
  const [config, setConfig] = useState({
    nome_empresa: 'Carregando...',
    telefone: '',
    endereco: '',
    taxa_entrega: 0,
    tempo_medio_preparo: 0,
    whatsapp_auto_reply_enabled: false,
    whatsapp_auto_reply_text: '',
    senha_admin: ''
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
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col overflow-y-auto pb-20">
      <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-heading drop-shadow-sm">Configurações</h2>
          <p className="text-zinc-300 mt-1">Gerencie as informações da sua hamburgueria.</p>
        </div>
        <button 
          onClick={handleSave}
          className="premium-btn px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <Save size={20} />
          <span>Salvar Alterações</span>
        </button>
      </header>

      <div className="relative overflow-hidden bg-dark-800/40 backdrop-blur-md border border-white/5 shadow-xl rounded-2xl p-6 md:p-8 shrink-0 mb-8">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-brand-500 to-rose-500"></div>
        <h3 className="text-xl font-bold font-heading text-white border-b border-white/5 pb-3 mb-6">Dados do Estabelecimento</h3>
        
        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
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
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                <Phone className="text-brand-400" size={18} /> Telefone Principal
              </label>
              <input 
                type="text" name="telefone"
                value={config.telefone} onChange={handleChange}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white"
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
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
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
              <MapPin className="text-brand-400" size={18} /> Endereço
            </label>
            <textarea 
              name="endereco" rows={2}
              value={config.endereco} onChange={handleChange}
              className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white resize-none"
            ></textarea>
          </div>
          
        </div>
        
        {/* WhatsApp Auto-Reply Section */}
        <div className="bg-dark-950 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden group shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2.5 bg-green-500/10 rounded-xl text-green-400">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-heading">Automação do WhatsApp</h3>
              <p className="text-zinc-300 text-sm">Responda automaticamente a novos clientes.</p>
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between bg-dark-900 border border-white/10 rounded-xl px-4 py-4">
              <div>
                <p className="text-white font-medium">Ativar Resposta Automática</p>
                <p className="text-zinc-300 text-sm mt-0.5">Envia uma mensagem automática se o cliente não interagiu nas últimas 2 horas.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="whatsapp_auto_reply_enabled" className="sr-only peer" checked={config.whatsapp_auto_reply_enabled} onChange={handleChange} />
                <div className="w-11 h-6 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            {config.whatsapp_auto_reply_enabled && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                  Mensagem Automática
                </label>
                <textarea 
                  name="whatsapp_auto_reply_text" rows={4}
                  value={config.whatsapp_auto_reply_text || ''} onChange={handleChange}
                  placeholder="Ex: Olá! Sou o assistente virtual da Burger Hause. Já vamos te atender! O nosso cardápio digital é..."
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all text-white resize-none"
                ></textarea>
              </div>
            )}
          </div>
        </div>

        {/* Security Section */}
        <div className="glass border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-brand-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover:bg-brand-500/10 transition-colors"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2.5 bg-brand-500/10 rounded-xl text-brand-400">
              <Lock size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-heading">Segurança</h3>
              <p className="text-zinc-300 text-sm">Proteja o acesso ao painel de controle.</p>
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                Senha de Administrador (PIN)
              </label>
              <input 
                type="text" 
                name="senha_admin" 
                value={config.senha_admin || ''} 
                onChange={handleChange}
                placeholder="Ex: burger123"
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white"
              />
              <p className="text-xs text-zinc-400 mt-2">
                Esta é a senha solicitada na tela de login para acessar o painel administrativo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
