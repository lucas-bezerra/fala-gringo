# Silabação e tônica — medição (T3.4)

> Gerado por `pnpm --filter @falagringo/engine syllables-eval`. Não edite à mão. Regras em [src/ipa/syllabify.ts](src/ipa/syllabify.ts).

## Fronteiras de sílaba (ataque máximo × "." da fonte)

Pronúncias principais, de uma palavra, que trazem "." da fonte e o mesmo número de sílabas nos dois lados. Acerto = todas as fronteiras iguais.

| Idioma | Palavras | Acerto |
|---|---|---|
| en-GB | 4.431 | **71.1%** |
| en-US | 21 | **76.2%** |
| fr-FR | 15 | **86.7%** |
| it-IT | 12.760 | **99.8%** |
| ko-KR | 2 | **100.0%** |
| nl-NL | 114.398 | **75.1%** |
| zh-CN | 1 | **100.0%** |

**Como ler:**
- **en-GB / en-US:** o inglês ignora o "." da fonte DE PROPÓSITO. O Wiktionary segue a convenção de Wells (consoante na sílaba tônica de vogal breve: "ˈæb.ə"), o CMUdict e o Britfone não têm pontos; o motor usa sempre o ataque máximo ("ˈæ.bə", como o brasileiro lê). A linha mede o quanto as duas convenções divergem, não um erro.
- **nl-NL:** os erros que sobram são fronteiras de palavras compostas ("aal|elger", "aagt|appel"), que só a morfologia resolve. Na prática o holandês sempre traz "." da fonte, e a regra só entra quando ele falta.
- Encontro inicial = obstruinte (ou nasal antes de semivogal) + líquida/semivogal. Entre vogais, s + consoante NÃO abre sílaba (italiano 95,5% → 99,8% ao retirar essa permissão); exceção: ʃ + oclusiva no alemão (be·stimmt, Ge·spräch), não mensurável aqui porque o alemão não traz pontos.

Primeiros erros por idioma:

- **en-GB:** abba /ˈæb.ə/; abbess /ˈæb.ɪs/; abbotcies /ˈæb.ət.sis/; abbotcy /ˈæb.ət.si/; Abernant /ˈæb.ə.nənt/; abo /ˈæb.əʊ/
- **en-US:** Blennerhasset /ˈblɛn.ər.hæs.ɪt/; Blickling /ˈblɪk.lɪŋ/; Bloomsbury /ˈbluːmz.bɛr.i/; Bolingbroke /ˈbɒl.ɪŋ.brʊk/; Bollington /ˈbɒl.ɪŋ.tən/
- **fr-FR:** Grand Est /ɡʁɑ̃.t‿ɛst/; Noble-Contrée /nɔb.l‿kɔ̃.tʁe/
- **it-IT:** angli /ˈan.ʎi/; apside /ˈa.psi.de/; brainrot /ˈbrɛn.rot/; Burgenland /ˈbur.d͡ʒen.land/; capsa /ˈka.psa/; capsae /ˈka.pse/
- **ko-KR:** 
- **nl-NL:** a-al-tolletje /aː.ˈɑl.tɔ.lə.tjə/; a-godsdienstig /aː.ɣɔdz.ˈdiːn.stəx/; A-omroep /ˈaː.ɔm.ruːp/; A-status /aː.ˈstaː.tʉs/; aagtappel /ˈaːxt.ɑ.pəl/; aalbessestruik /ˈaːl.bɛ.sə.strœyk/
- **zh-CN:** 

## Tônica por regra (quando a fonte não marca)

Pronúncias principais polissílabas COM tônica marcada: apaga-se a marca, aplica-se a regra e compara-se. As colunas seguintes mostram quanto acertaria cada regra fixa — base para escolher a regra de cada idioma.

| Idioma | Palavras | Regra atual | Sempre a 1ª | Sempre a penúltima | Sempre a última |
|---|---|---|---|---|---|
| de-DE | 686.654 | **66.3%** | 60.3% | 23.6% | 4.0% |
| en-GB | 36.461 | **69.7%** | 54.4% | 53.0% | 9.2% |
| en-US | 109.751 | **78.9%** | 67.7% | 65.3% | 7.2% |
| es-419 | 10 | **90.0%** | 30.0% | 80.0% | 10.0% |
| es-ES | 10 | **90.0%** | 30.0% | 80.0% | 10.0% |
| fr-FR | 5 | **100.0%** | 0.0% | 0.0% | 100.0% |
| it-IT | 84.425 | **69.5%** | 15.1% | 69.5% | 5.3% |
| nl-NL | 114.403 | **70.4%** | 62.6% | 34.6% | 9.6% |
| sv-SE | 18.598 | **68.7%** | 68.7% | 52.7% | 15.0% |

**Regras adotadas (escolhidas por esta medição):**
- **Inglês:** sufixos pela grafia (-tion/-ic → sílaba anterior; -ity/-ical → antepenúltima; -ee/-esque → última) + 1ª sílaba não reduzida. Era 67,7% (en-US) e 54,4% (en-GB) com "sempre a 1ª".
- **Alemão, holandês, sueco:** 1ª sílaba não reduzida (pula be-/ge-/ver-, a-).
- **Italiano:** penúltima. **Francês:** última. **Espanhol:** ortografia (acento gráfico; senão terminada em vogal/n/s → penúltima, senão última) — a amostra com tônica marcada é pequena (só o Wikidata) e o único erro é um dado errado da fonte ("Cuidad de Roxas" /ˈroxas/); a regra é coberta por testes unitários.
- Nos idiomas com tônica marcada na fonte (en, de, it, nl, sv), a regra só entra para as palavras sem marca; o motor informa `stress: 'rule'` para a interface sinalizar confiança menor.

Primeiros erros da regra atual:

- **de-DE:** 0,2-Liter-Flasche /nʊlkɔmat͡svaɪ̯ˈliːtɐˌflaʃə/; 0,2-Liter-Flaschen /nʊlkɔmat͡svaɪ̯ˈliːtɐˌflaʃn̩/; 0,33-Liter-Flasche /nʊlkɔmadʁaɪ̯dʁaɪ̯ˈliːtɐˌflaʃə/; 0,33-Liter-Flaschen /nʊlkɔmadʁaɪ̯dʁaɪ̯ˈliːtɐˌflaʃn̩/; 0,5-Liter-Flasche /nʊlkɔmafʏnfˈliːtɐˌflaʃə/; 0,5-Liter-Flaschen /nʊlkɔmafʏnfˈliːtɐˌflaʃn̩/
- **en-GB:** 's-Hertogenbosch /ˌsɜːtəʊɡənˈbɒs/; /tttt/ /ˌtiːˌtiːˌtiːˈtiː/; 101 /ˌwʌnəʊˈwʌn/; 10Xer /ˌtɛnˈɛks.ə/; 1984 /ˌnaɪn.tiːnˌeɪ.tiˈfɔː/; 1984-ish /ˌnʌɪntiːneɪtiˈfɔːɹɪʃ/
- **en-US:** a.d. /ˌeɪˈdi/; a.m. /ˌeɪˈɛm/; aaa /ˌtɹɪpəˈleɪ/; aaliyah /ˌɑˈliˌɑ/; aalsmeer /ˈɑlsmɪɹ/; aardema /ɑɹˈdɛmə/
- **es-419:** Cuidad de Roxas /ˈroxas/
- **es-ES:** Cuidad de Roxas /ˈroxas/
- **fr-FR:** 
- **it-IT:** 'ndrangheta /nˈdran.ɡe.ta/; 'ndranghete /ˈndran.ɡe.te/; 112 /ˌt͡ʃɛn.toˈdɔ.di.t͡ʃi/; abaca /ˈa.ba.ka/; abaco /ˈa.ba.ko/; Abacuc /a.baˈkuk/
- **nl-NL:** a-al-tolletje /aː.ˈɑl.tɔ.lə.tjə/; a-capella-koor /aː.kaː.ˈpɛ.laː.koːr/; a-christelijk /aː.ˈkrɪs.tə.lək/; a-godsdienstig /aː.ɣɔdz.ˈdiːn.stəx/; a-literair /aː.liː.tə.ˈrɛːr/; a-litterair /aː.liː.tə.ˈrɛːr/
- **sv-SE:** a conto /akˈɔnːtʊ/; abbedissa /²abɛdˈɪsːa/; abbé /abˈeː/; abc /ɑːbeːsˈeː/; ABC-stridsmedel /²ɑːbeːsˈeːstrɪtsmeːdɛl/; abdikera /abdɪkˈeːra/
