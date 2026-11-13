# ADR 0002 — Motor de regras IPA → PT-BR

- **Status:** aceita (2026-11-13)
- **Tarefa:** T3.5 (desenho e mecanismo). O conteúdo das regras é afinado nas T3.6 (núcleo comum, golden set da notação), T3.7 (inglês) e Fase 5 (demais idiomas)
- **Especificação:** [docs/notacao.md](../notacao.md), seções 3 a 6

## Contexto

A v1 convertia o IPA caractere a caractere, com no máximo 2 caracteres e sem contexto. A notação exige regras que dependem:

- da **posição**: `h` → `r` no início da palavra e `rr` no resto (R7); `l` em coda gera armadilha;
- dos **vizinhos**: `ŋ` → `n` antes de k/g (`THÉNK`) e `ng` nos outros casos; `j` some antes de `i` (R9);
- da **sílaba**: antinasalização em sílaba tônica antes de nasal na sílaba seguinte (R10);
- das **letras já geradas**: `s` → `ss` entre vogais **atravessando sílabas** (R6, `mé·ssâ`); `g` → `gu` antes de e/i (R8);
- do **idioma**: o mesmo `ð` é `dh` 🟧 no inglês e `d` no espanhol; `ʌ` é `â` no inglês e `ó` 🟧 no coreano.

Ele recebe o resultado das T3.3–T3.4: sons com base canônica e traços, silabados (ataque/núcleo/coda) e com tônica.

## Decisão

### 1. Duas camadas de regras e uma de detectores

| Camada | Opera sobre | Escolha | Exemplos |
|---|---|---|---|
| **Mapeamento** (`MapRule`) | Cada **som**, com o contexto fonológico | Ordenada; **a primeira que casa vence** | tabela da seção 4, R7, R9, R10, perfis |
| **Ortografia** (`OrthoRule`) | As **letras geradas** da palavra, atravessando sílabas | Ordenada; todas as que casam aplicam, uma vez cada | R6 (`ss`), R8 (`gu`) |
| **Armadilhas** (`TrapRule`) | Cada som, com o contexto | **Todas** as que casam valem; não competem com a grafia | as 8 armadilhas da seção 5.3 |

R6 e R8 ficam numa camada própria porque dependem do que **foi escrito**, não do som. Exemplo: `ʝ` vira `i` e esse `i` é vogal para o R6, mesmo vindo de uma consoante. As armadilhas são detectores à parte porque a mesma posição pode ter grafia de uma regra e várias armadilhas (`team` → `TIM`: TI_DI + CODA_NASAL).

### 2. Regras como dados TypeScript, com o padrão escrito em IPA

```ts
{ id: 'h-inicial', match: ['h', 'x', 'χ', 'ħ'], when: { wordInitial: true }, out: 'r' },
{ id: 'h',         match: ['h', 'x', 'χ', 'ħ'], out: 'rr' },
{ id: 'ŋ-velar',   match: 'ŋ', when: { next: ['k', 'ɡ'] }, out: 'n' },
{ id: 'ŋ',         match: 'ŋ', out: 'ng', special: true },
{ id: 'ɑ̃',         match: 'ɑ̃', out: 'ã' },          // antes de 'ɑ': o padrão com diacrítico exige o traço
```

- **Padrão = IPA** (`'ɔ̃'`, `'t͡ʃ'`, `'iː'`), analisado pelo próprio parser: a base precisa ser igual e os traços do padrão precisam estar no som. Também há **classes** (`'@vowel'`, `'@nasal'`, `'@obstruent'`, `'@i'`…). Um revisor de fonética lê a tabela sem saber programar.
- **Contexto (`when`)**: `slot` (onset/nucleus/coda), `wordInitial`/`wordFinal`, `stressed`, `prev`/`next` (vizinho na palavra, atravessando sílabas), `nextOnset` (1º som da próxima sílaba), `geminate` (o próximo som repete este).
- **Saída**: texto, ou função para os casos que derivam de outra grafia, como a vogal longa do japonês (`ôo`) ou o ditongo composto (`iɐ̯` → `iâ`). Funções são a exceção e estão documentadas.
- **Perfis por idioma** vêm **antes** do núcleo comum. Primeira que casa vence.

### 3. Rastreabilidade e verificações automáticas

- Cada segmento de saída guarda o `id` da regra que o gerou. Isso serve ao painel "som a som" da interface, à depuração e às falhas do golden set.
- **Na carga da tabela:** padrão que não é um som só (ex.: `'tʃ'` sem ligadura) é erro.
- **Teste de sombreamento:** uma regra sem contexto que casa tudo o que uma regra posterior casa torna a posterior inalcançável, e o teste falha.
- **Cobertura sobre o inventário real** (`pnpm --filter @falagringo/engine rules-coverage`): fração dos sons dos dados que cai em regra (e não no reserva), por idioma.
- **Som sem regra** cai num reserva visível: sai como a base, **destacado**, e é contado no relatório. Nunca some em silêncio.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| DSL em texto próprio (`h → r / #_`, estilo SPE), com parser | Exige parser, mensagens de erro e editor próprios. Perde a checagem de tipos. O ganho de concisão não compensa para algumas centenas de regras |
| Substituição por regex sobre a string de IPA (como a v1) | Não enxerga sílaba, tônica nem traços. Foi a causa dos erros da v1 |
| Transdutores (FST) ou regras ponderadas | Poder demais para regras determinísticas e legíveis. Ficam reservados para o G2P (T3.9), se for preciso |
| Uma camada só, com R6/R8 aproximados por som | `ʝ` → `i` e `j` → `i` também são "vogal" para o R6. A aproximação por som erraria esses casos |

## Consequências

- Acrescentar um idioma = escrever um **perfil** (lista de regras) e conferir no relatório de cobertura e no golden set. O motor não muda.
- A ordem das regras é parte da especificação. O teste de sombreamento e o rastreamento por `id` tornam os erros de ordem visíveis.
- **Divisão do trabalho:** a T3.5 entrega o mecanismo, a tabela comum da seção 4, R6–R9, R11, as 8 armadilhas e os perfis da seção 6 como ponto de partida. A T3.6 confere tudo contra os 69 exemplos da seção 7 e fecha as diferenças, incluindo a antinasalização (R10). A T3.7 afina o inglês com o golden set.

## Resultado (2026-11-13)

- **Cobertura sobre os dados reais** ([RULES-COVERAGE.md](../../packages/engine/RULES-COVERAGE.md)): **99,9997%** dos 17,7 milhões de sons das 1.976.763 pronúncias caem numa regra. Os 5 restantes são erros da fonte (ligadura entre vogal e consoante: `ˈe͡ɪbə͡lˌɔ͡ɪt`). Não há falhas de conversão. Cada pronúncia leva 0,03–0,05 ms.
- **Exemplos da notação (seção 7):** 66 de 69 iguais. As 3 diferenças estão declaradas no teste (`KNOWN_DIFFS`): o motor segue a regra adotada ou a fonte, e a notação foi escrita à mão.
- **Verificações estáticas:** padrões válidos, `id`s únicos e nenhuma regra sombreada dentro de cada camada. O perfil sobrepor o núcleo é a sobrescrita intencional.
- **Bugs que o teste com a notação revelou e foram corrigidos:**
  - fontes inglesas que escrevem `r` em vez de `ɹ` (`Greenwich` saía `GRRÉ`);
  - o italiano escreve todo /r/ como `r` (`grazie` saía `GRRA`);
  - a antinasalização (R10) foi antecipada da T3.6, porque é uma regra de uma linha.
- **Ressalva:** cobertura não é acerto. A correção da grafia é medida pelo golden set (T3.6 e T3.8).
