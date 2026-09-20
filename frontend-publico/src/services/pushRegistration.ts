import { Capacitor, registerPlugin } from '@capacitor/core';
import api from './api';

const FirebaseToken = registerPlugin<any>('FirebaseToken');

export async function registerPushTokenIfNative() {
  const isNativeApp = Capacitor.isNativePlatform() || navigator.userAgent.includes('BisBurgerApp');
  if (!isNativeApp) { alert('isNativeApp é false! Capacitor.isNativePlatform(): ' + Capacitor.isNativePlatform() + ', userAgent: ' + navigator.userAgent); return; }
  
  const token = localStorage.getItem('cliente_token');
  if (!token) return;

  try {
    
    alert('Pedindo token pro Firebase... Plugin existe? ' + !!FirebaseToken);
    
    // Timeout promise
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout! Firebase não respondeu após 10 segundos.')), 10000));
    
    const { token: fcmToken } = await Promise.race([
      FirebaseToken.getToken(),
      timeout
    ]) as any;

    if (fcmToken) {
      await api.put('/clientes/push', {
        token: fcmToken,
        plataforma: Capacitor.getPlatform()
      });
      alert('Token FCM registrado com sucesso no banco!');
      console.log('FCM Token registered successfully');
    }
  } catch (error) {
    alert('Erro no FCM: ' + String(error));
    console.error('Failed to register FCM token', error);
  }
}
