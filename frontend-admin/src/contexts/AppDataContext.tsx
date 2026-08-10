import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import { notificationSoundBase64 } from '../notificationSound';

interface AppDataContextType {
  // Data
  orders: any[];
  produtos: any[];
  dashboardResumo: any;
  caixa: any;
  chats: any[];
  hasUnreadChats: boolean;
  // Loading states (only for first load)
  ordersLoaded: boolean;
  produtosLoaded: boolean;
  dashboardLoaded: boolean;
  caixaLoaded: boolean;
  // Refresh functions
  refreshOrders: () => Promise<void>;
  refreshProdutos: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshCaixa: () => Promise<void>;
  refreshChats: () => Promise<void>;
  // Optimistic updates
  addOptimisticOrder: (order: any) => void;
  updateOrderStatus: (orderId: number, newStatus: string) => void;
  addOrUpdateProduto: (produto: any) => void;
  setCaixaData: (data: any) => void;
  markChatAsRead: (chatId: number) => void;
}

const AppDataContext = createContext<AppDataContextType | null>(null);

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
};

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  // ========== State ==========
  const [orders, setOrders] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [dashboardResumo, setDashboardResumo] = useState<any>({
    pedidos_hoje: 0,
    faturamento_hoje: 0,
    lucro_hoje: 0,
    ticket_medio: 0,
    mais_vendido: { nome: 'Carregando...', quantidade: 0 },
    ultimos_pedidos: [],
    alertas_estoque: []
  });
  const [caixa, setCaixa] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);

  // Track whether first load happened
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [produtosLoaded, setProdutosLoaded] = useState(false);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const [caixaLoaded, setCaixaLoaded] = useState(false);

// Helper function for browser notifications
const showBrowserNotification = (title: string, body: string) => {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, { body });
      }
    });
  }
};

  // ========== Refresh Functions ==========
  const refreshOrders = useCallback(async () => {
    if (!localStorage.getItem('adminToken')) return;
    try {
      const response = await api.get('/pedidos');
      setOrders(prev => {
        if (prev.length > 0 && response.data.length > prev.length) {
          try {
            const audio = new Audio(notificationSoundBase64);
            audio.play().catch(e => console.log('Autoplay blocked:', e));
            showBrowserNotification("Novo Pedido!", "Um novo pedido acabou de chegar no Burger Hause.");
          } catch (e) {
            console.error('Audio/Notification error', e);
          }
        }
        return response.data;
      });
      setOrdersLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      // Even on error, mark as loaded so UI doesn't stay on skeleton forever
      setOrdersLoaded(true);
    }
  }, []);

  const refreshProdutos = useCallback(async () => {
    try {
      const response = await api.get('/produtos');
      setProdutos(response.data);
      setProdutosLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setProdutosLoaded(true);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/resumo');
      setDashboardResumo({
        pedidos_hoje: response.data.pedidos_hoje,
        faturamento_hoje: response.data.faturamento_hoje,
        lucro_hoje: response.data.lucro_hoje,
        ticket_medio: response.data.ticket_medio,
        mais_vendido: response.data.mais_vendido,
        ultimos_pedidos: response.data.ultimos_pedidos || [],
        alertas_estoque: response.data.alertas_estoque || []
      });
      setDashboardLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setDashboardLoaded(true);
    }
  }, []);

  const refreshCaixa = useCallback(async () => {
    try {
      const response = await api.get('/caixa/status');
      setCaixa(response.data);
      setCaixaLoaded(true);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setCaixa(null);
      }
      setCaixaLoaded(true);
    }
  }, []);

  const refreshChats = useCallback(async () => {
    if (!localStorage.getItem('adminToken')) return;
    try {
      const response = await api.get('/whatsapp/chats');
      
      setChats(prev => {
        const novosChats = response.data;
        
        let shouldRing = false;
        let hasNewIncoming = false;

        novosChats.forEach((chat: any) => {
          const prevChat = prev.find((p: any) => p.id === chat.id);
          const inMsgs = chat.mensagens.filter((m: any) => m.direcao === 'in');
          const prevInMsgs = prevChat ? prevChat.mensagens.filter((m: any) => m.direcao === 'in') : [];
          
          if (inMsgs.length > prevInMsgs.length) {
            hasNewIncoming = true; // Still show red badge
            
            // Apply 2-hour rule for sound/notification
            if (prevInMsgs.length > 0) {
              const lastPrev = prevInMsgs[prevInMsgs.length - 1];
              const lastNew = inMsgs[inMsgs.length - 1];
              const diffMs = new Date(lastNew.data).getTime() - new Date(lastPrev.data).getTime();
              
              if (diffMs > 2 * 60 * 60 * 1000) {
                shouldRing = true;
              }
            } else {
              // First message ever from this contact
              shouldRing = true;
            }
          }
        });

        // Always show badge if there is any new message
        if (hasNewIncoming) {
          setHasUnreadChats(true);
        }

        // Only ring and show popup if it passed the 2 hour rule
        if (shouldRing) {
          try {
            const audio = new Audio(notificationSoundBase64);
            audio.play().catch(e => console.log('Autoplay blocked:', e));
            showBrowserNotification("Nova Mensagem!", "Você recebeu uma nova mensagem no WhatsApp do Burger Hause.");
          } catch (e) {
            console.error('Audio/Notification error', e);
          }
        }
        
        return novosChats;
      });
    } catch (error) {
      console.error('Erro ao carregar chats do whatsapp:', error);
    }
  }, []);

  // ========== Optimistic Updates ==========
  const addOptimisticOrder = useCallback((order: any) => {
    // Add the new order at the top of the list
    setOrders(prev => [order, ...prev]);
  }, []);

  const updateOrderStatus = useCallback((orderId: number, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  }, []);

  const addOrUpdateProduto = useCallback((produto: any) => {
    setProdutos(prev => {
      const exists = prev.find(p => p.id === produto.id);
      if (exists) {
        return prev.map(p => p.id === produto.id ? produto : p);
      }
      return [...prev, produto];
    });
  }, []);

  const setCaixaData = useCallback((data: any) => {
    setCaixa(data);
    setCaixaLoaded(true);
  }, []);

  const markChatAsRead = useCallback(() => {
    setHasUnreadChats(false);
  }, []);

  // ========== Preload critical data on app start ==========
  useEffect(() => {
    refreshProdutos();
    refreshOrders();
    refreshChats();
    
    // Polling global (roda de 5 em 5 seg)
    const intervalChats = setInterval(refreshChats, 5000);
    const intervalOrders = setInterval(refreshOrders, 10000);
    
    return () => {
      clearInterval(intervalChats);
      clearInterval(intervalOrders);
    };
  }, [refreshProdutos, refreshOrders, refreshChats]);

  return (
    <AppDataContext.Provider value={{
      orders,
      produtos,
      dashboardResumo,
      caixa,
      chats,
      hasUnreadChats,
      ordersLoaded,
      produtosLoaded,
      dashboardLoaded,
      caixaLoaded,
      refreshOrders,
      refreshProdutos,
      refreshDashboard,
      refreshCaixa,
      refreshChats,
      addOptimisticOrder,
      updateOrderStatus,
      addOrUpdateProduto,
      setCaixaData,
      markChatAsRead,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
