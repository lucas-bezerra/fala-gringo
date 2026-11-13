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

O limite é **200 KB com gzip por shard** (`DEFAULT_MAX_GZIP`). O empacotamento é guloso; um shard que passe do limite é dividido ao meio, recursivamente. Mesma entrada → mesmos arquivos e mesmo `dataVersion` (verificado regerando).

### Resultado (2026-11-13)

| Idioma | Palavras | Shards | gzip médio | gzip máximo | Total gzip |
|---|---|---|---|---|---|
| de-DE | 789.141 | 37 | 170 KB | 196 KB | 6,1 MB |
| en-GB | 85.582 | 6 | 162 KB | 181 KB | 0,9 MB |
| en-US | 126.313 | 6 | 154 KB | 176 KB | 0,9 MB |
| es-419 | 131.057 | 6 | 138 KB | 182 KB | 0,8 MB |
| es-ES | 131.071 | 6 | 138 KB | 182 KB | 0,8 MB |
| fr-FR | 84.444 | 4 | 149 KB | 181 KB | 0,6 MB |
| it-IT | 85.991 | 5 | 141 KB | 179 KB | 0,7 MB |
| ja-JP | 221.356 | 14 | 152 KB | 180 KB | 2,1 MB |
| ko-KR | 62.449 | 4 | 137 KB | 180 KB | 0,5 MB |
| nl-NL | 117.878 | 7 | 159 KB | 180 KB | 1,1 MB |
| sv-SE | 21.099 | 2 | 93 KB | 146 KB | 0,2 MB |
| zh-CN | 3 | 1 | — | — | — |

São 98 shards, com cerca de 14,7 MB comprimidos no total. Hoje (v1), o app baixa o `en_US.txt` inteiro, com 3,2 MB sem compressão; com shards, a primeira palavra custa um shard de **até 200 KB**. O "baixar idioma para offline" (T4.8) soma os shards do idioma: 0,9 MB para o en-US.

## Lacuna encontrada: japonês em kana

`ありがとう` não está no dicionário. A fonte (EDICT, via ipa-dict) registra as palavras quase sempre em kanji: só 3.513 das 221 mil entradas são escritas apenas em hiragana. Como o kana é fonético, isso se resolve com a conversão kana → IPA por regra, prevista na T5.5.
