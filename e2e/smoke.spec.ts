import { expect, test } from '@playwright/test';

test('converte uma frase em inglês', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('READY')).toBeVisible({ timeout: 20_000 });
  await page.locator('textarea').fill('thank you');
  await expect(page.getByText('Leitura Corrida (PT-BR)')).toBeVisible();
});

test('roda sob a CSP de produção sem violações nem requisições externas', async ({ page }) => {
  const violations: string[] = [];
  const external: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text());
  });
  page.on('request', (req) => {
    const host = new URL(req.url()).hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') external.push(req.url());
  });

  const response = await page.goto('/');
  const headers = response?.headers() ?? {};
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);

  await expect(page.getByText('READY')).toBeVisible({ timeout: 20_000 });
  await page.locator('textarea').fill('very much');
  await expect(page.getByText('Leitura Corrida (PT-BR)')).toBeVisible();

  expect(violations).toEqual([]);
  expect(external).toEqual([]);
});
