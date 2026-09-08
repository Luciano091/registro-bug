export function registerPwa() {
  const hostname = window.location.hostname.toLowerCase();
  const isBisBurger = hostname === 'bisburger.ritmesa.com.br' || window.location.pathname === '/bisburger';
  if (!isBisBurger) return;

  const manifest = document.createElement('link');
  manifest.rel = 'manifest';
  manifest.href = '/manifest.webmanifest';
  document.head.appendChild(manifest);

  const appTitle = document.createElement('meta');
  appTitle.name = 'apple-mobile-web-app-title';
  appTitle.content = 'BisBurger';
  document.head.appendChild(appTitle);

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Falha ao registrar o aplicativo BisBurger:', error);
      });
    });
  }
}
