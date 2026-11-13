// Gera packages/data/NOTICE.md (versionado). Com --check, só confere se está atualizado (usado no CI).
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderNotice } from '../src/notice';
import { DATA_ROOT } from './lib/write';

const file = path.join(DATA_ROOT, 'NOTICE.md');
const expected = renderNotice();
if (process.argv.includes('--check')) {
  const current = await readFile(file, 'utf-8').catch(() => '');
  if (current !== expected) {
    console.error('NOTICE.md desatualizado: rode `pnpm --filter @falagringo/data notice` e faça commit.');
    process.exit(1);
  }
  console.log('NOTICE.md em dia.');
} else {
  await writeFile(file, expected);
  console.log(`NOTICE.md gerado (${expected.length} caracteres).`);
}
