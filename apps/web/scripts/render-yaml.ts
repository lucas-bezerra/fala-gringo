// Gera o render.yaml (raiz do repositório) a partir de security-headers.ts. Uso: pnpm render:yaml
import { writeFileSync } from 'node:fs';
import { renderBlueprint } from '../security-headers';

const out = new URL('../../../render.yaml', import.meta.url);
writeFileSync(out, renderBlueprint());
console.log(`render.yaml atualizado (${out.pathname})`);
