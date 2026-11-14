import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Auditoria de acessibilidade (T4.11): todas as telas × temas × tamanhos, reflow, leitor de tela, teclado e foco.

const ROUTES = [
  { hash: '#/', ready: (p: Page) => p.getByRole('list', { name: 'Palavras' }).waitFor() },
  { hash: '#/apresentar', ready: (p: Page) => p.locator('main p span.inline-flex').first().waitFor() },
  { hash: '#/offline', ready: (p: Page) => p.getByRole('heading', { name: 'Inglês (EUA)' }).waitFor() },
  { hash: '#/creditos', ready: (p: Page) => p.getByRole('heading', { name: 'CMUdict' }).waitFor() },
];

async function axe(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  return violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const scheme of ['light', 'dark'] as const) {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test.describe(`${scheme} ${viewport.width}px`, () => {
      test.use({ colorScheme: scheme, viewport });
      for (const r of ROUTES) {
        test(`axe sem violações (WCAG 2.2 AA + boas práticas) em ${r.hash}`, async ({ page }) => {
          await page.goto('/' + r.hash);
          await r.ready(page);
          expect(await axe(page)).toEqual([]);
        });
      }
    });
  }
}

test.describe('reflow a 320 px (WCAG 1.4.10)', () => {
  test.use({ viewport: { width: 320, height: 640 } });
  for (const r of ROUTES) {
    test(`sem rolagem horizontal em ${r.hash}`, async ({ page }) => {
      await page.goto('/' + r.hash);
      await r.ready(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    });
  }
});

test('leitor de tela: cartão diz a palavra (em inglês) e como falar, sem soletrar nem ler IPA', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Texto em inglês').fill('thank watching');
  const cards = page.getByRole('list', { name: 'Palavras' }).getByRole('button');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toHaveAccessibleName('thank thénk');
  await expect(cards.nth(1)).toHaveAccessibleName('watching uatching, tônica em ua');
  await expect(cards.first().locator('[lang="en-US"]')).toHaveText('thank');
  // o painel de detalhe também
  const aside = page.getByRole('complementary');
  await expect(aside.getByRole('heading', { level: 2 }).locator('[lang="en-US"]')).toHaveText('thank');
});

test('leitor de tela no apresentador: palavra estrangeira com lang e "leia: …"', async ({ page }) => {
  await page.goto('/#/apresentar');
  await page.locator('main p span.inline-flex').first().waitFor();
  const word = page.locator('main p [lang="en-US"]', { hasText: 'Worcester' });
  await expect(word).toBeVisible();
  const spoken = await page
    .locator('main p span.inline-flex', { hasText: 'Worcester' })
    .locator('.sr-only')
    .textContent();
  expect(spoken).toMatch(/^ \(leia: [a-zà-ú ]+(, tônica em [a-zà-ú]+)?\)$/);
});

test('teclado: pular para o conteúdo, ordem do Tab e foco visível', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('list', { name: 'Palavras' }).waitFor();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();

  // daqui, o Tab passa por idioma → variante → texto → ações → abas → cartões → detalhe → rodapé
  const seen: string[] = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null; // saiu da página (interface do navegador)
      return {
        label: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30),
        tag: el.tagName,
        outline: getComputedStyle(el).outlineStyle,
      };
    });
    if (!info) break;
    expect(info.outline, `foco visível em ${info.tag} "${info.label}"`).not.toBe('none');
    seen.push(info.label);
  }
  const at = (s: string) => seen.findIndex((x) => x.includes(s));
  const order = [
    'Inglês',
    'EUA',
    'Thank you for',
    'Sílabas',
    'Thankthénk',
    // "Ouvir a palavra" fica fora: sem voz no navegador, o botão é desativado e sai da ordem (correto)
    'Fontes e créditos',
  ].map(at);
  expect(
    order.every((i) => i >= 0),
    JSON.stringify(seen),
  ).toBe(true);
  expect(
    [...order].sort((a, b) => a - b),
    JSON.stringify(seen),
  ).toEqual(order);
});
