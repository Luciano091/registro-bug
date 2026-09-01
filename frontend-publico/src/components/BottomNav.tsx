import { Utensils, Ticket, Receipt, User, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

interface BottomNavProps {
  onOpenCart: () => void;
}

export const BottomNav = ({ onOpenCart }: BottomNavProps) => {
  const { cartCount, cartTotal } = useCart();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-40 md:hidden pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        <button className="flex flex-col items-center justify-center w-full h-full text-brand-500">
          <Utensils size={20} strokeWidth={2.5} />
          <span className="text-[10px] font-bold mt-1">Cardápio</span>
        </button>
        
        <button onClick={() => alert('Cupons em breve!')} className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-zinc-600">
          <Ticket size={20} />
          <span className="text-[10px] font-medium mt-1">Cupons</span>
        </button>
        
        <button onClick={() => alert('Meus pedidos em breve!')} className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-zinc-600">
          <Receipt size={20} />
          <span className="text-[10px] font-medium mt-1">Pedidos</span>
        </button>
        
        <button onClick={() => alert('Minha conta em breve!')} className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-zinc-600">
          <User size={20} />
          <span className="text-[10px] font-medium mt-1">Conta</span>
        </button>
      </div>

      {cartCount > 0 && (
        <div className="absolute bottom-[4.5rem] left-4 right-4">
          <button 
            onClick={onOpenCart}
            className="w-full bg-brand-500 text-white p-3.5 rounded-2xl shadow-lg shadow-brand-500/25 flex items-center justify-between transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <ShoppingCart size={20} className="text-white" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-white/90">Carrinho</span>
                <span className="font-bold text-xs">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</span>
              </div>
            </div>
            <div className="font-price text-lg font-bold tracking-tight">
              {cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
