import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import api from '../services/api';

const Login = () => {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const response = await api.post('/auth/login', { senha });
      if (response.data.token) {
        localStorage.setItem('adminToken', response.data.token);
        navigate('/'); // Vai para o Dashboard
      }
    } catch (error) {
      setErro('Senha incorreta! Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm animate-in zoom-in-95 duration-500">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-dark-900 rounded-3xl border border-white/5 flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Lock size={32} className="text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold font-heading text-white mb-2">Área Restrita</h1>
          <p className="text-zinc-500 text-center">
            Digite a senha administrativa para acessar o painel de controle.
          </p>
        </div>

        <div className="bg-dark-900 border border-white/5 p-6 rounded-3xl shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <div className="relative">
                <input 
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Senha de Acesso"
                  className="w-full bg-dark-950 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600 text-center text-lg tracking-widest font-bold"
                  autoFocus
                />
              </div>
              {erro && (
                <p className="text-red-400 text-sm mt-3 text-center animate-in slide-in-from-top-1">{erro}</p>
              )}
            </div>

            <button 
              type="submit"
              disabled={!senha || loading}
              className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:hover:bg-brand-500 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-500/25"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Entrar no Painel <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center">
           <button onClick={() => navigate('/menu-publico')} className="text-zinc-500 hover:text-brand-400 transition-colors text-sm font-semibold">
              Ver Cardápio Público
           </button>
        </div>

      </div>
    </div>
  );
};

export default Login;
