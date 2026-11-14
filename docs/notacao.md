# Notação PT-BR do FalaGringo — especificação v0.1

> **Status: rascunho para revisão humana (T0.3).** Precisa ser validado por alguém de fonética ou da equipe de locução da TV Gazeta / CBN antes de virar referência para o motor (T3.5–T3.6) e para os golden sets (T3.8).
> Os exemplos da seção 7 foram escritos à mão a partir de transcrições usuais de dicionário. **Todos devem ser conferidos.**

## 1. Objetivo

Dada a transcrição IPA de uma palavra estrangeira, produzir uma grafia que um **falante de português do Brasil leia em voz alta da forma mais próxima possível da pronúncia original**, sem precisar conhecer IPA.

A notação é escrita para o **leitor brasileiro**, não para o idioma de origem. A pergunta de cada regra é: "como o brasileiro vai ler isto?", e não "qual letra corresponde a este som?".

## 2. Princípios

1. **Leitura previsível.** Usar só letras e combinações que o brasileiro lê sempre do mesmo jeito. Evitar `c`, `q`, `x`, `y`, `w` e `h` isolado.
2. **Uma grafia por som, por contexto.** O mesmo fonema, na mesma posição, sempre sai igual em todos os idiomas, salvo exceção documentada no perfil do idioma (seção 6).
3. **Honestidade.** O que o português não tem é **destacado** (laranja), e o leitor recebe uma explicação. Não fingimos que `th` é `f`.
4. **Legibilidade acima de precisão.** Pequenas diferenças de qualidade vocálica (ex.: `ɪ` × `i`) são simplificadas. Quem quer precisão vê o IPA ao lado.
5. **Uma só grafia nas duas formas.** A forma silabada e a forma corrida usam **exatamente as mesmas letras**. A silabada só acrescenta os separadores `·`. Isso evita que uma das formas induza a uma leitura errada.

### Dialeto de referência

O leitor-alvo fala o **português brasileiro de mídia** (o "sotaque neutro" de telejornal) — decidido na Q1. As regras evitam depender de traços regionais. Onde isso não é possível (ex.: `s` final chiado no Rio, `r` final retroflexo no interior), a diferença vira **dica**, não grafia. No inglês, a variante padrão é o **EN-US**.

## 3. Formato de saída

### 3.1 Elementos

| Elemento | Regra | Exemplo |
|---|---|---|
| Separador de sílabas | `·` (ponto médio), só na forma silabada | `VÉ·ri` |
| Sílaba tônica | **Inteira em MAIÚSCULAS**, nas duas formas | `ês·ta·SSIÔN` / `êstaSSIÔN` |
| Sílaba átona | minúsculas | |
| Tonicidade secundária | Não marcada | `mé·ssâ·TCHU·ssits` |
| Idiomas sem acento de intensidade (JA, KO, ZH) | Tudo em minúsculas | `a·ri·ga·tôo` |
| Monossílabos | Palavra de conteúdo: MAIÚSCULAS. Palavra funcional dentro de frase: minúsculas | `PLIZ`; `la` em "¿dónde está la…?" |
| Som destacado | Segmento sem equivalente em português, marcado na estrutura de saída (UI: laranja sublinhado) | `θ` → **th** |
| Palavra fora do dicionário | Selo **estimado** | |
| Variantes | A 1ª variante é exibida; as outras ficam em "outras pronúncias" | Greenwich |

> ⚠️ **Mudança em relação ao protótipo aprovado:** no protótipo, a "leitura corrida" aparecia toda em minúsculas (`uárer pliz`). Pela regra 3.1 (confirmada na Q2), ela mantém a tônica em MAIÚSCULAS (`UArer PLIZ`), na tela e no texto copiado.

### 3.2 Vogais: marcas de qualidade

Os acentos indicam a **qualidade** da vogal, não a tônica (a tônica é dada pelas maiúsculas).

| Regra | Motivo |
|---|---|
| **Todo `e` e todo `o` leva acento**: `é`/`ó` abertos, `ê`/`ô` fechados | Sem acento, o brasileiro lê `e`/`o` átonos finais como `i`/`u` ("dondi") e varia os pretônicos |
| `â` = vogal central/reduzida (`ə`, `ɐ`, `ʌ` do inglês) | É a leitura brasileira mais próxima do schwa |
| `a`, `i`, `u` não levam acento | A leitura já é estável |
| **Anti-nasalização:** em sílaba **tônica**, `a` seguido de `m`, `n` ou `nh` na sílaba seguinte vira `á` | O brasileiro nasaliza `a` tônico antes de nasal ("cama" = [ˈkɐ̃mɐ]). Ex.: espanhol `cama` → `KÁ·ma`. Em `ê`/`ô`, a nasalização residual é aceita (limitação conhecida) |
| Exceção: o dígrafo `er` para `ɚ` (r-colorido do inglês) vai sem acento | Forma fixa, sempre destacada. ❓ Q3 |

> ⚠️ **Mudança em relação ao protótipo:** saem os acentos agudos em `a`, `i` e `u` que só marcavam tônica (`UÁ`→`UA`, `TÁ`→`TA`, `IÚ`→`IU`).

## 4. Tabela de correspondência (núcleo comum)

Legenda: 🟧 = som destacado (não existe no PT-BR de mídia); *pos.* = depende da posição (seção 5).

### 4.1 Vogais e ditongos

| IPA | Grafia | Nota |
|---|---|---|
| i, iː, ɪ | i | |
| y, yː, ʏ | ü 🟧 | "i" com lábios de "u". ❓ Q4 |
| u, uː, ʊ | u | |
| ɯ | u | Destacado só no perfil KO (seção 6) |
| e, eː | ê | |
| ɛ, ɛː | é | |
| æ | é | Dica: "mais aberto que o é" |
| ø, øː | ê 🟧 | |
| œ | é 🟧 | |
| ə, ɐ | â | |
| ʌ | â | O perfil KO usa `ó` |
| ɜː (UK) | â 🟧 | "nurse" UK |
| ɝ, ɚ | er 🟧 | ❓ Q3 |
| o, oː | ô | |
| ɔ, ɔː, ɒ | ó | |
| a, aː, ɑ, ɑː | a (`á` pela regra anti-nasal) | |
| ɑ̃ | ã | |
| ɔ̃ | õ | |
| ɛ̃, œ̃ | ẽ | ❓ Q5 |
| aɪ | ai | |
| aʊ | au | |
| eɪ | êi | |
| oʊ, əʊ | ôu | |
| ɔɪ | ói | |
| ɪə | iâ | |
| eə, ɛə | éâ | |
| ʊə | uâ | |
| Comprimento `ː` | ignorado | Exceto no perfil JA (vogal dobrada) |

### 4.2 Semivogais

| IPA | Grafia | Nota |
|---|---|---|
| j | i | **omitido antes de `i`/`ɪ`** (`yeast` → `IST`) |
| w | u | **omitido antes de `u`/`ʊ`** (`woman` → `U·mân`, `Worcester` → `US·ter`) |

### 4.3 Consoantes

| IPA | Grafia | Nota |
|---|---|---|
| p, b, t, d, f, v, m, n, l | igual | Armadilhas de posição: seção 5.3 |
| k | k | Nunca `c`/`qu` |
| ɡ, g | g; **`gu` antes de `e`/`i`** | `give` → `GUIV` |
| s | s / **`ss` entre vogais** | *pos.* (R6) |
| z | z | |
| ʃ, ɕ | ch | Nunca `x` |
| ʒ, ʑ | j | Nunca `g` |
| tʃ, tɕ | tch | |
| dʒ, dʑ | dj | |
| ts | ts 🟧 | Destacado só quando a fonte o trata como africada (JA, IT, DE `z`). No inglês (`cats`, `its`), é encontro t + s, sem destaque |
| dz | dz 🟧 | Mesma regra do `ts` |
| θ | th 🟧 | |
| ð | dh 🟧 | ❓ Q6. No perfil ES (alofone), vira `d` sem destaque |
| ɹ | r 🟧 | inglês |
| ɾ | r | tepe: igual ao `r` de "caro" |
| r (vibrante múltipla) | rr 🟧 (`r` no início da palavra) | espanhol/italiano |
| h, x, χ, ħ | **`r` no início da palavra; `rr` nas outras posições** | *pos.* (R7). Equivale ao "r forte" brasileiro |
| ʁ | mesma regra do h 🟧 | francês/alemão. ❓ Q7 |
| ç | ch 🟧 | alemão `ich` |
| ɸ | f 🟧 | japonês `fu` |
| β | b | Destacado só no perfil ES, se aprovado (❓ Q8) |
| ɣ | g | |
| ʝ | i | |
| ŋ | **`n` antes de k/g**; `ng` 🟧 nos outros casos | `THÉNK`, `SING` |
| ɲ | nh | |
| ʎ | lh | |
| ʔ | omitido | |
| ʰ (aspiração) | ignorada | O perfil KO trata as aspiradas |
| ʲ (palatalização) | i | |

## 5. Regras de contexto (ordem de aplicação)

As regras rodam **nesta ordem**, sobre a sequência de fonemas já silabada. A ordem importa: por exemplo, R6 (`ss`) olha as letras geradas por R5.

| # | Regra | Detalhe |
|---|---|---|
| R1 | Normalização do IPA | NFC; `g`→`ɡ`; remove barras, colchetes e tie bars; separa os diacríticos conhecidos |
| R2 | Silabação | Usa os `.` e os acentos da fonte; sem eles, aplica o princípio do ataque máximo com a fonotática **do idioma de origem** |
| R3 | Tônica | Usa `ˈ` da fonte; sem `ˈ`, aplica a regra do perfil (seção 6). `ˌ` é ignorado |
| R4 | Substituições do perfil | Mapeamentos específicos do idioma (seção 6) antes do núcleo comum |
| R5 | Fonema → grafia | Tabela da seção 4, com prioridade para sequências mais longas (ditongos e africadas antes de segmentos simples), **sem limite fixo de 2 caracteres** |
| R6 | `s` → `ss` | Quando a grafia resultante tem vogal antes e vogal depois do `s`, **mesmo atravessando a fronteira de sílaba** (`mé·ssâ`, `ra·ssê`) |
| R7 | R forte | h/x/χ/ħ/ʁ → `r` no início da palavra; `rr` em qualquer outra posição (`bi·RRAIND`, `bõ·JURR`) |
| R8 | `g` → `gu` | Antes de `e`/`ê`/`é`/`i` na grafia |
| R9 | Omissão de semivogal | `j` antes de `i`, `w` antes de `u` |
| R10 | Acentos de qualidade | Seção 3.2, incluindo a anti-nasalização |
| R11 | Maiúsculas | Sílaba tônica → MAIÚSCULAS. Monossílabo funcional em frase → minúsculas |
| R12 | Destaques e armadilhas | Marca os segmentos 🟧 e gera os IDs de armadilha (seção 5.3) para as dicas contextuais |

### 5.1 Critério para destacar (laranja)

Um segmento é destacado **só quando o som não existe no PT-BR de mídia**, nem como alofone comum. Diferenças **de posição** (um som que existe, mas que o brasileiro altera naquela posição) **não** são destacadas: viram **armadilhas** com dica contextual. Isso mantém o laranja raro e significativo.

> ⚠️ **Mudança em relação ao protótipo:** `UÉL` (l final, em *welcome*) e `kam` (m final, em 감사합니다) estavam em laranja. Pelo critério, deixam de ser destacados e passam a gerar dicas.

### 5.2 O que **não** se resolve com grafia

A grafia não consegue impedir algumas leituras automáticas do brasileiro. Elas são tratadas como armadilhas (5.3), e a tela mostra a dica correspondente sempre que a frase as contém.

### 5.3 Armadilhas (geram dicas, não destaque)

| ID | Contexto | O que o brasileiro faz | Dica |
|---|---|---|---|
| `TRAP_TI_DI` | `t`/`d` + `i` | Chia: "tchi", "dji" | "Não chie: *ti* como em *típico* no Nordeste" |
| `TRAP_CODA_L` | `l` em fim de sílaba | Vira "u": "uéu" | "Encoste a língua no céu da boca no *l*" |
| `TRAP_CODA_NASAL` | `m`/`n` em fim de sílaba | Nasaliza a vogal e não fecha a consoante: "tĩ" | "Feche os lábios no *m* / encoste a língua no *n*" |
| `TRAP_FINAL_CONS` | Palavra terminada em consoante oclusiva, fricativa ou africada, **exceto `s` e `z`** (o português já termina palavras em -s: *mês*; o `z` tem armadilha própria) e o r forte (escrito `rr`) | Acrescenta "i": "plízi", "bigui" | "Termine na consoante, sem *i*" |
| `TRAP_S_CLUSTER` | `s` + consoante no início da palavra | Acrescenta "i/e" antes: "istrit" | "Comece direto no *s*" |
| `TRAP_FINAL_Z` | `z` no fim da palavra | Ensurdece: "plis" | "Mantenha o zumbido do *z*" |
| `TRAP_INITIAL_TAP` | `ɾ` no início da palavra (JA, KO) | Lê como r forte ("hamen") | "R leve, como em *caro*" |
| `TRAP_CODA_R` | `ɾ`/`r` em fim de sílaba (ES, IT, JA) | Varia por região (tepe, retroflexo, aspirado) | "R batido, como em *caro*" |

## 6. Perfis por idioma

| Perfil | Tônica sem marca na fonte | Particularidades |
|---|---|---|
| **EN-US** | (CMUdict sempre marca) | Flap `ɾ` entre vogais (`water` → `UA·rer`); `ɚ` → `er` 🟧. Formas fracas de palavras funcionais em frase (❓ Q9) |
| **EN-UK** | (fonte marca) | Sem r em fim de sílaba (não rótico); `əʊ` → `ôu`; `ɜː` → `â` 🟧 |
| **ES** | Regra ortográfica do espanhol (paroxítona por padrão; acento gráfico manda) | `β ð ɣ` (alofones) → `b d g`. `θ` → `th` 🟧 só na variante ES-ES. `x` → r forte (não destacado). `r` vibrante → `rr` 🟧. `ʝ` → `i`. Vogais sem redução: sempre `ê`/`ô` nos átonos |
| **FR** | Última sílaba de cada palavra | `ʁ` → r forte 🟧; `y ø œ` 🟧; vogais nasais `ã õ ẽ`. Liaison só se vier da fonte |
| **DE** | (fonte marca) | `ç` → `ch` 🟧; `x` → r forte; `ʁ` → r forte 🟧; `ɐ` → `â`; `y ø œ` 🟧 |
| **IT** | (fonte marca) | Geminadas simplificadas (`gnocchi` → `NHÓ·ki`); `ts`/`dz` 🟧 |
| **JA** | Sem tônica: tudo em minúsculas | Vogal longa = vogal dobrada (`tôo`); `ɯ` → `u` (sem destaque); `ɯ̥`/`i̥` desvozeados → `(u)`/`(i)` 🟧; `ɴ` → `n`; `ɕ` → `ch`; `ts` 🟧; `ɸ` → `f` 🟧; `ɾ` inicial → `TRAP_INITIAL_TAP` |
| **KO** | Sem tônica: tudo em minúsculas | `ʌ` → `ó` 🟧; `ɯ` → `u` 🟧; tensas (`p͈ t͈ k͈ s͈ t͈ɕ`) → consoante dobrada (`pp tt kk ss tch`) 🟧; aspiradas → letra simples 🟧; h entre vogais → `rr` (R7). ❓ Q13 |
| **ZH** | Tons, não tônica | A definir na T5.7 (❓ Q10) |

## 7. Exemplos (golden set inicial — **a revisar**)

Colunas: forma silabada; forma corrida (as mesmas letras, sem `·`); 🟧 = destaques; ⚑ = armadilhas.

### Inglês (EUA)

| # | Palavra | IPA | Silabada | Corrida | 🟧 / ⚑ |
|---|---|---|---|---|---|
| 1 | thank | θæŋk | THÉNK | THÉNK | 🟧 th · ⚑ FINAL_CONS |
| 2 | this | ðɪs | DHIS | DHIS | 🟧 dh |
| 3 | water | ˈwɑɾɚ | UA·rer | UArer | 🟧 er |
| 4 | please | pliz | PLIZ | PLIZ | ⚑ FINAL_Z |
| 5 | you | ju | IU | IU | — |
| 6 | very | ˈvɛɹi | VÉ·ri | VÉri | 🟧 r |
| 7 | red | ɹɛd | RÉD | RÉD | 🟧 r · ⚑ FINAL_CONS |
| 8 | house | haʊs | RAUS | RAUS | — |
| 9 | behind | bɪˈhaɪnd | bi·RRAIND | biRRAIND | ⚑ CODA_NASAL, FINAL_CONS |
| 10 | city | ˈsɪɾi | SI·ri | SIri | — |
| 11 | team | tim | TIM | TIM | ⚑ TI_DI, CODA_NASAL |
| 12 | little | ˈlɪɾəl | LI·râl | LIrâl | ⚑ CODA_L |
| 13 | sing | sɪŋ | SING | SING | 🟧 ng |
| 14 | street | stɹit | STRIT | STRIT | 🟧 r · ⚑ S_CLUSTER, FINAL_CONS |
| 15 | cat | kæt | KÉT | KÉT | ⚑ FINAL_CONS |
| 16 | cup | kʌp | KÂP | KÂP | ⚑ FINAL_CONS |
| 17 | about | əˈbaʊt | â·BAUT | âBAUT | ⚑ FINAL_CONS |
| 18 | give | ɡɪv | GUIV | GUIV | ⚑ FINAL_CONS |
| 19 | measure | ˈmɛʒɚ | MÉ·jer | MÉjer | 🟧 er |
| 20 | chocolate | ˈtʃɑklət | TCHA·klât | TCHAklât | ⚑ FINAL_CONS |
| 21 | judge | dʒʌdʒ | DJÂDJ | DJÂDJ | ⚑ FINAL_CONS |
| 22 | go | ɡoʊ | GÔU | GÔU | — |
| 23 | day | deɪ | DÊI | DÊI | — |
| 24 | boy | bɔɪ | BÓI | BÓI | — |
| 25 | woman | ˈwʊmən | U·mân | Umân | ⚑ CODA_NASAL |
| 26 | Worcester | ˈwʊstɚ | U·ster | Uster | 🟧 er |
| 27 | Massachusetts | ˌmæsəˈtʃusɪts | mé·ssâ·TCHU·ssits | méssâTCHUssits | — |
| 28 | welcome | ˈwɛlkəm | UÉL·kâm | UÉLkâm | ⚑ CODA_L, CODA_NASAL |

### Inglês (Reino Unido)

| # | Palavra | IPA | Silabada | Corrida | 🟧 / ⚑ |
|---|---|---|---|---|---|
| 29 | water | ˈwɔːtə | UÓ·tâ | UÓtâ | — |
| 30 | tomato | təˈmɑːtəʊ | tâ·MA·tôu | tâMAtôu | — |
| 31 | Greenwich | ˈɡrɛnɪtʃ | GRÉ·nitch | GRÉnitch | 🟧 r · ⚑ FINAL_CONS · variantes: ˈɡrɪnɪdʒ, ˈɡrɛnɪdʒ |
| 32 | bird | bɜːd | BÂD | BÂD | 🟧 â · ⚑ FINAL_CONS |

### Espanhol

| # | Palavra | Variante | IPA | Silabada | Corrida | 🟧 / ⚑ |
|---|---|---|---|---|---|---|
| 33 | dónde | todas | ˈdonde | DÔN·dê | DÔNdê | ⚑ CODA_NASAL |
| 34 | estación | ES | estaˈθjon | ês·ta·THIÔN | êstaTHIÔN | 🟧 th · ⚑ CODA_NASAL |
| 35 | estación | 419 | estaˈsjon | ês·ta·SSIÔN | êstaSSIÔN | ⚑ CODA_NASAL |
| 36 | perro | todas | ˈpero | PÊ·rrô | PÊrrô | 🟧 rr |
| 37 | jamón | todas | xaˈmon | ra·MÔN | raMÔN | ⚑ CODA_NASAL |
| 38 | cama | todas | ˈkama | KÁ·ma | KÁma | — (anti-nasal) |
| 39 | gracias | 419 | ˈɡɾasjas | GRA·ssias | GRAssias | — |
| 40 | gracias | ES | ˈɡɾaθjas | GRA·thias | GRAthias | 🟧 th |
| 41 | España | todas | esˈpaɲa | ês·PÁ·nha | êsPÁnha | — (anti-nasal) |
| 42 | agua | todas | ˈaɣwa | A·gua | Agua | — |
| 43 | llamar | 419 | ʝaˈmaɾ | ia·MAR | iaMAR | ⚑ CODA_R |

### Francês

| # | Palavra | IPA | Silabada | Corrida | 🟧 / ⚑ |
|---|---|---|---|---|---|
| 44 | bonjour | bɔ̃ʒuʁ | bõ·JURR | bõJURR | 🟧 rr |
| 45 | merci | mɛʁsi | mérr·SI | mérrSI | 🟧 rr |
| 46 | tu | ty | TÜ | TÜ | 🟧 ü |
| 47 | deux | dø | DÊ | DÊ | 🟧 ê |
| 48 | peur | pœʁ | PÉRR | PÉRR | 🟧 é, rr |
| 49 | enfant | ɑ̃fɑ̃ | ã·FÃ | ãFÃ | — |
| 50 | rouge | ʁuʒ | RUJ | RUJ | 🟧 r · ⚑ FINAL_CONS |
| 51 | Paris | paʁi | pa·RRI | paRRI | 🟧 rr |

### Japonês

| # | Palavra | IPA | Silabada | Corrida | 🟧 / ⚑ |
|---|---|---|---|---|---|
| 52 | ありがとう | aɾiɡatoː | a·ri·ga·tôo | arigatôo | — |
| 53 | ございます | ɡozaimasɯ̥ | gô·zai·ma·s(u) | gôzaimas(u) | 🟧 (u) |
| 54 | ラーメン | ɾaːmeɴ | raa·mên | raamên | ⚑ INITIAL_TAP, CODA_NASAL |
| 55 | 東京 | toːkʲoː | tôo·kiôo | tôokiôo | — |
| 56 | 富士 | ɸɯdʑi | fu·dji | fudji | 🟧 f |
| 57 | 津波 | tsɯnami | tsu·na·mi | tsunami | 🟧 ts |
| 58 | 寿司 | sɯɕi | su·chi | suchi | — |

### Coreano

| # | Palavra | IPA | Silabada | Corrida | 🟧 / ⚑ |
|---|---|---|---|---|---|
| 59 | 안녕하세요 | annjʌŋhasejo | an·nióng·rra·ssê·iô | annióngrrassêiô | 🟧 ó, ng · ⚑ CODA_NASAL |
| 60 | 감사합니다 | kamsahamnida | kam·sa·rram·ni·da | kamsarramnida | ⚑ CODA_NASAL |
| 61 | 서울 | sʌul | só·ul | sóul | 🟧 ó · ⚑ CODA_L |
| 62 | 빵 | p͈aŋ | ppang | ppang | 🟧 pp, ng |

### Alemão e italiano

| # | Palavra | IPA | Silabada | Corrida | 🟧 / ⚑ |
|---|---|---|---|---|---|
| 63 | ich | ɪç | ICH | ICH | 🟧 ch · ⚑ FINAL_CONS |
| 64 | Bach | bax | BARR | BARR | — |
| 65 | über | ˈyːbɐ | Ü·bâ | Übâ | 🟧 ü |
| 66 | Straße | ˈʃtʁaːsə | CHTRRA·ssâ | CHTRRAssâ | 🟧 rr · ⚑ S_CLUSTER |
| 67 | ciao | ˈtʃa.o | TCHA·ô | TCHAô | — (a fonte registra hiato; "tchau" é a forma aportuguesada) |
| 68 | gnocchi | ˈɲɔkki | NHÓ·ki | NHÓki | — |
| 69 | grazie | ˈɡrattsje | GRA·tsiê | GRAtsiê | 🟧 ts |

### Decisões de 2026-11-13 (T3.6, aprovadas pelo responsável do projeto)

| Ponto | Decisão |
|---|---|
| Armadilha de consoante final depois de `s` | **Não se aplica**: o português já termina palavras em -s (*mês*). Exemplos 8 e 27 corrigidos |
| *street* com TI_DI | Erro da tabela: o `t` vem depois do `i`. Corrigido |
| Divisão silábica de *chocolate* e *Worcester* | Vale a regra do motor (ataque máximo do inglês, T3.4): `TCHA·klât`, `U·ster` |
| *ciao* | Vale a fonte (hiato, italiano padrão): `TCHA·ô` |
| Armadilhas omitidas na tabela | Acrescentadas: *Greenwich* e *ich* (FINAL_CONS), *안녕하세요* (CODA_NASAL) |

Com isso, os 69 exemplos acima são o **golden set** do motor: grafia e armadilhas são testadas exatamente como estão aqui (`packages/engine/src/phonology.test.ts`).

## 8. Divergências com o protótipo aprovado

Estas mudanças devem ser aplicadas nos dados do protótipo e entram na Fase 4 como critério de aceite:

| Tela | Hoje | Pela notação |
|---|---|---|
| Traduzir | Leitura corrida em minúsculas (`uárer pliz thénk iú`) | `UArer PLIZ THÉNK IU` (Q2) |
| Traduzir | `UÁ`, `TÁ`, `IÚ` | `UA`, `TA`, `IU` |
| Traduzir (KO) | `rra·sê` | `rra·ssê` (R6) |
| Traduzir (KO) | `kam` em laranja | sem destaque + dica `CODA_NASAL` |
| Mobile | `UÉL` em laranja | sem destaque + dica `CODA_L` |
| Guia | `RRÁUS`, `RRUJ`, `rra·MÔN` | `RAUS`, `RUJ`, `ra·MÔN` (R7: r forte inicial = `r`) |
| Guia | `DIS` (ð) | `DHIS` (Q6) |
| Guia | `su·xi`, `xi` | `su·chi`, `chi` (`ʃ`/`ɕ` = `ch`) |
| Guia | `THIÉ·lô`, `ês·PA·nha` | `THIÊ·lô`, `ês·PÁ·nha` |
| Apresentador | `UÚS·ter`, `mé·sâ·TCHU·sits`, `rrê·RÉTH` | `U·ster`, `mé·ssâ·TCHU·ssits`, `rê·RÉTH` |

## 9. Questões para o revisor

| # | Questão | Proposta atual |
|---|---|---|
| Q1 | ✅ **Decidido (2026-11-13): PT-BR neutro de telejornal.** Variante padrão do inglês: **EN-US**. | — |
| Q2 | ✅ **Decidido (2026-11-13): MAIÚSCULAS sempre** (tela e texto copiado). | — |
| Q3 | ✅ **Decidido (2026-11-13): `er`.** | — |
| Q4 | Usar `ü` (fora da ortografia atual, mas conhecido) para `y`/`ʏ`? | Sim |
| Q5 | `ɛ̃` como `ẽ` (raro no PT) ou `ém`/`ã`? | `ẽ` |
| Q6 | `ð` como `dh` (destacado) ou `d`? | `dh` |
| Q7 | O `ʁ` francês/alemão deve ser destacado, dado que o r forte carioca é parecido? | Destacar |
| Q8 | No espanhol, destacar `β` (b suave)? | Não destacar |
| Q9 | Em frases em inglês, usar formas fracas (`to` → `tâ`) ou sempre a forma de citação (`TU`)? | Fracas, para uma lista fechada de palavras funcionais |
| Q10 | Como representar os tons do mandarim (números, setas, cores)? | Decidir na T5.7 |
| Q11 | Vogal longa do japonês: dobrar (`tôo`) ou usar um sinal (`tô:`)? | Dobrar |
| Q12 | A anti-nasalização vale só em sílaba tônica? | Sim |
| Q13 | Coreano: consoante dobrada para tensas e letra simples destacada para aspiradas é compreensível? | Sim, com dica |

## 10. Contrato com o motor (para a T3.1)

Cada palavra convertida deve expor, no mínimo:

```ts
interface Syllable {
  text: string;          // grafia já com maiúsculas e acentos (sem "·")
  stressed: boolean;
  segments: { text: string; ipa: string; special: boolean }[]; // special = 🟧
}
interface ConvertedWord {
  original: string;
  ipa: string;
  syllables: Syllable[];            // silabada = join("·"); corrida = join("")
  traps: TrapId[];                  // seção 5.3 → dicas contextuais
  origin: 'dictionary' | 'estimated';
  source?: string;                  // ex.: "CMUdict"
  variants?: string[];              // outras pronúncias (IPA)
}
```

A forma corrida é **sempre** a concatenação das sílabas. Nenhuma regra pode depender da forma de exibição (princípio 5).
