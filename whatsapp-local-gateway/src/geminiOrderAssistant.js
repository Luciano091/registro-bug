/**
 * Gemini AI Order Assistant for BisBurger WhatsApp Gateway
 * Handles automated order taking, menu queries, and direct order creation via Gemini Flash.
 */

// In-memory sessions per chatId
const sessions = new Map();
const SESSION_EXPIRATION_MS = 45 * 60 * 1000; // 45 minutes of inactivity

// Menu cache
let cachedMenu = null;
let lastMenuFetchAt = 0;
const MENU_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch and format live menu from backend
 */
export async function getLiveMenu(config, log) {
  const now = Date.now();
  if (cachedMenu && now - lastMenuFetchAt < MENU_CACHE_TTL_MS) {
    return cachedMenu;
  }

  try {
    const baseUrl = config.backendUrl.replace(/\/$/, '');
    const [prodsRes, catsRes] = await Promise.all([
      fetch(`${baseUrl}/public/${config.establishmentSlug}/produtos`, { signal: AbortSignal.timeout(6000) }),
      fetch(`${baseUrl}/public/${config.establishmentSlug}/categorias`, { signal: AbortSignal.timeout(6000) })
    ]);

    if (!prodsRes.ok) throw new Error(`HTTP ${prodsRes.status} ao buscar produtos`);
    const produtos = await prodsRes.json();
    const categorias = catsRes.ok ? await catsRes.json() : [];

    // Filter only active products
    const activeProducts = produtos.filter(p => p.ativo !== false);

    // Format menu for system prompt
    let formattedText = `CARDÁPIO OFICIAL DA ${config.businessName.toUpperCase()}:\n`;
    
    // Group by category
    const catMap = new Map();
    for (const c of categorias) catMap.set(c.id, c.nome);

    for (const p of activeProducts) {
      const catName = catMap.get(p.categoria_id) || p.categoria || 'Outros';
      const precoStr = Number(p.preco || 0).toFixed(2);
      formattedText += `\n• [PRODUTO ID: ${p.id}] ${p.nome} - R$ ${precoStr} (Categoria: ${catName})`;
      if (p.descricao) formattedText += `\n  Descrição: ${p.descricao}`;

      if (Array.isArray(p.grupos_opcoes) && p.grupos_opcoes.length > 0) {
        const adicionais = [];
        for (const g of p.grupos_opcoes) {
          if (!g.ativo) continue;
          for (const op of (g.opcoes || [])) {
            if (!op.ativo) continue;
            const opPreco = Number(op.preco_adicional || 0).toFixed(2);
            adicionais.push(`[OPCAO ID: ${op.id}] ${op.nome} (+R$ ${opPreco})`);
          }
        }
        if (adicionais.length > 0) {
          formattedText += `\n  Opções/Adicionais permitidos: ${adicionais.join(', ')}`;
        }
      }
    }

    cachedMenu = {
      rawProducts: activeProducts,
      formattedText,
      loadedAt: now
    };
    lastMenuFetchAt = now;
    if (log) log(`Cardápio atualizado: ${activeProducts.length} produtos carregados.`);
    return cachedMenu;
  } catch (error) {
    if (log) log(`Erro ao atualizar cardápio: ${error.message}`);
    if (cachedMenu) return cachedMenu;
    return { rawProducts: [], formattedText: 'Cardápio temporariamente indisponível.', loadedAt: 0 };
  }
}

/**
 * Splits initial greeting message into 2 separate bubbles if it includes the menu link
 * Bubble 1: Welcome message + cardápio link with photos preview
 * Bubble 2: Independent bubble right after: "Ou me dizer diretamente o que vai querer pedir por aqui! 🛵💨"
 */
export function splitGreetingMessage(text, menuUrl = '') {
  if (!text || typeof text !== 'string') return [text];
  const hasCardapioLink = text.includes('/cardapio') || (menuUrl && text.includes(menuUrl));
  if (!hasCardapioLink) {
    return [text];
  }

  const urlRegex = /(?:https?:\/\/[^\s]+cardapio[^\s]*)/i;
  const urlMatch = text.match(urlRegex);
  if (!urlMatch) return [text];

  const urlEndIndex = urlMatch.index + urlMatch[0].length;
  const part1Raw = text.slice(0, urlEndIndex).trim();
  const part2Raw = text.slice(urlEndIndex).trim();

  if (part2Raw && /(?:me dizer|preferir|pode pedir|me fala|pedir por aqui|diretamente|o que deseja|o que vai)/i.test(part2Raw)) {
    let part2 = part2Raw.replace(/^[\s,.\-–—]+/, '');
    if (!/^ou\b/i.test(part2)) {
      part2 = 'Ou ' + part2;
    }
    part2 = part2.charAt(0).toUpperCase() + part2.slice(1);
    return [part1Raw, part2];
  }

  return [text];
}

/**
 * Normalize AI response object structure
 */
function normalizeAiResponse(obj, menuUrl = '') {
  if (!obj || typeof obj !== 'object') return null;
  const rawReply = typeof obj.reply === 'string'
    ? obj.reply
    : (typeof obj.message === 'string' ? obj.message : (typeof obj.resposta === 'string' ? obj.resposta : ''));

  let messages = [];
  if (Array.isArray(obj.messages) && obj.messages.length > 0) {
    messages = obj.messages.map(m => String(m).trim()).filter(Boolean);
  } else if (rawReply.trim()) {
    messages = splitGreetingMessage(rawReply.trim(), menuUrl);
  }

  return {
    reply: rawReply.trim() || messages.join('\n\n'),
    messages,
    action: typeof obj.action === 'string' ? obj.action.trim() : 'NONE',
    order: (obj.order && typeof obj.order === 'object') ? obj.order : null
  };
}

/**
 * Resilient parser for Gemini output
 * Supports direct JSON, markdown blocks, embedded JSON, or conversational plain text.
 */
function parseAiOutput(rawText, menuUrl = '') {
  if (!rawText || typeof rawText !== 'string') return null;
  const trimmed = rawText.trim();

  // 1. Direct JSON parse
  try {
    const obj = JSON.parse(trimmed);
    if (obj && typeof obj === 'object') {
      const normalized = normalizeAiResponse(obj, menuUrl);
      if (normalized?.reply) return normalized;
    }
  } catch (_) {}

  // 2. Markdown code block ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    try {
      const obj = JSON.parse(codeBlockMatch[1].trim());
      if (obj && typeof obj === 'object') {
        const normalized = normalizeAiResponse(obj, menuUrl);
        if (normalized?.reply) return normalized;
      }
    } catch (_) {}
  }

  // 3. Find JSON block between first "{" and last "}"
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1);
      const obj = JSON.parse(candidate);
      if (obj && typeof obj === 'object') {
        const normalized = normalizeAiResponse(obj, menuUrl);
        if (normalized?.reply) return normalized;
      }
    } catch (_) {}
  }

  // 4. Conversational plain text response (treat the entire text as reply)
  const messages = splitGreetingMessage(trimmed, menuUrl);
  return {
    reply: trimmed,
    messages,
    action: 'NONE',
    order: null
  };
}

/**
 * Call Google Gemini with JSON mode and fallback models
 */
async function callGemini(systemInstruction, history, userMessage, config, log) {
  const models = ['gemini-flash-lite-latest', 'gemini-3.5-flash'];
  const key = config.geminiApiKey;

  const contents = [];
  for (const h of history) {
    contents.push({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }]
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2
    },
    contents
  };

  let lastError = null;
  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status} (${m}): ${errText.slice(0, 150)}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error(`Resposta vazia do modelo ${m}`);

      const parsed = parseAiOutput(rawText, config.menuUrl);
      if (parsed && parsed.reply) {
        return parsed;
      }
      throw new Error(`Não foi possível extrair resposta do modelo ${m}`);
    } catch (err) {
      lastError = err;
      if (log) log(`Tentativa com ${m} falhou: ${err.message}. Tentando próximo...`);
    }
  }

  throw lastError || new Error('Todos os modelos Gemini falharam.');
}

/**
 * Format user-friendly error message from backend submit response
 */
function formatSubmitErrorMessage(rawErrorMessage) {
  let clean = rawErrorMessage || '';
  try {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.detail) clean = parsed.detail;
    }
  } catch {}
  clean = clean.replace(/^Erro na API \(\d+\):\s*/i, '').trim();

  const isCaixaFechado = clean.includes('Caixa está fechado');
  const isEstoque = clean.toLowerCase().includes('estoque');

  if (isCaixaFechado) {
    return {
      pause: true,
      text: '⚠️ Nosso Caixa está fechado no momento no sistema da loja. Vou chamar o atendente para te atender por aqui! 👋'
    };
  }
  if (isEstoque) {
    return {
      pause: false,
      text: `⚠️ Nosso sistema avisou: ${clean}.\n\nGostaria de escolher outro lanche do cardápio ou prefere falar com um atendente? 🍔`
    };
  }
  return {
    pause: false,
    text: `Recebi a sua confirmação, mas nosso sistema avisou: "${clean}".\n\nPor favor, me informe como prefere prosseguir ou digite *atendente* para falarmos com você.`
  };
}

/**
 * Submit confirmed order into Ritmesa backend
 */
async function submitOrderToBackend(orderData, config, log) {
  const baseUrl = config.backendUrl.replace(/\/$/, '');
  const url = `${baseUrl}/public/${config.establishmentSlug}/pedidos`;

  const validItems = (orderData.itens || [])
    .filter(item => item && (item.produto_id || item.id))
    .map(item => ({
      produto_id: Number(item.produto_id || item.id),
      quantidade: Number(item.quantidade) || 1,
      observacao: item.observacao || null,
      opcoes: (item.opcoes || [])
        .filter(op => op && (op.opcao_id || op.id))
        .map(op => ({
          opcao_id: Number(op.opcao_id || op.id),
          quantidade: Number(op.quantidade) || 1
        }))
    }));

  if (validItems.length === 0) {
    throw new Error('Nenhum item válido encontrado no pedido.');
  }

  const payload = {
    uuid: `wpp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    cliente: orderData.cliente || 'Cliente WhatsApp',
    telefone: orderData.telefone || '',
    tipo_entrega: orderData.tipo_entrega === 'retirada' ? 'retirada' : 'delivery',
    endereco: orderData.endereco || null,
    bairro: orderData.bairro || 'Centro',
    forma_pagamento: orderData.forma_pagamento || 'PIX',
    observacao: orderData.observacao || 'Pedido realizado via WhatsApp',
    origem: 'whatsapp',
    itens: validItems
  };

  if (log) log(`Enviando pedido para a API da BisBurger: ${payload.cliente} (${payload.itens.length} itens)`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro na API (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  return result;
}

function normalizePhone(raw) {
  if (!raw) return '';
  const clean = String(raw).replace(/\D/g, '');
  if ((clean.length === 12 || clean.length === 13) && clean.startsWith('55')) {
    return clean.slice(2);
  }
  return clean;
}

/**
 * Main handler for WhatsApp messages with Gemini AI
 */
export async function processGeminiOrder({ chatId, contactName, phoneNumber, incomingText, config, log }) {
  const trimmedLower = incomingText.trim().toLowerCase();

  // 1. Check human request
  const wantsHuman = /^(6|opcao 6|opção 6|atendente|humano|falar com atendente|pessoa|falar com uma pessoa)$/i.test(trimmedLower);
  if (wantsHuman) {
    sessions.delete(chatId);
    return {
      intent: 'human',
      pause: true,
      text: `Entendido! Vou pausar o atendimento automático para o atendente da ${config.businessName} continuar com você por aqui. 👋`
    };
  }

  // 2. Get or initialize session
  const now = Date.now();
  let session = sessions.get(chatId);
  if (!session || now - session.lastActive > SESSION_EXPIRATION_MS) {
    session = {
      chatId,
      contactName,
      phoneNumber,
      history: [],
      pendingOrder: null,
      lastActive: now
    };
    sessions.set(chatId, session);
  }
  session.lastActive = now;
  if (contactName && !session.contactName) session.contactName = contactName;
  if (phoneNumber && !session.phoneNumber) session.phoneNumber = phoneNumber;

  // 3. Fast direct confirmation shortcut:
  // If the user was shown the order summary and responds "1", "sim", "confirmar", etc.
  const isDirectConfirmation = /^(1|sim|confirmar|confirmo|pode mandar|manda|fechar|ok|pode ser|correto|isso aí|isso)$/i.test(trimmedLower);
  if (session.pendingOrder && Array.isArray(session.pendingOrder.itens) && session.pendingOrder.itens.length > 0 && isDirectConfirmation) {
    const orderToSubmit = {
      ...session.pendingOrder,
      cliente: session.contactName || 'Cliente WhatsApp',
      telefone: normalizePhone(session.phoneNumber || chatId.split('@')[0])
    };

    try {
      const created = await submitOrderToBackend(orderToSubmit, config, log);
      const orderNum = created.numero || created.id;
      session.pendingOrder = null;
      session.history = []; // reset after completed order

      let successMsg = `🎉 *Pedido #${orderNum} confirmado com sucesso!*\n\n`;
      successMsg += `🍔 Seus lanches já entraram na nossa chapa!\n`;
      successMsg += `⏱️ Previsão: 35 a 50 minutos.\n`;
      
      if (orderToSubmit.forma_pagamento?.toUpperCase().includes('PIX')) {
        successMsg += `\n🔑 *Chave PIX:* 82998218008 (Telefone - BisBurger)\n_Envie o comprovante por aqui se puder._\n`;
      }

      successMsg += `\nAvisaremos por aqui assim que sair para entrega! 🛵💨`;
      if (log) log(`PEDIDO CRIADO COM SUCESSO: #${orderNum} para ${orderToSubmit.cliente}`);

      return {
        intent: 'order_created',
        pause: false,
        text: successMsg
      };
    } catch (submitErr) {
      if (log) log(`Erro ao cadastrar pedido no backend: ${submitErr.message}`);
      const errInfo = formatSubmitErrorMessage(submitErr.message);
      return {
        intent: 'order_error',
        pause: errInfo.pause,
        text: errInfo.text
      };
    }
  }

  // 4. Load live menu
  const menu = await getLiveMenu(config, log);

  // 5. System Prompt for BisBurger Assistant Bia
  const systemInstruction = `
Você é Bia, a atendente virtual oficial, calorosa, educada e muito ágil da hamburgueria ${config.businessName} em ${config.address}.
Você atende clientes no WhatsApp e ajuda a tirar dúvidas do cardápio e fechar pedidos de forma rápida para entrega ou retirada.

DADOS DA LOJA:
- Nome: ${config.businessName}
- Endereço da loja: ${config.address}
- Horário: ${config.hours}
- Formas de pagamento aceitas: PIX, Dinheiro, Cartão de Crédito e Cartão de Débito na entrega/retirada.
- Informações de entrega: ${config.deliveryInfo}.
- Link do cardápio online com fotos: ${config.menuUrl}

${menu.formattedText}

DADOS DO CLIENTE ATUAL:
- Nome: ${session.contactName || 'Cliente'}
- Telefone: ${session.phoneNumber || 'Não identificado'}

COMO CONVERSAR E ATENDER:
1. Seja sempre simpático(a), use emojis com moderação (🍔, 🍟, 🥤, 🛵, ✨) e seja muito direto ao ponto (os clientes no delivery querem rapidez!).
2. REGRA PARA SAUDAÇÃO INICIAL OU ENVIO DE CARDÁPIO:
   Ao receber uma saudação (ex: "boa noite", "oi", "olá") ou quando for enviar o link do cardápio, NUNCA envie tudo misturado em um único bloco.
   Envie SEMPRE duas mensagens separadas no array "messages":
   - Mensagem 1: Boas-vindas calorosas com o link do cardápio com fotos (${config.menuUrl})
   - Mensagem 2 (balão isolado logo em seguida): "Ou me dizer diretamente o que vai querer pedir por aqui! 🛵💨"
3. Quando o cliente pedir lanches, identifique o [PRODUTO ID: X] exato no cardápio.
4. Se o cliente pedir adicionais (ex: bacon extra, ovo, queijo), identifique o [OPCAO ID: Y] correspondente.
5. Para FECHAR um pedido, você OBRIGATORIAMENTE precisa coletar:
   a) Itens e quantidades exatas.
   b) Tipo de entrega: "delivery" ou "retirada".
   c) Se for delivery: Endereço completo (Rua, número e bairro). Se faltar número ou bairro, pergunte com educação.
   d) Forma de pagamento: PIX, Dinheiro (pergunte se precisa de troco para quanto), Cartão de Crédito ou Débito.
6. Sempre que o cliente já tiver escolhido produtos, mantenha o campo "order" com os itens selecionados (usando os IDs numéricos reais do cardápio).
7. Assim que tiver TODOS os dados (itens + entrega + endereço + pagamento), apresente um RESUMO COMPLETO e BONITO com os valores e pergunte:
   "👉 Digite *1* para CONFIRMAR o pedido ou me avise se quiser alterar algo."
   Nessa etapa, marque "action": "PROPOSE_CONFIRMATION" e preencha "order" com os dados estruturados.
8. Quando o cliente responder confirmando (ex: "1", "confirmar", "sim", "pode mandar", "ok"):
   Marque "action": "CONFIRMED_CREATE_ORDER" e repita o objeto "order" completo.
9. Se o cliente pedir para falar com um humano, marque "action": "HANDOFF_HUMAN".

FORMATO DA SUA RESPOSTA (OBRIGATÓRIO SER APENAS ESSE JSON):
{
  "reply": "Texto da sua mensagem que será enviada no WhatsApp para o cliente",
  "messages": ["Mensagem 1", "Mensagem 2"],
  "action": "NONE" | "PROPOSE_CONFIRMATION" | "CONFIRMED_CREATE_ORDER" | "HANDOFF_HUMAN",
  "order": {
    "tipo_entrega": "delivery" | "retirada",
    "endereco": "Rua ..., Nº ...",
    "bairro": "Centro",
    "forma_pagamento": "PIX" | "Dinheiro" | "Cartão de Crédito" | "Cartão de Débito",
    "troco_para": null,
    "observacao": "sem salada...",
    "itens": [
      {
        "produto_id": 7,
        "quantidade": 1,
        "observacao": "sem cebola",
        "opcoes": [
          { "opcao_id": 8, "quantidade": 1 }
        ]
      }
    ]
  }
}
Se "action" for "NONE", o campo "order" pode ser null se ainda não houver produtos selecionados.
Se "action" for "PROPOSE_CONFIRMATION" ou "CONFIRMED_CREATE_ORDER", o campo "order" DEVE conter todos os dados estruturados e os IDs reais do cardápio.
`;

  try {
    const aiResponse = await callGemini(systemInstruction, session.history, incomingText, config, log);

    // Save history with JSON string representation to maintain consistent model behavior
    session.history.push({ role: 'user', text: incomingText });
    if (aiResponse.reply) {
      session.history.push({
        role: 'model',
        text: JSON.stringify({
          reply: aiResponse.reply,
          action: aiResponse.action || 'NONE',
          order: aiResponse.order || null
        })
      });
    }
    if (session.history.length > 16) {
      session.history = session.history.slice(-12);
    }

    // Accumulate order data if model identified items or delivery/payment info
    if (aiResponse.order && typeof aiResponse.order === 'object') {
      const existingItems = session.pendingOrder?.itens || [];
      const newItems = Array.isArray(aiResponse.order.itens) && aiResponse.order.itens.length > 0
        ? aiResponse.order.itens
        : existingItems;

      session.pendingOrder = {
        ...(session.pendingOrder || {}),
        ...aiResponse.order,
        itens: newItems,
        cliente: session.contactName || 'Cliente WhatsApp',
        telefone: normalizePhone(session.phoneNumber || chatId.split('@')[0])
      };
    }

    // Process actions
    if (aiResponse.action === 'HANDOFF_HUMAN') {
      sessions.delete(chatId);
      return {
        intent: 'human',
        pause: true,
        text: aiResponse.reply || `Um atendente da ${config.businessName} já vai continuar com você aqui. 👋`
      };
    }

    if (aiResponse.action === 'CONFIRMED_CREATE_ORDER') {
      const orderToSubmit = aiResponse.order || session.pendingOrder;
      if (orderToSubmit && Array.isArray(orderToSubmit.itens) && orderToSubmit.itens.length > 0) {
        orderToSubmit.cliente = session.contactName || 'Cliente WhatsApp';
        orderToSubmit.telefone = normalizePhone(session.phoneNumber || chatId.split('@')[0]);

        try {
          const created = await submitOrderToBackend(orderToSubmit, config, log);
          const orderNum = created.numero || created.id;
          session.pendingOrder = null;
          session.history = []; // reset after completed order

          let successMsg = `🎉 *Pedido #${orderNum} confirmado com sucesso!*\n\n`;
          successMsg += `🍔 Seus lanches já entraram na nossa chapa!\n`;
          successMsg += `⏱️ Previsão: 35 a 50 minutos.\n`;
          
          if (orderToSubmit.forma_pagamento?.toUpperCase().includes('PIX')) {
            successMsg += `\n🔑 *Chave PIX:* 82998218008 (Telefone - BisBurger)\n_Envie o comprovante por aqui se puder._\n`;
          }

          successMsg += `\nAvisaremos por aqui assim que sair para entrega! 🛵💨`;
          if (log) log(`PEDIDO CRIADO COM SUCESSO: #${orderNum} para ${orderToSubmit.cliente}`);

          return {
            intent: 'order_created',
            pause: false,
            text: successMsg
          };
        } catch (submitErr) {
          if (log) log(`Erro ao cadastrar pedido no backend: ${submitErr.message}`);
          const errInfo = formatSubmitErrorMessage(submitErr.message);
          return {
            intent: 'order_error',
            pause: errInfo.pause,
            text: errInfo.text
          };
        }
      }
    }

    if (aiResponse.action === 'PROPOSE_CONFIRMATION') {
      return {
        intent: 'order_propose',
        pause: false,
        text: aiResponse.reply
      };
    }

    const messagesToSend = (Array.isArray(aiResponse.messages) && aiResponse.messages.length > 0)
      ? aiResponse.messages
      : splitGreetingMessage(aiResponse.reply, config.menuUrl);

    return {
      intent: 'gemini_reply',
      pause: false,
      text: messagesToSend.join('\n\n'),
      messages: messagesToSend
    };
  } catch (err) {
    if (log) log(`Falha crítica no Gemini: ${err.message}.`);
    return {
      intent: 'gemini_error',
      pause: false,
      text: 'Desculpe, tive uma pequena oscilação aqui. 😔 Poderia repetir sua mensagem, por favor?'
    };
  }
}
