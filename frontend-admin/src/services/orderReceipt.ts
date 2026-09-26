const RECEIPT_WIDTH = 32;

const asNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) => asNumber(value).toLocaleString('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const center = (value: string) => {
  const text = value.trim().slice(0, RECEIPT_WIDTH);
  return `${' '.repeat(Math.max(0, Math.floor((RECEIPT_WIDTH - text.length) / 2)))}${text}`;
};

const wrap = (value: string, width = RECEIPT_WIDTH, prefix = '') => {
  const available = Math.max(1, width - prefix.length);
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > available) {
      if (current) lines.push(current);
      for (let index = 0; index < word.length; index += available) {
        lines.push(word.slice(index, index + available));
      }
      current = '';
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > available) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length === 0) lines.push('');
  return lines.map((line, index) => `${index === 0 ? prefix : ' '.repeat(prefix.length)}${line}`);
};

const addPair = (lines: string[], label: string, value: string) => {
  const spacing = RECEIPT_WIDTH - label.length - value.length;
  if (spacing >= 1) {
    lines.push(`${label}${' '.repeat(spacing)}${value}`);
    return;
  }
  lines.push(...wrap(label));
  lines.push(value.padStart(RECEIPT_WIDTH));
};

export const formatOrderReceipt = (order: any, businessName: string) => {
  const separator = '-'.repeat(RECEIPT_WIDTH);
  const lines: string[] = [
    separator,
    center(businessName.toUpperCase()),
    separator,
    '',
    `PEDIDO #${String(order.numero || '').split('-').pop() || order.numero}`,
  ];

  lines.push(...wrap(String(order.cliente || 'Cliente nao informado'), RECEIPT_WIDTH - 9, 'Cliente: '));
  if (order.telefone) lines.push(`Tel: ${order.telefone}`);
  const date = new Date(order.data);
  if (!Number.isNaN(date.getTime())) {
    lines.push(`Data: ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`);
  }

  lines.push('', '[ITENS DO PEDIDO]');
  for (const item of order.itens || []) {
    const quantity = asNumber(item.quantidade) || 1;
    const productName = item.produto_nome || item.produto?.nome || 'Produto';
    const itemTotal = item.subtotal ?? quantity * asNumber(item.valor_unitario ?? item.produto?.preco);
    addPair(lines, `${quantity}x ${productName}`, `R$ ${money(itemTotal)}`);

    for (const option of item.opcoes || []) {
      const optionQuantity = asNumber(option.quantidade) || 1;
      const optionName = option.opcao_nome || option.opcao || 'Adicional';
      // O total do item ja inclui os adicionais; repetir os valores aqui faria
      // o cliente interpretar que seriam cobrados novamente.
      lines.push(...wrap(`${optionQuantity}x ${optionName}`, RECEIPT_WIDTH - 4, '  + '));
    }
    if (item.observacao) lines.push(...wrap(String(item.observacao), RECEIPT_WIDTH - 7, '  Obs: '));
  }

  lines.push('', '[RESUMO]');
  addPair(lines, 'Subtotal', `R$ ${money(order.subtotal)}`);
  if (asNumber(order.taxa_entrega) > 0) addPair(lines, 'Taxa de entrega', `R$ ${money(order.taxa_entrega)}`);
  if (asNumber(order.taxa_servico) > 0) addPair(lines, 'Taxa de servico', `R$ ${money(order.taxa_servico)}`);
  if (asNumber(order.desconto) > 0) {
    const label = order.cupom_codigo ? `Cupom ${order.cupom_codigo}` : 'Desconto';
    addPair(lines, label, `- R$ ${money(order.desconto)}`);
  }
  if (asNumber(order.cashback_usado) > 0) addPair(lines, 'Cashback utilizado', `- R$ ${money(order.cashback_usado)}`);
  lines.push(separator);
  addPair(lines, 'TOTAL', `R$ ${money(order.total)}`);

  lines.push('', '[PAGAMENTO]');
  lines.push(...wrap(`Forma: ${order.forma_pagamento || 'Nao informado'}`));
  lines.push(`Status: ${order.pagamento_confirmado_em ? 'PAGO' : 'PENDENTE'}`);

  lines.push('', '[RECEBIMENTO]');
  const deliveryType = String(order.tipo_entrega || '').toLowerCase();
  if (['delivery', 'entrega'].includes(deliveryType)) {
    lines.push('Tipo: Delivery');
    lines.push(...wrap(String(order.endereco || 'Endereco nao informado'), RECEIPT_WIDTH - 10, 'Endereco: '));
    if (order.bairro) lines.push(...wrap(String(order.bairro), RECEIPT_WIDTH - 8, 'Bairro: '));
  } else if (['salao', 'salão', 'mesa'].includes(deliveryType)) {
    lines.push('Tipo: Mesa/Salao');
  } else {
    lines.push('Tipo: Retirada no balcao');
  }
  if (order.observacao) {
    lines.push(...wrap(String(order.observacao), RECEIPT_WIDTH - 5, 'Obs: '));
  }

  lines.push('', center('Obrigado pela preferencia!'), separator);
  return lines.join('\n');
};
