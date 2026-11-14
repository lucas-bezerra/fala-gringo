import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Painel de detalhe da palavra (T4.3): som a som, variantes, IPA e áudio pela voz sintética do navegador.

const words = (page: Page) => page.getByRole('list', { name: 'Palavras' }).getByRole('button');

async function axe(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

/** Simula uma voz instalada e registra o que seria falado (o Chromium de teste não tem vozes). */
async function fakeVoices(page: Page, langs: string[]) {
  await page.addInitScript((voiceLangs) => {
    const spoken: { text: string; lang: string }[] = [];
    (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
    const voices = voiceLangs.map((lang) => ({
      lang,
      name: `Voz ${lang}`,
      voiceURI: `v-${lang}`,
      localService: true,
      default: false,
    }));
    class FakeUtterance {
      voice: unknown = null;
      lang = '';
      rate = 1;
      constructor(public text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: () => voices,
        speak: (u: FakeUtterance) => spoken.push({ text: u.text, lang: u.lang }),
        cancel: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
  }, langs);
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('painel lateral mostra som a som, fonte e IPA da palavra escolhida (teclado)', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Texto em inglês').fill('thank you');
    await expect(words(page)).toHaveCount(2);
    const aside = page.getByRole('complementary');
    await expect(aside.getByRole('heading', { name: 'thank' })).toBeVisible(); // 1ª palavra por padrão
    await words(page).nth(1).focus();
    await page.keyboard.press('Enter');
    await expect(words(page).nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(aside.getByRole('heading', { name: 'you' })).toBeVisible();
    await words(page).first().press('Space');
    await expect(aside.getByText('/ˈθæŋk/')).toBeVisible();
    await expect(aside.getByText(/Fonte: CMUdict/)).toBeVisible();
    const rows = aside.getByRole('listitem');
    await expect(rows.first()).toContainText('θ');
    await expect(rows.first()).toContainText('Som que não existe em português.');
    expect(await axe(page)).toEqual([]);
  });

  test('mostra outras pronúncias quando o dicionário tem variantes', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Texto em inglês').fill('either');
    const aside = page.getByRole('complementary');
    await expect(aside.getByRole('heading', { name: 'Outras pronúncias' })).toBeVisible();
  });

  test('sem voz instalada, o áudio fica desativado e explica o motivo', async ({ page }) => {
    await fakeVoices(page, []);
    await page.goto('/');
    await expect(words(page).first()).toBeVisible();
    const button = page.getByRole('button', { name: 'Ouvir a palavra' });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAccessibleDescription('Nenhuma voz em inglês instalada neste navegador.');
    await expect(page.getByText('Nenhuma voz em inglês instalada neste navegador.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ouvir frase' })).toBeDisabled();
  });

  test('com voz, fala a palavra e a frase na variante escolhida', async ({ page }) => {
    await fakeVoices(page, ['en-US', 'en-GB']);
    await page.goto('/');
    await page.getByLabel('Texto em inglês').fill('water please');
    await expect(words(page)).toHaveCount(2);
    await page.getByRole('radio', { name: 'Reino Unido' }).click();
    const button = page.getByRole('button', { name: 'Ouvir a palavra' });
    await expect(button).toHaveAccessibleDescription('Voz sintética do navegador');
    await button.click();
    await page.getByRole('button', { name: 'Ouvir frase' }).click();
    const spoken = await page.evaluate(() => (window as unknown as { __spoken: unknown[] }).__spoken);
    expect(spoken).toEqual([
      { text: 'water', lang: 'en-GB' },
      { text: 'water please', lang: 'en-GB' },
    ]);
  });
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('tocar na palavra abre o painel inferior; Esc fecha e devolve o foco', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Texto em inglês').fill('thank you');
    await expect(page.getByRole('complementary')).toHaveCount(0);
    const card = words(page).first();
    await card.click();
    const sheet = page.getByRole('dialog', { name: 'thank' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading', { name: 'Som a som' })).toBeVisible();
    expect(await axe(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(card).toBeFocused();
  });
});
