import { useState, useEffect } from 'react';
import { User, Save, Phone, MapPin, LogOut, ArrowLeft } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import api from '../services/api';

type NativeGoogleAuth = { signIn: () => Promise<{ credential: string }> };
type CapacitorAuthBridge = {
  isNativePlatform?: () => boolean;
  isPluginAvailable?: (name: string) => boolean;
  Plugins?: { NativeGoogleAuth?: NativeGoogleAuth };
};

export const ContaView = () => {
  const capacitor = (window as Window & { Capacitor?: CapacitorAuthBridge }).Capacitor;
  const isNativeApp = capacitor?.isNativePlatform?.() === true || navigator.userAgent.includes('BisBurgerApp');
  const nativeGoogleAuth = capacitor?.Plugins?.NativeGoogleAuth;
  const hasNativeGoogleAuth = isNativeApp && capacitor?.isPluginAvailable?.('NativeGoogleAuth') === true && typeof nativeGoogleAuth?.signIn === 'function';
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [saved, setSaved] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [foto, setFoto] = useState('');
  const [email, setEmail] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestStep, setGuestStep] = useState<'overview' | 'details'>('overview');

  useEffect(() => {
    setNome(localStorage.getItem('user_nome') || '');
    setTelefone(localStorage.getItem('user_telefone') || '');
    setEndereco(localStorage.getItem('user_endereco') || '');
    
    const token = localStorage.getItem('cliente_token');
    if (token) {
      setIsLoggedIn(true);
      setGuestStep('overview');
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

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setGoogleError('Não foi possível receber a confirmação do Google. Tente novamente.');
      return;
    }
    setGoogleError('');
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
      setGuestStep('overview');
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setGoogleError('Não foi possível entrar com Google agora. Você pode preencher seus dados abaixo.');
    }
  };

  const handleNativeGoogleSignIn = async () => {
    setGoogleError('');
    if (!nativeGoogleAuth?.signIn) {
      setGoogleError('O acesso Google não está disponível neste aplicativo. Baixe a atualização.');
      return;
    }
    setGoogleLoading(true);
    try {
      const credential = await nativeGoogleAuth.signIn();
      await handleGoogleSuccess(credential);
    } catch (error) {
      console.error('Erro no acesso Google do Android:', error);
      setGoogleError('Não foi possível concluir o acesso Google. Tente novamente.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cliente_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_foto');
    setIsLoggedIn(false);
    setFoto('');
    setEmail('');
    setGoogleError('');
    setGuestStep('overview');
  };

  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-8 pt-5 md:px-6">
      <header className={`mb-5 ${!isLoggedIn && guestStep === 'overview' ? 'border-b border-zinc-200 pb-4 text-center' : ''}`}>
        <h1 className="font-heading text-[1.75rem] font-bold leading-tight text-zinc-900">{!isLoggedIn && guestStep === 'overview' ? 'Entrar' : 'Minha conta'}</h1>
        {isLoggedIn && <p className="mt-1 text-sm leading-relaxed text-zinc-500">Gerencie os dados usados nos seus pedidos.</p>}
      </header>

      {isLoggedIn && (
        <section className="mb-4 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          {foto ? <img src={foto} alt="Foto do perfil" className="h-12 w-12 shrink-0 rounded-xl object-cover" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-50 text-brand-600"><User size={23} /></div>}
          <div className="min-w-0 flex-1"><p className="truncate font-heading text-base font-bold text-zinc-900">{nome}</p><p className="truncate text-xs text-zinc-500">{email}</p></div>
          <button type="button" onClick={handleLogout} aria-label="Sair da conta" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"><LogOut size={19} /></button>
        </section>
      )}

      {!isLoggedIn && guestStep === 'overview' && (
        <section className="flex min-h-[calc(100dvh-13.75rem)] flex-col pt-8">
          <p className="mx-auto max-w-xs text-center text-base leading-relaxed text-zinc-600">Entre para acompanhar seus pedidos e salvar seus dados.</p>
          {isNativeApp ? (
            hasNativeGoogleAuth ? (
              <button type="button" onClick={handleNativeGoogleSignIn} disabled={googleLoading} className="mt-7 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-3 text-base font-semibold text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-60">
                <img src="/google-g.png" alt="" className="h-5 w-5 shrink-0 object-contain" />
                {googleLoading ? 'Conectando...' : 'Continuar com Google'}
              </button>
            ) : (
              <p className="mt-5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">Atualize o aplicativo para entrar com Google. <a className="font-bold underline" href="/app-bisburger.apk?v=1.0.3" target="_blank" rel="noreferrer">Baixar atualização</a></p>
            )
          ) : (
            <div className="mt-7 flex justify-center"><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setGoogleError('Não foi possível abrir o login Google. Tente novamente.')} use_fedcm_for_button text="continue_with" size="large" shape="pill" width="280" /></div>
          )}
          {googleError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{googleError}</p>}
          <div className="my-6 flex items-center gap-4 text-xs font-medium text-zinc-400"><span className="h-px flex-1 bg-zinc-200" /><span>ou</span><span className="h-px flex-1 bg-zinc-200" /></div>
          <button type="button" onClick={() => setGuestStep('details')} className="flex min-h-11 w-full items-center justify-center rounded-xl px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900">Continuar sem conta</button>
          <div className="mt-auto flex flex-col items-center pt-8 text-center">
            <p className="font-heading text-xl font-bold tracking-tight text-zinc-800">BisBurger</p>
            <p className="mt-1 text-[11px] text-zinc-400">Pedidos com tecnologia Ritmesa</p>
          </div>
        </section>
      )}

      {(isLoggedIn || guestStep === 'details') && <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
        {!isLoggedIn && <button type="button" onClick={() => setGuestStep('overview')} className="mb-5 flex min-h-9 items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-900"><ArrowLeft size={17} /> Voltar</button>}
        <h2 className="font-heading text-lg font-bold text-zinc-900">Dados para o pedido</h2>
        <p className="mb-5 mt-1 text-xs leading-relaxed text-zinc-500">Salvos neste aparelho para agilizar seus próximos pedidos.</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="conta-nome" className="mb-1.5 block text-xs font-semibold text-zinc-600">Nome completo</label>
            <div className="relative"><User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" /><input id="conta-nome" type="text" autoComplete="name" value={nome} onChange={e => setNome(e.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none" placeholder="Como quer ser chamado?" /></div>
          </div>
          <div>
            <label htmlFor="conta-telefone" className="mb-1.5 block text-xs font-semibold text-zinc-600">WhatsApp</label>
            <div className="relative"><Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" /><input id="conta-telefone" type="tel" autoComplete="tel" value={telefone} onChange={e => setTelefone(e.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none" placeholder="(11) 99999-9999" /></div>
          </div>
          <div>
            <label htmlFor="conta-endereco" className="mb-1.5 block text-xs font-semibold text-zinc-600">Endereço principal</label>
            <div className="relative"><MapPin size={18} className="absolute left-3.5 top-3 text-zinc-400" /><textarea id="conta-endereco" autoComplete="street-address" value={endereco} onChange={e => setEndereco(e.target.value)} className="min-h-[68px] w-full resize-none rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 focus:border-brand-500 focus:outline-none" placeholder="Rua, número, bairro..." /></div>
          </div>
          <button type="button" onClick={handleSave} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl font-bold text-white transition-all active:scale-[.98] ${saved ? 'bg-emerald-500' : 'bg-brand-500 hover:bg-brand-600'}`}>{saved ? 'Dados salvos!' : <><Save size={17} />Salvar dados</>}</button>
        </div>
      </section>}
    </div>
  );
};
