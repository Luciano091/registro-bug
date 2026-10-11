import { expect, test } from '@playwright/test';

test.use({ channel: 'chrome' });

test('QR landing page exposes the four BisBurger destinations', async ({ page }) => {
  await page.goto('/bisburger/conecte');

  await expect(page.getByRole('heading', { name: 'Obrigado pelo pedido!' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Pedir novamente/ })).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: /Avaliar no Google/ })).toHaveAttribute(
    'href',
    'https://g.page/r/CbXZX-Xq-_WcECE/review',
  );
  await expect(page.getByRole('link', { name: /Falar no WhatsApp/ })).toHaveAttribute(
    'href',
    'https://wa.me/5582998218008',
  );
  await expect(page.getByRole('link', { name: /Seguir no Instagram/ })).toHaveAttribute(
    'href',
    'https://www.instagram.com/bisburger01/?hl=pt-br',
  );
});
