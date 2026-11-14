import { expect, test, type Page } from '@playwright/test';

// Orçamento de desempenho (T6.3), no perfil "celular médio" do Lighthouse: CPU 4× mais lenta, 1,6 Mbps, 150 ms de
// latência. Metas em docs/desempenho.md; os valores medidos saem no log do CI.

const BUDGET = {
  lcpMs: 2500, // "bom" no Core Web Vitals
  firstConversionMs: 4000, // da navegação ao 1º cartão (worker + manifest + 1º shard, cache vazio)
  // trocar um texto de 2.000 caracteres até o resultado (inclui a espera de 250 ms). Medido: 0,5 s no Mac, 1,0 s
  // no runner do CI (a limitação de CPU é relativa à máquina) — a meta dá folga para essa variação
  conversion2000Ms: 1500,
  typingFrameMs: 100, // digitar com o motor trabalhando: nenhuma tecla trava a tela
};

async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

const words = (page: Page) => page.getByRole('list', { name: 'Palavras' }).getByRole('button');

test.use({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); // cache vazio, sem SW: pior caso

test('LCP e primeira conversão dentro do orçamento (celular médio, cache vazio)', async ({ page }) => {
  await throttle(page);
  const t0 = Date.now();
  await page.goto('/');
  await expect(words(page).first()).toBeVisible({ timeout: 20_000 });
  const firstConversion = Date.now() - t0;
  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries[entries.length - 1]!.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      }),
  );
  console.log(`[desempenho] LCP ${Math.round(lcp)} ms · 1ª conversão ${firstConversion} ms`);
  expect(lcp).toBeLessThan(BUDGET.lcpMs);
  expect(firstConversion).toBeLessThan(BUDGET.firstConversionMs);
});

test('2.000 caracteres: conversão rápida e digitação sem travar (CPU 4× mais lenta)', async ({ page }) => {
  await throttle(page);
  await page.goto('/');
  await expect(words(page).first()).toBeVisible({ timeout: 20_000 });
  const box = page.getByLabel('Texto em inglês');
  const base = 'The president said the weather in Washington will change through the night. ';
  await box.fill(base.repeat(30).slice(0, 2000)); // aquece: baixa os shards necessários
  await expect(words(page).first()).toHaveAccessibleName(/^the /i, { timeout: 20_000 });
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 }); // 1ª conversão terminou

  // troca o texto inteiro (mesmas palavras, ordem diferente) e mede até o novo resultado aparecer
  const other = 'Through the night the weather will change in Washington, the president said. ';
  const t0 = await page.evaluate(() => performance.now());
  await box.fill(other.repeat(30).slice(0, 2000));
  await expect(words(page).first()).toHaveAccessibleName(/^through /i, { timeout: 10_000 });
  const conversion = (await page.evaluate(() => performance.now())) - t0;

  // digitar enquanto converte: mede a maior tarefa longa da thread principal
  await page.evaluate(() => {
    (window as unknown as { __longest: number }).__longest = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const w = window as unknown as { __longest: number };
        w.__longest = Math.max(w.__longest, e.duration);
      }
    }).observe({ type: 'longtask' });
  });
  await box.press('End');
  await box.pressSequentially(' and more words here', { delay: 30 });
  await page.waitForTimeout(1500);
  const longest = await page.evaluate(() => (window as unknown as { __longest: number }).__longest);
  console.log(
    `[desempenho] conversão 2.000 car. ${Math.round(conversion)} ms · maior tarefa ao digitar ${Math.round(longest)} ms`,
  );
  expect(conversion).toBeLessThan(BUDGET.conversion2000Ms);
  expect(longest).toBeLessThan(BUDGET.typingFrameMs * 4); // CPU 4× mais lenta: 100 ms reais num aparelho médio
});
