import { test, expect } from '@playwright/test';

const orders = [
  {
    id: 7,
    numero: 'B-0007',
    cliente: 'Cliente Teste',
    telefone: '82999999999',
    tipo_entrega: 'Delivery',
    endereco: 'Rua Teste, 10',
    total: 24.9,
    status: 'Recebido',
    data: new Date().toISOString(),
    pagamento_confirmado_em: null,
    estornado: false,
    origem: 'balcao',
  },
  {
    id: 8,
    numero: 'B-0008',
    cliente: 'Cliente Finalizado',
    telefone: '82988888888',
    tipo_entrega: 'Delivery',
    endereco: 'Rua Final, 20',
    total: 14.99,
    status: 'Finalizado',
    data: new Date().toISOString(),
    forma_pagamento: 'PIX',
    pagamento_confirmado_em: new Date().toISOString(),
    estornado: false,
    origem: 'balcao',
    itens: [{ id: 1, quantidade: 1, produto_nome: 'Hambúrguer', subtotal: 14.99 }],
  },
];

test.describe('Gestor de pedidos', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('adminToken', 'test-token');
      localStorage.setItem('estabelecimentoNome', 'BisBurger');
      localStorage.setItem('ritmesaSession', JSON.stringify({
        id: 1,
        nome: 'Gestor',
        email: 'gestor@teste.com',
        perfil: 'proprietario',
        permissoes: ['*'],
      }));
      localStorage.removeItem('orders_view_mode');
    });
    await page.route('**/pedidos/resumo', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(orders) }));
    await page.route('**/pedidos/8', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(orders[1]) }));
    await page.route('**/produtos', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/dashboard/resumo', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  });

  test('abre o fluxo e preserva a visualização em lista', async ({ page }) => {
    await page.goto('/pedidos');

    await expect(page.getByRole('button', { name: 'Fluxo' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Recebidos' })).toBeVisible();
    await expect(page.getByText('#0007')).toBeVisible();
    await expect(page.getByRole('button', { name: /Iniciar preparo/ })).toBeVisible();

    await page.getByRole('button', { name: 'Abrir detalhes do pedido 0008' }).click();
    await expect(page.getByRole('heading', { name: 'Pedido #0008' })).toBeVisible();
    await page.getByRole('button', { name: 'Fechar detalhes' }).click();

    await page.getByRole('button', { name: 'Lista' }).click();
    await expect(page.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('columnheader', { name: 'Pedido' })).toBeVisible();
    await expect(page.getByText('Cliente Teste')).toBeVisible();
  });
});
