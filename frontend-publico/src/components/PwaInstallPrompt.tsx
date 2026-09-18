import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      return;
    }
    
    // Detect iOS for custom instructions
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not dismissed recently
      if (!localStorage.getItem('pwa_prompt_dismissed')) {
        setShowPrompt(true);
      }
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    // For iOS, beforeinstallprompt doesn't fire, so we show it manually after 3 seconds
    if (isIosDevice && !localStorage.getItem('pwa_prompt_dismissed')) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

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
            {isIOS 
              ? 'Toque em Compartilhar e depois em "Adicionar à Tela de Início".' 
              : 'Instale nosso aplicativo para fazer pedidos mais rápido!'}
          </p>
        </div>
        
        {!isIOS && (
          <button 
            onClick={handleInstallClick}
            className="shrink-0 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
          >
            Instalar
          </button>
        )}
      </div>
    </div>
  );
};
