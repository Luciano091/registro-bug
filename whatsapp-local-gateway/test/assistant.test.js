import test from 'node:test';
import assert from 'node:assert/strict';
import { intentFor, replyFor } from '../src/assistant.js';

const business = {
  businessName: 'BisBurger',
  menuUrl: 'https://bisburger.ritmesa.com.br/',
  address: 'Cajueiro-AL',
  hours: 'das 13h às 00h',
  paymentMethods: 'PIX e cartão',
  deliveryInfo: 'Entrega grátis',
};

test('entende frases naturais e acentuação', () => {
  assert.equal(intentFor('Oi, vocês estão abertos?'), 'hours');
  assert.equal(intentFor('Queria ver o cardápio e os preços'), 'menu');
  assert.equal(intentFor('Onde está o meu pedido?'), 'order_status');
});

test('prioriza transferência para pessoa', () => {
  const answer = replyFor('Quero falar com um atendente sobre o cardápio', business);
  assert.equal(answer.intent, 'human');
  assert.equal(answer.pause, true);
});

test('responde com informações configuradas', () => {
  assert.match(replyFor('aceita pix?', business).text, /PIX/);
  assert.match(replyFor('qual o endereço?', business).text, /Cajueiro-AL/);
  assert.match(replyFor('manda o menu', business).text, /bisburger\.ritmesa\.com\.br/);
});

