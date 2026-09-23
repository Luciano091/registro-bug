import { test, expect } from '@playwright/test';

test.describe('Dashboard minimalista', () => {
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
    });
    await page.route('**/dashboard/resumo', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pedidos_hoje: 4,
        faturamento_hoje: 46.97,
        ticket_medio: 11.74,
        lucro_hoje: 22.5,
        vendas_semana: [
          { name: 'Seg', vendas: 12 },
          { name: 'Ter', vendas: 18 },
          { name: 'Qua', vendas: 16.97 },
        ],
        ultimos_pedidos: [
          { id: 4, numero: 'B-0004', cliente: 'Cliente Teste', status: 'Finalizado' },
        ],
      }),
    }));
    await page.route('**/pedidos/resumo', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/produtos', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  });

  test('mantém indicadores compactos e informações essenciais', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Visão geral da operação' })).toBeVisible();
    await expect(page.getByText('Pedidos Hoje')).toBeVisible();
    await expect(page.getByText('R$ 46,97')).toBeVisible();
    await expect(page.getByText('Pedido #0004')).toBeVisible();

    const firstCard = page.locator('.dashboard-stats > div').first();
    const cardHeight = await firstCard.evaluate(element => element.getBoundingClientRect().height);
    expect(cardHeight).toBeLessThanOrEqual(110);
  });
});
