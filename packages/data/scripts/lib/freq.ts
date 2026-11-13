// Listas de frequência FrequencyWords (OpenSubtitles 2018), baixadas para build/freq/ e reaproveitadas.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DATA_ROOT } from './write';

const BASE = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/525f9b560de4/content/2018';

/** Palavras com contagem, da mais frequente para a menos. `code`: en, es, pt_br… */
export async function frequencyList(code: string): Promise<[string, number][]> {
  const file = path.join(DATA_ROOT, 'build/freq', `${code}_50k.txt`);
  if (!existsSync(file)) {
    const res = await fetch(`${BASE}/${code}/${code}_50k.txt`);
    if (!res.ok) throw new Error(`Lista de frequência ${code}: HTTP ${res.status}`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, await res.text());
  }
  return (await readFile(file, 'utf-8'))
    .split('\n')
    .map((l) => l.trim().split(' '))
    .filter((p) => p.length === 2)
    .map(([w, n]) => [w, Number(n)]);
}
