import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// T4.9 (recentes, favoritos, link), T4.10 (tema) e T4.12 (fontes e créditos).

const words = (page: Page) => page.getByRole('list', { name: 'Palavras' }).getByRole('button');

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test('rodapé leva a Fontes e créditos, gerada do registro de fontes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Fontes e créditos' }).click();
  await expect(page.getByRole('heading', { name: 'Fontes e créditos', level: 1 })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'CMUdict' })).toBeVisible();
  await expect(page.getByText(/CC BY-SA 4\.0/).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'JMdict (EDRDG)' })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test('link compartilhado abre com o texto e a variante', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByLabel('Texto em inglês').fill('good morning');
  await page.getByRole('radio', { name: 'Reino Unido' }).click();
  await page.getByRole('button', { name: 'Compartilhar link' }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('l=en-GB');
  const other = await context.newPage();
  await other.goto(link);
  await expect(other.getByLabel('Texto em inglês')).toHaveValue('good morning');
  await expect(other.getByRole('radio', { name: 'Reino Unido' })).toHaveAttribute('aria-checked', 'true');
});

test('recentes e favoritos ficam no navegador', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Texto em inglês').fill('breaking news');
  await expect(words(page)).toHaveCount(2);
  const saved = page.getByRole('region', { name: 'Textos salvos' });
  await expect(saved.getByRole('button', { name: 'breaking news' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Favoritar' }).click();
  await expect(page.getByRole('button', { name: 'Favoritar' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Texto em inglês').fill('');
  await page.reload();
  await page.getByRole('heading', { name: 'Favoritos' }).waitFor();
  await saved.getByRole('button', { name: 'breaking news' }).first().click();
  await expect(page.getByLabel('Texto em inglês')).toHaveValue('breaking news');
});

test('tema escuro: escolha manual persiste e passa no axe', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(words(page).first()).toBeVisible();
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(11, 17, 32)');
  expect(await axe(page)).toEqual([]);
  await page.getByRole('radio', { name: 'Auto' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
});

test.describe('sistema em modo escuro', () => {
  test.use({ colorScheme: 'dark' });
  test('"Auto" segue o sistema e passa no axe', async ({ page }) => {
    await page.goto('/');
    await expect(words(page).first()).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      'rgb(11, 17, 32)',
    );
    expect(await axe(page)).toEqual([]);
  });
});
