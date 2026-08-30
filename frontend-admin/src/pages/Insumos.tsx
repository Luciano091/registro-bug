import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Package, Search } from 'lucide-react';
import api from '../services/api';

const Insumos = () => {
  const [insumos, setInsumos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [novoInsumo, setNovoInsumo] = useState({
    nome: '',
    unidade_medida: 'UN',
    custo_unitario: '',
    controlar_estoque: false,
    estoque: ''
  });

  const fetchInsumos = async () => {
    try {
      const { data } = await api.get('/insumos');
      setInsumos(data);
    } catch (error) {
      console.error("Erro ao buscar insumos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsumos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nome: novoInsumo.nome,
      unidade_medida: novoInsumo.unidade_medida,
      custo_unitario: parseFloat(novoInsumo.custo_unitario) || 0,
      controlar_estoque: novoInsumo.controlar_estoque,
      estoque: parseFloat(novoInsumo.estoque) || 0
    };

    try {
      if (editingId) {
        await api.put(`/insumos/${editingId}`, payload);
      } else {
        await api.post('/insumos', payload);
      }
      setIsModalOpen(false);
      setNovoInsumo({ nome: '', unidade_medida: 'UN', custo_unitario: '', controlar_estoque: false, estoque: '' });
      setEditingId(null);
      fetchInsumos();
    } catch (error) {
      console.error("Erro ao salvar insumo:", error);
      alert("Erro ao salvar insumo.");
    }
  };

  const handleDelete = async (id: number) => {
    if(window.confirm('Tem certeza que deseja excluir este insumo?')) {
      try {
        await api.delete(`/insumos/${id}`);
        fetchInsumos();
      } catch (error) {
        alert("Erro ao excluir insumo.");
      }
    }
  };

  const openEditModal = (insumo: any) => {
    setEditingId(insumo.id);
    setNovoInsumo({
      nome: insumo.nome,
      unidade_medida: insumo.unidade_medida,
      custo_unitario: insumo.custo_unitario.toString(),
      controlar_estoque: insumo.controlar_estoque || false,
      estoque: insumo.estoque !== null ? insumo.estoque.toString() : ''
    });
    setIsModalOpen(true);
  };

  const filteredInsumos = insumos.filter(i => i.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-32 md:pb-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight flex items-center gap-3">
            <Package className="text-brand-500" size={32} />
            Tabela de Insumos
          </h1>
          <p className="text-zinc-300 mt-1">Gerencie os custos de ingredientes e embalagens.</p>
        </div>
        
        <button 
          onClick={() => {
            setEditingId(null);
            setNovoInsumo({ nome: '', unidade_medida: 'UN', custo_unitario: '', controlar_estoque: false, estoque: '' });
            setIsModalOpen(true);
          }}
          className="premium-btn py-2.5 px-5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-500/20"
        >
          <Plus size={20} />
          <span>Novo Insumo</span>
        </button>
      </div>

      <div className="bg-dark-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar insumo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#131313] border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 text-white placeholder-zinc-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-auto max-h-[60vh] custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="border-b border-white/5 bg-[#131313]">
                <th className="p-4 text-sm font-semibold text-zinc-300">Nome</th>
                <th className="p-4 text-sm font-semibold text-zinc-300">Unidade</th>
                <th className="p-4 text-sm font-semibold text-zinc-300">Estoque</th>
                <th className="p-4 text-sm font-semibold text-zinc-300">Custo (R$)</th>
                <th className="p-4 text-sm font-semibold text-zinc-300 w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-400">Carregando...</td></tr>
              ) : filteredInsumos.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-400">Nenhum insumo encontrado.</td></tr>
              ) : (
                filteredInsumos.map(insumo => (
                  <tr key={insumo.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="font-semibold text-white">{insumo.nome}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-dark-800 text-zinc-200 px-2.5 py-1 rounded-md text-xs font-bold border border-white/5">
                        {insumo.unidade_medida}
                      </span>
                    </td>
                    <td className="p-4">
                      {insumo.controlar_estoque ? (
                        <div className="flex flex-col">
                          <span className={`font-bold ${insumo.estoque <= 5 ? 'text-red-400' : 'text-zinc-200'}`}>
                            {insumo.estoque}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-sm">Não controla</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-price text-brand-400 font-bold">
                        {insumo.custo_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openEditModal(insumo)}
                          className="p-2 text-zinc-300 hover:text-white bg-dark-800 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(insumo.id)}
                          className="p-2 text-zinc-300 hover:text-red-400 bg-dark-800 hover:bg-red-500/10 rounded-lg transition-colors border border-white/5"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#131313] rounded-3xl w-full max-w-md shadow-2xl border border-white/10 overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#18181A]">
              <h2 className="text-xl font-heading font-bold text-white">
                {editingId ? 'Editar Insumo' : 'Novo Insumo'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white transition-colors bg-white/5 p-1.5 rounded-full hover:bg-white/10">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nome do Insumo</label>
                <input 
                  required 
                  type="text" 
                  value={novoInsumo.nome} 
                  onChange={e => setNovoInsumo({...novoInsumo, nome: e.target.value})} 
                  placeholder="Ex: Pão Brioche"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Unidade</label>
                  <select 
                    value={novoInsumo.unidade_medida} 
                    onChange={e => setNovoInsumo({...novoInsumo, unidade_medida: e.target.value})} 
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white appearance-none"
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilograma (KG)</option>
                    <option value="G">Grama (G)</option>
                    <option value="L">Litro (L)</option>
                    <option value="ML">Mililitro (ML)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Custo (R$)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.001" 
                    value={novoInsumo.custo_unitario} 
                    onChange={e => setNovoInsumo({...novoInsumo, custo_unitario: e.target.value})} 
                    placeholder="0.00"
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600 font-bold"
                  />
                </div>
              </div>

              <div className="bg-dark-900 border border-white/5 p-4 rounded-xl space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={novoInsumo.controlar_estoque}
                    onChange={e => setNovoInsumo({...novoInsumo, controlar_estoque: e.target.checked})}
                    className="w-5 h-5 rounded border-white/10 bg-dark-800 text-brand-500 focus:ring-brand-500/50 focus:ring-offset-dark-900"
                  />
                  <span className="text-sm text-white font-medium">Controlar Estoque?</span>
                </label>
                
                {novoInsumo.controlar_estoque && (
                  <div>
                    <label className="block text-sm text-zinc-300 mb-1.5">Quantidade em Estoque</label>
                    <input 
                      type="number"
                      step="0.01" 
                      required={novoInsumo.controlar_estoque}
                      value={novoInsumo.estoque} 
                      onChange={e => setNovoInsumo({...novoInsumo, estoque: e.target.value})} 
                      placeholder="Ex: 50"
                      className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-white placeholder-zinc-600"
                    />
                  </div>
                )}
              </div>

              <button type="submit" className="w-full premium-btn py-3.5 rounded-xl font-bold mt-4 text-base">
                {editingId ? 'Salvar Alterações' : 'Adicionar Insumo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Insumos;
