import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getPendingOrders, deleteOfflineOrder } from '../services/db';
import api from '../services/api';

interface NetworkContextType {
  isOnline: boolean;
  isSyncing: boolean;
}

const NetworkContext = createContext<NetworkContextType>({ isOnline: true, isSyncing: false });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncing = useRef(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineOrders = useCallback(async () => {
    const path = window.location.pathname;
    if (!navigator.onLine || path === '/login' || path === '/reset-password' || window.location.hostname.toLowerCase().startsWith('admin.') || path.startsWith('/ritmesa-admin') || !localStorage.getItem('adminToken') || syncing.current) return;
    syncing.current = true;
    setIsSyncing(true);
    
    try {
      const pending = await getPendingOrders();
      if (pending.length === 0) return;
      
      console.log(`[Offline Sync] Sincronizando ${pending.length} pedidos pendentes...`);
      
      for (const order of pending) {
        try {
          // Re-enviar para a API. O UUID já vai no payload.
          await api.post('/pedidos', order.payload);
          await deleteOfflineOrder(order.uuid);
          window.dispatchEvent(new Event('ritmesa:orders-synced'));
          console.log(`[Offline Sync] Pedido ${order.uuid} sincronizado com sucesso.`);
        } catch (error: any) {
          // Se for erro de Caixa Fechado (400), não podemos sincronizar ainda.
          if (error.response?.status === 400 && error.response.data?.detail?.includes("Caixa está fechado")) {
             console.warn(`[Offline Sync] Caixa fechado. Aguardando abertura para sincronizar o pedido ${order.uuid}`);
             continue; // Mantém no IndexedDB
          }
          
          // Se for 500, também mantemos para tentar depois, a menos que seja um erro definitivo
          if (!error.response || error.response?.status >= 500) {
             break;
          }

          if ([401, 403, 429].includes(error.response.status)) break;

          // Se for outro erro de negócio que impede salvamento definitivo, deletamos para não travar a fila indefinidamente
          console.error(`[Offline Sync] Erro definitivo ao sincronizar pedido ${order.uuid}`, error);
          await deleteOfflineOrder(order.uuid);
        }
      }
    } catch (e) {
      console.error("[Offline Sync] Erro geral de sincronização:", e);
    } finally {
      syncing.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    void syncOfflineOrders();
    const timer = window.setInterval(() => void syncOfflineOrders(), 30000);
    return () => window.clearInterval(timer);
  }, [isOnline, syncOfflineOrders]);

  return (
    <NetworkContext.Provider value={{ isOnline, isSyncing }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
