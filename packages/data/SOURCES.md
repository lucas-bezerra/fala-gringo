# Fontes de dados e licenças

> Levantamento da T0.2 (PLANO-V2), feito em 2026-11-13 a partir das páginas oficiais de cada fonte (links abaixo).
> **Isto não é parecer jurídico.** O FalaGringo é usado por uma empresa (Rede Gazeta), então as decisões marcadas com ⚖️ devem ser confirmadas pelo jurídico antes do lançamento.

## Decisão T0.5 (2026-11-13, responsável pelo projeto)

- **Contexto de uso declarado:** projeto sem fins lucrativos, sem uso em canais oficiais da Rede Gazeta, uso individual e esporádico.
- **Decisão:** remover tudo que não tem permissão clara e manter só o permitido. O **EN-US é obrigatório** (idioma principal).
- **Executado:** removidos `ro`, `en_UK`, `es_ES`, `es_MX`, `fr_FR` e `fr_QC`. Créditos dos que ficaram em [raw/ipa-dict/LICENSES.md](raw/ipa-dict/LICENSES.md).
- A decisão foi do responsável pelo projeto, **sem parecer do jurídico**. **Se o uso mudar** (canais oficiais, TV/rádio no ar, distribuição para outras áreas), refazer esta análise com o jurídico antes.
- O histórico do git ainda contém os arquivos removidos. Não foi reescrito; isso só importa se o repositório for publicado.

## Regras para o projeto

1. **Proibido:** dados com cláusula **NC (não comercial)**, dados com licença **desconhecida** e dados **GPL** misturados ao bundle do app.
2. **Permitido com atribuição:** MIT, BSD, CC BY, CC0.
3. **Permitido com ShareAlike** (CC BY-SA): os shards gerados a partir dessas fontes são obras derivadas e **devem ser publicados sob CC BY-SA**, com atribuição. O código do app não é afetado. ⚖️ Confirmar esse entendimento.
4. Toda fonte usada aparece na página **Fontes e créditos** do app e no `NOTICE` do repositório.
5. Nenhuma fonte nova entra no pipeline sem uma linha nesta tabela.

## Fontes candidatas para a v2

| Fonte | Uso no FalaGringo | Licença verificada | Obrigações | Status |
|---|---|---|---|---|
| [CMUdict](https://github.com/cmusphinx/cmudict) | EN-US (base principal; ARPAbet → IPA) | Estilo BSD-2, © Carnegie Mellon University 1993–2015 | Manter o aviso de copyright, as condições e o disclaimer na documentação distribuída | ✅ Aprovada |
| [cmudict-ipa](https://github.com/lingz/cmudict-ipa) (usada no `en_US.txt` atual) | EN-US (alternativa já convertida para IPA) | MIT, © 2016 Lingliang Zhang (deriva do CMUdict) | Aviso MIT + aviso do CMUdict | ✅ Aprovada |
| [Britfone](https://github.com/JoseLlarena/Britfone) | EN-UK (RP/SSB, +16 mil entradas) | MIT, © 2017 Jose Llarena | Aviso MIT | ✅ Aprovada (cobertura pequena; completar com WikiPron) |
| [WikiPron](https://github.com/CUNY-CL/wikipron) (dados do Wiktionary) | Base multilíngue: 348 idiomas, +5 milhões de pares | Código: Apache 2.0. Dados: herdam a licença do Wiktionary (**CC BY-SA 4.0** / GFDL) | Atribuição ao Wiktionary e aos contribuidores; shards derivados em CC BY-SA | ✅ Aprovada com ShareAlike ⚖️ |
| [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing) (P898, IPA de nomes próprios) | Nomes de pessoas, lugares e clubes | **CC0** (domínio público) | Nenhuma; crédito recomendado | ✅ Aprovada |
| [JMdict / EDRDG](https://www.edrdg.org/edrdg/licence.html) | JA: leituras de kanji → kana | **CC BY-SA 4.0** | Crédito no site **em cada tela** (rodapé), ou crédito geral se misturado a outras fontes; link para a documentação e licença da EDRDG; **atualizar os dados regularmente** (servidores web: pelo menos mensalmente) | ✅ Aprovada com condições ⚖️ |
| [pinyin-pro](https://github.com/zh-lx/pinyin-pro) (npm `pinyin-pro`) | ZH: hanzi → pinyin | MIT (conforme o registro do npm, v3.29.5) | Aviso MIT no bundle | ✅ Aprovada |

## Dicionários que já estão no repositório (`packages/data/raw/ipa-dict/`)

Origem conforme a seção *Credits* do [ipa-dict](https://github.com/open-dict-data/ipa-dict). O repositório ipa-dict é MIT, mas **cada conjunto de dados mantém a licença original**.

| Arquivo | Origem | Licença | Decisão |
|---|---|---|---|
| `en_US.txt` | cmudict-ipa | MIT | ✅ Manter (será substituído pelo pipeline com o CMUdict) |
| `en_UK.txt` | ipacards | **GPL 3.0** | 🗑️ Removido (T0.5). Substituir por Britfone + WikiPron |
| `de.txt` | german-ipa-dict (Wiktionary) | CC BY-SA | ⚠️ Usar só com ShareAlike; preferir WikiPron (mesma origem, mais atualizado) |
| `es_ES.txt`, `es_MX.txt` | Gerados por script PHP de terceiros | **Não informada** | 🗑️ Removido (T0.5). Espanhol virá do WikiPron + G2P próprio por regras (T5.1) |
| `fr_FR.txt` | Não informada | **Não informada** | 🗑️ Removido (T0.5). Usar WikiPron |
| `fr_QC.txt` | Conversor qc-ipa ("highly experimental") | **Não informada** | 🗑️ Removido (T0.5) |
| `ja.txt` | Edict (EDRDG) | CC BY-SA 3.0 | ⚠️ Substituir por JMdict atual (CC BY-SA 4.0) + regras kana → IPA |
| `ko.txt` | korean-word-ipa-dictionary (Wiktionary coreano) | CC BY-SA | ⚠️ Desnecessário: o Hangul será convertido por regras (T5.6) |
| `nl.txt` | Instituut voor de Nederlandse Taal | CC BY | ✅ Pode manter, com atribuição |
| `ro.txt` | MaRePhoR | **CC BY-NC** (não comercial) | 🗑️ Removido (T0.5). Cláusula NC |
| `sv.txt` | Folkets lexikon | CC BY-SA 2.5 | ⚠️ Usar só com ShareAlike; preferir WikiPron |

## Pendências

- ⚖️ Jurídico: confirmar (a) que publicar os shards derivados em CC BY-SA atende ao ShareAlike sem afetar o código; (b) as condições da EDRDG para um site estático (crédito em cada tela + atualização mensal).
- O `ro.txt` e o `en_UK.txt` (GPL) **já estão versionados**, inclusive no histórico do git. Removê-los do diretório resolve o uso daqui para frente. Se o repositório for público, avaliar com o jurídico se é preciso limpar o histórico.
- Antes de cada import, confirmar de novo a licença na fonte (licenças mudam).
