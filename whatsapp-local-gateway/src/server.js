import express from 'express';
import QRCode from 'qrcode';
import wweb from 'whatsapp-web.js';
import { config } from './config.js';
import { replyFor } from './assistant.js';
import { dashboardHtml } from './dashboard.js';

const { Client, LocalAuth } = wweb;
const app = express();
app.use(express.json({ limit: '32kb' }));

const state = {
  connection: 'starting',
  qr: null,
  automationEnabled: true,
  logs: [],
  connectedNumber: null,
};

const handoffs = new Map();
const replyHistory = new Map();
const pendingMessages = new Map();
const botSendingChats = new Set();

const log = (message) => {
  const entry = { time: new Date().toLocaleTimeString('pt-BR'), message };
  state.logs = [entry, ...state.logs].slice(0, 80);
  console.log(`[${entry.time}] ${message}`);
};

const chromeArgs = [
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-setuid-sandbox',
];
if (config.chromeNoSandbox) chromeArgs.push('--no-sandbox');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '.session', clientId: 'bisburger' }),
  puppeteer: {
    headless: config.chromeHeadless,
    executablePath: config.chromePath,
    args: chromeArgs,
  },
});

const randomDelay = () => {
  const min = Math.min(config.replyDelayMinMs, config.replyDelayMaxMs);
  const max = Math.max(config.replyDelayMinMs, config.replyDelayMaxMs);
  return min + Math.floor(Math.random() * Math.max(1, max - min));
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const isRateLimited = (chatId) => {
  const now = Date.now();
  const windowStart = now - 10 * 60 * 1000;
  const history = (replyHistory.get(chatId) || []).filter((value) => value >= windowStart);
  if (history.length >= 12) {
    replyHistory.set(chatId, history);
    return true;
  }
  history.push(now);
  replyHistory.set(chatId, history);
  return false;
};

const isInHandoff = (chatId) => {
  const until = handoffs.get(chatId);
  if (!until) return false;
  if (until <= Date.now()) {
    handoffs.delete(chatId);
    return false;
  }
  return true;
};

const sendBotMessage = async (chatId, text) => {
  botSendingChats.add(chatId);
  try {
    const chat = await client.getChatById(chatId);
    await chat.sendStateTyping();
    await sleep(randomDelay());
    await client.sendMessage(chatId, text);
  } finally {
    setTimeout(() => botSendingChats.delete(chatId), 2500);
  }
};

const processMessages = async (chatId) => {
  const pending = pendingMessages.get(chatId);
  if (!pending) return;
  pendingMessages.delete(chatId);

  if (!state.automationEnabled || isInHandoff(chatId)) return;
  if (isRateLimited(chatId)) {
    handoffs.set(chatId, Date.now() + config.handoffMinutes * 60_000);
    log(`Automação pausada por limite de segurança para ${chatId}.`);
    return;
  }

  const combinedText = pending.messages.map((message) => message.body).join(' ');
  const answer = replyFor(combinedText, config);
  if (!answer.text) return;

  try {
    await sendBotMessage(chatId, answer.text);
    if (answer.pause) handoffs.set(chatId, Date.now() + config.handoffMinutes * 60_000);
    log(`Resposta automática enviada para ${pending.contactName || chatId} (${answer.intent}).`);
  } catch (error) {
    log(`Falha ao responder ${chatId}: ${error.message}`);
  }
};

client.on('qr', async (qr) => {
  state.connection = 'waiting_qr';
  state.qr = await QRCode.toDataURL(qr, { width: 320, margin: 1 });
  log('QR Code gerado. Escaneie em Aparelhos conectados.');
});

client.on('authenticated', () => {
  state.connection = 'authenticated';
  state.qr = null;
  log('QR Code aceito; autenticando a sessão.');
});

client.on('ready', () => {
  state.connection = 'ready';
  state.qr = null;
  state.connectedNumber = client.info?.wid?.user || null;
  log(`WhatsApp conectado${state.connectedNumber ? ` no número ${state.connectedNumber}` : ''}.`);
});

client.on('auth_failure', (message) => {
  state.connection = 'auth_failure';
  state.qr = null;
  log(`Falha de autenticação: ${message}`);
});

client.on('disconnected', (reason) => {
  state.connection = 'disconnected';
  state.qr = null;
  log(`WhatsApp desconectado: ${reason}.`);
});

client.on('message_create', (message) => {
  if (!message.fromMe || message.from === 'status@broadcast') return;
  const chatId = message.to;
  if (!chatId || botSendingChats.has(chatId)) return;
  handoffs.set(chatId, Date.now() + config.handoffMinutes * 60_000);
  log(`Atendimento humano detectado em ${chatId}; robô pausado temporariamente.`);
});

client.on('message', async (message) => {
  if (message.fromMe || message.from === 'status@broadcast' || !message.from.endsWith('@c.us')) return;
  if (!message.body?.trim()) return;

  let contactName = message.from;
  try {
    const contact = await message.getContact();
    contactName = contact.pushname || contact.name || contact.number || message.from;
  } catch {}

  log(`Mensagem recebida de ${contactName}.`);
  const previous = pendingMessages.get(message.from);
  if (previous?.timer) clearTimeout(previous.timer);
  const messages = [...(previous?.messages || []), message];
  const timer = setTimeout(() => processMessages(message.from), 1100);
  pendingMessages.set(message.from, { messages, contactName, timer });
});

app.get('/', (_request, response) => response.type('html').send(dashboardHtml));

app.get('/api/status', (_request, response) => response.json({
  connection: state.connection,
  qr: state.qr,
  automationEnabled: state.automationEnabled,
  connectedNumber: state.connectedNumber,
  logs: state.logs,
}));

app.post('/api/automation', (request, response) => {
  state.automationEnabled = Boolean(request.body?.enabled);
  log(`Atendimento automático ${state.automationEnabled ? 'ativado' : 'pausado'} pelo painel local.`);
  response.json({ automationEnabled: state.automationEnabled });
});

const server = app.listen(config.port, config.host, () => {
  log(`Painel local disponível em http://${config.host}:${config.port}`);
  client.initialize().catch((error) => {
    state.connection = 'disconnected';
    log(`Não foi possível iniciar o navegador: ${error.message}`);
  });
});

const shutdown = async (signal) => {
  log(`Encerrando com ${signal}; preservando a sessão local.`);
  server.close();
  try { await client.destroy(); } catch {}
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

