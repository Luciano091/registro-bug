import { test, expect } from '@playwright/test';

const config = {
  nome_empresa: 'BisBurger',
  descricao: 'Hambúrgueres artesanais para momentos especiais',
  logo: '/logo.png',
  loja_aberta: false,
  entrega_habilitada: true,
  taxa_entrega: 0,
  tempo_medio_preparo: 30,
  endereco: 'Cajueiro-AL',
};

const products = [
  {
    id: 8,
    nome: 'Bis Clássico',
    categoria: 'Hambúrguer Artesanal',
    descricao: 'Pão brioche, hambúrguer artesanal, cebola caramelizada e molho da casa.',
    imagem_url: '/logo.png',
    preco: 15.99,
    ativo: true,
    is_destaque: true,
    promocao_ativa: false,
    grupos_opcoes: [],
  },
  {
    id: 7,
    nome: 'Bis Egg',
    categoria: 'Hambúrguer Artesanal',
    descricao: 'Hambúrguer artesanal + queijo + ovo + salada + molho.',
    imagem_url: '/logo.png',
    preco: 15.99,
    ativo: true,
    is_destaque: false,
    promocao_ativa: false,
    grupos_opcoes: [],
  },
];

test.describe('Qualidade do cardápio público', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/public/bisburger/configuracao', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(config) }));
    await page.route('**/public/bisburger/produtos', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(products) }));
    await page.route('**/public/bisburger/categorias', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, nome: 'Hambúrguer Artesanal' }]) }));
    await page.route('**/public/bisburger/cupons/destaque', route => route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  });

  test('adia Google, carrega produtos progressivamente e mantém os modais acessíveis', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'BisBurger' })).toBeVisible();
    await expect(page.locator('script[src*="accounts.google.com/gsi/client"]')).toHaveCount(0);

    const regularImage = page.getByRole('img', { name: 'Bis Egg' });
    await expect(regularImage).toHaveAttribute('loading', 'lazy');
    await expect(regularImage).toHaveAttribute('decoding', 'async');

    await page.getByRole('button', { name: 'Adicionar Bis Egg ao carrinho' }).click();
    await expect(page.getByRole('dialog', { name: 'Loja Fechada' })).toBeVisible();
    await page.getByRole('button', { name: 'Fechar aviso de loja fechada' }).click();

    await page.getByRole('button', { name: 'Conta' }).filter({ visible: true }).click();
    await expect(page.locator('script[src*="accounts.google.com/gsi/client"]')).toHaveCount(1);
  });
});
