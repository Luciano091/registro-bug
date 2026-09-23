import { test, expect } from '@playwright/test';

const product = {
  id: 14,
  nome: 'Guaraná Lata 350ml',
  preco: 5,
  preco_compra: 2.7,
  categoria: 'Bebidas',
  descricao: '',
  imagem_url: null,
  controlar_estoque: true,
  estoque: 14,
  is_promocao: false,
  is_destaque: false,
  is_combo: false,
  ativo: true,
};

test.describe('Ações dos produtos no cardápio', () => {
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
    await page.route('**/produtos', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([product]) }));
    await page.route('**/pedidos/resumo', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/dashboard/resumo', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  });

  test('mantém todos os botões dentro do card', async ({ page }) => {
    await page.goto('/cardapio');

    const card = page.locator('.menu-product-card');
    const actions = card.locator('.product-actions');
    await expect(card.getByText('Guaraná Lata 350ml')).toBeVisible();
    await expect(actions.getByRole('button')).toHaveCount(5);

    const cardBox = await card.boundingBox();
    const actionsBox = await actions.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect(actionsBox!.x).toBeGreaterThanOrEqual(cardBox!.x);
    expect(actionsBox!.x + actionsBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 1);

    await card.getByRole('button', { name: 'Editar Guaraná Lata 350ml' }).click();
    await expect(page.getByRole('heading', { name: 'Editar Produto' })).toBeVisible();
  });
});
