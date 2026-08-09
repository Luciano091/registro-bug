import { useState, useEffect } from 'react';
import { Plus, Edit2, Search, X } from 'lucide-react';
import api from '../services/api';
import { useAppData } from '../contexts/AppDataContext';

const Menu = () => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [removerFundo, setRemoverFundo] = useState(false);
  const [novoProduto, setNovoProduto] = useState({ nome: '', preco: '', preco_compra: '', categoria: '', descricao: '', imagem_url: '', controlar_estoque: false, estoque: '' });

  const [activeCategory, setActiveCategory] = useState('Todos');

  const { produtos: cachedProdutos, produtosLoaded, refreshProdutos } = useAppData();
  const produtos = cachedProdutos;

  useEffect(() => {
    if (!produtosLoaded) refreshProdutos();
  }, [produtosLoaded, refreshProdutos]);



  const openEditProductModal = (item: any) => {
    setNovoProduto({ 
      nome: item.nome, 
      preco: item.preco.toString(), 
      preco_compra: item.preco_compra ? item.preco_compra.toString() : '', 
      categoria: item.categoria,
      descricao: item.descricao || '',
      imagem_url: item.imagem_url || '',
      controlar_estoque: item.controlar_estoque || false,
      estoque: item.estoque !== null && item.estoque !== undefined ? item.estoque.toString() : ''
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    try {
      if (removerFundo) {
        // Run AI locally in the browser
        const { default: removeBackground } = await import('@imgly/background-removal');
        const imageBlob = await removeBackground(file);
        // Create a new File from the blob
        file = new File([imageBlob], "image-transparent.png", { type: "image/png" });
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setNovoProduto({ ...novoProduto, imagem_url: response.data.url });
    } catch (error: any) {
      console.error('Erro ao fazer upload da imagem:', error);
      const detail = error.response?.data?.detail || error.message;
      alert(`Erro ao enviar imagem: ${detail}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    try {
      const payload = {
        nome: novoProduto.nome,
        preco: parseFloat(novoProduto.preco),
        preco_compra: parseFloat(novoProduto.preco_compra) || 0.0,
        categoria: novoProduto.categoria || 'Geral',
        descricao: novoProduto.descricao || null,
        imagem_url: novoProduto.imagem_url || null,
        controlar_estoque: novoProduto.controlar_estoque,
        estoque: parseInt(novoProduto.estoque) || 0
      };

      if (editingId) {
        await api.put(`/produtos/${editingId}`, payload);
      } else {
        await api.post('/produtos', payload);
      }
      
      setShowModal(false);
      setNovoProduto({ nome: '', preco: '', preco_compra: '', categoria: '', descricao: '', imagem_url: '', controlar_estoque: false, estoque: '' });
      setEditingId(null);
      refreshProdutos();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar produto");
    }
  };

  const categoriasUnicas = Array.from(new Set(produtos.map(p => {
    const cat = p.categoria.trim();
    return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  })));
  
  const categorias = ['Todos', ...categoriasUnicas];

  let filtered = produtos.map(p => ({
    ...p,
    categoriaNormalizada: p.categoria.trim().charAt(0).toUpperCase() + p.categoria.trim().slice(1).toLowerCase()
  }));

  if (activeCategory !== 'Todos') {
    filtered = filtered.filter(p => p.categoriaNormalizada === activeCategory);
  }
  if (search) {
    filtered = filtered.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-heading drop-shadow-sm">Cardápio</h2>
          <p className="text-zinc-400 mt-1">Gerencie os produtos e categorias.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setNovoProduto({ nome: '', preco: '', preco_compra: '', categoria: '', descricao: '', imagem_url: '', controlar_estoque: false, estoque: '' });
            setShowModal(true);
          }}
          className="premium-btn px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Novo Produto</span>
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
        <div className="flex gap-2 p-1 bg-dark-800/50 backdrop-blur-md border border-white/5 rounded-xl overflow-x-auto custom-scrollbar shadow-lg">
          {categorias.map(cat => (
            <button
              key={cat as string}
              onClick={() => {
                setActiveCategory(cat as string);
                setSearch('');
              }}
              className={`px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                activeCategory === cat && !search 
                  ? 'bg-white/10 text-white font-medium shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {cat as string}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full md:w-72 bg-dark-800/50 backdrop-blur-md border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all shadow-lg"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(produto => (
            <div key={produto.id} className="glass-card p-5 rounded-2xl group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {produto.categoria}
                  </span>
                  {produto.controlar_estoque && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ml-2 ${produto.estoque <= 3 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
                      {produto.estoque <= 3 ? '🔥 ' : '📦 '}{produto.estoque} unid.
                    </span>
                  )}
                  <button 
                    onClick={() => openEditProductModal(produto)}
                    className="text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all bg-dark-900 p-1.5 rounded-lg border border-white/10 hover:border-brand-500/50"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
                <h3 className="font-bold text-lg text-white mb-1 group-hover:text-brand-400 transition-colors font-heading">{produto.nome}</h3>
              </div>
              <div className="mt-4 flex flex-col gap-1">
                <span className="text-xl font-bold text-zinc-300">
                  {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                {produto.preco_compra > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Custo: {produto.preco_compra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <span className="text-emerald-500 font-medium">Lucro: {(produto.preco - produto.preco_compra).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-10 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
            <p className="text-zinc-500">Nenhum produto encontrado nesta categoria.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass border border-white/10 rounded-3xl p-6 w-full max-w-md animate-in zoom-in-95 shadow-2xl max-h-[95vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold font-heading">{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nome do Produto</label>
                <input 
                  required 
                  value={novoProduto.nome} 
                  onChange={e => setNovoProduto({...novoProduto, nome: e.target.value})} 
                  placeholder="Ex: X-Burger Duplo"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Categoria</label>
                <input 
                  required 
                  list="categorias-list"
                  value={novoProduto.categoria} 
                  onChange={e => setNovoProduto({...novoProduto, categoria: e.target.value})} 
                  placeholder="Ex: Hamburguer"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600"
                />
                <datalist id="categorias-list">
                  {categoriasUnicas.map(cat => (
                    <option key={cat as string} value={cat as string} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Descrição (Ingredientes)</label>
                <textarea 
                  value={novoProduto.descricao || ''} 
                  onChange={e => setNovoProduto({...novoProduto, descricao: e.target.value})} 
                  placeholder="Ex: Pão brioche, 150g de blend angus, queijo prato..."
                  rows={2}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Imagem do Produto</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input 
                      type="url"
                      value={novoProduto.imagem_url || ''} 
                      onChange={e => setNovoProduto({...novoProduto, imagem_url: e.target.value})} 
                      placeholder="URL (ou anexe um arquivo)"
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600 mb-2"
                    />
                    <label className="cursor-pointer premium-btn py-2 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm w-full text-center mb-3">
                      {uploadingImage ? 'Enviando...' : 'Fazer Upload (PNG/JPG)'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        disabled={uploadingImage}
                        className="hidden" 
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={removerFundo}
                        onChange={(e) => setRemoverFundo(e.target.checked)}
                        className="w-4 h-4 rounded border-white/10 bg-dark-900 text-brand-500 focus:ring-brand-500/50"
                      />
                      Remover fundo (Automático)
                    </label>
                  </div>
                  {novoProduto.imagem_url && (
                    <div className="w-24 h-24 shrink-0 bg-dark-900 rounded-xl overflow-hidden border border-white/10">
                      <img src={novoProduto.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Preço Custo (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={novoProduto.preco_compra} 
                    onChange={e => setNovoProduto({...novoProduto, preco_compra: e.target.value})} 
                    placeholder="10.00"
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-zinc-300 placeholder-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Preço Venda (R$)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={novoProduto.preco} 
                    onChange={e => setNovoProduto({...novoProduto, preco: e.target.value})} 
                    placeholder="25.90"
                    className="w-full bg-dark-900 border border-brand-500/30 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-white placeholder-zinc-600 font-bold"
                  />
                </div>
              </div>

              <div className="bg-dark-900 border border-white/5 p-4 rounded-xl space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={novoProduto.controlar_estoque}
                    onChange={e => setNovoProduto({...novoProduto, controlar_estoque: e.target.checked})}
                    className="w-5 h-5 rounded border-white/10 bg-dark-800 text-brand-500 focus:ring-brand-500/50 focus:ring-offset-dark-900"
                  />
                  <span className="text-sm text-white font-medium">Controlar Estoque?</span>
                </label>
                
                {novoProduto.controlar_estoque && (
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Quantidade em Estoque</label>
                    <input 
                      type="number" 
                      required={novoProduto.controlar_estoque}
                      value={novoProduto.estoque} 
                      onChange={e => setNovoProduto({...novoProduto, estoque: e.target.value})} 
                      placeholder="Ex: 50"
                      className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600"
                    />
                  </div>
                )}
              </div>
              
              <button type="submit" className="w-full premium-btn py-3.5 rounded-xl font-bold mt-4 text-base">
                {editingId ? 'Salvar Alterações' : 'Adicionar Produto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
