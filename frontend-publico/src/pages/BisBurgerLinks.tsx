import { useEffect } from 'react';
import { ArrowRight, Camera, MessageCircle, ShoppingBag, Star } from 'lucide-react';

const links = [
  {
    label: 'Pedir novamente',
    description: 'Abra o cardápio da BisBurger',
    href: '/',
    icon: ShoppingBag,
    primary: true,
  },
  {
    label: 'Avaliar no Google',
    description: 'Conte como foi sua experiência',
    href: 'https://g.page/r/CbXZX-Xq-_WcECE/review',
    icon: Star,
  },
  {
    label: 'Falar no WhatsApp',
    description: '(82) 99821-8008',
    href: 'https://wa.me/5582998218008',
    icon: MessageCircle,
  },
  {
    label: 'Seguir no Instagram',
    description: '@bisburger01',
    href: 'https://www.instagram.com/bisburger01/?hl=pt-br',
    icon: Camera,
  },
];

export default function BisBurgerLinks() {
  useEffect(() => {
    document.title = 'BisBurger | Peça, avalie e fale com a gente';
  }, []);

  return (
    <main className="min-h-dvh w-full bg-[#121316] px-5 py-10 text-white sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <img
            src="/pwa/icon-512.png?v=2"
            alt="Logo da BisBurger"
            className="mx-auto h-28 w-28 rounded-full border-4 border-[#fbbf24] object-cover shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
          />
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.28em] text-[#ff9b35]">BisBurger</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Obrigado pelo pedido!</h1>
          <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-zinc-300">
            Quer repetir, contar como foi ou falar com a gente? Escolha uma opção abaixo.
          </p>
        </div>

        <nav aria-label="Links da BisBurger" className="mt-9 space-y-3">
          {links.map(({ label, description, href, icon: Icon, primary }) => (
            <a
              key={label}
              href={href}
              className={`flex min-h-[76px] items-center gap-4 rounded-2xl border px-5 py-4 transition-transform active:scale-[0.99] ${
                primary
                  ? 'border-[#ff8a19] bg-[#ff7a0d] text-[#18110c] shadow-[0_12px_32px_rgba(255,122,13,0.22)]'
                  : 'border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.11]'
              }`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${primary ? 'bg-black/10' : 'bg-[#ff7a0d]/15 text-[#ff9b35]'}`}>
                <Icon aria-hidden="true" size={23} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold leading-tight">{label}</span>
                <span className={`mt-1 block text-sm leading-tight ${primary ? 'text-[#332014]' : 'text-zinc-400'}`}>{description}</span>
              </span>
              <ArrowRight aria-hidden="true" size={20} className="shrink-0" />
            </a>
          ))}
        </nav>

        <p className="mt-9 text-center text-xs text-zinc-500">Feito com carinho pela BisBurger.</p>
      </div>
    </main>
  );
}
