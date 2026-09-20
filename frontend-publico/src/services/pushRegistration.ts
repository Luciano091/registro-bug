import { Capacitor, registerPlugin } from '@capacitor/core';
import api from './api';

const FirebaseToken = registerPlugin<any>('FirebaseToken');

export async function registerPushTokenIfNative() {
  const isNativeApp = Capacitor.isNativePlatform() || navigator.userAgent.includes('BisBurgerApp');
  if (!isNativeApp) return;
  
  const token = localStorage.getItem('cliente_token');
  if (!token) return;

  try {
    const { token: fcmToken } = await FirebaseToken.getToken();
    if (fcmToken) {
      await api.put('/clientes/push', {
        token: fcmToken,
        plataforma: Capacitor.getPlatform()
      });
      console.log('FCM Token registered successfully');
    }
  } catch (error) {
    console.error('Failed to register FCM token', error);
  }
}
