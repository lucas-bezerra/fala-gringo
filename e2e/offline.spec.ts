import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Uso offline + PWA (T4.8). O service worker só existe no build (é o que o e2e testa).

const words = (page: Page) => page.getByRole('list', { name: 'Palavras' }).getByRole('button');

async function swControls(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test('manifest do PWA e service worker registrados', async ({ page }) => {
  await page.goto('/');
  await swControls(page);
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.short_name).toBe('FalaGringo');
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
});

test('baixar o idioma inteiro e converter sem internet', async ({ page, context }) => {
  await page.goto('/');
  await swControls(page);
  await page.getByRole('link', { name: 'Uso offline' }).click();
  const row = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Inglês (EUA)' }) });
  await expect(row).toContainText(/Ocupa ~5,\d MB no aparelho/);
  await expect(row.getByText('Não baixado')).toBeVisible();
  await row.getByRole('button', { name: 'Baixar' }).click();
  await expect(row.getByText('Disponível offline')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Espaço usado pelo site/)).toBeVisible();

  await context.setOffline(true);
  await page.goto('/'); // a página vem do cache do service worker
  await page.getByLabel('Texto em inglês').fill('zebra quantum xylophone');
  await expect(words(page)).toHaveCount(3);
  await expect(page.getByText('Fora do dicionário')).toHaveCount(0);
  await expect(page.getByText('Disponível offline')).toBeVisible();
});

test('sob demanda: o que já foi usado funciona offline; o resto explica o que fazer', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await swControls(page);
  await page.reload(); // o worker do motor agora nasce sob o service worker
  await page.getByLabel('Texto em inglês').fill('thank you');
  await expect(words(page)).toHaveCount(2);

  await context.setOffline(true);
  await page.reload();
  await page.getByLabel('Texto em inglês').fill('thank you');
  await expect(words(page)).toHaveCount(2);
  // outra faixa de chaves (shard "a…carbonized"), nunca baixada
  await page.getByLabel('Texto em inglês').fill('apple banana');
  await expect(page.getByRole('alert')).toContainText('Sem internet');
  await expect(page.getByRole('alert').getByRole('link', { name: 'Uso offline' })).toBeVisible();
});

test('remover libera o idioma; página passa no axe e na CSP', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) problems.push(msg.text());
  });
  await page.goto('/#/offline');
  await swControls(page);
  const row = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Português (modo apresentador)' }) });
  await row.getByRole('button', { name: 'Baixar' }).click();
  await expect(row.getByText('Disponível offline')).toBeVisible({ timeout: 30_000 });
  await row.getByRole('button', { name: 'Remover' }).click();
  await expect(row.getByText('Não baixado')).toBeVisible();
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
  expect(problems).toEqual([]);
});
