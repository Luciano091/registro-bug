import api from './api';

type PushRegistration = { token: string; platform: string; appVersion: string };
type PushOpen = { orderId?: number };
type NativePushPlugin = {
  register(): Promise<PushRegistration>;
  getInitialNotification(): Promise<PushOpen>;
};

const plugin = (): NativePushPlugin | null => {
  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { RitmesaPush?: NativePushPlugin } };
  }).Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;
  return capacitor.Plugins?.RitmesaPush || null;
};

export const isNativePushAvailable = () => Boolean(plugin());

export async function registerNativePush(): Promise<PushOpen> {
  const native = plugin();
  if (!native) return {};
  const registration = await native.register();
  await api.post('/dispositivos/push', {
    token: registration.token,
    plataforma: registration.platform,
    app_version: registration.appVersion,
  });
  return native.getInitialNotification();
}
