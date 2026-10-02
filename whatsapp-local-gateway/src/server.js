import express from 'express';
import QRCode from 'qrcode';
import wweb from 'whatsapp-web.js';
import { config } from './config.js';
import { audioReply, isAudioType, replyFor } from './assistant.js';
import { dashboardHtml } from './dashboard.js';
import { GatewayBridge } from './bridge.js';

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
const contactResolutionAttempts = new Map();

const log = (message) => {
  const entry = { time: new Date().toLocaleTimeString('pt-BR'), message };
  state.logs = [entry, ...state.logs].slice(0, 80);
  console.log(`[${entry.time}] ${message}`);
};

const bridge = new GatewayBridge(config, log);

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

// O WhatsApp está migrando conversas individuais de @c.us para @lid.
// Ambos representam contatos diretos e precisam chegar ao assistente.
const isDirectChatId = (chatId = '') => chatId.endsWith('@c.us') || chatId.endsWith('@lid');

const mediaLabels = {
  image: '[Imagem recebida]',
  video: '[Vídeo recebido]',
  document: '[Documento recebido]',
  sticker: '[Figurinha recebida]',
  location: '[Localização recebida]',
  contact_card: '[Contato recebido]',
  contacts: '[Contatos recebidos]',
};

const normalizeIncomingText = (message) => {
  if (isAudioType(message.type)) return '[Áudio recebido]';
  if (message.hasMedia || mediaLabels[message.type]) return mediaLabels[message.type] || '[Arquivo recebido]';
  const text = String(message.body || '').trim();
  const compact = text.replace(/\s/g, '');
  const looksEncoded = compact.length > 500 && /^[A-Za-z0-9+/=]+$/.test(compact);
  if (looksEncoded || text.length > 4000) return '[Conteúdo não suportado recebido]';
  return text;
};

const resolvePhoneNumber = async (chatId, contact = null) => {
  if (chatId.endsWith('@c.us')) {
    return contact?.number || contact?.id?.user || chatId.split('@')[0];
  }
  if (!chatId.endsWith('@lid')) return null;

  const mappings = await client.getContactLidAndPhone([chatId]);
  const mapping = mappings.find((item) => item.lid === chatId) || mappings[0];
  return mapping?.pn ? mapping.pn.split('@')[0] : null;
};

const syncContactIdentity = async (chatId, contactName = null, contact = null) => {
  const lastAttempt = contactResolutionAttempts.get(chatId) || 0;
  if (Date.now() - lastAttempt < 10 * 60 * 1000) return null;
  contactResolutionAttempts.set(chatId, Date.now());

  try {
    const phoneNumber = await resolvePhoneNumber(chatId, contact);
    if (phoneNumber) {
      bridge.contact(chatId, phoneNumber, contactName);
      return phoneNumber;
    }
  } catch (error) {
    log(`Não foi possível identificar o telefone de ${chatId}: ${error.message}`);
  }
  return null;
};

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
    // A ação de "digitando" ainda falha em algumas conversas @lid,
    // embora o envio direto para o mesmo identificador seja suportado.
    if (!chatId.endsWith('@lid')) {
      const chat = await client.getChatById(chatId);
      await chat.sendStateTyping();
    }
    await sleep(randomDelay());
    return await client.sendMessage(chatId, text);
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
    const sentMessage = await sendBotMessage(chatId, answer.text);
    bridge.outgoing({
      chat_id: chatId,
      external_id: sentMessage?.id?._serialized || null,
      texto: answer.text,
      remetente: 'bot',
      criado_em: new Date().toISOString(),
    });
    if (answer.pause) {
      handoffs.set(chatId, Date.now() + config.handoffMinutes * 60_000);
      bridge.mode(chatId, 'human', true);
    }
    log(`Resposta automática enviada para ${pending.contactName || chatId} (${answer.intent}).`);
  } catch (error) {
    log(`Falha ao responder ${chatId}: ${error.message}`);
  }
};

client.on('qr', async (qr) => {
  state.connection = 'waiting_qr';
  state.qr = await QRCode.toDataURL(qr, { width: 320, margin: 1 });
  log('QR Code gerado. Escaneie em Aparelhos conectados.');
  bridge.heartbeat({ connection: state.connection, connected_number: null, automation_enabled: state.automationEnabled, needs_qr: true });
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
  bridge.heartbeat({ connection: state.connection, connected_number: state.connectedNumber, automation_enabled: state.automationEnabled, needs_qr: false });
});

client.on('auth_failure', (message) => {
  state.connection = 'auth_failure';
  state.qr = null;
  log(`Falha de autenticação: ${message}`);
  bridge.heartbeat({ connection: state.connection, connected_number: null, automation_enabled: state.automationEnabled, needs_qr: true, error_message: message });
});

client.on('disconnected', (reason) => {
  state.connection = 'disconnected';
  state.qr = null;
  log(`WhatsApp desconectado: ${reason}.`);
  bridge.heartbeat({ connection: state.connection, connected_number: state.connectedNumber, automation_enabled: state.automationEnabled, needs_qr: false, error_message: String(reason) });
});

client.on('message_create', async (message) => {
  if (!message.fromMe || message.from === 'status@broadcast') return;
  const chatId = message.to;
  if (!chatId || botSendingChats.has(chatId)) return;
  handoffs.set(chatId, Date.now() + config.handoffMinutes * 60_000);
  if (message.body?.trim()) {
    bridge.outgoing({
      chat_id: chatId,
      external_id: message.id?._serialized || null,
      texto: message.body,
      remetente: 'humano',
      criado_em: message.timestamp ? new Date(message.timestamp * 1000).toISOString() : new Date().toISOString(),
    });
  }
  bridge.mode(chatId, 'human', true);
  log(`Atendimento humano detectado em ${chatId}; robô pausado temporariamente.`);
});

client.on('message', async (message) => {
  if (message.fromMe || message.from === 'status@broadcast' || !isDirectChatId(message.from)) return;
  const receivedAudio = isAudioType(message.type);
  const incomingText = normalizeIncomingText(message);
  if (!incomingText) return;

  let contactName = message.from;
  let phoneNumber = null;
  try {
    const contact = await message.getContact();
    contactName = contact.pushname || contact.name || contact.number || message.from;
    phoneNumber = await syncContactIdentity(message.from, contactName, contact);
  } catch {}

  log(`${receivedAudio ? 'Áudio' : 'Mensagem'} recebido de ${contactName}.`);
  bridge.incoming({
    chat_id: message.from,
    telefone: phoneNumber,
    contact_name: contactName,
    external_id: message.id?._serialized || null,
    texto: incomingText,
    criado_em: message.timestamp ? new Date(message.timestamp * 1000).toISOString() : new Date().toISOString(),
  });

  if (receivedAudio) {
    if (!state.automationEnabled || isInHandoff(message.from) || isRateLimited(message.from)) return;
    try {
      const text = audioReply();
      const sentMessage = await sendBotMessage(message.from, text);
      bridge.outgoing({
        chat_id: message.from,
        external_id: sentMessage?.id?._serialized || null,
        texto: text,
        remetente: 'bot',
        criado_em: new Date().toISOString(),
      });
      log(`Orientação para áudio enviada para ${contactName}.`);
    } catch (error) {
      log(`Falha ao responder áudio de ${message.from}: ${error.message}`);
    }
    return;
  }

  const previous = pendingMessages.get(message.from);
  if (previous?.timer) clearTimeout(previous.timer);
  const messages = [...(previous?.messages || []), { body: incomingText }];
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
  bridge.heartbeat({ connection: state.connection, connected_number: state.connectedNumber, automation_enabled: state.automationEnabled, needs_qr: state.connection === 'waiting_qr' });
  response.json({ automationEnabled: state.automationEnabled });
});

let syncingOutbox = false;
const syncPanel = async () => {
  if (syncingOutbox || !bridge.enabled || state.connection !== 'ready') return;
  syncingOutbox = true;
  try {
    const data = await bridge.sync();
    for (const item of data.modes || []) {
      if (item.modo === 'human') handoffs.set(item.chat_id, Number.POSITIVE_INFINITY);
      else handoffs.delete(item.chat_id);
      await syncContactIdentity(item.chat_id);
    }
    for (const queued of data.outbox || []) {
      botSendingChats.add(queued.chat_id);
      try {
        const sent = await client.sendMessage(queued.chat_id, queued.texto);
        await bridge.deliveryStatus(queued.id, 'sent', sent?.id?._serialized || null);
        log(`Resposta do painel enviada para ${queued.chat_id}.`);
      } catch (error) {
        await bridge.deliveryStatus(queued.id, 'failed', null, error.message);
        log(`Falha ao enviar resposta do painel para ${queued.chat_id}: ${error.message}`);
      } finally {
        setTimeout(() => botSendingChats.delete(queued.chat_id), 2500);
      }
    }
  } finally {
    syncingOutbox = false;
  }
};

setInterval(() => void syncPanel(), 2500);
setInterval(() => bridge.heartbeat({
  connection: state.connection,
  connected_number: state.connectedNumber,
  automation_enabled: state.automationEnabled,
  needs_qr: state.connection === 'waiting_qr',
}), 15_000);

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
