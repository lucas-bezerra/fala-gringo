import { describe, expect, it } from 'vitest';
import { renderNotice, sourcesInUse } from './notice';

describe('NOTICE', () => {
  it('lista só fontes em uso no merge (jmdict ainda não)', () => {
    expect(sourcesInUse()).toContain('cmudict');
    expect(sourcesInUse()).not.toContain('jmdict');
  });

  it('traz licença, origem e crédito de cada fonte e o aviso de ShareAlike', () => {
    const text = renderNotice();
    expect(text).toContain('Carnegie Mellon University');
    expect(text).toContain('Contribuidores do Wiktionary');
    expect(text).toContain('CC BY-SA 4.0');
    expect(text).not.toContain('EDRDG)'); // JMdict fora enquanto não for usado
  });
});
