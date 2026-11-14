# Modelos G2P publicados no site (T3.9)

Estimam a pronúncia de palavras **fora do dicionário**. A tela marca o resultado como "estimado". Decisão, números e pendências de governança: [ADR 0004](../../../../docs/adr/0004-modelo-g2p.md).

| Idioma | Treinado com | Licença do modelo | Grafia PT-BR (teste) |
|---|---|---|--:|
| en-US | CMUdict (BSD-2), Wikidata (CC0) | BSD-2 (crédito ao CMUdict) | 74,4% |
| en-GB | Wiktionary/kaikki e WikiPron (CC BY-SA 4.0), Britfone (MIT), Wikidata (CC0) | **CC BY-SA 4.0** | 67,9% |
| de-DE | german-ipa-dict via ipa-dict (CC BY-SA, base Wiktionary), WikiPron, Wikidata; 150 mil palavras sorteadas | **CC BY-SA 4.0** | IPA: 89,8% |

Cada pasta tem:
- `g2p.json`: configuração, vocabulários, índice dos tensores, dados e métricas do treino (a documentação do modelo);
- `g2p.bin`: pesos em float16;
- `fixtures.tsv`: saída do PyTorch, que a inferência em TypeScript tem de reproduzir. O `pnpm test` confere isso.

## Atualizar depois de um treino novo

1. Treine, avalie e exporte com [docs/treino-g2p.md](../../../../docs/treino-g2p.md).
2. Copie `tools/g2p/export/<idioma>/{g2p.json,g2p.bin,fixtures.tsv}` para cá.
3. Rode `pnpm test` (fixtures) e `pnpm --filter @falagringo/engine g2p-eval`, e atualize a tabela acima e a do ADR.
4. O `pnpm dev` e o build publicam os arquivos com nome novo (hash), então o cache do navegador não serve o modelo velho.
