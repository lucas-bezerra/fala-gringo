# Inventário de sons por idioma (T3.3)

> Gerado por `pnpm --filter @falagringo/engine inventory` a partir de `packages/data/build/merged`. Não edite à mão.

Cada pronúncia mesclada foi analisada pelo parser de IPA ([src/ipa/parse.ts](src/ipa/parse.ts)), com os agrupamentos do idioma (africadas e ditongos). **Ida e volta** = remontar os tokens devolve exatamente o IPA original. Este inventário é a lista que as regras de conversão (T3.5–T3.6 e Fase 5) precisam cobrir.

| Idioma | Pronúncias | Ida e volta | Vogais distintas | Consoantes distintas | Sons raros (< 20) | "Outro" | Tons |
|---|---|---|---|---|---|---|---|
| de-DE | 843.949 | ✅ 100% | 69 | 53 | 48 | 3 | 0 |
| en-GB | 102.451 | ✅ 100% | 48 | 38 | 30 | 4 | 0 |
| en-US | 135.433 | ✅ 100% | 24 | 25 | 6 | 0 | 0 |
| es-419 | 131.975 | ✅ 100% | 13 | 25 | 7 | 0 | 0 |
| es-ES | 132.017 | ✅ 100% | 13 | 26 | 7 | 0 | 0 |
| fr-FR | 96.241 | ✅ 100% | 13 | 25 | 2 | 0 | 0 |
| it-IT | 95.117 | ✅ 100% | 13 | 34 | 15 | 1 | 1 |
| ja-JP | 233.056 | ✅ 100% | 9 | 22 | 0 | 0 | 0 |
| ko-KR | 66.627 | ✅ 100% | 12 | 30 | 1 | 0 | 0 |
| nl-NL | 118.137 | ✅ 100% | 19 | 26 | 3 | 0 | 0 |
| sv-SE | 21.757 | ✅ 100% | 17 | 26 | 4 | 0 | 12587 |
| zh-CN | 3 | ✅ 100% | 4 | 7 | 11 | 0 | 4 |

## de-DE

**Vogais:** `ə` 682.528 · `a` 423.421 · `ɪ` 263.043 · `ɛ` 240.140 · `i` 201.101 · `ɐ` 179.420 · `ʊ` 140.351 · `aɪ` 129.279 · `o` 128.316 · `e` 104.881 · `u` 103.751 · `ɔ` 92.160 · `aʊ` 80.762 · `ɛɐ` 58.322 · `ʏ` 44.521 · `y` 39.317 · `iɐ` 29.636 · `ɔɪ` 26.719 · `ø` 17.542 · `oɐ` 15.827 · `eɐ` 14.436 · `œ` 14.225 · `aɐ` 10.865 · `uɐ` 4.526 · `yɐ` 2.569 · `øɐ` 1.949 · `ɑ` 1.771 · `ɛɪ` 1.571 · `ɔʊ` 492 · `œɐ` 369 · `ɔɐ` 254 · `æ` 225 · `ɔʏ` 190 · `au` 148 · `ɪɐ` 104 · `eɪ` 53 · `ʌ` 48 · `ʊɐ` 29 · `ʊɪ` 20 · `ʉ` 20 · `oʊ` 18 · `ɪə` 16 · `ɨ` 12 · `ɒ` 12 · `æɪ` 11 · `ʊə` 10 · `ai` 9 · `ʏɐ` 9 · `iə` 9 · `ɘ` 8 · `yə` 8 · `əʊ` 8 · `ɑɐ` 7 · `œɪ` 7 · `oɪ` 7 · `ei` 6 · `iɑ` 6 · `oa` 6 · `eu` 5 · `ui` 5 · `ɚ` 5 · `ɜ` 3 · `ɤ` 3 · `oʏ` 2 · `ɛi` 2 · `aa` 1 · `ɛə` 1 · `əu` 1 · `ɯ` 1

**Consoantes:** `n` 737.789 · `t` 733.437 · `ʁ` 478.814 · `s` 422.457 · `l` 378.022 · `k` 269.154 · `m` 255.908 · `d` 237.510 · `f` 236.273 · `ɡ` 206.770 · `ʃ` 203.482 · `b` 189.826 · `t͡s` 176.893 · `p` 161.695 · `v` 125.487 · `z` 113.748 · `h` 98.955 · `ç` 92.029 · `ŋ` 71.165 · `ʔ` 58.244 · `x` 43.610 · `p͡f` 16.453 · `j` 11.531 · `t͡ʃ` 10.615 · `ʒ` 2.508 · `d͡ʒ` 1.342 · `r` 1.204 · `w` 329 · `χ` 117 · `ɱ` 106 · `θ` 81 · `ɹ` 81 · `ʀ` 47 · `ð` 23 · `ɬ` 13 · `ɫ` 12 · `ɾ` 12 · `d͡z` 9 · `ʎ` 9 · `ɲ` 6 · `ʕ` 4 · `ʈ` 4 · `ɣ` 4 · `ɸ` 4 · `ʂ` 3 · `ħ` 3 · `ʋ` 3 · `ɥ` 2 · `ɕ` 2 · `ɺ` 2 · `ʙ` 1 · `ɦ` 1 · `ɓ` 1

**Traços:** long 558.155 · syllabic 242.864 · nonSyllabic 23.793 · nasal 2.904 · voiceless 606 · apical 61 · raised 35 · extraShort 21 · aspirated 20 · halfLong 9 · palatalized 6 · dental 2 · unreleased 2 · uvularized 2 · lowered 2 · velarized 1

**Sons raros (< 20 ocorrências — em geral palavras estrangeiras ou erro da fonte):** `oʊ` (Backbone /ˈbɛkˌboʊ̯n/); `ɪə` (queer /kwɪə̯/); `ɬ` (hleban /ˈɬɛːɓan/); `ɫ` (Andorra la Vellas /anˈdɔʁa ɫa ˈveʎas/); `ɨ` (Białystok /bʲaˈwɨstɔk/); `ɾ` (Burúshaski /buˈɾuɕaski/); `ɒ` (Connacht /ˈkɒnɔːt/); `æɪ` (eingenachtet /ˈæɪ̯nɡe̝ˌnaxte̝t/); `ʊə` (mooresche Gesetz /ˌmʊə̯ʃə ɡəˈzɛt͡s/); `d͡z` (Abbelkrotze /ˈabl̩ˌɡʁɔd͡zə/); `ai` (Achaikus /aˈxaːi̯kʊs/); `ʎ` (Andorra la Vellas /anˈdɔʁa ɫa ˈveʎas/); `ʏɐ` (Betonstürze /betɔŋʃtʏɐ̯t͡sə/); `iə` (dienten /ˈdiə̯ntn̩/); `ɘ` (Bundesgerichtsgebäude /bʊndɘsɡɘˌrɪçt͡s.ɡeˈbœɪ̯də/); `yə` (Büezer /ˈbyə̯t͡sər/); `əʊ` (Chisinau /ˌkiʃiˈnəʊ̯/); `ɑɐ` (Apartment /əˈpɑːɐ̯tmənt/); `œɪ` (Bundesgerichtsgebäude /bʊndɘsɡɘˌrɪçt͡s.ɡeˈbœɪ̯də/); `oɪ` (oikotypisch /oɪ̯koˈtyːpɪʃ/); `ei` (Anhui /anxu̯ei̯/); `ɲ` (Avignon /aviˈɲɔ̃/); `iɑ` (griechisch-uniert /ˈɡʁiːçɪʃʔuˈniːɑ̯t/); `oa` (Hoatzin /ˈhoːa̯t͡sɪn/); `eu` (Ceuta /ˈθeu̯ta/); `ui` (Saarlouis /ˌzaːɐ̯ˈlui̯/); `ɚ` (Vancouver /vænˈkuːvɚ/); `ʕ` (Baal /baˈʕaːl/); `ʈ` (Jiu Jitsu /ʒiuʒiʈsu/); `ɣ` (Nijmegen /ˈnɛi̯meːɣə/); `ɸ` (Taumatawhakatangihangakoauauotamateaturipukakapikimaungahoronukupokaiwhenuakitanatahu /tɐʉmɐtɐ.ɸɐkɐtɐŋihɐŋɐ.koːɐʉɐʉ.ɔ.tɐmɐtɛɐ.tʉɾi.pʉkɐkɐ.piki.mɐʉŋɐ.hɔɾɔ.nʉkʉ.pɔkɐi.ɸɛnʉɐ.ki.tɐnɐ.tɐhʉ/); `ɜ` (angekündigt /ˈanɡɜˌkyndikt/); `ɤ` (Feng Shui /fɤŋ ʂu̯eɪ̯/); `ʂ` (Feng Shui /fɤŋ ʂu̯eɪ̯/); `ħ` (Kahba /kaħbɐ/); `ʋ` (Schwanzmeise /ʃʋant͡smaɪ̯zə/); `ɥ` (Bruay-la-Buissiere /brylabɥˈsjɛːr/); `ɕ` (Burúshaski /buˈɾuɕaski/); `oʏ` (goil /ɡoʏ̯l/); `ɺ` (Hascherl /ˈhɑʃɐɺl/); `ɛi` (Nijmegen /ˈnɛi̯meːɣə/); `aa` (Ars /aːa̯s/); `ɛə` (Basseterre /bæsˈtɛə̯/); `ʙ` (brr /ʙ̩ː/); `əu` (Chișinău /ˌkiʃiˈnəu̯/); `ɦ` (Den Haag /dɛnˈɦaːx/); `ɓ` (hleban /ˈɬɛːɓan/); `ɯ` (nu wor /nɯˈvɔʶː/)
**"Outro" (não é som nem marca):** `̩` ×2 (früher oder später /ˈfʁyːɐ ̩ˌoːdɐ ˈʃpɛːtɐ/); `ː` ×1 (präter- /pʁɛˈː.teː.ʁ/)

## en-GB

**Vogais:** `ə` 65.935 · `ɪ` 50.726 · `i` 29.301 · `ɛ` 18.544 · `æ` 17.330 · `eɪ` 12.851 · `ɒ` 12.686 · `əʊ` 11.356 · `aɪ` 10.574 · `u` 9.280 · `ɑ` 9.149 · `ʌ` 8.480 · `ɔ` 6.945 · `ɜ` 4.258 · `ʊ` 3.183 · `a` 2.372 · `ɪə` 2.323 · `oʊ` 2.147 · `aʊ` 2.078 · `ɛə` 1.654 · `ɔɪ` 1.084 · `ʊə` 1.080 · `e` 228 · `o` 132 · `eə` 55 · `ɨ` 29 · `ʌɪ` 25 · `ɐ` 22 · `ɵʊ` 19 · `ᵻ` 13 · `ʉ` 9 · `iə` 7 · `ɵ` 6 · `œ` 5 · `y` 5 · `ᵿ` 4 · `ɪʊ` 4 · `uʊ` 3 · `ø` 3 · `ʏ` 2 · `ɘ` 2 · `ʊu` 2 · `əɪ` 2 · `ɑɪ` 1 · `ɔʊ` 1 · `iɛ` 1 · `ɛɪ` 1 · `æʊ` 1

**Consoantes:** `n` 48.440 · `t` 43.816 · `s` 41.587 · `l` 38.343 · `k` 35.296 · `ɹ` 34.888 · `d` 24.668 · `m` 24.152 · `p` 19.808 · `b` 15.828 · `z` 12.796 · `f` 12.713 · `ɡ` 9.924 · `v` 8.677 · `ʃ` 8.158 · `j` 7.044 · `ŋ` 6.654 · `w` 6.394 · `d͡ʒ` 6.284 · `h` 5.678 · `t͡ʃ` 3.823 · `θ` 3.298 · `ð` 913 · `ʒ` 838 · `r` 637 · `ʍ` 113 · `ʔ` 51 · `x` 50 · `t͡s` 8 · `ʁ` 5 · `ə͡l` 4 · `ç` 4 · `c` 3 · `ɾ` 3 · `q` 2 · `ɬ` 1 · `ɻ` 1 · `t͡j` 1

**Traços:** long 38.639 · syllabic 1.349 · nasal 160 · extraShort 28 · lowered 25 · aspirated 8 · nonSyllabic 6 · centralized 3 · schwaRelease 3 · raised 3 · palatalized 2 · retracted 1 · halfLong 1

**Sons raros (< 20 ocorrências — em geral palavras estrangeiras ou erro da fonte):** `ɵʊ` (anglo /ˈæŋ.ɡlɵʊ̯/); `ᵻ` (alacrity /əˈlakrᵻti/); `ʉ` (bluey /ˈblʉː.iː/); `t͡s` (mozzetta /mɔːtˈt͡sɛtə/); `iə` (Adelphians /ɐdˈɛlfi͡ənz/); `ɵ` (Cenozoic /ˌsɛnɵˈzəʊɪk/); `ʁ` (au revoir /o.ʁə ˈvwaʁ/); `œ` (danseur noble /dɑ̃ːˈsœɹ ˌnɔːbl/); `y` (Debussy /dəbyˈsiː/); `ə͡l` (Abeloite /ˈe͡ɪbə͡lˌɔ͡ɪt/); `ᵿ` (actually /ˈækʃᵿli/); `ɪʊ` (ew /ɪʊ̯/); `ç` (gemütlich /ɡəˈmyːtlɪç/); `uʊ` (clew /kluʊ̯/); `c` (Coombe /cuːm/); `ɾ` (cringeworthy /ˈkɾɪnd͡ʒˌweːði/); `ø` (Eötvös /ˈøtvøʃ/); `ʏ` (abune /əˈbʏn/); `ɘ` (oppugnances /ɘˈpʌɡnənsɪz/); `q` (quadraphonic /ˌqwɒdɹəˈfɒnɪk/); `ʊu` (stupefaction /ˌstjʊu̯pəˈfækʃən/); `əɪ` (uranium /ˌjyː.ˈɹəɪ̯.nɪ̝.əm/); `ɑɪ` (antialiasing /æntɑɪ̯eɪliəsɪŋ/); `ɔʊ` (dolehead /dɔʊ̯lhɛd/); `iɛ` (earworm /ˈiɛ̯weːm/); `ɛɪ` (flocculation /ˌflɒkjʊˈlɛɪ̯ʃən/); `æʊ` (founders /ˈfæʊ̯ndəːs/); `ɬ` (Gwersyllt /ˈɡwɛəsɪɬt/); `ɻ` (Iranicist /ɪəɻɔːnɪsɪst/); `t͡j` (Vistula /ˈvɪst͡jʊlə/)
**"Outro" (não é som nem marca):** `(` ×1 (academic quarter /ˌækəˈdɛmɪk ˈkwɔːtə(r/); `-` ×1 (orange /ˈ-ənd͡ʒ/); `̩` ×2 (preproparoxytone /̩pɹiːpɹəʊpəˈɹɒksɪtəʊn/)

## en-US

**Vogais:** `ə` 63.420 · `ɪ` 50.553 · `i` 35.229 · `ɛ` 27.765 · `ɑ` 25.351 · `ɚ` 23.971 · `æ` 22.124 · `oʊ` 19.404 · `eɪ` 13.794 · `ɔ` 11.578 · `aɪ` 11.559 · `u` 10.011 · `ʌ` 8.034 · `ɝ` 5.195 · `aʊ` 3.388 · `ʊ` 2.354 · `ɔɪ` 1.312 · `ɒ` 23 · `ɜ` 17 · `a` 5 · `ɨ` 2 · `o` 1 · `ai` 1 · `ɘ` 1

**Consoantes:** `n` 61.395 · `s` 50.577 · `l` 50.127 · `t` 49.186 · `ɹ` 46.521 · `k` 43.229 · `d` 32.654 · `m` 29.840 · `z` 28.276 · `b` 21.541 · `p` 20.042 · `f` 13.987 · `ɡ` 13.731 · `v` 10.851 · `ŋ` 10.005 · `h` 9.407 · `w` 9.027 · `ʃ` 8.835 · `d͡ʒ` 6.415 · `j` 5.284 · `t͡ʃ` 4.978 · `θ` 2.947 · `ð` 589 · `ʒ` 574 · `r` 145

**Traços:** long 156 · breathyAspirated 1 · dental 1 · centralized 1 · nonSyllabic 1

**Sons raros (< 20 ocorrências — em geral palavras estrangeiras ou erro da fonte):** `ɜ` (Boerne /ˈbɜːrni/); `a` (David Eirwyn Morgan /ˈairwɪn/); `ɨ` (DeVry University /dəˈvraɪ junɨˈvɝsəti/); `o` (Jordan Peterson /ˈd͡ʒoɹdən bəɹnt ˈpitəɹsən/); `ai` (United Kingdom /jʊ̈nai̯tɘd kɪŋɡdə̯m/); `ɘ` (United Kingdom /jʊ̈nai̯tɘd kɪŋɡdə̯m/)

## es-419

**Vogais:** `a` 183.958 · `e` 112.559 · `o` 110.675 · `i` 78.624 · `u` 22.414 · `ei` 2.083 · `au` 1.962 · `ai` 1.811 · `eu` 625 · `oi` 611 · `ou` 114 · `ɛ` 1 · `ɑ` 1

**Consoantes:** `s` 112.753 · `ɾ` 76.818 · `n` 68.754 · `t` 62.357 · `d` 61.615 · `l` 47.296 · `k` 43.276 · `m` 39.687 · `b` 35.339 · `p` 26.389 · `ɡ` 19.571 · `j` 18.637 · `f` 12.953 · `r` 12.276 · `x` 9.478 · `ʝ` 6.487 · `w` 6.293 · `t͡ʃ` 5.355 · `ɲ` 2.614 · `ʃ` 290 · `ŋ` 9 · `ɣ` 9 · `β` 8 · `ð` 5 · `z` 1

**Traços:** raised 325 · long 3

**Sons raros (< 20 ocorrências — em geral palavras estrangeiras ou erro da fonte):** `ŋ` (balconing /balkoniŋ/); `ɣ` (Cabucgayan /kaβuɣˈɣajan/); `β` (Cabangan /kaˈβaŋɡan/); `ð` (Alfredo Alcón /alˈfɾeðo alˈkon/); `ɛ` (Chichén Itzá /tʃiːˈtʃɛn iːˈtsɑː/); `ɑ` (Chichén Itzá /tʃiːˈtʃɛn iːˈtsɑː/); `z` (Sergio Osmeña /ˈseɾxjo ozˈmeɲa/)

## es-ES

**Vogais:** `a` 184.010 · `e` 112.601 · `o` 110.691 · `i` 78.642 · `u` 22.416 · `ei` 2.082 · `au` 1.962 · `ai` 1.811 · `eu` 626 · `oi` 611 · `ou` 114 · `ɛ` 1 · `ɑ` 1

**Consoantes:** `s` 87.562 · `ɾ` 76.839 · `n` 68.778 · `t` 62.373 · `d` 61.623 · `l` 47.304 · `k` 43.291 · `m` 39.691 · `b` 35.344 · `p` 26.408 · `θ` 25.792 · `ɡ` 19.570 · `j` 18.644 · `f` 12.958 · `r` 12.276 · `x` 9.480 · `ʝ` 6.488 · `w` 6.295 · `t͡ʃ` 5.357 · `ɲ` 2.613 · `ʃ` 290 · `ɣ` 10 · `ŋ` 10 · `β` 8 · `ð` 5 · `z` 1

**Traços:** raised 324 · long 3

**Sons raros (< 20 ocorrências — em geral palavras estrangeiras ou erro da fonte):** `ɣ` (Aleix García Serrano /aˈleʃ ɣaɾˈθi.a/); `ŋ` (balconing /balkoniŋ/); `β` (Cabangan /kaˈβaŋɡan/); `ð` (Alfredo Alcón /alˈfɾeðo alˈkon/); `ɛ` (Chichén Itzá /tʃiːˈtʃɛn iːˈtsɑː/); `ɑ` (Chichén Itzá /tʃiːˈtʃɛn iːˈtsɑː/); `z` (Sergio Osmeña /ˈseɾxjo ozˈmeɲa/)

## fr-FR

**Vogais:** `a` 59.763 · `i` 48.644 · `e` 43.206 · `ɔ` 40.135 · `ɛ` 32.531 · `ɑ` 22.144 · `y` 12.054 · `ə` 8.187 · `u` 7.216 · `o` 5.636 · `œ` 2.736 · `ø` 2.202 · `ɪ` 1

**Consoantes:** `ʁ` 64.618 · `t` 39.838 · `s` 37.813 · `l` 28.719 · `k` 26.456 · `m` 23.025 · `j` 19.767 · `n` 19.689 · `p` 18.642 · `d` 17.565 · `b` 14.463 · `z` 13.091 · `f` 10.964 · `v` 8.943 · `ɡ` 8.845 · `ʒ` 7.936 · `ʃ` 4.909 · `w` 3.648 · `ɥ` 1.694 · `ɲ` 1.530 · `d͡ʒ` 401 · `t͡ʃ` 277 · `ŋ` 172 · `r` 37 · `h` 1

**Traços:** nasal 36.903 · long 75 · dental 1

**Sons raros (< 20 ocorrências — em geral palavras estrangeiras ou erro da fonte):** `h` (hôpital de Sierre /hɔ.pi.tal də sjɛʁ/); `ɪ` (Sayabec /seɪbɛk/)

## it-IT

**Vogais:** `a` 101.277 · `i` 86.398 · `o` 72.144 · `e` 68.909 · `u` 14.720 · `ɛ` 14.051 · `ɔ` 11.255 · `ø` 30 · `y` 19 · `ə` 8 · `ɪ` 3 · `ia` 3 · `ɪo` 1

**Consoantes:** `r` 67.490 · `t` 64.841 · `n` 50.019 · `l` 37.887 · `k` 36.896 · `s` 35.612 · `m` 25.712 · `d` 24.066 · `p` 22.993 · `b` 14.846 · `j` 14.018 · `f` 13.375 · `v` 12.654 · `t͡ʃ` 10.657 · `ɡ` 9.724 · `z` 8.411 · `d͡ʒ` 7.553 · `t͡s` 5.408 · `w` 4.674 · `ʎ` 3.268 · `ʃ` 3.188 · `d͡z` 3.007 · `ɲ` 2.934 · `ʒ` 46 · `x` 14 · `ɾ` 14 · `h` 10 · `ŋ` 6 · `ɹ` 2 · `ʔ` 2 · `ʀ` 1 · `ʋ` 1 · `ɟ` 1 · `θ` 1

**Traços:** long 28 · centralized 20 · lowered 5 · nasal 1 · extraShort 1

**Sons raros (< 20 ocorrências — em geral palavras estrangeiras ou erro da fonte):** `y` (au-dessus de la mêlée /o.desˈsy dəˈla məˈle/); `x` (chruscioviano /xruʃ.ʃoˈvja.no/); `ɾ` (correre /ˈkoɾe/); `h` (ahah /ˈahah/); `ə` (arbëresh /arbəˈrɛʃ/); `ŋ` (bom /ˈbɔŋ/); `ɪ` (Disney /ˈdɪzni/); `ia` (famiglia /faˈmia̯/); `ɹ` (barbera /baɹˈbɛ.ɹa/); `ʔ` (beh /ˈbɛʔ/); `ʀ` (charme /ˈʃaʀmə/); `ʋ` (discorsività /ˌdiskoɾt͡siʋiˈd̞ä/); `ɟ` (onghia /ˈon.ɟa/); `ɪo` (teoria /tɪ̆o̯ˈria̯/); `θ` (zeppola /ˈθep.po.la/)
**"Outro" (não é som nem marca):** `̥` ×1 (prosciutto /proʒˈ̥ut.to/)

## ja-JP

**Vogais:** `ɯ` 283.035 · `a` 210.677 · `o` 206.257 · `i` 177.105 · `e` 101.038 · `ai` 34.417 · `ei` 25.795 · `ɯi` 6.977 · `oi` 3.793

**Consoantes:** `k` 167.886 · `ɾ` 106.586 · `ɴ` 97.409 · `s` 75.842 · `t` 71.289 · `m` 62.101 · `ɕ` 55.504 · `ɡ` 47.965 · `n` 46.367 · `b` 40.286 · `j` 39.716 · `d` 34.480 · `d͡ʑ` 26.331 · `h` 24.260 · `t͡s` 22.352 · `t͡ɕ` 21.150 · `z` 19.219 · `p` 18.748 · `ɸ` 14.390 · `ɰ` 9.243 · `ç` 9.214 · `v` 384

**Traços:** long 62.512 · compressed 9.248 · lowered 5 · advanced 3 · retracted 2 · voiceless 1

## ko-KR

**Vogais:** `a` 72.816 · `ʌ` 34.747 · `i` 31.035 · `u` 24.178 · `o` 22.874 · `ɯ` 16.834 · `ɛ` 11.384 · `e` 8.296 · `ø` 2.190 · `y` 1.312 · `ɘ` 32 · `ɔ` 1

**Consoantes:** `k` 38.107 · `n` 27.609 · `d` 26.458 · `ŋ` 25.933 · `s` 19.594 · `m` 19.574 · `p` 18.901 · `ɭ` 18.838 · `t͡ɕ` 17.936 · `ɡ` 17.280 · `t` 16.014 · `j` 15.943 · `ɾ` 14.501 · `d͡ʑ` 12.477 · `ɦ` 7.996 · `w` 7.568 · `b` 7.324 · `ɕ` 5.801 · `β` 2.134 · `h` 2.019 · `ɲ` 1.600 · `ɥ` 1.312 · `ɸ` 1.311 · `ʝ` 1.112 · `ç` 900 · `ʎ` 811 · `ɰ` 706 · `x` 609 · `ɣ` 96 · `ʃ` 76

**Traços:** retracted 72.816 · aspirated 43.350 · moreRounded 34.747 · lowered 31.274 · fortis 22.415 · unreleased 20.822 · raised 11.383 · labialized 650 · long 300 · palatalized 1

**Sons raros (< 20 ocorrências — em geral palavras estrangeiras ou erro da fonte):** `ɔ` (개성시 /kɛ.sɔŋ/)

## nl-NL

**Vogais:** `ə` 93.668 · `a` 38.794 · `ɑ` 36.352 · `i` 33.891 · `o` 29.474 · `e` 28.475 · `ɪ` 28.321 · `ɛ` 26.496 · `ɔ` 25.865 · `ɛi` 17.575 · `u` 9.722 · `ʉ` 9.703 · `œy` 6.750 · `y` 6.207 · `ɑu` 3.698 · `ø` 3.140 · `ɒ` 220 · `œ` 20 · `ʊ` 1

**Consoantes:** `r` 96.307 · `t` 90.150 · `s` 71.873 · `l` 59.428 · `n` 49.851 · `k` 46.612 · `d` 31.123 · `m` 30.685 · `p` 30.608 · `x` 29.729 · `b` 23.728 · `v` 20.165 · `f` 17.257 · `ŋ` 17.002 · `ʋ` 16.597 · `ɣ` 14.424 · `z` 14.238 · `h` 13.971 · `j` 10.557 · `ʃ` 1.665 · `ɡ` 1.074 · `ʒ` 866 · `t͡ʃ` 396 · `d͡ʒ` 100 · `ɦ` 1 · `ɾ` 1

**Traços:** long 150.517

**Sons raros (< 20 ocorrências — em geral palavras estrangeiras ou erro da fonte):** `ɦ` (Johannes Diderik van der Waals /joːˈɦɑnəs ˈdidəˌrɪk vɑn dər ʋaːls/); `ʊ` (Joris Luyendijk /ˈjʊːrɪs ˈlœyənˌdɛik/); `ɾ` (Lompret /lˈɔmpɾət/)

## sv-SE

**Vogais:** `a` 13.853 · `ɛ` 12.708 · `ɪ` 7.302 · `e` 3.270 · `ɑ` 2.937 · `ɔ` 2.670 · `ɵ` 2.458 · `i` 1.920 · `u` 1.901 · `ʊ` 1.674 · `o` 1.666 · `ø` 1.496 · `ʉ` 1.306 · `œ` 1.176 · `ʏ` 864 · `y` 558 · `æ` 1

**Consoantes:** `r` 14.867 · `s` 10.390 · `t` 9.964 · `n` 8.533 · `l` 8.145 · `k` 7.112 · `d` 5.238 · `m` 4.470 · `v` 3.961 · `p` 3.751 · `ɡ` 3.573 · `f` 3.361 · `b` 3.077 · `ŋ` 2.116 · `j` 1.903 · `h` 1.391 · `ɧ` 1.211 · `ʂ` 883 · `ʈ` 686 · `ɖ` 545 · `ɕ` 396 · `ɳ` 308 · `ɭ` 249 · `t͡ɕ` 18 · `w` 5 · `x` 1

**Traços:** long 30.339 · centralized 373 · tom:falling 1

**Sons raros (< 20 ocorrências — em geral palavras estrangeiras ou erro da fonte):** `t͡ɕ` (bukspottkörtel /²bˈʉːkspɔtɕœʈːɛl/); `w` (squash /skwɔɧː/); `æ` (Greta Thunberg /ˈɡreːta ˈtʉːnˌbærj/); `x` (telefax /tɛlɛfˈaxː/)

## zh-CN

**Vogais:** `ʊ` 2 · `i` 2 · `ə` 1 · `u` 1

**Consoantes:** `ŋ` 3 · `t͡s` 2 · `t͡ɕ` 2 · `n` 2 · `ʈ` 1 · `ʂ` 1 · `t` 1

**Traços:** aspirated 5 · tom:rising 1 · tom:high 1

**Sons raros (< 20 ocorrências — em geral palavras estrangeiras ou erro da fonte):** `ŋ` (成都市 /ʈʂʰə̌ŋ.tú/); `t͡s` (重庆主城区 /t͡sʰʊŋ˦˨t͡ɕʰin˨˩˧/); `ʊ` (重庆主城区 /t͡sʰʊŋ˦˨t͡ɕʰin˨˩˧/); `t͡ɕ` (重庆主城区 /t͡sʰʊŋ˦˨t͡ɕʰin˨˩˧/); `i` (重庆主城区 /t͡sʰʊŋ˦˨t͡ɕʰin˨˩˧/); `n` (重庆主城区 /t͡sʰʊŋ˦˨t͡ɕʰin˨˩˧/); `ʈ` (成都市 /ʈʂʰə̌ŋ.tú/); `ʂ` (成都市 /ʈʂʰə̌ŋ.tú/); `ə` (成都市 /ʈʂʰə̌ŋ.tú/); `t` (成都市 /ʈʂʰə̌ŋ.tú/); `u` (成都市 /ʈʂʰə̌ŋ.tú/)
