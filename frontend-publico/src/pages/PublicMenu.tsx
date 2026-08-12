import { useState, useEffect, useMemo } from 'react';
import { MapPin, Clock, Utensils, Plus, Flame, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { ProductModal } from '../components/ProductModal';
import { FloatingCart } from '../components/FloatingCart';
import { CheckoutModal } from '../components/CheckoutModal';

const PublicMenu = () => {
  const [config, setConfig] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  
  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, prodRes] = await Promise.all([
          api.get('/configuracao'),
          api.get('/produtos')
        ]);
        const conf = configRes.data;
        setConfig(conf);
        setProdutos(prodRes.data.filter((p: any) => p.ativo));
        
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
    
    // Filtra apenas hambúrgueres
    const burgers = produtos.filter(p => p.categoria && p.categoria.toLowerCase().includes('hamburguer'));
    if (burgers.length === 0) return null;
    
    // Usa o dia do ano para fazer o rodízio (muda 1x por dia)
    const start = new Date(new Date().getFullYear(), 0, 0).getTime();
    const diff = new Date().getTime() - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    return burgers[dayOfYear % burgers.length];
  }, [produtos, activeCategory]);

  // Promoções do Dia
  const promocoesAtivas = useMemo(() => {
    if (activeCategory !== 'Todos') return [];
    return produtos.filter(p => p.is_promocao).slice(0, 2);
  }, [produtos, activeCategory]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0D0D]">
        <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const preferredOrder = [
    'Hamburguer artesanal',
    'Hamburguer',
    'Frituras',
    'Combo',
    'Bebidas'
  ];

  const uniqueCategories = Array.from(new Set(produtos.map(p => p.categoria.trim())));
  
  uniqueCategories.sort((a, b) => {
    const indexA = preferredOrder.findIndex(cat => cat.toLowerCase() === a.toLowerCase());
    const indexB = preferredOrder.findIndex(cat => cat.toLowerCase() === b.toLowerCase());
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

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
    <div className="min-h-screen bg-[#0D0D0D] text-zinc-100 font-sans pb-24 selection:bg-brand-500/30 selection:text-white">
      
      {/* HEADER / HERO */}
      <div className="w-full relative flex flex-col items-center justify-end min-h-[260px] md:min-h-[300px] pt-12 pb-6">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/70 to-black/30 z-10 pointer-events-none"></div>
        <img 
          src="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1400&q=80" 
          alt="Capa" 
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        />
        
        {/* Informações da Loja por cima do Hero */}
        <div className="relative z-20 flex flex-col items-center w-full px-4 mt-auto">
          <div className="w-28 h-28 md:w-32 md:h-32 bg-[#171717] rounded-full p-1 border-2 border-white/10 shadow-2xl mb-4 shrink-0">
            <img src={config?.logo || "/logo.jpg"} alt={config?.nome_empresa || "Logo"} className="w-full h-full object-cover rounded-full" />
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white tracking-wide text-center">
            {config?.nome_empresa || 'Burger Hause'}
          </h1>
          <p className="text-brand-400 font-bold tracking-widest text-sm uppercase mt-1 mb-4 text-center">O Lanche</p>
          
          <div className="flex flex-wrap justify-center items-center gap-3">
             <div className="bg-[#171717]/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 text-xs font-bold text-white shadow-lg">
                {config?.loja_aberta ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse shrink-0"></div>
                    Aberto
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0"></div>
                    Fechado
                  </>
                )}
             </div>
             <div className="bg-[#171717]/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 text-xs font-bold text-white shadow-lg">
                <Clock size={14} className="text-brand-500 shrink-0" />
                ~ {config?.tempo_medio_preparo || 30} min
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-20 mt-6">
        {/* NAVEGAÇÃO DE CATEGORIAS */}
        <div className="sticky top-0 z-30 bg-[#0D0D0D]/95 backdrop-blur-md pt-2 pb-2 -mx-4 px-4 border-b border-white/5 mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:justify-center">
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
                  activeCategory === cat 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
                    : 'bg-[#171717] border border-white/5 text-zinc-400 hover:text-white hover:bg-[#262626]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-12">
          
          {/* 🔥 PROMOÇÕES DO DIA OU DESTAQUE */}
          {promocoesAtivas.length > 0 ? (
            <div className="mb-14">
              <div className="flex items-center mb-4">
                <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                  <Flame size={20} className="text-orange-500" /> Promoção do Dia
                </h2>
              </div>
              <div className="flex flex-col gap-6">
                {promocoesAtivas.map(promocao => (
                  <div 
                    key={promocao.id}
                    className="group relative w-full bg-[#131313] rounded-3xl overflow-hidden cursor-pointer shadow-2xl border border-orange-500/30 transition-all hover:border-orange-500/60 flex items-center min-h-[260px] md:min-h-[300px]"
                    onClick={() => setSelectedProduct(promocao)}
                  >
                    {/* Glows */}
                    <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute left-10 bottom-0 w-40 h-40 bg-red-600/10 rounded-full blur-[60px] pointer-events-none"></div>

                    {/* Left Content (Text) */}
                    <div className="relative z-30 w-[55%] md:w-1/2 p-4 md:p-8 flex flex-col justify-center">
                      <div className="inline-flex items-center gap-2 bg-orange-500 text-white text-xs md:text-sm font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest mb-3 w-fit shadow-[0_0_20px_rgba(249,115,22,0.6)] animate-pulse border border-orange-400">
                        <Flame size={16} fill="currentColor" /> OFERTA
                      </div>
                      
                      <h3 className="font-heading font-bold text-white text-3xl md:text-5xl uppercase tracking-wide mb-2 leading-none drop-shadow-lg">
                        {promocao.nome}
                      </h3>
                      
                      <p className="text-zinc-300 text-[11px] md:text-sm leading-snug mb-4 line-clamp-4 md:line-clamp-3 drop-shadow-md font-medium pr-2">
                        {promocao.descricao}
                      </p>

                      <div className="flex flex-col gap-1 mt-auto">
                        <span className="font-price font-bold text-sm text-zinc-500 line-through">
                          {promocao.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="font-price font-bold text-3xl md:text-4xl text-orange-400 drop-shadow-md">
                          {promocao.preco_promocao?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <div className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 transition-transform group-hover:scale-105 active:scale-95 w-fit mt-2">
                          <Plus size={16} /> Pedir
                        </div>
                      </div>
                    </div>

                    {/* Right Content (Image) */}
                    <div className="absolute right-[-12px] md:right-0 top-1/2 -translate-y-1/2 w-[210px] h-[210px] md:w-[320px] md:h-[320px] flex items-center justify-center pointer-events-none z-20">
                      {promocao.imagem_url ? (
                        <img 
                          src={promocao.imagem_url} 
                          alt={promocao.nome} 
                          className="w-full h-full object-contain scale-[1.45] md:scale-[1.3] transition-transform duration-700 group-hover:scale-[1.55] drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <Utensils size={64} strokeWidth={1} className="text-zinc-700" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : destaqueDoDia && (
            <div className="mb-14">
              <div className="flex items-center mb-4">
                <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                  <Flame size={20} className="text-brand-500" /> Destaque do Dia
                </h2>
              </div>
              
              <div 
                className="group relative w-full bg-[#131313] rounded-3xl overflow-hidden cursor-pointer shadow-2xl border border-brand-500/20 transition-all hover:border-brand-500/50 flex items-center min-h-[260px] md:min-h-[300px] mt-4"
                onClick={() => setSelectedProduct(destaqueDoDia)}
              >
                {/* Glows */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-brand-500/20 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute left-10 bottom-0 w-40 h-40 bg-orange-600/10 rounded-full blur-[60px] pointer-events-none"></div>

                {/* Left Content (Text) */}
                <div className="relative z-30 w-[55%] md:w-1/2 p-4 md:p-8 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-1.5 bg-brand-500 text-white text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 w-fit shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                    <Flame size={12} fill="currentColor" /> Especial
                  </div>
                  
                  <h3 className="font-heading font-bold text-white text-3xl md:text-5xl uppercase tracking-wide mb-2 leading-none drop-shadow-lg">
                    {destaqueDoDia.nome}
                  </h3>
                  
                  <p className="text-zinc-300 text-[11px] md:text-sm leading-snug mb-4 line-clamp-4 md:line-clamp-3 drop-shadow-md font-medium pr-2">
                    {destaqueDoDia.descricao || "Pão brioche, blend artesanal, cheddar, bacon crocante, alface, tomate e molho da casa."}
                  </p>

                  <div className="flex flex-col gap-2 mt-auto">
                    <span className="font-price font-bold text-2xl md:text-3xl text-brand-400 drop-shadow-md">
                      {destaqueDoDia.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <div className="inline-flex items-center justify-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-brand-500/30 transition-transform group-hover:scale-105 active:scale-95 w-fit mt-1">
                      <Plus size={16} /> Pedir
                    </div>
                  </div>
                </div>

                {/* Right Content (Image) completely absolute and NOT constrained by overflow-hidden! */}
                <div className="absolute right-[-12px] md:right-0 top-1/2 -translate-y-1/2 w-[210px] h-[210px] md:w-[320px] md:h-[320px] flex items-center justify-center pointer-events-none z-20">
                  {destaqueDoDia.imagem_url ? (
                    <img 
                      src={destaqueDoDia.imagem_url} 
                      alt={destaqueDoDia.nome} 
                      className="w-full h-full object-contain scale-[1.45] md:scale-[1.3] transition-transform duration-700 group-hover:scale-[1.55] drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <Utensils size={64} strokeWidth={1} className="text-zinc-700" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LISTAGEM DE PRODUTOS POR CATEGORIA */}
          {Object.entries(groupedProducts).map(([categoria, items]: [string, any]) => (
            <div key={categoria} className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-heading font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <div className="text-brand-500 border border-brand-500/30 p-1.5 rounded-lg bg-brand-500/10">
                    <Utensils size={18} />
                  </div>
                  {categoria}
                </h2>
                <button className="text-brand-400 text-xs md:text-sm font-bold flex items-center gap-1 hover:text-brand-300 transition-colors">
                  Ver todas <ChevronRight size={14} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {items.map((produto: any) => (
                  <div 
                    key={produto.id} 
                    className="group bg-[#131313] rounded-2xl p-3 flex gap-4 transition-all hover:bg-[#1a1a1a] cursor-pointer shadow-lg shadow-black/20 border border-white/5"
                    onClick={() => setSelectedProduct(produto)}
                  >
                    <div className="w-[80px] md:w-[100px] h-[80px] md:h-[100px] bg-[#0A0A0B] rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center border border-white/5">
                       {produto.imagem_url ? (
                         <img 
                           src={produto.imagem_url} 
                           alt={produto.nome} 
                           className="w-full h-full object-contain p-1.5 transition-transform duration-500 group-hover:scale-110 drop-shadow-md" 
                           referrerPolicy="no-referrer" 
                         />
                       ) : (
                         <Utensils size={24} strokeWidth={1.5} className="text-zinc-700" />
                       )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center py-1 pr-1">
                      <div>
                        <h3 className="font-sans font-semibold text-white text-[15px] md:text-[16px] tracking-tight leading-tight line-clamp-1">
                          {produto.nome}
                        </h3>
                        <p className="text-zinc-400 text-[11px] md:text-xs mt-1 line-clamp-2 leading-snug">
                          {produto.descricao || categoria}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-price font-bold text-[15px] md:text-[16px] text-brand-400 tracking-wide">
                          {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-zinc-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                          <Plus size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedProducts).length === 0 && (
            <div className="text-center py-16 bg-[#171717] rounded-3xl border border-white/5">
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
      </div>

      {/* RODAPÉ */}
      <footer className="mt-20 border-t border-white/5 bg-[#0A0A0B] py-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#171717] rounded-full p-1 border border-white/10 mb-4 opacity-70 grayscale">
            <img src={config?.logo || "/logo.jpg"} alt="Logo" className="w-full h-full object-cover rounded-full" />
          </div>
          <h4 className="font-heading text-xl text-zinc-500 mb-2">{config?.nome_empresa || 'Burger Hause'}</h4>
          {config?.endereco && (
            <p className="text-zinc-600 text-sm max-w-sm flex items-center justify-center gap-1.5">
              <MapPin size={14} />
              {config.endereco}
            </p>
          )}
        </div>
      </footer>

      {/* MODALS & FLOATING CART */}
      {selectedProduct && (
        <ProductModal 
          produto={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
      
      <FloatingCart onOpen={() => setIsCheckoutOpen(true)} />
      
      {isCheckoutOpen && (
        <CheckoutModal 
          onClose={() => setIsCheckoutOpen(false)} 
        />
      )}
    </div>
  );
};

export default PublicMenu;
