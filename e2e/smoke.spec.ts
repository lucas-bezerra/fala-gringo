import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Tela Traduzir (T4.2): motor v2 num Web Worker, shards servidos em /dict/, build de produção sob a CSP real.

const words = (page: import('@playwright/test').Page) =>
  page.getByRole('list', { name: 'Palavras' }).getByRole('listitem');

test('converte uma frase em inglês com o motor no worker', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Texto em inglês').fill('thank you');
  await expect(words(page)).toHaveCount(2);
  await expect(words(page).first()).toContainText('/ˈθæŋk/');
  await expect(words(page).first().locator('.text-special')).toHaveText('TH'); // som especial destacado
  await expect(page.getByText('MAIÚSCULAS')).toBeVisible();
});

test('variante Reino Unido usa o dicionário britânico', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Texto em inglês').fill('water');
  await expect(words(page).first()).toContainText('/ˈwɔtɚ/');
  await page.getByRole('radio', { name: 'Reino Unido' }).click();
  await expect(words(page).first()).not.toContainText('/ˈwɔtɚ/');
  await expect(words(page).first()).toContainText('ɔː');
});

test('palavra fora do dicionário aparece com aviso', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Texto em inglês').fill('zorbletonx');
  await expect(words(page).first()).toContainText('Fora do dicionário');
});

test('formato corrido e cópia da leitura', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByLabel('Texto em inglês').fill('welcome');
  await expect(words(page)).toHaveCount(1);
  await page.getByRole('tab', { name: 'Corrido' }).click();
  await expect(page.getByRole('tabpanel')).not.toContainText('·');
  await page.getByRole('button', { name: 'Copiar leitura' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Leitura copiada' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('UÉLkâm'); // MAIÚSCULAS sempre (notação, decisão Q2)
});

test('2.000 caracteres convertem sem travar a digitação', async ({ page }) => {
  await page.goto('/');
  const box = page.getByLabel('Texto em inglês');
  const long = 'The president said the weather in Washington will change through the night. '
    .repeat(30)
    .slice(0, 2000);
  await box.fill(long);
  await expect(words(page).first()).toBeVisible({ timeout: 15_000 });
  // a thread principal segue livre: digitar logo depois responde rápido
  const t0 = Date.now();
  await box.press('End');
  await box.pressSequentially('!', { delay: 0 });
  expect(Date.now() - t0).toBeLessThan(500);
  await expect(page.getByText('2.000 caracteres · máx. 2.000')).toBeVisible();
});

test('sem violações de acessibilidade (axe, WCAG 2.2 AA)', async ({ page }) => {
  await page.goto('/');
  await expect(words(page).first()).toBeVisible();
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
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

  await page.getByLabel('Texto em inglês').fill('very much');
  await expect(words(page)).toHaveCount(2);
  await page.getByRole('radio', { name: 'Reino Unido' }).click();
  await expect(words(page)).toHaveCount(2);

  expect(violations).toEqual([]);
  expect(external).toEqual([]);
});
