import { TicketPercent } from 'lucide-react';

export const CuponsView = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center min-h-[60vh]">
      <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
        <TicketPercent size={32} className="text-zinc-400" />
      </div>
      <h2 className="text-xl font-heading font-bold text-zinc-900 mb-2">Meus Cupons</h2>
      <p className="text-zinc-500 text-sm">
        Você não possui nenhum cupom ativo no momento. Fique de olho em nossas redes sociais para garantir descontos exclusivos!
      </p>
      
      <div className="mt-8 w-full max-w-sm">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <input 
            type="text" 
            placeholder="Digite um código" 
            className="w-full text-sm outline-none text-zinc-900 uppercase"
          />
          <button className="text-brand-500 font-bold text-sm whitespace-nowrap ml-4">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
