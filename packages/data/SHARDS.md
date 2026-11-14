# Shards do dicionário (T2.7)

`pnpm --filter @falagringo/data shards` lê `build/merged/{lang}.tsv` e gera:

```
build/dict/
├─ manifest.json            # índice de todos os idiomas (~10 KB)
└─ {lang}/{hash}.json       # shards; o nome é o hash do conteúdo → cache imutável
```

Código: [src/shards.ts](src/shards.ts) (formato e busca, usados também pelo app) e [src/shardBuilder.ts](src/shardBuilder.ts) (gerador, Node).

## Faixas, não prefixos

Cada idioma é dividido em **faixas contíguas de chaves em ordem**, e o manifest guarda a primeira chave de cada shard. O plano previa shards por prefixo, mas no japonês e no coreano cada caractere seria um prefixo e geraria milhares de arquivos minúsculos. As faixas funcionam igual para qualquer escrita.

Para achar uma palavra:
1. `key = lookupKey(palavra, idioma)` (NFC e minúsculas do idioma);
2. `findShard(manifest.langs[idioma].shards, key)` (busca binária);
3. baixar esse shard e ler `words[key]`.

**Uma palavra = um shard baixado.** O primeiro shard começa na chave vazia, então toda busca cai em algum shard.

> **A ordem é a comparação de strings do JavaScript** (`<`, unidades UTF-16) sobre a `lookupKey`. Quem consulta precisa usar a mesma chave e a mesma comparação.

## Formato

```jsonc
// manifest.json
{
  "format": 1,
  "dataVersion": "08879347ecf9",            // muda se qualquer shard mudar → versão do cache no app
  "sources": ["ipa-dict", "cmudict", …],     // índice usado nos shards
  "langs": {
    "en-US": { "words": 126313, "prons": 135433,
               "shards": [{ "from": "", "file": "en-US/ab12….json", "words": 21000, "bytes": 912345, "gzip": 160123 }, …] }
  }
}

// en-US/ab12….json
{ "format": 1, "lang": "en-US",
  "words": {
    "greenwich": { "w": "Greenwich", "p": 1, "v": [["ˈɡɹɛnɪtʃ", "m", 5, 1]] },
    "a":         { "v": [["ə", "o", 1, 0], ["ˈeɪ", "m", 1, 0]] }
  } }
```

| Campo | Significado |
|---|---|
| `w` | Grafia de exibição. Só aparece quando difere da chave |
| `p: 1` | Nome próprio |
| `v` | Pronúncias em ordem: `[ipa, tônica, fonte, concordância]` |
| tônica | `m` marcada · `b` emprestada · `o` monossílaba · `n` sem tônica (ver [MERGE.md](MERGE.md)) |
| fonte | Índice em `manifest.sources` |
| concordância | Quantas outras fontes têm os mesmos segmentos (só na principal) |

## Tamanho

O limite é **48 KB com gzip por shard** (`DEFAULT_MAX_GZIP`). O empacotamento é guloso; um shard que passe do limite é dividido ao meio, recursivamente. Mesma entrada → mesmos arquivos e mesmo `dataVersion` (verificado regerando).

**Por que 48 KB (T6.3):** o limite era 200 KB. Medido no perfil "celular médio" (1,6 Mbps, CPU 4×), a frase de exemplo caía em 3 shards (~500 KB) e a 1ª conversão levava 4,6 s; com 48 KB, baixa ~120 KB e leva 3,1 s. O total por idioma praticamente não muda (o gzip perde pouco com arquivos menores); só aumenta o número de arquivos, o que o HTTP/2 absorve. Detalhes em [docs/desempenho.md](../../docs/desempenho.md).

### Resultado (2026-11-14, dados fb4d2a79eab3)

| Idioma | Palavras | Shards | gzip médio | gzip máximo | Total gzip |
|---|---|---|---|---|---|
| de-DE | 789.141 | 160 | 39 KB | 48 KB | 6,4 MB |
| en-GB | 85.582 | 24 | 41 KB | 43 KB | 1,0 MB |
| en-US | 126.313 | 23 | 40 KB | 43 KB | 0,9 MB |
| es-419 | 131.057 | 22 | 37 KB | 45 KB | 0,8 MB |
| es-ES | 131.071 | 22 | 38 KB | 46 KB | 0,8 MB |
| fr-FR | 84.444 | 17 | 35 KB | 46 KB | 0,6 MB |
| it-IT | 85.991 | 18 | 39 KB | 43 KB | 0,7 MB |
| ja-JP | 221.356 | 52 | 41 KB | 46 KB | 2,2 MB |
| ko-KR | 62.449 | 14 | 39 KB | 46 KB | 0,6 MB |
| nl-NL | 117.878 | 28 | 40 KB | 47 KB | 1,1 MB |
| sv-SE | 21.099 | 5 | 37 KB | 43 KB | 0,2 MB |
| zh-CN | 3 | 1 | — | — | — |

São 386 shards, com cerca de 15,5 MB comprimidos no total. A primeira palavra custa um shard de **até 48 KB**. O "baixar idioma para offline" (T4.8) soma os shards do idioma: 0,9 MB para o en-US.

## Lacuna encontrada: japonês em kana

`ありがとう` não está no dicionário. A fonte (EDICT, via ipa-dict) registra as palavras quase sempre em kanji: só 3.513 das 221 mil entradas são escritas apenas em hiragana. Como o kana é fonético, isso se resolve com a conversão kana → IPA por regra, prevista na T5.5.
