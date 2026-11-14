import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Componentes base (T4.1), testados no catálogo, no build de produção e sob a CSP real.

function watchCsp(page: Page) {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) problems.push(msg.text());
  });
  page.on('request', (req) => {
    const host = new URL(req.url()).hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') problems.push(`externa: ${req.url()}`);
  });
  return problems;
}

/** Espera as animações de abertura (200 ms) terminarem: no meio delas, opacidade e posição ainda mudam. */
async function settle(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
}

async function axe(page: Page) {
  await settle(page);
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/catalogo.html');
  await expect(page.getByRole('heading', { name: 'Componentes base' })).toBeVisible();
});

test('sem violações de acessibilidade (axe, WCAG 2.2 AA), fechado e com sobreposições abertas', async ({
  page,
}) => {
  expect(await axe(page)).toEqual([]);
  await page.getByRole('button', { name: 'O que é “th”?' }).click();
  await expect(page.getByRole('dialog', { name: 'O que é o som th' })).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ver detalhes de “welcome”' }).click();
  await expect(page.getByRole('dialog', { name: 'welcome' })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test('abas: setas, Home e End trocam e focam a aba', async ({ page }) => {
  const silabas = page.getByRole('tab', { name: 'Sílabas' });
  const corrida = page.getByRole('tab', { name: 'Corrida' });
  await silabas.focus();
  await page.keyboard.press('ArrowRight');
  await expect(corrida).toBeFocused();
  await expect(corrida).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveText('uélkâm');
  await page.keyboard.press('Home');
  await expect(silabas).toBeFocused();
  await page.keyboard.press('End');
  await expect(corrida).toBeFocused();
  await page.keyboard.press('ArrowRight'); // dá a volta
  await expect(silabas).toHaveAttribute('aria-selected', 'true');
  await expect(silabas).toHaveAttribute('tabindex', '0');
  await expect(corrida).toHaveAttribute('tabindex', '-1');
});

test('chip: aria-pressed acompanha a escolha', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Idioma' });
  const fr = group.getByRole('button', { name: /Francês/ });
  await expect(fr).toHaveAttribute('aria-pressed', 'false');
  await fr.press('Enter');
  await expect(fr).toHaveAttribute('aria-pressed', 'true');
  await expect(group.getByRole('button', { name: /Inglês \(EUA\)/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('popover: abre junto ao botão, Esc fecha e devolve o foco', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'O que é “th”?' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const pop = page.getByRole('dialog', { name: 'O que é o som th' });
  await expect(pop).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const t = (await trigger.boundingBox())!;
  const p = (await pop.boundingBox())!;
  expect(Math.abs(p.y - (t.y + t.height + 8))).toBeLessThan(2); // logo abaixo do botão
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test('painel inferior: Tab não sai para a página atrás, Esc fecha e devolve o foco', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'Ver detalhes de “welcome”' });
  await opener.focus();
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: 'welcome' });
  await expect(sheet).toBeVisible();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    // o <dialog> modal deixa o foco ir à interface do navegador (activeElement = body), mas nunca à página atrás
    const where = await page.evaluate(() => {
      const el = document.activeElement;
      return !el || el === document.body ? 'navegador' : el.closest('dialog') ? 'painel' : 'página';
    });
    expect(where).not.toBe('página');
  }
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(opener).toBeFocused();
  // reabre e fecha pelo botão
  await opener.click();
  await sheet.getByRole('button', { name: 'Fechar' }).click();
  await expect(sheet).toBeHidden();
});

test('painel inferior no celular: largura toda, encostado embaixo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Ver detalhes de “welcome”' }).click();
  await settle(page);
  const box = (await page.getByRole('dialog', { name: 'welcome' }).boundingBox())!;
  expect(box.width).toBe(390);
  expect(Math.round(box.y + box.height)).toBe(844);
});

test('aviso temporário: anunciado na região status e fecha pelo botão', async ({ page }) => {
  await page.getByRole('button', { name: 'Copiar a leitura' }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Leitura copiada');
  await status.getByRole('button', { name: 'Fechar aviso' }).click();
  await expect(status).not.toContainText('Leitura copiada');
});

test('catálogo roda sob a CSP de produção, sem violações nem requisições externas', async ({ page }) => {
  const problems = watchCsp(page);
  await page.reload();
  await page.getByRole('button', { name: 'O que é “th”?' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ver detalhes de “welcome”' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Copiar a leitura' }).click();
  await expect(page.getByRole('status')).toContainText('Leitura copiada');
  expect(problems).toEqual([]);
});

test('segmentado: setas trocam a opção marcada (radiogroup)', async ({ page }) => {
  const group = page.getByRole('radiogroup', { name: 'Variante' });
  const us = group.getByRole('radio', { name: 'EUA' });
  const uk = group.getByRole('radio', { name: 'Reino Unido' });
  await us.focus();
  await page.keyboard.press('ArrowRight');
  await expect(uk).toBeFocused();
  await expect(uk).toHaveAttribute('aria-checked', 'true');
  await expect(us).toHaveAttribute('aria-checked', 'false');
  await expect(us).toHaveAttribute('tabindex', '-1');
});
