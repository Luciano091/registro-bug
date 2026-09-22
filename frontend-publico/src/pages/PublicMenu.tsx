import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Clock, Utensils, Truck, ChevronRight, Gift, Crown, Plus, Flame, Check, Ticket, Receipt, User } from 'lucide-react';
import api from '../services/api';
import { getEstablishmentSlug } from '../services/api';
import { ProductModal } from '../components/ProductModal';
import { FloatingCart } from '../components/FloatingCart';
import { BottomNav, type TabType } from '../components/BottomNav';
import { CuponsView } from './CuponsView';
import { PedidosView } from './PedidosView';
import { ContaView } from './ContaView';
import { CheckoutModal } from '../components/CheckoutModal';
import { LojaFechadaModal } from '../components/LojaFechadaModal';
import { PromoPopup } from '../components/PromoPopup';
import { PwaInstallPrompt } from '../components/PwaInstallPrompt';
import { useCart } from '../contexts/CartContext';

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

const isRunningInNativeApp = () => {
  const capacitor = (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;

  return capacitor?.isNativePlatform?.() === true
    || capacitor?.getPlatform?.() === 'android'
    || navigator.userAgent.includes('BisBurgerApp');
};

const PublicMenu = () => {
  const { mesaNumero } = useParams();
  const [config, setConfig] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [categoriasConfiguradas, setCategoriasConfiguradas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [activeTab, setActiveTab] = useState<TabType>('cardapio');
  const [showLojaFechada, setShowLojaFechada] = useState(false);
  const isNativeApp = useMemo(isRunningInNativeApp, []);
  
  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { addItem, cartCount } = useCart();
  const [addedProductId, setAddedProductId] = useState<number | null>(null);

  const quickAdd = useCallback((produto: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (config && !config.loja_aberta) {
      setShowLojaFechada(true);
      return;
    }

    if (produto.grupos_opcoes?.some((grupo: any) => grupo.ativo && grupo.opcoes?.some((opcao: any) => opcao.ativo))) {
      setSelectedProduct(produto);
      return;
    }

    addItem({
      id: crypto.randomUUID(),
      produtoId: produto.id,
      nome: produto.nome,
      precoBase: produto.promocao_ativa && produto.preco_promocao ? produto.preco_promocao : produto.preco,
      quantidade: 1,
      adicionais: [],
      observacao: ''
    });
    setAddedProductId(produto.id);
    setTimeout(() => setAddedProductId(null), 1200);
  }, [addItem, config]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, prodRes, categoriasRes] = await Promise.all([
          api.get(`/public/${getEstablishmentSlug()}/configuracao`),
          api.get(`/public/${getEstablishmentSlug()}/produtos`),
          api.get(`/public/${getEstablishmentSlug()}/categorias`)
        ]);
        const conf = configRes.data;
        setConfig(conf);
        setProdutos(prodRes.data.filter((p: any) => p.ativo));
        setCategoriasConfiguradas(categoriasRes.data);
        document.title = `${conf.nome_empresa || 'Cardápio'} | Ritmesa`;
        
        // Atualizar o ícone (favicon) dinamicamente com a logo do restaurante
        if (conf.logo) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = conf.logo;
        }
      } catch (error) {
        console.error('Erro ao carregar cardápio:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Hooks não podem ser chamados após o return!
  // Produto Destaque do Dia (Rodízio diário)
  const destaqueDoDia = useMemo(() => {
    if (activeCategory !== 'Todos') return null;
    
    const produtosComImagem = produtos.filter(p => p.imagem_url);
    const candidatos = produtosComImagem.length > 0 ? produtosComImagem : produtos;
    if (candidatos.length === 0) return null;
    
    // Usa o dia do ano para fazer o rodízio (muda 1x por dia)
    const start = new Date(new Date().getFullYear(), 0, 0).getTime();
    const diff = new Date().getTime() - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    return candidatos[dayOfYear % candidatos.length];
  }, [produtos, activeCategory]);

  // Promoções do Dia
  const promocoesAtivas = useMemo(() => {
    if (activeCategory !== 'Todos') return [];
    return produtos.filter(p => p.promocao_ativa);
  }, [produtos, activeCategory]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50">
        <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const configuredNames = categoriasConfiguradas.map(categoria => categoria.nome);
  const legacyNames = Array.from(new Set(produtos.map(p => p.categoria?.trim()).filter(Boolean))) as string[];
  const uniqueCategories = [...configuredNames, ...legacyNames.filter(nome => !configuredNames.includes(nome))];

  const categories = ['Todos', ...uniqueCategories];
  const filteredProducts = activeCategory === 'Todos' 
    ? produtos 
    : produtos.filter(p => p.categoria === activeCategory);

  const groupedProducts = filteredProducts.reduce((acc: any, produto: any) => {
    const cat = produto.categoria || 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(produto);
    return acc;
  }, {});

  return (
    <div className={`public-menu min-h-screen text-zinc-900 font-sans ${cartCount > 0 ? "pb-[6.5rem]" : "pb-20"} md:pb-8 selection:bg-brand-500/30 selection:text-zinc-900`}>
      <PromoPopup />
      {!isNativeApp && <PwaInstallPrompt />}
      
      {mesaNumero && (
        <div className="bg-brand-500 text-white text-center py-2 font-medium sticky top-0 z-[60] text-sm md:text-base shadow-sm">
          📍 Você está pedindo para a <strong>Mesa {mesaNumero}</strong>
        </div>
      )}
      <header className="public-desktop-nav sticky top-0 z-50 hidden border-b border-zinc-200/80 bg-white/95 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-8">
          <button onClick={() => setActiveTab('cardapio')} className="flex items-center gap-2.5" aria-label="Ir para o cardápio">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-200">
              <img src="/brand/ritmesa-mark.png" alt="" className="h-7 w-7 object-contain" />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#10233f]">Ritmesa</span>
          </button>
          <nav className="flex items-center gap-1 rounded-2xl bg-zinc-100 p-1" aria-label="Navegação principal">
            {([
              ['cardapio', 'Cardápio', Utensils],
              ['cupons', 'Cupons', Ticket],
              ['pedidos', 'Pedidos', Receipt],
              ['conta', 'Conta', User],
            ] as const).map(([tab, label, Icon]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-current={activeTab === tab ? 'page' : undefined}
                className={`flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-white text-brand-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
              >
                <Icon size={17} /> {label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      
      {/* DYNAMIC VIEWS */}
      {activeTab === 'cardapio' && (
        <div className="animate-in fade-in duration-300">
          {/* HEADER / HERO */}

      <div className="w-full bg-[#111] pt-6 pb-6 md:pt-10 md:pb-8 relative overflow-hidden rounded-b-[32px] md:rounded-b-[48px] shadow-2xl">
        {/* Background Image / Glow */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-[#111]">
           {/* Imagem de fundo estilo Hamburgueria Artesanal (unsplash) ou a capa_url do restaurante */}
           <img src={config?.capa_url || "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1000&auto=format&fit=crop"} alt="Capa" className="absolute top-0 right-0 w-[85%] h-[120%] object-cover opacity-35 object-right-top" />
           {/* Gradiente escuro para garantir legibilidade perfeita */}
           <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#111]/90 to-transparent"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/50 to-transparent"></div>
           <div className="absolute -right-20 -top-20 w-80 h-80 bg-orange-500/20 rounded-full blur-[80px]"></div>
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Top Section: Logo (Left) + Text/Facts (Right) */}
          <div className="flex items-start gap-3 md:gap-4">
            
            {/* Logo */}
            <div className="shrink-0 rounded-[20px] border border-white/10 bg-black/50 p-1 shadow-xl backdrop-blur-md mt-1">
              <img src={config?.logo || "/logo.png"} alt={config?.nome_empresa || "Logo"} className="h-[84px] w-[84px] rounded-[14px] object-cover md:h-[120px] md:w-[120px]" />
            </div>
            
            {/* Right Column */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center">
                <h1 className="text-[26px] font-black tracking-tight text-white md:text-4xl drop-shadow-md relative py-1">
                  {(() => {
                    const name = config?.nome_empresa || 'BisBurger';
                    if (name.toLowerCase() === 'bisburger') {
                      return (
                        <>
                          B
                          <span className="relative inline-block mx-[0.5px]">
                            <Crown className="w-[16px] h-[16px] text-[#facc15] fill-[#facc15] absolute -top-[9px] left-1/2 -translate-x-[45%] rotate-[12deg] drop-shadow-sm" strokeWidth={1} />
                            ı
                          </span>
                          s<span className="text-[#facc15]">Burger</span>
                        </>
                      );
                    }
                    const iIndex = name.toLowerCase().indexOf('i');
                    if (iIndex === -1) return name;
                    return (
                      <>
                        {name.substring(0, iIndex)}
                        <span className="relative inline-block">
                          <Crown className="w-[14px] h-[14px] text-[#facc15] fill-[#facc15] absolute -top-[11px] left-1/2 -translate-x-1/2 rotate-12 drop-shadow-sm" strokeWidth={1} />
                          {name[iIndex]}
                        </span>
                        {name.substring(iIndex + 1)}
                      </>
                    );
                  })()}
                </h1>
              </div>
              
              <div className="mt-1 flex flex-col items-start gap-1.5">
                {config?.loja_aberta ? (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 border border-emerald-500/30">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-[11px] font-bold text-emerald-300 tracking-wide uppercase">Aberto agora</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 shadow-sm">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-white"></div>
                    <span className="text-[12px] font-bold text-white tracking-wide">Fechado</span>
                  </div>
                )}
                
                <span className="text-[12px] text-zinc-300 mt-0.5 line-clamp-2 leading-snug md:text-base font-light">
                  {config?.descricao || 'Hambúrgueres artesanais para momentos especiais'}
                </span>
              </div>
              
                          </div>
          </div>

                    {/* Middle Section: Facts (FULL WIDTH, CENTERED) */}
          <div className="mt-5 flex w-full items-center justify-center gap-4">

                 {/* Delivery Tag */}
                 <div className="flex items-center gap-2">
                   <Truck className="w-4 h-4 shrink-0 text-white opacity-90" strokeWidth={1.5} />
                   <div className="flex flex-col">
                     <span className="text-[11px] font-bold text-white whitespace-nowrap leading-tight">
                       {!config?.entrega_habilitada ? 'Retirada' : config?.taxa_entrega === 0 || !config?.taxa_entrega ? 'Entrega grátis' : `Taxa ${Number(config.taxa_entrega).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                     </span>
                     <span className="text-[9px] text-zinc-400 leading-tight">
                       {config?.entrega_modo === 'bairro' ? 'na região' : 'em Cajueiro-AL'}
                     </span>
                   </div>
                 </div>
                 
                 {/* Divider */}
                 <div className="h-6 w-px bg-white/20"></div>
                 
                 {/* Time Tag */}
                 <div className="flex items-center gap-2">
                   <Clock className="w-4 h-4 shrink-0 text-white opacity-90" strokeWidth={1.5} />
                   <div className="flex flex-col">
                     <span className="text-[11px] font-bold text-white whitespace-nowrap leading-tight">{config?.tempo_medio_preparo || 30} min</span>
                     <span className="text-[9px] text-zinc-400 leading-tight">tempo médio</span>
                   </div>
                 </div>
                        </div>

          {/* Bottom Section: Cashback Full Width Banner */}
          <div 
            onClick={() => setActiveTab('conta')}
            className="mt-5 flex w-full cursor-pointer items-center justify-between rounded-xl bg-gradient-to-r from-[#fae8c3] to-[#f4d193] px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-transform active:scale-[0.98] md:hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-orange-600 shrink-0" />
              <span className="text-[12px] leading-tight md:text-sm font-medium text-[#8a550d]">
                Ganhe <strong className="text-orange-700">2% de cashback</strong> em todos os seus pedidos!
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-orange-600/60 shrink-0" />
          </div>

        </div>
      </div>

      <main className="menu-content relative z-20 mx-auto mt-3 min-h-[55vh] max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* NAVEGAÇÃO DE CATEGORIAS */}
        <div className="category-strip sticky top-0 z-40 -mx-4 mb-6 border-b border-zinc-200/80 bg-[#f7f7f8]/95 px-4 pb-2 pt-2 backdrop-blur-xl md:top-16 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategory(cat)}
                className={`min-h-11 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeCategory === cat 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
                    : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-10">
          
          {/* 🔥 PROMOÇÕES DO DIA OU DESTAQUE */}
          {promocoesAtivas.length > 0 ? (
            <section className="promotion-section mb-10">
              <div className="promotion-heading mb-4 flex items-end justify-between gap-4">
                <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
                  <Flame size={20} className="shrink-0 text-brand-500" /> <span className="sm:hidden">Ofertas do dia</span><span className="hidden sm:inline">Promoções para você</span>
                </h2>
                {promocoesAtivas.length > 1 && (
                  <span className="shrink-0 text-xs font-medium text-zinc-500">Deslize →</span>
                )}
              </div>
              <div className={promocoesAtivas.length > 1
                ? 'hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 scroll-px-4 pb-3 sm:-mx-6 sm:px-6 sm:scroll-px-6 lg:-mx-8 lg:px-8 lg:scroll-px-8'
                : 'grid gap-4 lg:max-w-4xl'}>
                {promocoesAtivas.map(promocao => (
                  <div 
                    key={promocao.id}
                    className={`group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg sm:min-h-56 sm:flex-row sm:items-stretch ${promocoesAtivas.length > 1 ? 'w-[86vw] shrink-0 snap-start snap-always sm:w-[560px] lg:w-[620px]' : 'w-full'}`}
                    onClick={() => setSelectedProduct(promocao)}
                  >
                    <div className="promo-image relative flex h-48 w-full items-center justify-center overflow-hidden bg-orange-50 sm:h-56 sm:min-h-0 sm:w-[42%] sm:order-2">
                      {promocao.imagem_url ? (
                        <img 
                          src={promocao.imagem_url} 
                          alt={promocao.nome} 
                          className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <Utensils size={64} strokeWidth={1} className="text-zinc-700" />
                      )}
                    </div>

                    <div className="promo-content relative z-10 flex w-full flex-1 flex-col p-5 sm:order-1 sm:p-6">
                      <div className="promo-badge mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                        <Flame size={14} fill="currentColor" /> Oferta
                      </div>
                      
                      <h3 className="mb-2 text-xl font-bold leading-tight text-zinc-900 sm:text-2xl">
                        {promocao.nome}
                      </h3>
                      
                      <p className="promo-description mb-5 line-clamp-3 text-sm leading-relaxed text-zinc-500">
                        {promocao.descricao}
                      </p>

                      <div className="flex items-center gap-4 mt-auto">
                        <div className="flex flex-col">
                          <span className="font-price font-bold text-sm text-zinc-500 line-through">
                            {promocao.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          <span className="font-price text-xl font-bold text-brand-600 sm:text-2xl">
                            {promocao.preco_promocao?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => quickAdd(promocao, e)}
                          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all active:scale-95 ${addedProductId === promocao.id ? 'bg-emerald-500' : 'bg-brand-500 hover:bg-brand-600'}`}
                        >
                          {addedProductId === promocao.id ? <><Check size={16} /> Adicionado!</> : <><Plus size={16} /> Pedir</>}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : destaqueDoDia && (
            <section className="featured-section mb-10">
              <div className="featured-heading flex items-center mb-4">
                <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
                  <Flame size={20} className="text-brand-500" /> Destaque do dia
                </h2>
              </div>
              
              <div 
                className="group relative mt-4 flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg sm:min-h-56 sm:flex-row sm:items-stretch lg:max-w-4xl"
                onClick={() => setSelectedProduct(destaqueDoDia)}
              >
                <div className="featured-image relative flex h-52 w-full items-center justify-center overflow-hidden bg-orange-50 sm:h-56 sm:min-h-0 sm:w-[42%] sm:order-2">
                  {destaqueDoDia.imagem_url ? (
                    <img 
                      src={destaqueDoDia.imagem_url} 
                      alt={destaqueDoDia.nome} 
                      className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <Utensils size={64} strokeWidth={1} className="text-zinc-700" />
                  )}
                </div>

                <div className="featured-content relative z-10 flex w-full flex-1 flex-col p-5 sm:order-1 sm:p-7">
                  <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                    <Flame size={13} fill="currentColor" /> Especial
                  </div>
                  
                  <h3 className="mb-2 text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl">
                    {destaqueDoDia.nome}
                  </h3>
                  
                  <p className="featured-description mb-5 text-sm leading-relaxed text-zinc-500">
                    {destaqueDoDia.descricao || "Uma escolha especial do cardápio para o seu pedido de hoje."}
                  </p>

                  <div className="flex items-center gap-4 mt-auto">
                    <span className="font-price text-xl font-bold text-brand-600 sm:text-2xl">
                      {destaqueDoDia.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <button 
                      onClick={(e) => quickAdd(destaqueDoDia, e)}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all active:scale-95 ${addedProductId === destaqueDoDia.id ? 'bg-emerald-500' : 'bg-brand-500 hover:bg-brand-600'}`}
                    >
                      {addedProductId === destaqueDoDia.id ? <><Check size={16} /> Adicionado!</> : <><Plus size={16} /> Pedir</>}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* LISTAGEM DE PRODUTOS POR CATEGORIA */}
          {Object.entries(groupedProducts).map(([categoria, items]: [string, any]) => (
            <section key={categoria} className="pt-1">
              <div className="flex items-center mb-4">
                <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
                  <div className="rounded-lg bg-brand-50 p-1.5 text-brand-600 ring-1 ring-brand-100">
                    <Utensils size={18} />
                  </div>
                  {categoria}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((produto: any) => (
                  <div 
                    key={produto.id} 
                    className="group flex min-h-32 cursor-pointer gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md sm:min-h-36"
                    onClick={() => setSelectedProduct(produto)}
                  >
                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 sm:h-28 sm:w-24 lg:w-28">
                       {produto.imagem_url ? (
                         <img 
                           src={produto.imagem_url} 
                           alt={produto.nome} 
                           className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                           referrerPolicy="no-referrer" 
                         />
                       ) : (
                         <Utensils size={28} strokeWidth={1.5} className="text-zinc-400" />
                       )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h3 className="font-sans text-[15px] font-bold leading-snug tracking-tight text-zinc-900">
                          {produto.nome}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-zinc-500">
                          {produto.descricao || ''}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex flex-col">
                          {produto.promocao_ativa && produto.preco_promocao ? (
                            <>
                              <span className="font-price text-[11px] text-zinc-400 line-through leading-none mb-0.5">
                                {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span className="font-price text-[16px] font-bold leading-none tracking-wide text-brand-600">
                                {produto.preco_promocao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </>
                          ) : (
                            <span className="font-price font-bold text-[16px] text-zinc-800 tracking-wide">
                              {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={(e) => quickAdd(produto, e)}
                          aria-label={`Adicionar ${produto.nome} ao carrinho`}
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${addedProductId === produto.id ? 'scale-105 bg-emerald-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600 active:scale-95'}`}
                        >
                          {addedProductId === produto.id ? <Check size={18} /> : <Plus size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {Object.keys(groupedProducts).length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-zinc-200">
              <p className="text-zinc-500 font-medium">Nenhum produto encontrado nesta categoria.</p>
              <button 
                onClick={() => setActiveCategory('Todos')}
                className="mt-4 text-brand-400 font-bold hover:text-brand-300"
              >
                Ver todos os produtos
              </button>
            </div>
          )}
        </div>
      </main>

      {/* RODAPÉ */}
      <footer className="mt-4 pb-4">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 text-center opacity-70">
          <h4 className="text-xs font-semibold text-zinc-500">{config?.nome_empresa || 'Seu Restaurante'}</h4>
          {config?.endereco && (
            <p className="mt-0.5 text-zinc-400 text-[10px] flex items-center justify-center gap-1 font-medium">
              <MapPin size={10} />
              {config.endereco}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-zinc-400">
            <img src="/brand/ritmesa-mark.png" alt="" className="w-3 h-3 object-contain" />
            Pedidos com tecnologia <a href="https://www.ritmesa.com.br/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 font-bold hover:underline">Ritmesa</a>
          </div>
          {getEstablishmentSlug() === 'bisburger' && !isNativeApp && (
            <div className="mt-3">
              <a href="/app-bisburger.apk?v=2.0.0" download="BisBurger.apk" className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 px-3 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Baixar App
              </a>
            </div>
          )}
        </div>
      </footer>

      
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl">
        {activeTab === 'cupons' && <CuponsView />}
        {activeTab === 'pedidos' && <PedidosView />}
        {activeTab === 'conta' && <ContaView />}
      </div>

      {/* MODALS & FLOATING CART */}

      {selectedProduct && (
        <ProductModal 
          produto={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          lojaAberta={config?.loja_aberta}
          onLojaFechada={() => { setSelectedProduct(null); setShowLojaFechada(true); }}
        />
      )}
      
      <div className="hidden md:block">
        <FloatingCart onOpen={() => setIsCheckoutOpen(true)} />
      </div>
      <BottomNav onOpenCart={() => setIsCheckoutOpen(true)} activeTab={activeTab} onChangeTab={setActiveTab} />
      
      {isCheckoutOpen && (
        <CheckoutModal 
          onClose={() => setIsCheckoutOpen(false)} 
          lojaAberta={config?.loja_aberta}
          mesaNumero={mesaNumero}
        />
      )}

      {showLojaFechada && (
        <LojaFechadaModal
          onClose={() => setShowLojaFechada(false)}
          tempoMedio={config?.tempo_medio_preparo}
        />
      )}
    </div>
  );
};

export default PublicMenu;
