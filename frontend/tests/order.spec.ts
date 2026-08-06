import { test, expect } from '@playwright/test';

test.describe('Fluxo do Cardápio Público', () => {
  test('Deve carregar o cardápio e exibir categorias', async ({ page }) => {
    await page.goto('/menu-publico');
    
    // Verifica se o loading some
    await expect(page.locator('text=Carregando')).not.toBeVisible({ timeout: 10000 });
    
    // Verifica se o título da loja (ex: Burger Hause) aparece
    await expect(page.locator('h1')).toBeVisible();
    
    // Verifica se as categorias estão sendo renderizadas
    const botoesCategoria = page.locator('button');
    await expect(botoesCategoria.nth(0)).toBeVisible();
  });
});
