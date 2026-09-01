import { X, Clock, Moon } from 'lucide-react';

interface LojaFechadaModalProps {
  onClose: () => void;
  tempoMedio?: number;
}

export const LojaFechadaModal = ({ onClose, tempoMedio = 30 }: LojaFechadaModalProps) => {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo laranja */}
        <div className="bg-brand-500 px-6 pt-8 pb-10 flex flex-col items-center text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <Moon size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-heading font-black text-white uppercase tracking-wide">
            Loja Fechada
          </h2>
          <p className="text-white/80 text-sm mt-1 font-medium">
            Estamos em repouso no momento
          </p>
        </div>

        {/* Onda decorativa */}
        <div className="bg-brand-500 h-6 relative -mb-px">
          <svg viewBox="0 0 400 24" className="absolute bottom-0 w-full" fill="white">
            <path d="M0,24 C100,0 300,0 400,24 L400,24 L0,24 Z" />
          </svg>
        </div>

        {/* Conteúdo */}
        <div className="px-6 pt-4 pb-8 flex flex-col items-center text-center">
          <p className="text-zinc-600 text-sm leading-relaxed">
            Não é possível realizar pedidos enquanto a loja estiver fechada.
            <br />
            Volte mais tarde e faremos com prazer o seu lanche! 🍔
          </p>

          <div className="mt-5 flex items-center gap-2 bg-zinc-100 rounded-full px-4 py-2 text-xs font-bold text-zinc-500">
            <Clock size={14} className="text-brand-500" />
            Tempo médio de preparo: ~{tempoMedio} min
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full bg-brand-500 text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform text-sm"
          >
            Entendido!
          </button>
        </div>
      </div>
    </div>
  );
};
