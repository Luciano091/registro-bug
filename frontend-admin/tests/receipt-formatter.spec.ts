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
  expect(receipt).toContain('Endereco: Rua B, 122');
  expect(Math.max(...receipt.split('\n').map(line => line.length))).toBeLessThanOrEqual(32);
});

