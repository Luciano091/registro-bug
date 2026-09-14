import { useState, useEffect } from 'react';
import { User, Save, Phone, MapPin, LogOut } from 'lucide-react';
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
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-8 pt-5 md:px-6">
      <header className="mb-5 flex items-center gap-3">
        {isLoggedIn && foto ? (
          <img src={foto} alt="Foto do perfil" className="h-12 w-12 shrink-0 rounded-2xl border border-brand-200 object-cover" />
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-brand-600"><User size={24} /></div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-heading font-bold leading-tight text-zinc-900">Minha conta</h1>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{isLoggedIn ? email : 'Seus dados para pedir mais rápido'}</p>
        </div>
        {isLoggedIn && <button type="button" onClick={handleLogout} className="flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"><LogOut size={17} />Sair</button>}
      </header>

      {!isLoggedIn && <section className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-heading font-bold text-zinc-900">Entre com Google</h2>
        <p className="mt-1 text-xs text-zinc-500">Seus dados disponíveis em outros aparelhos.</p>
        {isNativeApp ? (
          hasNativeGoogleAuth ? (
            <button type="button" onClick={handleNativeGoogleSignIn} disabled={googleLoading} className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full border border-[#747775] bg-white px-4 font-semibold text-[#1f1f1f] transition-colors active:bg-zinc-100 disabled:opacity-60">
              <img src="/google-g.png" alt="" className="mr-3 h-5 w-5 object-contain" />
              {googleLoading ? 'Conectando ao Google...' : 'Continuar com Google'}
            </button>
          ) : (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Atualize o aplicativo para entrar com Google. <a className="font-bold underline" href="/app-bisburger.apk?v=1.0.3" target="_blank" rel="noreferrer">Baixar atualização</a>
            </p>
          )
        ) : (
          <div className="mt-3 flex justify-center"><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setGoogleError('Não foi possível abrir o login Google. Tente novamente.')} use_fedcm_for_button text="continue_with" size="large" shape="pill" width="280" /></div>
        )}
        {googleError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-left text-xs text-red-700">{googleError}</p>}
      </section>}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-heading font-bold text-zinc-900">Dados para o pedido</h2>
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
      </section>
    </div>
  );
};
