import { useState } from 'react';
import { Check, Download, Share2, Smartphone } from 'lucide-react';

const APK_URL = 'https://painel.ritmesa.com.br/ritmesa-entregador.apk';

export default function DriverAppDownload({ dark = false }: { dark?: boolean }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const data = {
      title: 'Ritmesa Entregador',
      text: 'Baixe o aplicativo Ritmesa Entregador para receber e acompanhar suas entregas.',
      url: APK_URL,
    };
    if (navigator.share) {
      await navigator.share(data).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(APK_URL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className={`relative overflow-hidden rounded-2xl border p-5 md:p-6 ${dark ? 'border-white/10 bg-slate-900/70 text-white' : 'border-orange-200 bg-gradient-to-br from-orange-50 to-white text-slate-900 shadow-sm'}`}>
      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-400/10" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-900 text-orange-400 shadow-lg"><Smartphone size={24} /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-heading text-xl font-bold">Ritmesa Entregador</h2><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">APK assinado · v1.0.0</span></div>
            <p className={`mt-1 max-w-2xl text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>Aplicativo para entregadores com GPS ativo durante a rota, acompanhamento do pedido e navegação pelo Google Maps ou Waze.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a href={APK_URL} download="Ritmesa-Entregador-v1.0.0.apk" className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600"><Download size={18} /> Baixar APK</a>
          <button type="button" onClick={share} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${dark ? 'border-white/15 bg-white/5 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{copied ? <Check size={18} className="text-emerald-500" /> : <Share2 size={18} />}{copied ? 'Link copiado' : 'Compartilhar'}</button>
        </div>
      </div>
      <p className={`relative mt-4 border-t pt-3 text-xs ${dark ? 'border-white/10 text-slate-400' : 'border-orange-100 text-slate-500'}`}>O entregador deve permitir localização precisa e notificações. O GPS permanece ativo somente enquanto houver uma entrega sendo acompanhada.</p>
    </section>
  );
}
