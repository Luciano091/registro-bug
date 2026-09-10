import { useState } from 'react';
import { TicketPercent } from 'lucide-react';

export const CuponsView = () => {
  const [codigo, setCodigo] = useState(localStorage.getItem('ritmesa_coupon_code') || '');
  const [saved, setSaved] = useState(false);
  const save = () => { if (!codigo.trim()) return; localStorage.setItem('ritmesa_coupon_code', codigo.trim().toUpperCase()); setCodigo(codigo.trim().toUpperCase()); setSaved(true); };
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center min-h-[60vh]">
      <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
        <TicketPercent size={32} className="text-zinc-400" />
      </div>
      <h2 className="text-xl font-heading font-bold text-zinc-900 mb-2">Meus Cupons</h2>
      <p className="text-zinc-500 text-sm">
        Digite o código recebido. A validade e o desconto serão confirmados no carrinho de forma segura.
      </p>
      
      <div className="mt-8 w-full max-w-sm">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <input 
            type="text" 
            value={codigo}
            onChange={event => { setCodigo(event.target.value.toUpperCase()); setSaved(false); }}
            placeholder="Digite um código" 
            className="w-full text-sm outline-none text-zinc-900 uppercase"
          />
          <button onClick={save} className="text-brand-500 font-bold text-sm whitespace-nowrap ml-4">
            Guardar
          </button>
        </div>
        {saved && <p className="mt-3 text-sm font-semibold text-emerald-600">Código guardado. Abra o carrinho para validar e aplicar.</p>}
      </div>
    </div>
  );
};
