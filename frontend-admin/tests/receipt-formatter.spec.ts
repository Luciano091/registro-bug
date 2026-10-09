import { expect, test } from '@playwright/test';
import { formatOrderReceipt } from '../src/services/orderReceipt';

test('formata pedido completo para bobina termica de 58 mm', () => {
  const receipt = formatOrderReceipt({
    numero: 'BIS-002',
    cliente: 'LUCIANO SEVERIANO',
    telefone: '82999193166',
    data: '2026-09-26T18:27:28',
    itens: [{
      quantidade: 2,
      produto_nome: 'X-Burguer Especial',
      subtotal: 30.48,
      opcoes: [{ quantidade: 1, opcao_nome: 'Bacon extra', subtotal: 3 }],
      observacao: 'Sem cebola',
    }],
    subtotal: 30.48,
    taxa_entrega: 2,
    desconto: 1,
    cupom_codigo: 'TESTE10',
    cashback_usado: 0.5,
    total: 30.98,
    forma_pagamento: 'PIX',
    pagamento_confirmado_em: '2026-09-26T18:30:00',
    tipo_entrega: 'Delivery',
    endereco: 'Rua B, 122',
    bairro: 'Centro',
  }, 'BisBurger');

  expect(receipt).toContain('2x X-Burguer Especial');
  expect(receipt).toContain('+ 1x Bacon extra');
  expect(receipt).toContain('Obs: Sem cebola');
  expect(receipt).toContain('Cupom TESTE10');
  expect(receipt).toContain('Cashback utilizado');
  expect(receipt).toContain('Cliente:\n\x1B!\x38LUCIANO\nSEVERIANO\x1B!\x00');
  expect(receipt).toContain('Endereco:\n\x1B!\x38Rua B, 122\x1B!\x00');
  expect(receipt).toMatch(/PEDIDO #002\nData: 26\/09\/2026 .*\nCliente:/);
  expect(receipt.indexOf('Data:')).toBeLessThan(receipt.indexOf('Cliente:'));
  expect(receipt.indexOf('Cliente:')).toBeLessThan(receipt.indexOf('Endereco:'));
  expect(receipt.indexOf('Endereco:')).toBeLessThan(receipt.indexOf('Tel:'));
  expect(receipt.indexOf('Bairro: Centro')).toBeLessThan(receipt.indexOf('[ITENS DO PEDIDO]'));
  expect(receipt.match(/Endereco:/g)).toHaveLength(1);
  expect(receipt).toContain('[RECEBIMENTO]\nTipo: Delivery');
  const highlighted = [...receipt.matchAll(/\x1B!\x38([\s\S]*?)\x1B!\x00/g)];
  expect(highlighted).toHaveLength(2);
  for (const [, text] of highlighted) {
    expect(Math.max(...text.split('\n').map(line => line.length))).toBeLessThanOrEqual(16);
  }
  const withoutPrintCommands = receipt.replace(/\x1B!./g, '');
  expect(Math.max(...withoutPrintCommands.split('\n').map(line => line.length))).toBeLessThanOrEqual(32);
});

test('nao imprime endereco em destaque para retirada', () => {
  const receipt = formatOrderReceipt({
    numero: '004',
    cliente: 'ANA SILVA',
    tipo_entrega: 'retirada',
    endereco: 'Rua que nao deve aparecer',
    itens: [],
  }, 'BisBurger');

  expect(receipt).not.toContain('Endereco:');
  expect(receipt).toContain('Tipo: Retirada no balcao');
  expect([...receipt.matchAll(/\x1B!\x38([\s\S]*?)\x1B!\x00/g)]).toHaveLength(1);
});

test('quebra nome e endereco longos sem cortar informacoes no texto ampliado', () => {
  const receipt = formatOrderReceipt({
    numero: '003',
    cliente: 'MARIA APARECIDA DOS SANTOS OLIVEIRA',
    tipo_entrega: 'delivery',
    endereco: 'Avenida Professor Jose de Almeida, numero 1234, apartamento 302',
    itens: [],
  }, 'BisBurger');

  const highlighted = [...receipt.matchAll(/\x1B!\x38([\s\S]*?)\x1B!\x00/g)];
  expect(highlighted).toHaveLength(2);
  expect(highlighted[0][1].replace(/\n/g, ' ')).toBe('MARIA APARECIDA DOS SANTOS OLIVEIRA');
  expect(highlighted[1][1].replace(/\n/g, ' ')).toBe('Avenida Professor Jose de Almeida, numero 1234, apartamento 302');
  for (const [, text] of highlighted) {
    expect(Math.max(...text.split('\n').map(line => line.length))).toBeLessThanOrEqual(16);
  }
});
