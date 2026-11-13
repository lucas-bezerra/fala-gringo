// Copia os dicionários ATIVOS para apps/web/public/dict, onde o Vite os serve como arquivos estáticos.
// Solução provisória até o gerador de shards (T2.7) substituí-la.
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Manter em sincronia com AVAILABLE_LANGUAGES em apps/web/src/services/dictionaryService.ts
const ACTIVE = ['en_US'];

const here = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(here, '../raw/ipa-dict');
const outDir = path.resolve(here, '../../../apps/web/public/dict');

await mkdir(outDir, { recursive: true });
for (const name of ACTIVE) {
  await copyFile(path.join(srcDir, `${name}.txt`), path.join(outDir, `${name}.txt`));
}
await copyFile(path.join(srcDir, 'LICENSES.md'), path.join(outDir, 'LICENSES.md'));
console.log(`[data] ${ACTIVE.length} dicionário(s) copiado(s) para ${path.relative(process.cwd(), outDir)}`);
