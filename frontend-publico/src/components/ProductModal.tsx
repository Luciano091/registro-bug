import { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

interface ProductModalProps {
  produto: any;
  onClose: () => void;
}

export const ProductModal = ({ produto, onClose }: ProductModalProps) => {
  const { addItem } = useCart();
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  
  // Como a aplicação original usa `adicionais_ids`, que provavelmente são IDs, 
  // vamos mockar/preparar a estrutura de adicionais. Se tivermos os objetos de adicionais completos,
  // poderíamos listar aqui. Como não temos certeza se a API de produtos já traz os adicionais populados,
  // vamos simplificar. Se houver `produto.adicionais`, listamos.
  const [selectedAdicionais, setSelectedAdicionais] = useState<any[]>([]);

  const handleAdd = () => {
    addItem({
      id: crypto.randomUUID(),
      produtoId: produto.id,
      nome: produto.nome,
      precoBase: produto.preco,
      quantidade,
      adicionais: selectedAdicionais,
      observacao
    });
    onClose();
  };

  const toggleAdicional = (add: any) => {
    const exists = selectedAdicionais.find(a => a.nome === add.nome);
    if (exists) {
      setSelectedAdicionais(prev => prev.filter(a => a.nome !== add.nome));
    } else {
      setSelectedAdicionais(prev => [...prev, { ...add, quantidade: 1 }]);
    }
  };

  const basePrice = produto.preco * quantidade;
  const adicionaisPrice = selectedAdicionais.reduce((sum, add) => sum + add.preco, 0) * quantidade;
  const totalPrice = basePrice + adicionaisPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full md:max-w-xl bg-[#141416] rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh] shadow-2xl shadow-black">
        {/* Imagem Cover */}
        {produto.imagem_url && (
          <div className="w-full h-56 md:h-64 relative bg-[#0F0F11]">
            <img 
              src={produto.imagem_url} 
              alt={produto.nome} 
              className="w-full h-full object-contain p-4" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141416] to-transparent"></div>
          </div>
        )}
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide leading-tight">{produto.nome}</h2>
              {produto.descricao && (
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  {produto.descricao}
                </p>
              )}
            </div>
            <div className="font-price font-bold text-xl text-brand-400 shrink-0">
              {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>

          {/* Adicionais - Se existirem na API */}
          {produto.adicionais && produto.adicionais.length > 0 && (
            <div className="mt-8">
              <div className="bg-[#18181A] p-4 rounded-2xl border border-white/5">
                <h3 className="font-bold text-white mb-1">Turbine seu pedido</h3>
                <p className="text-xs text-zinc-500 mb-4">Escolha opções adicionais (opcional)</p>
                
                <div className="space-y-3">
                  {produto.adicionais.map((add: any, idx: number) => {
                    const isSelected = selectedAdicionais.find(a => a.nome === add.nome);
                    return (
                      <label key={idx} className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-500 border-brand-500' : 'border border-zinc-600 group-hover:border-zinc-400'}`}>
                            {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>}
                          </div>
                          <span className="text-sm font-medium text-zinc-200">{add.nome}</span>
                        </div>
                        <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
                          + {add.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={!!isSelected}
                          onChange={() => toggleAdicional(add)}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-bold text-white mb-3 text-sm">Alguma observação?</h3>
            <textarea 
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Tirar cebola, ponto da carne, etc..."
              className="w-full bg-[#18181A] border border-white/10 rounded-xl p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-500/50 resize-none h-24"
            ></textarea>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-6 bg-[#18181A] border-t border-white/5 flex gap-4 items-center">
          <div className="flex items-center gap-4 bg-[#202022] rounded-xl p-2 shrink-0 border border-white/5">
            <button 
              className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 transition-colors"
              onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
              disabled={quantidade <= 1}
            >
              <Minus size={18} />
            </button>
            <span className="font-bold text-white w-4 text-center">{quantidade}</span>
            <button 
              className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => setQuantidade(quantidade + 1)}
            >
              <Plus size={18} />
            </button>
          </div>
          
          <button 
            onClick={handleAdd}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white p-4 rounded-xl font-bold flex items-center justify-between transition-colors shadow-lg shadow-brand-500/20 active:scale-[0.98]"
          >
            <span>Adicionar</span>
            <span className="font-price tracking-tight">
              {totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
