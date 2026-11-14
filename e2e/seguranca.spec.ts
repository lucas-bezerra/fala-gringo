import { expect, test, type Page } from '@playwright/test';

// Revisão de segurança (T6.2): CSP com Trusted Types, cabeçalhos por tipo de arquivo e fluxos completos sem
// nenhum erro de console, violação de CSP/Trusted Types ou requisição externa.

function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || /Content Security Policy|Refused to|Trusted ?Type/i.test(msg.text())) {
      problems.push(`console ${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (e) => problems.push(`exceção: ${e.message}`));
  page.on('request', (req) => {
    const host = new URL(req.url()).hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') problems.push(`externa: ${req.url()}`);
  });
  return problems;
}

test('CSP nega tudo por padrão e exige Trusted Types', async ({ page }) => {
  const res = await page.goto('/');
  const csp = res!.headers()['content-security-policy']!;
  for (const d of [
    "default-src 'none'",
    "script-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "require-trusted-types-for 'script'",
    'trusted-types default',
  ]) {
    expect(csp).toContain(d);
  }
  expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|data:|\*/);
  const meta = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(meta).toContain("require-trusted-types-for 'script'");
});

test('Trusted Types bloqueia HTML injetado e script de outra origem', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('list', { name: 'Palavras' }).waitFor();
  const result = await page.evaluate(() => {
    const tryIt = (fn: () => void) => {
      try {
        fn();
        return 'permitido';
      } catch (e) {
        return (e as Error).name;
      }
    };
    return {
      innerHTML: tryIt(() => {
        document.createElement('div').innerHTML = '<img src=x onerror=alert(1)>';
      }),
      worker: tryIt(() => new Worker('https://exemplo.invalid/x.js')),
      workerLocal: tryIt(() => new Worker('/nada.js').terminate()),
    };
  });
  expect(result.innerHTML).toBe('TypeError');
  // eval: o código do page.evaluate roda isento da CSP no Playwright; a ausência de 'unsafe-eval' é conferida no
  // cabeçalho (teste acima).
  expect(result.worker).not.toBe('permitido');
  expect(result.workerLocal).toBe('permitido'); // a política libera a própria origem
});

test('cabeçalhos de segurança e de cache por tipo de arquivo', async ({ request }) => {
  const root = await request.get('/');
  const h = root.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['referrer-policy']).toBe('no-referrer');
  expect(h['cross-origin-opener-policy']).toBe('same-origin');
  expect(h['cross-origin-resource-policy']).toBe('same-origin');
  expect(h['permissions-policy']).toContain('camera=()');
  expect(h['permissions-policy']).not.toContain('interest-cohort');

  // o service worker também roda sob a CSP (por isso o runtime do Workbox vai embutido, sem importScripts)
  const sw = await request.get('/sw.js');
  expect(sw.headers()['content-security-policy']).toContain("default-src 'none'");
  expect(await sw.text()).not.toContain('importScripts(');
});

test('fluxos completos sem erro, violação nem requisição externa', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const problems = watch(page);
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByLabel('Texto em inglês').fill('Thank you for watching');
  await expect(page.getByRole('list', { name: 'Palavras' }).getByRole('button')).toHaveCount(4);
  await page.getByRole('list', { name: 'Palavras' }).getByRole('button').nth(3).click();
  await page.getByRole('button', { name: 'Copiar leitura' }).click();
  await page.getByRole('button', { name: 'Compartilhar link' }).click();
  await page.getByRole('radio', { name: 'Escuro' }).click();
  await page.getByRole('link', { name: 'Apresentar' }).click();
  await page.locator('main p span.inline-flex').first().waitFor();
  await page.goto('/#/offline');
  const row = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Inglês (Reino Unido)' }) });
  await row.getByRole('button', { name: 'Baixar' }).click();
  await expect(row.getByText('Disponível offline')).toBeVisible({ timeout: 60_000 });
  await page.goto('/#/creditos');
  await page.goto('/catalogo.html');
  await page.getByRole('button', { name: 'O que é “th”?' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ver detalhes de “welcome”' }).click();
  await page.keyboard.press('Escape');
  expect(problems).toEqual([]);
});

test('link compartilhado leva o texto no fragmento (não chega ao servidor)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByLabel('Texto em inglês').fill('segredo de redação');
  await page.getByRole('button', { name: 'Compartilhar link' }).click();
  const link = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  expect(link.search).toBe('');
  expect(link.hash).toMatch(/^#\/\?t=segredo/);

  const seen: string[] = [];
  const other = await context.newPage();
  other.on('request', (r) => seen.push(r.url()));
  await other.goto(link.href);
  await expect(other.getByLabel('Texto em inglês')).toHaveValue('segredo de redação');
  expect(seen.filter((u) => u.includes('segredo'))).toEqual([]); // nenhuma requisição carrega o texto
});

test('link no formato antigo (?t=) continua abrindo', async ({ page }) => {
  await page.goto('/?t=hello&l=en-GB');
  await expect(page.getByLabel('Texto em inglês')).toHaveValue('hello');
  await expect(page.getByRole('radio', { name: 'Reino Unido' })).toHaveAttribute('aria-checked', 'true');
});
