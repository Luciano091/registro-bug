import 'dotenv/config';

const integer = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) ? value : fallback;
};

const boolean = (name, fallback) => {
  const value = process.env[name];
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'sim'].includes(value.toLowerCase());
};

export const config = Object.freeze({
  host: process.env.HOST || '127.0.0.1',
  port: integer('PORT', 3210),
  chromePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  chromeHeadless: boolean('CHROME_HEADLESS', true),
  chromeNoSandbox: boolean('CHROME_NO_SANDBOX', false),
  businessName: process.env.BUSINESS_NAME || 'BisBurger',
  menuUrl: process.env.MENU_URL || 'https://bisburger.ritmesa.com.br/cardapio',
  address: process.env.BUSINESS_ADDRESS || 'Cajueiro-AL',
  hours: process.env.BUSINESS_HOURS || 'Todos os dias, das 13h às 00h',
  paymentMethods: process.env.PAYMENT_METHODS || 'PIX, dinheiro e cartão',
  deliveryInfo: process.env.DELIVERY_INFO || 'Consulte a entrega no cardápio',
  backendUrl: process.env.BACKEND_URL || 'https://registro-bug.onrender.com',
  gatewayToken: process.env.WHATSAPP_GATEWAY_TOKEN || '',
  establishmentSlug: process.env.ESTABLISHMENT_SLUG || 'bisburger',
  handoffMinutes: integer('HANDOFF_MINUTES', 120),
  replyDelayMinMs: integer('REPLY_DELAY_MIN_MS', 1200),
  replyDelayMaxMs: integer('REPLY_DELAY_MAX_MS', 2600),
});
