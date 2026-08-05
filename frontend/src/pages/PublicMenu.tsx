import { useState, useEffect } from 'react';
import { Clock, MapPin } from 'lucide-react';
import api from '../services/api';

const PublicMenu = () => {
  const [config, setConfig] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

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
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans pb-10">
      {/* Imagem de Fundo (Capa) */}
      <div className="h-48 w-full relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1000&q=80" 
          alt="Capa" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-20 relative z-20">
        {/* Cabeçalho da Loja */}
        <div className="bg-dark-900 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-dark-800 rounded-full border-4 border-brand-500 overflow-hidden shadow-xl -mt-16 mb-4 flex-shrink-0">
            {config?.logo ? (
              <img src={config.logo} alt={config.nome_empresa} className="w-full h-full object-cover" />
            ) : (
              <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80" alt="Logo" className="w-full h-full object-cover" />
            )}
          </div>
          <h1 className="text-2xl font-bold font-heading text-white">{config?.nome_empresa || 'Burger Hause'}</h1>
          <p className="text-zinc-400 text-sm mt-1 mb-4">Bem-vindo ao nosso cardápio digital!</p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium w-full">
            <div className="flex items-center gap-1.5 bg-dark-800 px-3 py-1.5 rounded-full text-zinc-300">
              <Clock size={14} className="text-brand-400" />
              {config?.tempo_medio_preparo} min
            </div>
          </div>
        </div>

        {/* Endereço (Opcional) */}
        {config?.endereco && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-400 text-center">
            <MapPin size={16} className="text-brand-500 shrink-0" />
            <span className="truncate">{config.endereco}</span>
          </div>
        )}

        {/* Navegação de Categorias */}
        <div className="mt-8 mb-6 overflow-x-auto hide-scrollbar -mx-4 px-4 flex gap-2">
          {categories.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full font-semibold transition-all ${
                activeCategory === cat 
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25' 
                  : 'bg-dark-900 border border-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Lista de Produtos */}
        <div className="space-y-8">
          {Object.entries(groupedProducts).map(([categoria, items]: [string, any]) => (
            <div key={categoria} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold font-heading text-white mb-4 flex items-center gap-2">
                {categoria}
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
              </h2>
              
              <div className="space-y-4">
                {items.map((produto: any) => (
                  <div 
                    key={produto.id} 
                    className="bg-dark-900 border border-white/5 rounded-2xl p-4 flex gap-4 items-center group transition-colors hover:border-brand-500/30"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-base truncate">{produto.nome}</h3>
                      <p className="text-brand-400 font-bold mt-1 text-sm">
                        R$ {produto.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="w-20 h-20 bg-dark-800 rounded-xl border border-white/5 overflow-hidden shrink-0 flex items-center justify-center text-zinc-600 relative">
                       <span className="font-bold font-heading text-2xl text-white/10 group-hover:text-white/20 transition-colors uppercase">
                          {produto.nome.substring(0,2)}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedProducts).length === 0 && (
            <div className="text-center py-10 bg-dark-900 border border-white/5 rounded-2xl">
              <p className="text-zinc-500">Nenhum produto encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicMenu;
