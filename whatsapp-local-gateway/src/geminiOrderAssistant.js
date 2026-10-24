/**
 * Gemini AI Order Assistant for BisBurger WhatsApp Gateway
 * Handles automated order taking, menu queries, and direct order creation via Gemini 3.8 Flash.
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
 * Call Google Gemini with JSON mode and fallback models
 */
async function callGemini(systemInstruction, history, userMessage, config, log) {
  const models = ['gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
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
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status} (${m}): ${errText.slice(0, 150)}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error(`Resposta vazia do modelo ${m}`);

      const parsed = JSON.parse(rawText);
      return parsed;
    } catch (err) {
      lastError = err;
      if (log) log(`Tentativa com ${m} falhou: ${err.message}. Tentando próximo...`);
    }
  }

  throw lastError || new Error('Todos os modelos Gemini falharam.');
}

/**
 * Submit confirmed order into Ritmesa backend
 */
async function submitOrderToBackend(orderData, config, log) {
  const baseUrl = config.backendUrl.replace(/\/$/, '');
  const url = `${baseUrl}/public/${config.establishmentSlug}/pedidos`;

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
    itens: orderData.itens.map(item => ({
      produto_id: Number(item.produto_id),
      quantidade: Number(item.quantidade) || 1,
      observacao: item.observacao || null,
      opcoes: (item.opcoes || []).map(op => ({
        opcao_id: Number(op.opcao_id),
        quantidade: Number(op.quantidade) || 1
      }))
    }))
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

/**
 * Main handler for WhatsApp messages with Gemini AI
 */
export async function processGeminiOrder({ chatId, contactName, phoneNumber, incomingText, config, log }) {
  // Check human request
  const lower = incomingText.toLowerCase();
  const wantsHuman = /^(6|opcao 6|atendente|humano|falar com atendente|pessoa|falar com uma pessoa)$/i.test(lower.trim());
  if (wantsHuman) {
    sessions.delete(chatId);
    return {
      intent: 'human',
      pause: true,
      text: `Entendido! Vou pausar o atendimento automático para o atendente da ${config.businessName} continuar com você por aqui. 👋`
    };
  }

  // Get or initialize session
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

  // Load menu
  const menu = await getLiveMenu(config, log);

  // System Prompt for BisBurger Assistant
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
2. Ao receber uma saudação ou pedido de cardápio, dê as boas-vindas, informe o link com fotos (${config.menuUrl}) mas diga que ele também pode pedir diretamente com você!
3. Quando o cliente pedir lanches, identifique o [PRODUTO ID: X] exato no cardápio.
4. Se o cliente pedir adicionais (ex: bacon extra, ovo, queijo), identifique o [OPCAO ID: Y] correspondente.
5. Para FECHAR um pedido, você OBRIGATORIAMENTE precisa coletar:
   a) Itens e quantidades exatas.
   b) Tipo de entrega: "delivery" ou "retirada".
   c) Se for delivery: Endereço completo (Rua, número e bairro). Se faltar número ou bairro, pergunte com educação.
   d) Forma de pagamento: PIX, Dinheiro (pergunte se precisa de troco para quanto), Cartão de Crédito ou Débito.
6. Assim que tiver TODOS os dados (itens + entrega + endereço + pagamento), apresente um RESUMO COMPLETO e BONITO com os valores e pergunte:
   "👉 Digite *1* para CONFIRMAR o pedido ou me avise se quiser alterar algo."
   Nessa etapa, marque "action": "PROPOSE_CONFIRMATION" e preencha "order" com os dados estruturados.
7. Quando o cliente responder confirmando (ex: "1", "confirmar", "sim", "pode mandar", "ok"):
   Marque "action": "CONFIRMED_CREATE_ORDER" e repita o objeto "order" completo.
8. Se o cliente pedir para falar com um humano, marque "action": "HANDOFF_HUMAN".

FORMATO DA SUA RESPOSTA (OBRIGATÓRIO SER APENAS ESSE JSON):
{
  "reply": "Texto da sua mensagem que será enviada no WhatsApp para o cliente",
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
Se "action" for "NONE", o campo "order" pode ser null.
Se "action" for "PROPOSE_CONFIRMATION" ou "CONFIRMED_CREATE_ORDER", o campo "order" DEVE conter todos os dados estruturados e os IDs reais do cardápio.
`;

  try {
    const aiResponse = await callGemini(systemInstruction, session.history, incomingText, config, log);

    // Save history
    session.history.push({ role: 'user', text: incomingText });
    if (aiResponse.reply) {
      session.history.push({ role: 'model', text: aiResponse.reply });
    }
    if (session.history.length > 16) {
      session.history = session.history.slice(-12);
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

    if (aiResponse.action === 'PROPOSE_CONFIRMATION' && aiResponse.order) {
      session.pendingOrder = {
        ...aiResponse.order,
        cliente: session.contactName || 'Cliente WhatsApp',
        telefone: session.phoneNumber || chatId.split('@')[0]
      };
      return {
        intent: 'order_propose',
        pause: false,
        text: aiResponse.reply
      };
    }

    if (aiResponse.action === 'CONFIRMED_CREATE_ORDER') {
      const orderToSubmit = aiResponse.order || session.pendingOrder;
      if (orderToSubmit && Array.isArray(orderToSubmit.itens) && orderToSubmit.itens.length > 0) {
        orderToSubmit.cliente = session.contactName || 'Cliente WhatsApp';
        orderToSubmit.telefone = session.phoneNumber || chatId.split('@')[0];

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
          return {
            intent: 'order_error',
            pause: false,
            text: `Recebi a sua confirmação, mas nosso sistema de pedidos avisou: "${submitErr.message}".\n\nPor favor, confirme seus dados ou digite *atendente* para concluirmos manualmente.`
          };
        }
      }
    }

    return {
      intent: 'gemini_reply',
      pause: false,
      text: aiResponse.reply
    };
  } catch (err) {
    if (log) log(`Falha crítica no Gemini: ${err.message}. Usando fallback clássico.`);
    return null; // Will trigger fallback to classic assistant
  }
}
