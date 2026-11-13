import { expect, test } from '@playwright/test';

test('converte uma frase em inglês', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('READY')).toBeVisible({ timeout: 20_000 });
  await page.locator('textarea').fill('thank you');
  await expect(page.getByText('Leitura Corrida (PT-BR)')).toBeVisible();
});
