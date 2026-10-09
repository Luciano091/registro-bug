import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, Save, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

type Insumo = { id: number; nome: string; unidade_medida: string; custo_unitario: number };
type ItemFicha = { insumo_id: number; quantidade: number; insumo?: Insumo };

interface FichaTecnicaModalProps {
  produtoId: number;
  produtoNome: string;
  onClose: () => void;
}

const FichaTecnicaModal = ({ produtoId, produtoNome, onClose }: FichaTecnicaModalProps) => {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [ficha, setFicha] = useState<ItemFicha[]>([]);
  const [loading, setLoading] = useState(true);
  const [insumosError, setInsumosError] = useState('');
  const [fichaError, setFichaError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  
  const [searchInsumo, setSearchInsumo] = useState('');
  
  useEffect(() => {
    fetchDados();
  }, [produtoId]);

  const fetchDados = async () => {
    setLoading(true);
    setInsumosError('');
    setFichaError('');
    const [resInsumos, resFicha] = await Promise.allSettled([
      api.get<Insumo[]>('/insumos'),
      api.get<ItemFicha[]>(`/produtos/${produtoId}/ficha-tecnica`)
    ]);
    if (resInsumos.status === 'fulfilled') setInsumos(resInsumos.value.data);
    else setInsumosError(resInsumos.reason?.response?.data?.detail || 'Não foi possível carregar os insumos.');
    if (resFicha.status === 'fulfilled') setFicha(resFicha.value.data);
    else setFichaError(resFicha.reason?.response?.data?.detail || 'Não foi possível carregar a ficha técnica.');
    setLoading(false);
  };

  const addInsumoToFicha = (insumo: Insumo) => {
    // Verifica se ja tem
    if (ficha.find(i => i.insumo_id === insumo.id)) {
      alert("Insumo já adicionado à ficha técnica.");
      return;
    }
    
    setFicha([...ficha, {
      insumo_id: insumo.id,
      insumo: insumo,
      quantidade: 1
    }]);
    setDirty(true);
    setSaveError('');
    setSearchInsumo('');
  };

  const updateQuantidade = (index: number, novaQtde: string) => {
    setFicha(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantidade: Number(novaQtde) } : item));
    setDirty(true);
    setSaveError('');
  };

  const removeInsumo = (index: number) => {
    setFicha(current => current.filter((_, itemIndex) => itemIndex !== index));
    setDirty(true);
    setSaveError('');
  };

  const handleSave = async () => {
    if (loading || fichaError || !dirty || saving) return;
    if (ficha.some(item => !Number.isFinite(item.quantidade) || item.quantidade <= 0)) {
      setSaveError('Informe uma quantidade maior que zero para cada insumo.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const payload = ficha.map(item => ({
        insumo_id: item.insumo_id,
        quantidade: item.quantidade
      }));
      
      await api.put(`/produtos/${produtoId}/ficha-tecnica`, payload);
      alert("Ficha técnica salva com sucesso!");
      onClose();
    } catch (error: any) {
      setSaveError(error.response?.data?.detail || 'Não foi possível salvar a ficha técnica.');
    } finally {
      setSaving(false);
    }
  };

  const calcularCustoTotal = () => {
    return ficha.reduce((total, item) => {
      const custoUni = item.insumo?.custo_unitario || 0;
      return total + (custoUni * (item.quantidade || 0));
    }, 0);
  };

  const filteredInsumos = insumos.filter(i => i.nome.toLowerCase().includes(searchInsumo.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass border border-white/10 rounded-3xl p-6 w-full max-w-2xl animate-in zoom-in-95 shadow-2xl max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold font-heading text-white flex items-center gap-2">
              <Package className="text-brand-500" />
              Ficha Técnica
            </h3>
            <p className="text-brand-400 font-semibold">{produtoNome}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          {/* Lado Esquerdo: Buscar Insumos */}
          <div className="flex flex-col border-r border-white/5 pr-0 md:pr-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text"
                placeholder="Buscar insumo..."
                value={searchInsumo}
                onChange={e => setSearchInsumo(e.target.value)}
                className="w-full bg-[#131313] border border-white/10 rounded-xl py-2 pl-9 pr-4 focus:outline-none focus:border-brand-500 text-white text-sm"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
              {loading ? (
                <p className="text-sm text-zinc-400">Carregando...</p>
              ) : insumosError ? (
                <div role="alert" className="text-sm text-red-600"><p>{insumosError}</p><button type="button" onClick={() => void fetchDados()} className="mt-2 font-semibold underline">Tentar novamente</button></div>
              ) : filteredInsumos.length === 0 ? (
                <div className="text-sm text-slate-600 space-y-2">
                  <p>{insumos.length === 0 ? 'Nenhum insumo cadastrado neste estabelecimento.' : 'Nenhum insumo encontrado para esta busca.'}</p>
                  {insumos.length === 0 && <Link to="/insumos" onClick={onClose} className="inline-block font-semibold text-orange-700 underline">Cadastrar insumos</Link>}
                </div>
              ) : filteredInsumos.map(insumo => (
                <div key={insumo.id} className="flex justify-between items-center p-2 hover:bg-white/5 rounded-lg mb-1 group transition-colors">
                  <div>
                    <p className="text-sm text-white font-medium">{insumo.nome}</p>
                    <p className="text-[10px] text-zinc-400">{Number(insumo.custo_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {insumo.unidade_medida}</p>
                  </div>
                  <button 
                    onClick={() => addInsumoToFicha(insumo)}
                    className="p-1.5 bg-brand-500/10 text-brand-500 rounded-md hover:bg-brand-500 hover:text-white transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Lado Direito: Itens da Ficha */}
          <div className="flex flex-col">
            <h4 className="text-sm font-bold text-zinc-300 mb-4 uppercase tracking-wider">Ingredientes do Produto</h4>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
              {fichaError ? (
                <div role="alert" className="text-sm text-red-600"><p>{fichaError}</p><button type="button" onClick={() => void fetchDados()} className="mt-2 font-semibold underline">Tentar novamente</button></div>
              ) : ficha.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center mt-10">Nenhum insumo adicionado.</p>
              ) : (
                ficha.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 mb-3 p-3 bg-dark-900 border border-white/5 rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm text-white font-semibold">{item.insumo?.nome}</p>
                      <p className="text-xs text-zinc-400">{(Number(item.insumo?.custo_unitario || 0) * (item.quantidade || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        step="0.001"
                        min="0.001"
                        value={item.quantidade}
                        onChange={(e) => updateQuantidade(index, e.target.value)}
                        className="w-20 bg-[#131313] border border-white/10 rounded-lg p-1.5 text-center text-white text-sm focus:outline-none focus:border-brand-500"
                      />
                      <span className="text-xs text-zinc-400 w-6">{item.insumo?.unidade_medida}</span>
                      <button 
                        onClick={() => removeInsumo(index)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-zinc-300">Custo Total Calculado:</span>
                <span className="text-xl font-bold font-price text-brand-400">
                  {calcularCustoTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <button 
                onClick={handleSave}
                disabled={loading || !!fichaError || !dirty || saving}
                className="w-full premium-btn py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {saving ? 'Salvando...' : 'Salvar Ficha Técnica'}
              </button>
              {saveError && <p role="alert" className="mt-2 text-sm text-red-600">{saveError}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FichaTecnicaModal;
