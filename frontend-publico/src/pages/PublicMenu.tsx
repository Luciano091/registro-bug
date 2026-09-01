import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapPin, Clock, Utensils, Plus, Flame, Check } from 'lucide-react';
import api from '../services/api';
import { ProductModal } from '../components/ProductModal';
import { FloatingCart } from '../components/FloatingCart';
import { BottomNav, type TabType } from '../components/BottomNav';
import { CuponsView } from './CuponsView';
import { PedidosView } from './PedidosView';
import { ContaView } from './ContaView';
import { CheckoutModal } from '../components/CheckoutModal';
import { LojaFechadaModal } from '../components/LojaFechadaModal';
import { useCart } from '../contexts/CartContext';

const PublicMenu = () => {
  const [config, setConfig] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [activeTab, setActiveTab] = useState<TabType>('cardapio');
  const [showLojaFechada, setShowLojaFechada] = useState(false);
  
  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { addItem } = useCart();
  const [addedProductId, setAddedProductId] = useState<number | null>(null);

  const quickAdd = useCallback((produto: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (config && !config.loja_aberta) {
      setShowLojaFechada(true);
      return;
    }

    addItem({
      id: crypto.randomUUID(),
      produtoId: produto.id,
      nome: produto.nome,
      precoBase: produto.is_promocao && produto.preco_promocao ? produto.preco_promocao : produto.preco,
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50">
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
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans pb-32 md:pb-24 selection:bg-brand-500/30 selection:text-zinc-900">
      
      {/* DYNAMIC VIEWS */}
      {activeTab === 'cardapio' && (
        <div className="animate-in fade-in duration-300">
          {/* HEADER / HERO */}

      <div className="w-full bg-white border-b border-zinc-200 pt-6 pb-4 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-5">
            <div className="w-28 h-28 md:w-32 md:h-32 bg-white rounded-full p-0.5 border-2 border-zinc-200 shrink-0 overflow-hidden shadow-md">
              <img src={config?.logo || "/logo.jpg"} alt={config?.nome_empresa || "Logo"} className="w-full h-full object-cover rounded-full" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-heading font-black text-zinc-900 uppercase tracking-tight leading-tight">
                {config?.nome_empresa || 'Burger Hause'}
              </h1>
              
              <div className="flex items-center gap-2 mt-1.5">
                {config?.loja_aberta ? (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse"></div>
                    <span className="text-sm font-bold text-[#22C55E]">Aberto</span>
                  </>
                ) : (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="text-sm font-bold text-red-500">Fechado</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-4">
             <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold border border-emerald-100">
                <MapPin size={14} />
                {config?.taxa_entrega === 0 || !config?.taxa_entrega ? 'Grátis' : `( Taxa ${Math.floor(config.taxa_entrega)} Real )`}
             </div>
             <div className="bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold border border-zinc-200">
                <Clock size={14} />
                {config?.tempo_medio_preparo || 30} min
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-20 mt-4">
        {/* NAVEGAÇÃO DE CATEGORIAS */}
        <div className="sticky top-0 z-40 bg-zinc-50/95 backdrop-blur-md pt-2 pb-2 -mx-4 px-4 border-b border-zinc-200 mb-8">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 md:flex-wrap md:justify-center">
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
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

        <div className="space-y-12">
          
          {/* 🔥 PROMOÇÕES DO DIA OU DESTAQUE */}
          {promocoesAtivas.length > 0 ? (
            <div className="mb-14">
              <div className="flex items-center mb-4">
                <h2 className="text-xl font-heading font-bold text-zinc-900 flex items-center gap-2 uppercase tracking-wide">
                  <Flame size={20} className="text-orange-500" /> Promoção do Dia
                </h2>
              </div>
              <div className={`flex ${promocoesAtivas.length > 1 ? 'overflow-x-auto snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0' : ''} gap-4 md:gap-6 pb-4`}>
                {promocoesAtivas.map(promocao => (
                  <div 
                    key={promocao.id}
                    className={`group relative shrink-0 ${promocoesAtivas.length > 1 ? 'w-[85vw] md:w-[600px] snap-center' : 'w-full'} bg-white rounded-3xl overflow-hidden cursor-pointer shadow-2xl border border-orange-500/30 transition-all hover:border-orange-500/60 flex flex-col md:flex-row md:items-center`}
                    onClick={() => setSelectedProduct(promocao)}
                  >
                    {/* Glows */}
                    <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute left-10 bottom-0 w-40 h-40 bg-red-600/10 rounded-full blur-[60px] pointer-events-none"></div>

                    {/* Image - Top on mobile, Right on desktop */}
                    <div className="relative w-full md:w-1/2 h-[260px] md:h-[300px] flex items-center justify-center md:order-2 overflow-hidden">
                      {promocao.imagem_url ? (
                        <img 
                          src={promocao.imagem_url} 
                          alt={promocao.nome} 
                          className="w-[290px] h-[290px] md:w-[280px] md:h-[280px] object-contain transition-transform duration-700 group-hover:scale-110 drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <Utensils size={64} strokeWidth={1} className="text-zinc-700" />
                      )}
                    </div>

                    {/* Content - Bottom on mobile, Left on desktop */}
                    <div className="relative z-30 w-full md:w-1/2 p-5 md:p-8 flex flex-col md:order-1">
                      <div className="inline-flex items-center gap-2 bg-orange-500 text-white text-xs md:text-sm font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest mb-3 w-fit shadow-[0_0_20px_rgba(249,115,22,0.6)] animate-pulse border border-orange-400">
                        <Flame size={16} fill="currentColor" /> OFERTA
                      </div>
                      
                      <h3 className="font-heading font-bold text-zinc-900 text-2xl md:text-3xl lg:text-4xl uppercase tracking-wide mb-2 leading-none drop-shadow-lg">
                        {promocao.nome}
                      </h3>
                      
                      <p className="text-zinc-500 text-xs md:text-sm leading-snug mb-4 drop-shadow-md font-medium">
                        {promocao.descricao}
                      </p>

                      <div className="flex items-center gap-4 mt-auto">
                        <div className="flex flex-col">
                          <span className="font-price font-bold text-sm text-zinc-500 line-through">
                            {promocao.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          <span className="font-price font-bold text-2xl md:text-3xl text-orange-400 drop-shadow-md">
                            {promocao.preco_promocao?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => quickAdd(promocao, e)}
                          className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${addedProductId === promocao.id ? 'bg-emerald-500 shadow-emerald-500/30 scale-105' : 'bg-orange-500 shadow-orange-500/30 group-hover:scale-105'}`}
                        >
                          {addedProductId === promocao.id ? <><Check size={16} /> Adicionado!</> : <><Plus size={16} /> Pedir</>}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : destaqueDoDia && (
            <div className="mb-14">
              <div className="flex items-center mb-4">
                <h2 className="text-xl font-heading font-bold text-zinc-900 flex items-center gap-2 uppercase tracking-wide">
                  <Flame size={20} className="text-brand-500" /> Destaque do Dia
                </h2>
              </div>
              
              <div 
                className="group relative w-full bg-white rounded-3xl overflow-hidden cursor-pointer shadow-2xl border border-brand-500/20 transition-all hover:border-brand-500/50 flex flex-col md:flex-row md:items-center mt-4"
                onClick={() => setSelectedProduct(destaqueDoDia)}
              >
                {/* Glows */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-brand-500/20 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute left-10 bottom-0 w-40 h-40 bg-orange-600/10 rounded-full blur-[60px] pointer-events-none"></div>

                {/* Image - Top on mobile, Right on desktop */}
                <div className="relative w-full md:w-1/2 h-[260px] md:h-[300px] flex items-center justify-center md:order-2 overflow-hidden">
                  {destaqueDoDia.imagem_url ? (
                    <img 
                      src={destaqueDoDia.imagem_url} 
                      alt={destaqueDoDia.nome} 
                      className="w-[290px] h-[290px] md:w-[280px] md:h-[280px] object-contain transition-transform duration-700 group-hover:scale-110 drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <Utensils size={64} strokeWidth={1} className="text-zinc-700" />
                  )}
                </div>

                {/* Content - Bottom on mobile, Left on desktop */}
                <div className="relative z-30 w-full md:w-1/2 p-5 md:p-8 flex flex-col md:order-1">
                  <div className="inline-flex items-center gap-1.5 bg-brand-500 text-white text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 w-fit shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                    <Flame size={12} fill="currentColor" /> Especial
                  </div>
                  
                  <h3 className="font-heading font-bold text-zinc-900 text-2xl md:text-5xl uppercase tracking-wide mb-2 leading-none drop-shadow-lg">
                    {destaqueDoDia.nome}
                  </h3>
                  
                  <p className="text-zinc-500 text-xs md:text-sm leading-snug mb-4 drop-shadow-md font-medium">
                    {destaqueDoDia.descricao || "Pão brioche, blend artesanal, cheddar, bacon crocante, alface, tomate e molho da casa."}
                  </p>

                  <div className="flex items-center gap-4 mt-auto">
                    <span className="font-price font-bold text-2xl md:text-3xl text-brand-400 drop-shadow-md">
                      {destaqueDoDia.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <button 
                      onClick={(e) => quickAdd(destaqueDoDia, e)}
                      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${addedProductId === destaqueDoDia.id ? 'bg-emerald-500 shadow-emerald-500/30 scale-105' : 'bg-brand-500 shadow-brand-500/30 group-hover:scale-105'}`}
                    >
                      {addedProductId === destaqueDoDia.id ? <><Check size={16} /> Adicionado!</> : <><Plus size={16} /> Pedir</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LISTAGEM DE PRODUTOS POR CATEGORIA */}
          {Object.entries(groupedProducts).map(([categoria, items]: [string, any]) => (
            <div key={categoria} className="pt-2">
              <div className="flex items-center mb-4">
                <h2 className="text-lg md:text-xl font-heading font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
                  <div className="text-brand-500 border border-brand-500/30 p-1.5 rounded-lg bg-brand-500/10">
                    <Utensils size={18} />
                  </div>
                  {categoria}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4">
                {items.map((produto: any) => (
                  <div 
                    key={produto.id} 
                    className="group bg-white flex gap-4 transition-all cursor-pointer border-b border-zinc-100 py-4 last:border-b-0"
                    onClick={() => setSelectedProduct(produto)}
                  >
                    <div className="w-[100px] h-[100px] bg-zinc-100 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center">
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
                        <h3 className="font-sans font-bold text-zinc-900 text-[15px] tracking-tight leading-tight">
                          {produto.nome}
                        </h3>
                        <p className="text-zinc-400 text-[12px] mt-1 leading-snug line-clamp-2">
                          {produto.descricao || ''}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex flex-col">
                          {produto.is_promocao && produto.preco_promocao ? (
                            <>
                              <span className="font-price text-[11px] text-zinc-400 line-through leading-none mb-0.5">
                                {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span className="font-price font-bold text-[16px] text-brand-400 tracking-wide leading-none">
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
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${addedProductId === produto.id ? 'bg-emerald-500 text-white scale-110' : 'bg-brand-500 text-white hover:bg-brand-400 active:scale-90'}`}
                        >
                          {addedProductId === produto.id ? <Check size={18} /> : <Plus size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
      </div>

      {/* AVISO IMPORTANTE */}
      <div className="max-w-4xl mx-auto px-6 mt-16">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 text-center flex flex-col items-center">
          <span className="bg-brand-500/20 text-brand-400 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
            Aviso Importante
          </span>
          <p className="text-zinc-500 text-sm max-w-lg leading-relaxed">
            Trabalhamos com duas linhas de hambúrgueres para melhor te atender: 
            nossa tradicional linha de <strong className="text-zinc-900">Hambúrgueres Artesanais</strong> (100% Carne Bovina fresca) 
            e nossa linha econômica com <strong className="text-zinc-900">Hambúrgueres Tradicionais</strong> (Processados). 
            Verifique a descrição de cada produto!
          </p>
        </div>
      </div>

      {/* RODAPÉ */}
      <footer className="mt-12 border-t border-zinc-200 bg-white py-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center text-center">
          <h4 className="font-heading text-xl text-zinc-500 mb-2">{config?.nome_empresa || 'Burger Hause'}</h4>
          {config?.endereco && (
            <p className="text-zinc-600 text-sm max-w-sm flex items-center justify-center gap-1.5">
              <MapPin size={14} />
              {config.endereco}
            </p>
          )}
        </div>
      </footer>

      
        </div>
      )}

      {activeTab === 'cupons' && <CuponsView />}
      {activeTab === 'pedidos' && <PedidosView />}
      {activeTab === 'conta' && <ContaView />}

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
