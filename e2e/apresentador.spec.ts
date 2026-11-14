import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Modo apresentador (T4.7): teleprompter com texto misto (português + nomes estrangeiros).

test.use({ viewport: { width: 1440, height: 900 } });

const reading = (page: import('@playwright/test').Page, original: string) =>
  page.locator('main span.inline-flex', { hasText: original }).locator('span').first();

test('"Apresentar" leva o texto da tela Traduzir e anuncia a tela nova', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Texto em inglês').fill('Thank you');
  await expect(page.getByRole('list', { name: 'Palavras' }).getByRole('button')).toHaveCount(2);
  await page.getByRole('link', { name: 'Apresentar' }).click();
  await expect(page).toHaveURL(/#\/apresentar$/);
  await expect(page).toHaveTitle(/Modo apresentador/);
  await expect(page.getByRole('heading', { name: 'Modo apresentador' })).toBeFocused();
  await expect(reading(page, 'Thank')).toHaveText('THÉNK');
  await page.getByRole('link', { name: 'Sair do modo apresentador' }).click();
  await expect(page.getByLabel('Texto em inglês')).toHaveValue('Thank you');
});

test('texto misto: só os nomes estrangeiros ganham leitura; o português passa direto', async ({ page }) => {
  await page.goto('/#/apresentar');
  await expect(reading(page, 'Worcester')).toBeVisible();
  await expect(reading(page, 'Worcester')).toHaveText(/^[A-ZÀ-Úa-zà-ú·]+$/);
  const foreign = await page.locator('main p span.inline-flex').allTextContents();
  expect(foreign.join(' ')).not.toMatch(/Correspondentes|acompanham|Londres/);
  // legível a ~3 m: 64 px no texto, leitura em amarelo com ~40 px
  const sizes = await reading(page, 'Worcester').evaluate((el) => [
    parseFloat(getComputedStyle(el).fontSize),
    parseFloat(getComputedStyle(el.parentElement!.lastElementChild!).fontSize),
  ]);
  expect(sizes[0]).toBeGreaterThanOrEqual(39);
  expect(sizes[1]).toBe(64);
});

test('atalhos: + − I E e Espaço', async ({ page }) => {
  await page.goto('/#/apresentar');
  await expect(reading(page, 'Worcester')).toBeVisible();
  await page.keyboard.press('+');
  await expect(page.getByText('80 px')).toBeVisible();
  await page.keyboard.press('-');
  await page.keyboard.press('-');
  await expect(page.getByText('52 px')).toBeVisible();
  const ipa = page.getByRole('switch', { name: 'Mostrar IPA' });
  await page.keyboard.press('i');
  await expect(ipa).toHaveAttribute('aria-checked', 'true');
  await expect(
    page
      .locator('main')
      .getByText(/^\/.*ˈ.*\/$/)
      .first(),
  ).toBeVisible();

  // E abre o roteiro; digitar "e" nele não fecha nem dispara atalhos
  await page.keyboard.press('e');
  const box = page.getByLabel(/Roteiro/);
  await expect(box).toBeVisible();
  await box.fill('');
  await box.pressSequentially('Thank you, Greenwich. e'); // o "e" é digitado, não dispara o atalho
  await expect(box).toBeVisible();
  await expect(box).toHaveValue('Thank you, Greenwich. e');
  await expect(page.getByText('52 px')).toBeVisible();
  await box.fill('Thank you.\n\n' + 'Correspondentes em Worcester acompanham o caso. '.repeat(40));
  // espera o roteiro longo terminar de converter (a página só cresce depois)
  await expect.poll(() => page.locator('main p span.inline-flex').count()).toBeGreaterThan(30);

  await page.getByRole('button', { name: 'Fechar roteiro' }).click();
  await page.locator('main').click({ position: { x: 5, y: 5 } });
  const before = await page.evaluate(() => window.scrollY);
  await page.keyboard.press(' ');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 200);
});

test('léxico do português só é baixado no modo apresentador', async ({ page }) => {
  const lexicon: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('pt-BR-lexicon')) lexicon.push(r.url());
  });
  await page.goto('/');
  await expect(page.getByRole('list', { name: 'Palavras' })).toBeVisible();
  expect(lexicon).toEqual([]);
  await page.getByRole('link', { name: 'Modo apresentador' }).click();
  await expect(reading(page, 'Worcester')).toBeVisible();
  expect(lexicon).toHaveLength(1);
});

test('sem violações de acessibilidade (axe) e sob a CSP de produção', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) problems.push(msg.text());
  });
  page.on('request', (req) => {
    const host = new URL(req.url()).hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') problems.push(`externa: ${req.url()}`);
  });
  await page.goto('/#/apresentar');
  await expect(reading(page, 'Worcester')).toBeVisible();
  await page.keyboard.press('i');
  await page.keyboard.press('e');
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  expect(problems).toEqual([]);
});
