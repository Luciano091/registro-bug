import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle2, X, Loader2 } from 'lucide-react';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const estabelecimento = new URLSearchParams(window.location.search).get('estabelecimento') || localStorage.getItem('estabelecimentoSlug') || 'bisburger';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const response = await api.post('/auth/login', { senha, estabelecimento, email: email.trim() || null });
      if (response.data.token) {
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('estabelecimentoSlug', response.data.estabelecimento.slug);
        if (response.data.usuario) localStorage.setItem('ritmesaSession', JSON.stringify(response.data.usuario));
        navigate('/'); // Vai para o Dashboard
      }
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        setErro('Senha incorreta! Tente novamente.');
      } else if (error.response && error.response.status === 404) {
        setErro('Endereço do estabelecimento não encontrado ou inativo.');
      } else {
        setErro('Erro de conexão com o servidor. Verifique se a API está online.');
        console.error("Erro no login:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4">
      <div className="login-panel w-full max-w-sm animate-in zoom-in-95 duration-500">
        
        <div className="flex flex-col items-center mb-8">
          <div className="login-brand mb-8">
            <div className="brand-mark"><img src="/brand/ritmesa-mark.png" alt="" /></div>
            <div><strong>Ritmesa</strong><span>Seu negócio no ritmo certo</span></div>
          </div>
          <div className="w-14 h-14 bg-orange-50 rounded-2xl border border-orange-100 flex items-center justify-center mb-5">
            <Lock size={24} className="text-brand-600" />
          </div>
          <h1 className="text-3xl font-bold font-heading text-slate-900 mb-2">Acesse sua operação</h1>
          <p className="text-zinc-400 text-center">
            Entre para acompanhar pedidos, caixa e cardápio.
          </p>
        </div>

        <div className="login-form bg-dark-900 border border-white/5 p-6 rounded-3xl shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@restaurante.com.br"
                autoComplete="username"
                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all text-slate-900 placeholder-slate-400"
              />
              <p className="mt-2 text-xs text-slate-500">No primeiro acesso antigo, você ainda pode entrar apenas com a senha.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Senha de acesso"
                  className="w-full bg-dark-950 border border-white/10 rounded-2xl pl-5 pr-12 py-4 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600 text-center text-lg tracking-widest font-bold"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {erro && (
                <p className="text-red-400 text-sm mt-3 text-center animate-in slide-in-from-top-1">{erro}</p>
              )}
            </div>

            
            <div className="flex justify-end mt-2">
              <button type="button" onClick={() => setForgotModal(true)} className="text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors">
                Esqueci minha senha
              </button>
            </div>
            <button

              disabled={!senha || loading}
              className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:hover:bg-brand-500 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-500/25"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Entrar no painel <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center text-sm text-slate-500">
          Plataforma de gestão para food service
        </div>

      </div>
    </div>
  );
};

export default Login;
