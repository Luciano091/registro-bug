const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const includesAny = (text, expressions) => expressions.some((expression) => text.includes(expression));

const numberedIntents = {
  1: 'menu',
  2: 'hours',
  3: 'delivery',
  4: 'payment',
  5: 'order_status',
  6: 'human',
};

const optionsMenu = `1️⃣ Ver cardápio
2️⃣ Horário de atendimento
3️⃣ Entrega e taxa
4️⃣ Formas de pagamento
5️⃣ Acompanhar pedido
6️⃣ Falar com atendente`;

const greetingFor = (text) => {
  if (text.includes('bom dia')) return 'Bom dia';
  if (text.includes('boa tarde')) return 'Boa tarde';
  if (text.includes('boa noite')) return 'Boa noite';
  return 'Olá';
};

export const intentFor = (message) => {
  const text = normalize(message);

  if (!text) return 'empty';
  const numberedOption = text.match(/^(?:opcao\s*)?([1-6])$/);
  if (numberedOption) return numberedIntents[numberedOption[1]];
  if (includesAny(text, ['atendente', 'humano', 'pessoa de verdade', 'falar com alguem', 'falar com uma pessoa'])) return 'human';
  if (includesAny(text, ['cardapio', 'menu', 'preco', 'valor', 'lanche', 'hamburguer', 'burger', 'comida'])) return 'menu';
  if (includesAny(text, ['meu pedido', 'acompanhar', 'status', 'onde esta', 'demora', 'pedido chegou'])) return 'order_status';
  if (includesAny(text, ['horario', 'aberto', 'abre', 'fecha', 'funciona'])) return 'hours';
  if (includesAny(text, ['endereco', 'localizacao', 'onde fica', 'como chegar'])) return 'address';
  if (includesAny(text, ['pagamento', 'pagar', 'pix', 'cartao', 'dinheiro'])) return 'payment';
  if (includesAny(text, ['entrega', 'delivery', 'taxa', 'frete', 'entregam'])) return 'delivery';
  if (includesAny(text, ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'e ai'])) return 'greeting';
  if (includesAny(text, ['obrigado', 'obrigada', 'valeu', 'agradeco'])) return 'thanks';
  return 'fallback';
};

export const replyFor = (message, business) => {
  const intent = intentFor(message);
  const name = business.businessName;

  switch (intent) {
    case 'human':
      return {
        intent,
        pause: true,
        text: `Claro! Vou pausar o atendimento automático para a equipe da ${name} continuar com você por aqui. 👋`,
      };
    case 'menu':
      return {
        intent,
        text: `Nosso cardápio está aqui: ${business.menuUrl}\n\nVocê consegue escolher os produtos, conferir os valores e finalizar o pedido pelo próprio link. 🍔`,
      };
    case 'order_status':
      return {
        intent,
        text: `Você pode acompanhar o pedido na aba *Pedidos* do nosso cardápio: ${business.menuUrl}\n\nSe precisar de ajuda, escreva *atendente* que alguém da equipe continua com você.`,
      };
    case 'hours':
      return { intent, text: `O horário de atendimento da ${name} é: ${business.hours}.` };
    case 'address':
      return { intent, text: `Estamos em ${business.address}. Se quiser fazer seu pedido, acesse ${business.menuUrl}` };
    case 'payment':
      return { intent, text: `Aceitamos ${business.paymentMethods}. A forma de pagamento pode ser escolhida ao finalizar o pedido.` };
    case 'delivery':
      return { intent, text: `${business.deliveryInfo}. Consulte as condições e finalize o pedido em ${business.menuUrl}` };
    case 'greeting':
      return {
        intent,
        text: `${greetingFor(normalize(message))}! 😊 Sou o assistente virtual da ${name}.\n\nComo posso ajudar?\n\n${optionsMenu}\n\nDigite o número da opção.`,
      };
    case 'thanks':
      return { intent, text: `Por nada! A ${name} agradece o contato. 🍔` };
    case 'empty':
      return { intent, text: null };
    default:
      return {
        intent,
        text: `Não consegui entender. Escolha uma opção:\n\n${optionsMenu}\n\nDigite o número da opção.`,
      };
  }
};

export const normalizeText = normalize;
