import { useState, useEffect } from 'react';
import { Clock, MapPin, X, Phone, Sparkles, ChevronRight } from 'lucide-react';
import api from '../services/api';

const PublicMenu = () => {
  const [config, setConfig] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [amplifiedImage, setAmplifiedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, prodRes] = await Promise.all([
          api.get('/configuracao'),
          api.get('/produtos')
        ]);
        setConfig(configRes.data);
        // Filtra apenas produtos ativos
        setProdutos(prodRes.data.filter((p: any) => p.ativo));
      } catch (error) {
        console.error('Erro ao carregar cardápio:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-[3px] border-transparent border-t-brand-500 border-r-brand-500/30"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles size={20} className="text-brand-500 animate-pulse" />
          </div>
        </div>
        <p className="text-zinc-500 text-sm mt-6 animate-pulse">Carregando cardápio...</p>
      </div>
    );
  }

  // Obter categorias únicas dos produtos
  const categories = ['Todos', ...Array.from(new Set(produtos.map(p => p.categoria)))];
  
  // Filtrar produtos da categoria ativa
  const filteredProducts = activeCategory === 'Todos' 
    ? produtos 
    : produtos.filter(p => p.categoria === activeCategory);

  // Agrupar produtos filtrados por categoria para exibição
  const groupedProducts = filteredProducts.reduce((acc: any, produto: any) => {
    const cat = produto.categoria || 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(produto);
    return acc;
  }, {});

  const categoryEmojis: { [key: string]: string } = {
    'Hambúrguer': '🍔', 'Hamburguer': '🍔', 'Hamburgueres': '🍔',
    'Bebida': '🥤', 'Bebidas': '🥤',
    'Porção': '🍟', 'Porções': '🍟', 'Porcao': '🍟',
    'Sobremesa': '🍰', 'Sobremesas': '🍰',
    'Combo': '⭐', 'Combos': '⭐',
    'Lanche': '🌮', 'Lanches': '🌮',
    'Pizza': '🍕', 'Pizzas': '🍕',
    'Salgado': '🥟', 'Salgados': '🥟',
    'Açaí': '🫐', 'Sorvete': '🍦',
    'Todos': '✨',
  };

  const getEmoji = (cat: string) => categoryEmojis[cat] || '🍽️';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 pb-10" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Hero Banner com Parallax Effect */}
      <div className="h-64 md:h-72 w-full relative overflow-hidden">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent"></div>
        <div className="absolute inset-0 z-[5] bg-gradient-to-b from-black/40 to-transparent"></div>
        <img 
          src="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1400&q=80" 
          alt="Capa" 
          className="w-full h-full object-cover scale-110"
          style={{ filter: 'brightness(0.7) saturate(1.2)' }}
        />
        {/* Floating Particles Effect */}
        <div className="absolute top-10 left-[20%] w-2 h-2 bg-brand-500/40 rounded-full animate-pulse z-10"></div>
        <div className="absolute top-20 right-[30%] w-1.5 h-1.5 bg-amber-400/30 rounded-full animate-pulse z-10" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-16 right-[15%] w-1 h-1 bg-brand-500/50 rounded-full animate-pulse z-10" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-28 relative z-20">
        {/* Store Header Card - Glassmorphism */}
        <div className="relative bg-[#121214]/80 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Glow decorativo */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none"></div>
          
          <div className="flex flex-col items-center text-center relative z-10">
            {/* Logo com ring animado */}
            <div className="relative -mt-20 mb-5">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-500 to-amber-500 animate-spin" style={{ animationDuration: '8s', padding: '3px', margin: '-3px' }}></div>
              <div className="w-28 h-28 rounded-full border-[4px] border-[#0a0a0a] overflow-hidden shadow-2xl relative z-10 bg-dark-800">
                {config?.logo ? (
                  <img src={config.logo} alt={config.nome_empresa} className="w-full h-full object-cover" />
                ) : (
                  <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80" alt="Logo" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
            
            {/* Nome da Empresa */}
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-transparent tracking-tight">
              {config?.nome_empresa || 'Burger Hause'}
            </h1>
            <p className="text-zinc-500 text-sm mt-2 max-w-xs">
              Sabores que conquistam, qualidade que encanta ✨
            </p>
            
            {/* Info Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
              <div className="flex items-center gap-1.5 bg-white/[0.04] backdrop-blur-sm px-4 py-2 rounded-full text-zinc-300 border border-white/[0.06] text-xs font-medium">
                <Clock size={13} className="text-brand-400" />
                <span>{config?.tempo_medio_preparo || 25} min</span>
              </div>
              
              {config?.endereco && (
                <div className="flex items-center gap-1.5 bg-white/[0.04] backdrop-blur-sm px-4 py-2 rounded-full text-zinc-300 border border-white/[0.06] text-xs font-medium">
                  <MapPin size={13} className="text-green-400" />
                  <span className="max-w-[180px] truncate">{config.endereco}</span>
                </div>
              )}

              {config?.telefone && (
                <a 
                  href={`https://wa.me/55${config.telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 px-4 py-2 rounded-full text-green-400 border border-green-500/20 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                >
                  <Phone size={13} />
                  <span>Pedir via WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Category Navigation - Horizontal Scroll */}
        <div className="mt-8 mb-8">
          <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 flex gap-2">
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                  activeCategory === cat 
                    ? 'bg-gradient-to-r from-brand-500 to-amber-500 text-white shadow-lg shadow-brand-500/25 scale-105' 
                    : 'bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12]'
                }`}
              >
                <span>{getEmoji(cat)}</span>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products List */}
        <div className="space-y-10">
          {Object.entries(groupedProducts).map(([categoria, items]: [string, any]) => (
            <div key={categoria} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">{getEmoji(categoria)}</span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {categoria}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                <span className="text-xs text-zinc-600 font-medium">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
              </div>
              
              <div className="space-y-3">
                {items.map((produto: any) => (
                  <div 
                    key={produto.id} 
                    className="group relative bg-[#121214]/60 backdrop-blur-sm border border-white/[0.05] rounded-2xl p-4 flex gap-4 items-center transition-all duration-300 hover:border-brand-500/20 hover:bg-[#121214]/90 hover:shadow-[0_8px_30px_-10px_rgba(249,115,22,0.1)]"
                  >
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-[15px] group-hover:text-brand-400 transition-colors truncate">
                        {produto.nome}
                      </h3>
                      {produto.descricao && (
                        <p className="text-zinc-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                          {produto.descricao}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-brand-400 font-extrabold text-base">
                          R$ {produto.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Product Image */}
                    <div 
                      className="w-[88px] h-[88px] bg-[#1a1a1c] rounded-2xl border border-white/[0.05] overflow-hidden shrink-0 flex items-center justify-center relative cursor-pointer group/img transition-transform duration-300 hover:scale-105"
                      onClick={() => produto.imagem_url && setAmplifiedImage(produto.imagem_url)}
                    >
                       {produto.imagem_url ? (
                         <>
                           <img 
                             src={produto.imagem_url} 
                             alt={produto.nome} 
                             className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" 
                             referrerPolicy="no-referrer" 
                           />
                           {/* Hover overlay para indicar que é clicável */}
                           <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                             <ChevronRight size={20} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-lg" />
                           </div>
                         </>
                       ) : (
                         <div className="w-full h-full bg-gradient-to-br from-brand-500/5 to-amber-500/5 flex items-center justify-center">
                           <span className="font-black text-2xl text-white/[0.06] uppercase tracking-tighter">
                              {produto.nome.substring(0,2)}
                           </span>
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedProducts).length === 0 && (
            <div className="text-center py-16 bg-[#121214]/60 border border-white/[0.05] rounded-3xl">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-zinc-500 font-medium">Nenhum produto encontrado nesta categoria.</p>
              <button 
                onClick={() => setActiveCategory('Todos')}
                className="mt-4 text-brand-400 text-sm font-semibold hover:text-brand-300 transition-colors"
              >
                Ver todos os produtos
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 pb-6 text-center">
          <div className="h-px w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto mb-6"></div>
          <p className="text-zinc-600 text-xs">
            {config?.nome_empresa || 'Burger Hause'} &middot; Cardápio Digital
          </p>
          <p className="text-zinc-700 text-[10px] mt-1">
            Preços e disponibilidade sujeitos a alteração
          </p>
        </div>
      </div>

      {/* Image Modal - Amplified View */}
      {amplifiedImage && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setAmplifiedImage(null)}
        >
          <button 
            className="absolute top-5 right-5 text-white/40 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all backdrop-blur-sm border border-white/10"
            onClick={() => setAmplifiedImage(null)}
          >
            <X size={22} />
          </button>
          <img 
            src={amplifiedImage} 
            alt="Produto" 
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" 
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default PublicMenu;
