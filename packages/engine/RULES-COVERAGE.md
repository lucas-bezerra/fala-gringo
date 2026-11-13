# Cobertura das regras (T3.5)

> Gerado por `pnpm --filter @falagringo/engine rules-coverage`. Não edite à mão. Regras em [src/rules/](src/rules/).

Todas as pronúncias mescladas passaram pela fonologia completa (parser → sílabas → regras). **Coberto** = o som caiu em alguma regra; o resto saiu pelo reserva (a base, destacada).

| Idioma | Pronúncias | Sons | Coberto | Sem regra | Tempo médio por pronúncia |
|---|---|---|---|---|---|
| de-DE | 843.949 | 8.390.899 | **100.000%** | 0 | 0.051 ms |
| en-GB | 102.451 | 704.821 | **99.999%** | 5 | 0.035 ms |
| en-US | 135.433 | 865.255 | **100.000%** | 0 | 0.033 ms |
| es-419 | 131.975 | 1.183.708 | **100.000%** | 0 | 0.044 ms |
| es-ES | 132.017 | 1.184.578 | **100.000%** | 0 | 0.044 ms |
| fr-FR | 96.241 | 657.498 | **100.000%** | 0 | 0.033 ms |
| it-IT | 95.117 | 848.149 | **100.000%** | 0 | 0.041 ms |
| ja-JP | 233.056 | 2.059.816 | **100.000%** | 0 | 0.047 ms |
| ko-KR | 66.627 | 556.239 | **100.000%** | 0 | 0.046 ms |
| nl-NL | 118.137 | 1.086.780 | **100.000%** | 0 | 0.048 ms |
| sv-SE | 21.757 | 153.914 | **100.000%** | 0 | 0.038 ms |
| zh-CN | 3 | 18 | **100.000%** | 0 | 0.085 ms |

## Sons sem regra

- **en-GB:** `ə͡l` ×4 (Abeloite /ˈe͡ɪbə͡lˌɔ͡ɪt/); `t͡j` ×1 (Vistula /ˈvɪst͡jʊlə/)

