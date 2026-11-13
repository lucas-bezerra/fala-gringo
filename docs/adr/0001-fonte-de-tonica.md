# ADR 0001 — Fonte de tônica para it-IT e en-GB

- **Status:** aceita (2026-11-13)
- **Tarefa:** T2.10

## Contexto

A notação ([docs/notacao.md](../notacao.md)) marca a sílaba tônica em MAIÚSCULAS. Os TSV publicados do WikiPron (T2.4), nossa fonte multilíngue, **não têm marcas de tônica nem de sílaba**: zero `ˈ` em cerca de 615 mil linhas.

| Idioma | Tônica |
|---|---|
| es, fr | Deduzível por regra (acento gráfico; última sílaba) |
| de | O `de.txt` do ipa-dict tem tônica em 99% das linhas |
| **it, en-GB** | **Sem fonte.** A regra não resolve (*SU-bi-to*, *àncora* × *ancóra*) |

## Opções avaliadas

1. **Extrair do Wiktionary via wiktextract/kaikki.org.** Mesma origem e licença do WikiPron, mas com o IPA original (tônica e sílabas).
2. **Rodar a coleta do WikiPron mantendo a tônica.** Consulta o Wiktionary ao vivo, por horas, a cada idioma.
3. **Britfone para en-GB.** MIT, com tônica, mas só cerca de 16 mil entradas.

## Decisão

**Opção 1 para it-IT e en-GB, com a opção 3 como complemento em en-GB.**

- Usamos os JSONL **por idioma** do kaikki.org (`kaikki.org-dictionary-{Italian,English}.jsonl.gz`).
  - O arquivo bruto com todos os idiomas (2,9 GB) é o caminho oficial, mas o servidor limita a velocidade a cerca de 70–350 KB/s, o que daria cerca de 12 h de download.
  - Os arquivos por idioma estão marcados como **obsoletos** pelo kaikki.
- Por isso, **guardamos no repositório só o TSV compacto já extraído** (`raw/wiktextract/{lang}.tsv`). Os JSONL de centenas de MB não entram.
- Só transcrições **fonêmicas** (`/…/`) entram. Em en-GB, só as de etiqueta exclusivamente `Received-Pronunciation` e/ou `UK` (ver Resultado).

## Consequências

- it-IT e en-GB ganham tônica e fronteiras de sílaba, que também ajudam a silabação (T3.4).
- **Licença:** o kaikki.org não declara licença para os dados. Eles são extraídos do Wiktionary e, portanto, herdam a **CC BY-SA 4.0**: mesma situação e mesmas obrigações do WikiPron.
- **Atualização (T2.9):** quando o kaikki remover os arquivos por idioma, a extração terá que ler o arquivo bruto. O script aceita qualquer `.jsonl.gz` e filtra por `lang_code`, então só muda a entrada.

## Resultado (2026-11-13)

| Idioma | Fonte | Entradas | Palavras | Tônica |
|---|---|---|---|---|
| it-IT | Wiktionary (kaikki) | 95.960 | 86.842 | 99,9% das polissílabas |
| en-GB | Wiktionary (kaikki) | 42.678 | 36.441 | ~95% das polissílabas |
| en-GB | Britfone | 16.204 | 15.212 | 16.117 de 16.204 linhas |

Casos que a regra não resolveria vieram certos e com as duas leituras: `subito` → `ˈsu.bi.to` / `suˈbi.to`; `ancora` → `ˈan.ko.ra` / `anˈko.ra`.

Em en-GB, os dados mostraram que a etiqueta `British` também cobre variantes regionais e a "Southern Standard" moderna (`/fɹɪj/`, `ˈwa.tɐ`). O filtro final aceita só `Received-Pronunciation` e/ou `UK`, cerca de 61,6 mil das transcrições.
