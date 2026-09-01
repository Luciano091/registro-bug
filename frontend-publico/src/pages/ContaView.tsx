import { useState, useEffect } from 'react';
import { User, Save, Phone, MapPin } from 'lucide-react';

export const ContaView = () => {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNome(localStorage.getItem('user_nome') || '');
    setTelefone(localStorage.getItem('user_telefone') || '');
    setEndereco(localStorage.getItem('user_endereco') || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('user_nome', nome);
    localStorage.setItem('user_telefone', telefone);
    localStorage.setItem('user_endereco', endereco);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-500">
          <User size={32} />
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold text-zinc-900">Minha Conta</h2>
          <p className="text-zinc-500 text-sm">Seus dados para agilizar o pedido</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Nome Completo</label>
          <div className="relative">
            <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-900 focus:outline-none focus:border-brand-500"
              placeholder="Como quer ser chamado?"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">WhatsApp</label>
          <div className="relative">
            <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="tel" 
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-900 focus:outline-none focus:border-brand-500"
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Endereço Principal</label>
          <div className="relative">
            <MapPin size={18} className="absolute left-3.5 top-3 text-zinc-400" />
            <textarea 
              value={endereco}
              onChange={e => setEndereco(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-900 focus:outline-none focus:border-brand-500 min-h-[80px] resize-none"
              placeholder="Rua, número, bairro..."
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            saved ? 'bg-emerald-500 text-white' : 'bg-brand-500 text-white active:scale-95'
          }`}
        >
          {saved ? 'Dados Salvos!' : <><Save size={18} /> Salvar Dados</>}
        </button>
      </div>
    </div>
  );
};
