# Modelo G2P — acerto na grafia PT-BR (T3.9)

> Gerado por `pnpm --filter @falagringo/engine g2p-eval`. Não edite à mão. Precisa dos modelos
> (`tools/g2p/export`) e dos dados de teste (`tools/g2p/data`), que ficam fora do git: veja
> [docs/treino-g2p.md](../../docs/treino-g2p.md). Decisão e contexto: [ADR 0004](../../docs/adr/0004-modelo-g2p.md).

Palavras de **teste**, que o modelo nunca viu no treino. A previsão passa pelo motor (como na tela) e conta como
certa se for igual a **alguma** das pronúncias do dicionário, também passadas pelo motor.

- **IPA idêntico:** a transcrição do modelo é igual, caractere a caractere. É a métrica do treino.
- **Grafia PT-BR:** a forma silabada com a tônica em maiúsculas é igual (ex.: `â·KÂM·pâ·nist`). É o que o usuário vê.
- **Sem tônica:** só os sons escritos são iguais (sílabas e tônica ignoradas).
- **ms/palavra:** inferência em TypeScript no Node, nesta máquina. No celular médio, conte ~4× mais.

| Idioma | Palavras | IPA idêntico | Grafia PT-BR | Sem tônica | ms/palavra | Modelo (float16) |
|---|--:|--:|--:|--:|--:|--:|
| en-US | 6.206 | 71.1% | **74.4%** | 76.6% | 34 | 6.3 MB |
| en-GB | 2.893 | 44.2% | **67.9%** | 71.9% | 35 | 6.3 MB |
| fr-FR | 4.165 | 95.7% | **95.8%** | 95.9% | 35 | 6.3 MB |

## Exemplos de diferença na grafia

- **en-US:** aarti: modelo `AR·ri`, dicionário `AR·ti`; abacha: modelo `â·BA·tchâ`, dicionário `É·bâ·kâ`; abalone: modelo `É·bâ·lôun`, dicionário `é·bâ·LÔU·ni`; abdicating: modelo `ÉB·dâ·kêi·ring`, dicionário `ÉB·di·kêi·ring`; ablest: modelo `â·BLÉST`, dicionário `ÊI·bâlst`; abuladze: modelo `É·biâ·lédz`, dicionário `é·biu·LÉD·zi`; accompanist: modelo `â·KÂM·pâ·nist`, dicionário `â·KÂM·pâ·nâst`; accrediting: modelo `â·KRÉ·ri·ring`, dicionário `â·KRÉ·râ·ring`; acero: modelo `a·SSÉ·rôu`, dicionário `â·SSÉ·rôu`; achoa: modelo `A·tchôu·â`, dicionário `â·TCHÔU·â`; actinomycosis: modelo `ék·ti·nôu·mai·KÔU·ssâs`, dicionário `ék·ti·nôu·mai·KÔU·ssis`; adarand: modelo `É·rer·ând`, dicionário `É·râ·rénd`
- **en-GB:** aabomycin: modelo `êi·bôu·MÂ·i·ssin`, dicionário `é·bôu·MAI·ssin`; abacavir: modelo `é·bâ·KÊI·vâ`, dicionário `â·BA·kâ·viâ`; abaft: modelo `â·BÉFT`, dicionário `â·BAFT`; abalone: modelo `É·bâ·lôun`, dicionário `é·bâ·LÔU·ni`; abend: modelo `â·BÉND`, dicionário `É·bénd`; abhisheka: modelo `é·bi·CHÉ·kâ`, dicionário `â·bi·CHÊI·kâ`; absinth: modelo `âb·SINTH`, dicionário `ÉB·sinth`; abydocomist: modelo `é·bi·DÓ·kâ·mist`, dicionário `é·bi·dâ·KÔU·mist`; acceleration: modelo `âk·sé·lâ·RÊI·chân`, dicionário `ék·sé·lâ·RÊI·chân`; acetabulum: modelo `â·SSI·tâ·biu·lâm`, dicionário `é·ssi·TÉ·biu·lâm`; ached: modelo `ÉTCHT`, dicionário `ÊIKT`; actualize: modelo `ÉK·chuâ·laiz`, dicionário `ÉK·tiu·â·laiz`
- **fr-FR:** abiment: modelo `a·bi·MÃ`, dicionário `a·BIM`; absolus: modelo `ap·só·LÜS`, dicionário `ap·só·LÜ`; abstrayiez: modelo `aps·trrêi·IÊ`, dicionário `aps·trréi·IÊ`; alexya: modelo `a·lék·si·A`, dicionário `a·lék·SIA`; alzen: modelo `al·ZÉN`, dicionário `al·ZÃ`; ambisexuelle: modelo `ã·bi·zék·SÜÉL`, dicionário `ã·bi·ssék·SÜÉL`; angélus: modelo `ã·jê·LÜ`, dicionário `ã·jê·LÜS`; aouste: modelo `a·UST`, dicionário `a·UT`; apothicairerie: modelo `a·pó·ti·kê·rrâ·RRI`, dicionário `a·pó·ti·kérr·RRI`; aquisextaine: modelo `a·ki·zéks·TÉN`, dicionário `a·ki·sséks·TÉN`; archisuppôt: modelo `arr·chi·ssü·PÔ`, dicionário `arr·chi·zü·PÔ`; aster: modelo `as·TÊ`, dicionário `as·TÉRR`
