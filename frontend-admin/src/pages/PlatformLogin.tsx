import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import platformApi from '../services/platformApi';

export default function PlatformLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const dashboardPath = window.location.hostname.toLowerCase().startsWith('admin.') ? '/' : '/ritmesa-admin';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErro('');
    try {
      const { data } = await platformApi.post('/platform/auth/login', { email, senha });
      localStorage.setItem('platformToken', data.token);
      navigate(dashboardPath);
    } catch (error: any) {
      setErro(error.response?.data?.detail || 'Não foi possível acessar o painel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="platform-login min-h-screen px-5 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full">
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="brand-mark"><img src="/brand/ritmesa-mark.png" alt="" /></div>
            <div><strong className="block text-xl text-slate-900">Ritmesa</strong><span className="text-xs text-slate-500">Administração da plataforma</span></div>
          </div>
          <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-brand-600"><LockKeyhole size={23} /></div>
            <h1 className="text-2xl font-bold text-slate-900">Painel Ritmesa</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Gerencie estabelecimentos, planos e oportunidades comerciais.</p>
            <div className="mt-7 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">E-mail
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3.5 text-base outline-none focus:border-brand-500" placeholder="admin@ritmesa.com.br" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Senha
                <div className="relative mt-2">
                  <input type={showPassword ? 'text' : 'password'} required value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3.5 pr-12 text-base outline-none focus:border-brand-500" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500" aria-label="Mostrar senha">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
                </div>
              </label>
            </div>
            {erro && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
            <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3.5 font-bold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600 disabled:opacity-60">{loading ? 'Entrando...' : <>Entrar <ArrowRight size={18} /></>}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
