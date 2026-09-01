import { ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

interface FloatingCartProps {
  onOpen: () => void;
}

export const FloatingCart = ({ onOpen }: FloatingCartProps) => {
  const { cartCount, cartTotal } = useCart();

  if (cartCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-40 md:left-auto md:right-8 md:bottom-8 md:w-80">
      <button 
        onClick={onOpen}
        className="w-full bg-brand-500 hover:bg-brand-600 text-zinc-900 p-4 rounded-2xl shadow-xl shadow-brand-500/25 flex items-center justify-between transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <ShoppingCart size={20} className="text-zinc-900" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-zinc-900/90">Carrinho</span>
            <span className="font-bold">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</span>
          </div>
        </div>
        <div className="font-price text-lg font-bold tracking-tight">
          {cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </div>
      </button>
    </div>
  );
};
