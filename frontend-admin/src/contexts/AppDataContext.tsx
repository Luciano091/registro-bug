import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import { connectOperationStream } from '../services/realtime';
import { notificationSoundBase64 } from '../notificationSound';

interface AppDataContextType {
  // Data
  orders: any[];
  produtos: any[];
  dashboardResumo: any;
  caixa: any;
  realtimeConnected: boolean;

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

  // Optimistic updates
  addOptimisticOrder: (order: any) => void;
  updateOrderStatus: (orderId: number, newStatus: string) => void;
  addOrUpdateProduto: (produto: any) => void;
  setCaixaData: (data: any) => void;

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
  const [orderSoundReady, setOrderSoundReady] = useState(false);
  const orderAudio = useRef<HTMLAudioElement | null>(null);
  const knownOrderIds = useRef<Set<number> | null>(null);
  const ordersRequestId = useRef(0);
  const [realtimeConnected, setRealtimeConnected] = useState(false);


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
  }
};

  const getOrderAudio = useCallback(() => {
    if (!orderAudio.current) {
      orderAudio.current = new Audio(notificationSoundBase64);
      orderAudio.current.preload = 'auto';
      orderAudio.current.volume = 1;
    }
    return orderAudio.current;
  }, []);

  const playOrderSound = useCallback(async () => {
    const audio = getOrderAudio();
    audio.currentTime = 0;
    try {
      await audio.play();
      setOrderSoundReady(true);
    } catch (error) {
      setOrderSoundReady(false);
      console.error('O navegador bloqueou o som de novos pedidos:', error);
    }
  }, [getOrderAudio]);

  useEffect(() => {
    if (orderSoundReady) return;
    const unlock = async () => {
      const audio = getOrderAudio();
      audio.muted = true;
      try {
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        setOrderSoundReady(true);
      } catch {
        setOrderSoundReady(false);
      } finally {
        audio.muted = false;
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [getOrderAudio, orderSoundReady]);

  // ========== Refresh Functions ==========
  const refreshOrders = useCallback(async () => {
    if (!localStorage.getItem('adminToken')) return;
    const requestId = ++ordersRequestId.current;
    try {
      const response = await api.get('/pedidos');
      if (requestId !== ordersRequestId.current) return;
      const incomingOrders: any[] = response.data;
      const incomingIds = new Set<number>(incomingOrders.filter(order => order.id < 1000000000).map(order => order.id));
      const hasNewOrder = knownOrderIds.current !== null && [...incomingIds].some(id => !knownOrderIds.current?.has(id));
      knownOrderIds.current = incomingIds;
      setOrders(incomingOrders);
      if (hasNewOrder) {
        void playOrderSound();
        const businessName = localStorage.getItem('estabelecimentoNome') || 'seu estabelecimento';
        showBrowserNotification("Novo pedido!", `Um novo pedido acabou de chegar em ${businessName}.`);
      }
      setOrdersLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      // Even on error, mark as loaded so UI doesn't stay on skeleton forever
      setOrdersLoaded(true);
    }
  }, [playOrderSound]);

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



  // ========== Preload critical data on app start ==========
  useEffect(() => {
    const path = window.location.pathname;
    const isPublicRoute = path === '/login' || path === '/reset-password';
    const isPlatformArea = window.location.hostname.toLowerCase().startsWith('admin.') || path.startsWith('/ritmesa-admin');
    if (isPublicRoute || isPlatformArea || !localStorage.getItem('adminToken')) return;

    void refreshProdutos();
    void refreshOrders();
    const stopRealtime = connectOperationStream(event => {
      void refreshOrders();
      void refreshDashboard();
      window.dispatchEvent(new CustomEvent('ritmesa:operation-update', { detail: event }));
    }, connected => {
      setRealtimeConnected(connected);
      if (connected) {
        void refreshOrders();
        void refreshDashboard();
      }
    });
    const intervalOrders = window.setInterval(() => void refreshOrders(), 30000);
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') void refreshOrders();
    };
    document.addEventListener('visibilitychange', refreshVisible);
    
    return () => {
      stopRealtime();
      window.clearInterval(intervalOrders);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [refreshProdutos, refreshOrders, refreshDashboard]);

  return (
    <AppDataContext.Provider value={{
      orders,
      produtos,
      dashboardResumo,
      caixa,
      realtimeConnected,

      ordersLoaded,
      produtosLoaded,
      dashboardLoaded,
      caixaLoaded,
      refreshOrders,
      refreshProdutos,
      refreshDashboard,
      refreshCaixa,

      addOptimisticOrder,
      updateOrderStatus,
      addOrUpdateProduto,
      setCaixaData,

    }}>
      {children}
    </AppDataContext.Provider>
  );
};
