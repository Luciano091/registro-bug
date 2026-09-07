import { Utensils, Ticket, Receipt, User, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

export type TabType = 'cardapio' | 'cupons' | 'pedidos' | 'conta';

interface BottomNavProps {
  onOpenCart: () => void;
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNav = ({ onOpenCart, activeTab, onChangeTab }: BottomNavProps) => {
  const { cartCount, cartTotal } = useCart();

  const getTabClass = (tab: TabType) => {
    return `flex min-h-14 w-full flex-col items-center justify-center rounded-xl transition-colors ${
      activeTab === tab ? 'text-brand-500' : 'text-zinc-400 hover:text-zinc-600'
    }`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden pb-safe">
      <div className="flex min-h-[72px] items-center justify-around px-2 py-1">
        <button onClick={() => onChangeTab('cardapio')} className={getTabClass('cardapio')} aria-current={activeTab === 'cardapio' ? 'page' : undefined}>
          <Utensils size={20} strokeWidth={activeTab === 'cardapio' ? 2.5 : 2} />
          <span className="mt-1 text-[11px] font-semibold">Cardápio</span>
        </button>
        
        <button onClick={() => onChangeTab('cupons')} className={getTabClass('cupons')} aria-current={activeTab === 'cupons' ? 'page' : undefined}>
          <Ticket size={20} strokeWidth={activeTab === 'cupons' ? 2.5 : 2} />
          <span className="mt-1 text-[11px] font-semibold">Cupons</span>
        </button>
        
        <button onClick={() => onChangeTab('pedidos')} className={getTabClass('pedidos')} aria-current={activeTab === 'pedidos' ? 'page' : undefined}>
          <Receipt size={20} strokeWidth={activeTab === 'pedidos' ? 2.5 : 2} />
          <span className="mt-1 text-[11px] font-semibold">Pedidos</span>
        </button>
        
        <button onClick={() => onChangeTab('conta')} className={getTabClass('conta')} aria-current={activeTab === 'conta' ? 'page' : undefined}>
          <User size={20} strokeWidth={activeTab === 'conta' ? 2.5 : 2} />
          <span className="mt-1 text-[11px] font-semibold">Conta</span>
        </button>
      </div>

      {cartCount > 0 && activeTab === 'cardapio' && (
        <div className="absolute bottom-[5rem] left-4 right-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
