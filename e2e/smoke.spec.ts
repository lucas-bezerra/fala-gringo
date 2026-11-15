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

test('espanhol, francês, italiano, coreano e alemão (Fase 5): dicionário, variante padrão e estimativa por regras', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Espanhol/ }).click();
  await page.getByLabel('Texto em espanhol').fill('la casa quieres');
  await expect(words(page)).toHaveCount(3);
  await expect(words(page).nth(0)).toContainText('/la/'); // o WikiPron põe "a" antes de "la"
  await expect(words(page).nth(2)).toContainText('estimado'); // forma verbal fora do dicionário
  await expect(words(page).nth(2)).toContainText('KIÊ');
  await page.getByRole('radio', { name: 'Espanha' }).click();
  await page.getByLabel('Texto em espanhol').fill('cerveza');
  await expect(words(page).first()).toContainText('θ');
  await page.getByRole('button', { name: /Francês/ }).click();
  await page.getByLabel('Texto em francês').fill('de');
  await expect(words(page).first()).toContainText('/də/'); // o WikiPron põe "dam" primeiro
  await page.getByRole('button', { name: /Italiano/ }).click();
  await page.getByLabel('Texto em italiano').fill('grazie');
  await expect(words(page).first()).toContainText('GRA');
  await page.getByRole('button', { name: /Coreano/ }).click();
  await page.getByLabel('Texto em coreano').fill('있어요'); // forma flexionada: fora do dicionário, regras do Hangul
  await expect(words(page).first()).toContainText('estimado');
  await expect(words(page).first()).toContainText('i·ssó·iô');
  await page.getByRole('button', { name: /Alemão/ }).click();
  await page.getByLabel('Texto em alemão').fill('danke');
  await expect(words(page).first()).toContainText('DAN');
  await page.getByLabel('Texto em alemão').fill('Merzkoalition'); // composto novo: modelo G2P do alemão
  await expect(words(page).first()).toContainText('estimado', { timeout: 15_000 });
});

test('japonês (T5.5): kanji pelo dicionário com leitura curada, kana por regras e segmentação', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Japonês/ }).click();
  await page.getByLabel('Texto em japonês').fill('私は東京'); // sem espaços: o segmentador separa
  await expect(words(page)).toHaveCount(3);
  await expect(words(page).nth(0)).toContainText('ua·ta·chi'); // a fonte põe "atai" antes de "watashi"
  await expect(words(page).nth(1)).toContainText('ua'); // partícula は = wa
  await expect(words(page).nth(2)).toContainText('tôo·kiôo'); // vogal longa que a fonte não marca
  await page.getByLabel('Texto em japonês').fill('ございます'); // o ICU quebra em ご|ざ|い|ます; fora do dicionário
  await expect(words(page)).toHaveCount(1);
  await expect(words(page).first()).toContainText('estimado');
  await expect(words(page).first()).toContainText('gô·zai·ma·s(u)');
});

test('variante Reino Unido usa o dicionário britânico', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Texto em inglês').fill('water');
  await expect(words(page).first()).toContainText('/ˈwɔtɚ/');
  await page.getByRole('radio', { name: 'Reino Unido' }).click();
  await expect(words(page).first()).not.toContainText('/ˈwɔtɚ/');
  await expect(words(page).first()).toContainText('ɔː');
});

test('palavra fora do dicionário: estimada pelo modelo (T3.9) ou com aviso', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Texto em inglês').fill('Zelensky');
  await expect(words(page).first()).toContainText('estimado', { timeout: 15_000 });
  await expect(page.getByText('modelo de inteligência artificial')).toBeVisible();
  // outra escrita: o modelo não estima
  await page.getByLabel('Texto em inglês').fill('Москва');
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
