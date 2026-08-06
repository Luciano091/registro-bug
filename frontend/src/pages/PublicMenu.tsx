import { useState, useEffect } from 'react';
import { MapPin, X, ChevronRight, Clock, Info, Utensils } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F0F11]">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-zinc-800 border-t-white"></div>
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
    <div className="min-h-screen bg-[#0F0F11] text-zinc-100 font-sans pb-16 selection:bg-brand-500/30 selection:text-white">
      {/* Banner Minimalista */}
      <div className="h-56 w-full relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F11] to-transparent z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1400&q=80" 
          alt="Capa" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 -mt-24 relative z-20">
        
        {/* Cabeçalho Limpo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-32 h-32 bg-[#18181A] rounded-full p-1 border-4 border-[#0F0F11] overflow-hidden shadow-2xl mb-4 relative z-20">
            <img src={config?.logo || "/logo.jpg"} alt={config?.nome_empresa || "Logo"} className="w-full h-full object-cover rounded-full" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            {config?.nome_empresa || 'Burger Hause'}
          </h1>
          
          {config?.endereco && (
            <p className="text-zinc-400 text-sm mt-2 flex items-center justify-center gap-1.5 font-medium">
              <MapPin size={14} className="text-zinc-500" />
              {config.endereco}
            </p>
          )}

          <div className="flex items-center gap-2 mt-4">
             <div className="bg-[#18181A] px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <Clock size={14} className="text-zinc-400" />
                ~ {config?.tempo_medio_preparo || 25} min
             </div>
             <div className="bg-[#18181A] px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <Info size={14} className="text-zinc-400" />
                Aberto
             </div>
          </div>
        </div>

        {/* Navegação de Categorias Elegante */}
        <div className="sticky top-0 z-30 bg-[#0F0F11]/90 backdrop-blur-md pt-4 pb-4 -mx-4 px-4 border-b border-white/[0.04] mb-8">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar md:justify-center">
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full font-medium text-sm transition-colors ${
                  activeCategory === cat 
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                    : 'bg-[#18181A] text-zinc-400 hover:text-zinc-100 hover:bg-[#202022]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Listagem de Produtos */}
        <div className="space-y-12">
          {Object.entries(groupedProducts).map(([categoria, items]: [string, any]) => (
            <div key={categoria}>
              <h2 className="text-xl font-bold text-white mb-6">
                {categoria}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((produto: any) => (
                  <div 
                    key={produto.id} 
                    className="group bg-[#18181A] rounded-2xl p-4 flex gap-4 transition-colors hover:bg-[#202022] cursor-pointer"
                    onClick={() => produto.imagem_url && setAmplifiedImage(produto.imagem_url)}
                  >
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-bold text-white text-[16px] md:text-[17px] tracking-tight truncate leading-tight">
                          {produto.nome}
                        </h3>
                        {produto.descricao && (
                          <p className="text-zinc-400 text-[13px] mt-1.5 line-clamp-2 leading-snug font-medium">
                            {produto.descricao}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 font-bold text-[16px] text-brand-400 tracking-wide">
                        {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                    
                    <div className="w-[100px] h-[100px] bg-[#0F0F11] rounded-xl overflow-hidden shrink-0 relative">
                       {produto.imagem_url ? (
                         <>
                           <img 
                             src={produto.imagem_url} 
                             alt={produto.nome} 
                             className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                             referrerPolicy="no-referrer" 
                           />
                           <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ChevronRight size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                           </div>
                         </>
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-[#141416] border border-white/5">
                           <Utensils size={32} strokeWidth={1.5} className="text-zinc-700" />
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedProducts).length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-500">Nenhum produto encontrado nesta categoria.</p>
              <button 
                onClick={() => setActiveCategory('Todos')}
                className="mt-4 text-white font-medium hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal da Imagem Ampliada */}
      {amplifiedImage && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setAmplifiedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white p-2 rounded-full bg-white/5 transition-colors"
            onClick={() => setAmplifiedImage(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={amplifiedImage} 
            alt="Produto em destaque" 
            className="max-w-full max-h-[85vh] object-contain rounded-xl" 
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default PublicMenu;
