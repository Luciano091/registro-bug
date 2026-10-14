import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, CheckCircle2, X, Loader2 } from 'lucide-react';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
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
        if (response.data.estabelecimento.nome) localStorage.setItem('estabelecimentoNome', response.data.estabelecimento.nome);
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

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim(), estabelecimento });
      setForgotSuccess(true);
    } catch {
      setForgotError('Não foi possível solicitar o link agora. Tente novamente.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-screen min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 selection:bg-brand-500/20">
      <div className="login-panel w-full animate-in zoom-in-95 duration-300">
        
        <div className="login-brand mb-5 flex items-center justify-center gap-3">
          <div className="brand-mark">
            <img src="/brand/ritmesa-mark.png" alt="Ritmesa" />
          </div>
          <div className="text-left">
            <strong className="block text-base font-bold text-slate-900 leading-tight">Ritmesa</strong>
            <span className="block text-xs text-slate-500 leading-tight">Seu negócio no ritmo certo</span>
          </div>
        </div>

        <div className="login-form bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-900/5">
          <div className="mb-6 text-left">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight">Acesse sua operação</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Entre para acompanhar pedidos, caixa e cardápio.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-left">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@restaurante.com.br"
                autoComplete="username"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 sm:py-3 text-sm focus:outline-none transition-all text-slate-900 placeholder:text-slate-400 text-left"
              />
              <p className="mt-1.5 text-xs text-slate-400 text-left leading-normal">
                Acesso antigo? Entre preenchendo apenas a senha.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Senha</label>
                <button
                  type="button"
                  onClick={() => setForgotModal(true)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua senha de acesso"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 pr-11 py-2.5 sm:py-3 focus:outline-none transition-all text-slate-900 placeholder:text-slate-400 text-left text-sm sm:text-base font-medium"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {erro && (
                <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 text-xs font-medium mt-2 text-center animate-in slide-in-from-top-1">{erro}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!senha || loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:hover:bg-brand-500 text-white font-bold rounded-xl py-2.5 sm:py-3 px-4 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-brand-500/20 text-sm sm:text-base mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Entrar no painel <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="login-footer mt-4 text-center text-xs text-slate-400">
          <a
            href="https://wa.me/5582998218008?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20acesso%20ao%20painel%20Ritmesa"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-600 transition-colors"
          >
            Precisa de ajuda? Fale com o suporte
          </a>
        </div>

      </div>
      {forgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleForgot} className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <button type="button" onClick={() => { setForgotModal(false); setForgotSuccess(false); setForgotError(''); }} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
            <h2 className="mb-1 text-xl font-bold text-slate-900">Recuperar senha</h2>
            {forgotSuccess ? (
              <div className="py-4 text-center">
                <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={38} />
                <p className="text-sm text-slate-600">Se o e-mail existir, enviaremos um link válido por 15 minutos.</p>
                <button type="button" onClick={() => { setForgotModal(false); setForgotSuccess(false); }} className="mt-5 w-full rounded-xl bg-slate-100 hover:bg-slate-200 py-2.5 text-sm font-bold text-slate-700 transition">Voltar ao login</button>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs text-slate-500">Digite o e-mail cadastrado no painel.</p>
                <input type="email" required value={forgotEmail} onChange={event => setForgotEmail(event.target.value)} placeholder="seu@email.com" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20" />
                {forgotError && <p className="mt-2 text-xs text-red-500">{forgotError}</p>}
                <button disabled={forgotLoading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 disabled:opacity-50">
                  {forgotLoading ? <Loader2 className="animate-spin" size={18} /> : 'Enviar link'}
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default Login;
