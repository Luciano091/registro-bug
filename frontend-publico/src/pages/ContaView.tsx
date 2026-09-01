import { useState, useEffect } from 'react';
import { User, Save, Phone, MapPin, LogOut } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';

export const ContaView = () => {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [saved, setSaved] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [foto, setFoto] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    setNome(localStorage.getItem('user_nome') || '');
    setTelefone(localStorage.getItem('user_telefone') || '');
    setEndereco(localStorage.getItem('user_endereco') || '');
    
    const token = localStorage.getItem('cliente_token');
    if (token) {
      setIsLoggedIn(true);
      setFoto(localStorage.getItem('user_foto') || '');
      setEmail(localStorage.getItem('user_email') || '');
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('user_nome', nome);
    localStorage.setItem('user_telefone', telefone);
    localStorage.setItem('user_endereco', endereco);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const response = await api.post('/auth/google', { token: credentialResponse.credential });
      const data = response.data;
      
      localStorage.setItem('cliente_token', data.token);
      localStorage.setItem('user_nome', data.cliente.nome);
      localStorage.setItem('user_email', data.cliente.email);
      if (data.cliente.foto_url) localStorage.setItem('user_foto', data.cliente.foto_url);
      if (data.cliente.telefone) localStorage.setItem('user_telefone', data.cliente.telefone);
      if (data.cliente.endereco) localStorage.setItem('user_endereco', data.cliente.endereco);
      
      setNome(data.cliente.nome);
      setEmail(data.cliente.email);
      setFoto(data.cliente.foto_url || '');
      if (data.cliente.telefone) setTelefone(data.cliente.telefone);
      if (data.cliente.endereco) setEndereco(data.cliente.endereco);
      
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      alert('Falha ao autenticar com o Google. Tente novamente.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cliente_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_foto');
    setIsLoggedIn(false);
    setFoto('');
    setEmail('');
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-8">
        {isLoggedIn && foto ? (
          <img src={foto} alt="Perfil" className="w-16 h-16 rounded-full border-2 border-brand-500 object-cover" />
        ) : (
          <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-500">
            <User size={32} />
          </div>
        )}
        
        <div className="flex-1">
          <h2 className="text-xl font-heading font-bold text-zinc-900">Minha Conta</h2>
          <p className="text-zinc-500 text-sm">{isLoggedIn ? email : 'Seus dados para agilizar o pedido'}</p>
        </div>
        
        {isLoggedIn && (
          <button onClick={handleLogout} className="flex items-center gap-2 p-2 text-zinc-400 hover:text-red-500 transition-colors">
            <span className="text-sm font-bold">Sair</span>
            <LogOut size={20} />
          </button>
        )}
      </div>

      {!isLoggedIn && (
        <div className="mb-8 p-4 bg-white border border-zinc-200 rounded-xl flex flex-col items-center text-center">
          <p className="text-sm font-bold text-zinc-700 mb-4">Cadastre-se rapidamente para não precisar preencher seus dados sempre</p>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.log('Login Failed');
            }}
            useOneTap
          />
        </div>
      )}

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
