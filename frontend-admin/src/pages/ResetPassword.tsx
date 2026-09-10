import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  if (!token) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col justify-center items-center p-4">
        <div className="bg-dark-900 border border-white/5 p-8 rounded-3xl w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Link inválido</h1>
          <p className="text-zinc-400 mb-6">O link de recuperação de senha está incompleto ou inválido.</p>
          <button onClick={() => navigate('/login')} className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-colors">Voltar ao login</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmar) {
      setError('As senhas não coincidem');
      return;
    }
    if (senha.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', { token, nova_senha: senha });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocorreu um erro ao redefinir a senha. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-500/20 rounded-full blur-[120px] pointer-events-none opacity-50" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20 mb-4 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
          <Lock className="w-10 h-10 text-brand-500" />
        </div>
        <h2 className="text-3xl font-heading font-bold text-white tracking-tight">Nova senha</h2>
        <p className="mt-2 text-zinc-400 text-sm">Crie uma nova senha segura para o seu acesso</p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-dark-900 border border-white/5 py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 relative overflow-hidden backdrop-blur-xl">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Senha alterada!</h3>
              <p className="text-zinc-400">Sua senha foi redefinida com sucesso. Redirecionando para o login...</p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nova Senha</label>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-white/10 rounded-xl bg-dark-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all sm:text-sm"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Confirmar Nova Senha</label>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-white/10 rounded-xl bg-dark-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all sm:text-sm"
                    placeholder="Repita a nova senha"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-brand-500/20 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-brand-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden mt-8"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <>Salvar nova senha <ArrowRight size={20} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
