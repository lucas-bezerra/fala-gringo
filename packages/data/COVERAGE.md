# Cobertura do dicionário (T2.8)

> Gerado por `pnpm --filter @falagringo/data coverage` em 2026-11-13 (dataVersion `08879347ecf9`). Não edite à mão.

Base: as 10.000 palavras mais frequentes de legendas de cada idioma ([FrequencyWords](https://github.com/hermitdave/FrequencyWords), OpenSubtitles 2018, CC BY-SA 4.0 — uso só para medir; a lista não é distribuída).

| Idioma | Palavras no dicionário | Top 1.000 presentes | Top 10.000 presentes | **Uso coberto*** | Uso coberto com tônica resolvida** |
|---|---|---|---|---|---|
| de-DE | 789.141 | 98.1% | 88.9% | **98.1%** | 99.8% |
| en-GB | 85.582 | 98.1% | 92.7% | **97.5%** | 99.8% |
| en-US | 126.313 | 98.1% | 97.5% | **96.5%** | 100.0% |
| es-419 | 131.057 | 90.2% | 65.8% | **86.0%** | 47.0% |
| es-ES | 131.071 | 90.2% | 65.8% | **86.0%** | 47.0% |
| fr-FR | 84.444 | 90.4% | 66.3% | **93.3%** | 77.7% |
| it-IT | 85.991 | 88.0% | 65.4% | **89.5%** | 99.9% |
| ko-KR | 62.449 | 38.6% | 20.0% | **44.5%** | 42.4% |
| nl-NL | 117.878 | 76.6% | 59.1% | **84.8%** | 100.0% |
| sv-SE | 21.099 | 72.3% | 44.7% | **82.6%** | 99.6% |

\* Fração das ocorrências (ponderada pela frequência) das 10.000 palavras mais usadas que está no dicionário.
\*\* Dentro do uso coberto: tônica marcada, emprestada ou monossílaba. Espanhol e francês ficam baixos de propósito — a tônica deles vem por regra (T3.4); japonês e coreano não têm tônica.

Japonês fica de fora: a FrequencyWords não tem lista de japonês (as legendas não vêm segmentadas em palavras).

Listas de legendas incluem nomes, interjeições e grafias informais; parte das ausências é ruído da lista, não lacuna do dicionário. Primeiras ausências por idioma:

- **de-DE:** ok, mr., dr., s., mrs., the, captain, jack
- **en-GB:** 't, didn, mr., doesn, isn, wasn, wouldn, couldn
- **en-US:** 't, 're, 'll, 've, 'd, didn, doesn, isn
- **es-419:** de, a, o, quieres, podría, sr., días, necesito
- **es-ES:** de, a, o, quieres, podría, sr., días, necesito
- **fr-FR:** est-ce, son, peut-être, quelqu', ok, m., désolée, tué
- **it-IT:** del, c', della, mia, piu, cosi, d', delle
- **ko-KR:** 거야, 있어, 어떻게, 할, 있어요, 우리가, 그게, 네가
- **nl-NL:** is, zou, ga, had, gaat, zal, hebt, denk
- **sv-SE:** har, de, vet, gör, okej, alla, sa, nåt
