/** O snippet do Nginx em docs/deploy.md precisa ter exatamente os cabeçalhos de security-headers.ts (T6.2). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from '../../security-headers';

const doc = readFileSync(new URL('../../../../docs/deploy.md', import.meta.url), 'utf8');

describe('docs/deploy.md em sincronia com security-headers.ts', () => {
  it.each(Object.entries(SECURITY_HEADERS))('%s', (name, value) => {
    expect(doc).toContain(`add_header ${name} "${value}" always;`);
  });

  it('não sobra cabeçalho de segurança antigo no snippet', () => {
    const snippet = doc.slice(doc.indexOf('falagringo-security.conf`:'), doc.indexOf('Site:'));
    const names = [...snippet.matchAll(/add_header ([\w-]+) /g)].map((m) => m[1]);
    expect(names.sort()).toEqual(Object.keys(SECURITY_HEADERS).sort());
  });
});
