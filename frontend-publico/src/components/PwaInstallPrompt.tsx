import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { getEstablishmentSlug } from '../services/api';

export const PwaInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  
  useEffect(() => {
    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;

    // Se estiver no iOS, não mostramos o botão de APK (pois APK não instala no iPhone)
    if (isIosDevice) return;

    // Mostra o banner após 2 segundos se não foi fechado antes
    if (!localStorage.getItem('apk_prompt_dismissed')) {
      const timer = setTimeout(() => setShowPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem('apk_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;
  
  // Só vamos mostrar o banner de APK para o BisBurger (conforme a lógica do footer)
  if (getEstablishmentSlug() !== 'bisburger') return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-xl border border-brand-100 p-4 relative flex items-center gap-4">
        <button onClick={dismiss} className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={16} />
        </button>
        
        <div className="bg-brand-50 rounded-xl p-3 text-brand-600 shrink-0">
          <Download size={24} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 text-sm">Baixe nosso App!</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
            Instale o aplicativo da BisBurger para Android e faça pedidos mais rápido!
          </p>
        </div>
        
        <a 
          href="/app-bisburger.apk?v=2.0.1"
          download="BisBurger.apk"
          onClick={dismiss}
          className="shrink-0 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors text-center"
        >
          Baixar APK
        </a>
      </div>
    </div>
  );
};
