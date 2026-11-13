# Léxico do português (T3.2)

O motor usa este léxico no **modo texto misto** (português com nomes estrangeiros, como no modo apresentador) para **não converter** as palavras em português. Ele é gerado junto dos shards (`pnpm --filter @falagringo/data shards`) e publicado como `build/dict/pt-BR-lexicon.{hash}.txt`, referenciado em `manifest.lexicons['pt-BR']`.

Formato: palavras comuns, uma por linha; depois a linha `#names` e os nomes próprios do português (em minúsculas). Código: [src/ptLexicon.ts](src/ptLexicon.ts).

## Por que combinar fontes

Nenhuma fonte diz sozinha o que é português:

| Fonte | Problema |
|---|---|
| Lista de frequência de legendas pt-BR (FrequencyWords) | Tem as flexões, mas também `the` (486ª), `you`, `John`, `der`, `la` e nomes estrangeiros (`massachusetts`, `greenwich`) |
| WikiPron PT-BR | É dicionário, mas faltam flexões (`correspondentes` e até o artigo `a`); traz alguns estrangeirismos e nomes estrangeiros (`Massachusetts`, `John`) |

**Construção:**
1. Palavras **minúsculas** do WikiPron PT-BR (dicionário).
2. ∪ as **30 mil** mais frequentes das legendas pt-BR.
3. − **ruído estrangeiro**: palavra das legendas, fora do dicionário, pelo menos **10×** mais frequente em en/es/fr/it/de/nl/sv (top 3.000). Remove `the`, `you`, `and`, `of`, `my`… Com a razão de 3×, saíam palavras portuguesas legítimas que outras línguas românicas compartilham (`estado`, `penso`, `vem`).
4. − palavras que o WikiPron PT só registra **como nome próprio** (`massachusetts`).
5. \+ `PT_CORE`, as palavras funcionais do português, sempre presentes (`das` é a 2ª do alemão e continua português).
6. **Nomes próprios do português** à parte: o que o WikiPron PT-BR registra com maiúscula (`Londres`, `Alemanha`, `Munique`).

Resultado (2026-11-13): **68.614 palavras + 3.245 nomes**, 212 KB gzip. Foram removidas 1.012 palavras de ruído e 672 nomes próprios.

## Como o motor decide (engine.ts)

| Palavra | Regra |
|---|---|
| Correção manual (`forcePortuguese`/`forceForeign`) | Vence tudo. A interface oferece esse ajuste palavra a palavra |
| Maiúscula no meio da frase | **Estrangeira** se o dicionário do idioma-alvo a tem; senão, português se for nome ou palavra do português (`Londres`) |
| Palavra comum do português (inclusive no início da frase) | Português (`Correspondentes`) |
| Fora do léxico, mas no dicionário | Estrangeira (inclusive no início da frase: `Massachusetts`) |
| Minúscula desconhecida dos dois lados | Português (provável flexão) |
| **Atração** | Palavra funcional do idioma-alvo colada a um nome estrangeiro vai junto: *Bank **of** America*, *Jerez de **la** Frontera*. Uma funcional que também é do português (`de`, `a`, `e`) só vai junto **entre dois estrangeiros** (*Tour **de** France*) ou antes de outra funcional atraída. Assim, o `de` de "o estado de Jalisco" continua português |

**Viés proposital:** um nome que existe nos dois mundos, como *Paris* ou *Maria*, é tratado como estrangeiro quando o dicionário do idioma-alvo o tem. Converter um nome português por engano custa menos ao apresentador do que deixar um estrangeiro sem leitura. A correção manual cobre o resto.

## Verificação com dados reais

| Idioma | Frase (⟦convertido⟧) |
|---|---|
| en-US | Correspondentes em ⟦Worcester⟧, ⟦Massachusetts⟧, e em ⟦Greenwich⟧, em Londres, acompanham o caso. |
| en-US | ⟦Massachusetts⟧ aprovou a lei; o ⟦Bank⟧ ⟦of⟧ ⟦America⟧ comentou. |
| en-GB | O ⟦Manchester⟧ ⟦United⟧ venceu o ⟦Liverpool⟧ em ⟦Old⟧ ⟦Trafford⟧, diz o ⟦The⟧ ⟦Guardian⟧. |
| fr-FR | Correspondentes em ⟦Saint⟧-⟦Étienne⟧ e ⟦Bordeaux⟧ cobrem o ⟦Tour⟧ ⟦de⟧ ⟦France⟧. |
| it-IT | A ⟦Juventus⟧ enfrenta o ⟦Napoli⟧ no estádio ⟦Diego⟧ ⟦Armando⟧ ⟦Maradona⟧. |
| de-DE | O ⟦Borussia⟧ ⟦Mönchengladbach⟧ joga contra o ⟦Bayern⟧ de Munique na Alemanha. |
| es-ES | A próxima etapa será em ⟦Jerez⟧ de ⟦la⟧ ⟦Frontera⟧, na Espanha, e depois em ⟦Sevilla⟧. |

**Limitação visível:** no espanhol, o `de` de "Jerez de la Frontera" fica português porque o dicionário espanhol **não tem `de`** (a lacuna do WikiPron vista na T2.8). A atração só converte palavras que o motor sabe pronunciar. Isso se resolve com o G2P do espanhol (T5.1).
