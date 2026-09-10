import api from './api';

type NativeTrackingStatus = {
  active: boolean;
  orderId?: number;
};

type NativeLocationPlugin = {
  startTracking(options: { orderId: number; endpoint: string; token: string }): Promise<NativeTrackingStatus>;
  stopTracking(): Promise<NativeTrackingStatus>;
  getStatus(): Promise<NativeTrackingStatus>;
};

const plugin = (): NativeLocationPlugin | null => {
  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { RitmesaLocation?: NativeLocationPlugin } };
  }).Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;
  return capacitor.Plugins?.RitmesaLocation || null;
};

export const isNativeLocationAvailable = () => Boolean(plugin());

export async function nativeTrackingStatus(): Promise<NativeTrackingStatus> {
  const native = plugin();
  return native ? native.getStatus() : { active: false };
}

export async function startNativeTracking(orderId: number) {
  const native = plugin();
  if (!native) throw new Error('Serviço nativo de localização indisponível.');
  const token = localStorage.getItem('adminToken');
  if (!token) throw new Error('Sessão expirada. Entre novamente.');
  const baseUrl = String(api.defaults.baseURL || window.location.origin).replace(/\/$/, '');
  return native.startTracking({
    orderId,
    endpoint: `${baseUrl}/entregas/${orderId}/localizacao`,
    token,
  });
}

export async function stopNativeTracking() {
  const native = plugin();
  return native ? native.stopTracking() : { active: false };
}
