import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface CartItem {
  id: string;
  produtoId: number;
  nome: string;
  precoBase: number;
  quantidade: number;
  adicionais: Array<{
    nome: string;
    preco: number;
    quantidade: number;
  }>;
  observacao?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve ser usado dentro de um CartProvider');
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const cartTotal = items.reduce((total, item) => {
    const itemTotal = item.precoBase + item.adicionais.reduce((sum, add) => sum + (add.preco * add.quantidade), 0);
    return total + (itemTotal * item.quantidade);
  }, 0);

  const cartCount = items.reduce((count, item) => count + item.quantidade, 0);

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => [...prev, item]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantidade + delta);
        return { ...item, quantidade: newQuantity };
      }
      return item;
    }));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart, cartTotal, cartCount
    }}>
      {children}
    </CartContext.Provider>
  );
};
