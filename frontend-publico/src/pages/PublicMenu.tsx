import { useState, useEffect, useMemo } from 'react';
import { MapPin, Clock, Utensils, Plus } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0D0D]">
        <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const categories = ['Todos', ...Array.from(new Set(produtos.map(p => p.categoria)))];
  
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
                <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse shrink-0"></div>
                Aberto
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
        <div className="sticky top-0 z-30 bg-[#0D0D0D]/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 border-b border-white/5 mb-8">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar md:flex-wrap md:justify-center">
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
          
          {/* 🌟 DESTAQUE DO DIA */}
          {destaqueDoDia && (
            <div className="mb-12">
              <h2 className="text-2xl font-heading font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-brand-500">🌟</span> Destaque do Dia
              </h2>
              
              <div 
                className="group relative w-full bg-[#171717] rounded-3xl overflow-hidden cursor-pointer shadow-2xl shadow-brand-500/5 border border-brand-500/20 transition-all hover:shadow-brand-500/20 hover:border-brand-500/40"
                onClick={() => setSelectedProduct(destaqueDoDia)}
              >
                {/* Imagem Ampliada */}
                <div className="w-full h-[280px] md:h-[340px] bg-[#111112] relative overflow-hidden flex items-center justify-center">
                  {/* Spotlight FORTE (brilho radial laranja bem visível atrás do hambúrguer) */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.4)_0%,transparent_70%)] pointer-events-none mix-blend-screen opacity-80 group-hover:opacity-100 transition-opacity duration-700"></div>
                  
                  {destaqueDoDia.imagem_url ? (
                    <img 
                      src={destaqueDoDia.imagem_url} 
                      alt={destaqueDoDia.nome} 
                      className="w-full h-full object-contain scale-[1.25] md:scale-[1.15] -translate-y-4 transition-transform duration-700 group-hover:scale-[1.35] drop-shadow-[0_20px_40px_rgba(249,115,22,0.4)]" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <Utensils size={64} strokeWidth={1} className="text-zinc-700 mb-12" />
                  )}
                  
                  {/* Badge */}
                  <div className="absolute top-4 right-4 bg-brand-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider z-20">
                    Especial
                  </div>
                </div>

                {/* Informações overlay (Degradê suave subindo do fundo) */}
                <div className="p-5 md:p-6 bg-gradient-to-t from-[#111112] via-[#111112]/80 to-transparent absolute bottom-0 w-full flex flex-col justify-end pt-28 pointer-events-none">
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-sans font-bold text-white text-xl md:text-2xl tracking-tight leading-tight drop-shadow-md">
                        {destaqueDoDia.nome}
                      </h3>
                      {destaqueDoDia.descricao && (
                        <p className="text-zinc-300 text-sm mt-1.5 line-clamp-2 leading-relaxed drop-shadow-md">
                          {destaqueDoDia.descricao}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-price font-bold text-[22px] md:text-[26px] text-brand-400 drop-shadow-md">
                        {destaqueDoDia.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-brand-500/30 transition-transform group-hover:scale-105 active:scale-95">
                        <Plus size={16} /> Pedir
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LISTAGEM DE PRODUTOS POR CATEGORIA */}
          {Object.entries(groupedProducts).map(([categoria, items]: [string, any]) => (
            <div key={categoria} className="pt-4 border-t border-white/5 first:border-0 first:pt-0">
              <h2 className="text-2xl font-heading font-bold text-white mb-6 uppercase tracking-wide">
                {categoria}
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map((produto: any) => (
                  <div 
                    key={produto.id} 
                    className="group bg-[#171717] rounded-2xl p-3 flex gap-4 transition-all hover:bg-[#262626] cursor-pointer shadow-lg shadow-black/30 border border-white/5"
                    onClick={() => setSelectedProduct(produto)}
                  >
                    <div className="w-[110px] h-[110px] bg-[#0D0D0D] rounded-xl overflow-hidden shrink-0 relative">
                       {produto.imagem_url ? (
                         <img 
                           src={produto.imagem_url} 
                           alt={produto.nome} 
                           className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-110" 
                           referrerPolicy="no-referrer" 
                         />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-[#171717]">
                           <Utensils size={32} strokeWidth={1.5} className="text-zinc-700" />
                         </div>
                       )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1 pr-2">
                      <div>
                        <h3 className="font-sans font-semibold text-white text-[16px] md:text-[18px] tracking-tight leading-tight">
                          {produto.nome}
                        </h3>
                        {produto.descricao && (
                          <p className="text-zinc-400 text-[13px] mt-1.5 leading-snug font-medium line-clamp-2">
                            {produto.descricao}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-price font-bold text-[16px] text-brand-400 tracking-wide">
                          {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <div className="px-3 py-1.5 bg-white/5 rounded-lg text-xs font-bold text-white group-hover:bg-brand-500 transition-colors">
                          Adicionar
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
          empresaPhone={config?.telefone || '559999999999'} 
        />
      )}
    </div>
  );
};

export default PublicMenu;
