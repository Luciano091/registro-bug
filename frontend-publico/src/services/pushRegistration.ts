import { Capacitor, registerPlugin } from '@capacitor/core';
import api from './api';

const FirebaseToken = registerPlugin<any>('FirebaseToken');

export async function registerPushTokenIfNative() {
  const isNativeApp = Capacitor.isNativePlatform() || navigator.userAgent.includes('BisBurgerApp');
  if (!isNativeApp) { alert('isNativeApp é false! Capacitor.isNativePlatform(): ' + Capacitor.isNativePlatform() + ', userAgent: ' + navigator.userAgent); return; }
  
  const token = localStorage.getItem('cliente_token');
  if (!token) return;

  try {
    alert('Pedindo token pro Firebase...');
    const { token: fcmToken } = await FirebaseToken.getToken();
    if (fcmToken) {
      await api.put('/clientes/push', {
        token: fcmToken,
        plataforma: Capacitor.getPlatform()
      });
      alert('Token FCM registrado com sucesso no banco!');
      console.log('FCM Token registered successfully');
    }
  } catch (error) {
    alert('Erro no FCM: ' + JSON.stringify(error));
    console.error('Failed to register FCM token', error);
  }
}
