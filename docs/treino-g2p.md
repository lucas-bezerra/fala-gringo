# Como treinar o modelo G2P (T3.9)

Este guia explica como treinar, num PC com Windows e placa NVIDIA, o modelo que **estima a pronúncia (IPA) de palavras que não estão no dicionário**. O modelo aprende com o próprio dicionário do FalaGringo e depois roda no navegador, sem servidor e sem custo.

> **Situação:** experimento. Antes de qualquer uso fora do desenvolvimento, a proposta passa pela revisão de governança (ver [Antes de usar de verdade](#antes-de-usar-de-verdade)).

## Visão geral

```
 Mac (repositório)                         PC Windows (GPU)                      Mac (repositório)
 ─────────────────                         ────────────────                      ─────────────────
 pnpm … merge                               python train.py     (≈ 1 h/idioma)    inferência em TypeScript
 python prepare.py  ──► data/{idioma}/ ──►  python evaluate.py               ──►  (próxima etapa da T3.9)
                         (pendrive/Drive)   python export.py  ──► export/{idioma}/
```

| Script | Onde roda | Precisa de GPU? | O que faz |
|---|---|---|---|
| `prepare.py` | Mac | não (nem torch) | Gera treino (90%), validação (5%) e teste (5%) a partir do dicionário mesclado |
| `train.py` | PC | sim (recomendado) | Treina e guarda o melhor modelo |
| `evaluate.py` | PC | não | Mede o erro em palavras nunca vistas e testa palavras avulsas |
| `export.py` | PC | não | Gera os arquivos que vão para o navegador |

Os scripts ficam em [`tools/g2p/`](../tools/g2p/). O modelo é um Transformer pequeno, que lê letra por letra e escreve o IPA símbolo por símbolo. Tem cerca de 3 milhões de parâmetros, e o arquivo exportado ocupa cerca de 6 MB.

## 1. No Mac: preparar os dados

O `prepare.py` usa só a biblioteca padrão do Python (3.10 ou mais nova). Rode a partir da raiz do repositório:

```bash
pnpm --filter @falagringo/data merge          # gera packages/data/build/merged/ (se ainda não existir)
cd tools/g2p
python3 prepare.py --lang en-US
python3 prepare.py --lang en-GB
python3 prepare.py --lang fr-FR
```

Cada idioma vira uma pasta `tools/g2p/data/{idioma}/` com `train.tsv`, `dev.tsv`, `test.tsv` e `meta.json` (contagens, fontes e data). Resultado com os dados atuais:

| Idioma | Palavras | Fontes |
|---|--:|---|
| en-US | 125.203 | CMUdict (BSD) quase todas; 105 do Wikidata (CC0) |
| en-GB | 57.177 | Britfone (MIT), Wiktionary/WikiPron (CC BY-SA) |
| fr-FR | 84.396 | Wiktionary/WikiPron (CC BY-SA) |

Regras do preparo:
- **A divisão é fixa por palavra** (hash): a mesma palavra cai sempre no mesmo conjunto. As medições são comparáveis entre treinos e máquinas.
- **No treino entra só a pronúncia principal** de cada palavra. Na validação e no teste, acertar qualquer variante conta como acerto.
- **Em idiomas com tônica lexical** (inglês, alemão, italiano…), pronúncias sem tônica no dado ficam de fora. Assim o modelo não aprende a omiti-la.
- Ficam de fora palavras com espaço, dígito ou símbolo, e entradas muito longas.
- `--sources cmudict,britfone` restringe às fontes listadas (ver [Licenças](#licenças)).

**Leve para o PC a pasta `tools/g2p/` inteira**, com `data/` dentro, por pendrive, Google Drive ou outro meio. Ela tem os scripts e os dados, e nada mais do repositório é necessário. A pasta `data/` fica fora do git de propósito.

## 2. No PC: instalar o ambiente (uma vez)

### 2.1 Driver da NVIDIA

Instale o driver mais recente da GeForce GTX 1060 pelo site da NVIDIA ou pelo GeForce Experience. Depois, num **PowerShell**:

```powershell
nvidia-smi
```

A tabela precisa mostrar a placa e uma "CUDA Version" 12.6 ou maior. Não é preciso instalar o CUDA Toolkit, porque o PyTorch já traz o que usa.

### 2.2 Python 3.12

Baixe o instalador **Python 3.12 (Windows installer 64-bit)** em python.org. Na primeira tela, marque **"Add python.exe to PATH"**. Confira:

```powershell
py -3.12 --version
```

### 2.3 Ambiente virtual e PyTorch

```powershell
cd C:\caminho\para\g2p
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install torch==2.14.1 --index-url https://download.pytorch.org/whl/cu126
pip install -r requirements.txt
```

> ⚠️ **Fixe a versão do torch.** A GTX 1060 é da arquitetura Pascal (`sm_61`), que o PyTorch está deixando de suportar. As builds CUDA 12.8 e mais novas já não incluem a Pascal. A partir do **PyTorch 2.15**, nenhuma build inclui. A **2.14.1 com CUDA 12.6** (`cu126`) é a última que serve, e a página de download do PyTorch ainda tinha o pacote para Python 3.12 no Windows em 2026-11-13. Fontes: [anúncio do fim do CUDA 12.6](https://dev-discuss.pytorch.org/t/notice-cuda-12-6-wheels-will-no-longer-be-published-from-pytorch-2-15-drops-maxwell-pascal-volta/3432) e [Pascal fora das builds 12.8/12.9](https://dev-discuss.pytorch.org/t/cuda-toolkit-version-and-architecture-support-update-maxwell-and-pascal-architecture-support-removed-in-cuda-12-8-and-12-9-builds/3128).

Se o PowerShell bloquear o `Activate.ps1` ("execução de scripts foi desabilitada"), rode uma vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. A alternativa é usar o **Prompt de Comando** com `.venv\Scripts\activate.bat`.

### 2.4 Conferir a GPU

```powershell
python -c "import torch; print(torch.__version__, torch.cuda.is_available()); print(torch.cuda.get_device_name(0)); print(torch.cuda.get_arch_list()); print(torch.ones(2, device='cuda') * 2)"
```

O esperado:
- `2.14.1+cu126 True`;
- `NVIDIA GeForce GTX 1060 6GB`;
- uma lista que **contém `sm_61`**;
- `tensor([2., 2.], device='cuda:0')`.

Se a lista não tiver `sm_61`, ou aparecer *"no kernel image is available"*, troque pela versão anterior, que também tem pacote para Python 3.12:

```powershell
pip install torch==2.7.1 --index-url https://download.pytorch.org/whl/cu118 --force-reinstall
```

## 3. Teste rápido (2 minutos)

Antes do treino longo, confirme que tudo funciona:

```powershell
python train.py --lang en-US --epochs 3 --limit 3000 --eval-every 1 --out runs\teste
```

A primeira linha deve dizer `dispositivo cuda` e `GPU: NVIDIA GeForce GTX 1060 6GB`. Com tão poucos dados, o erro fica perto de 100%; o teste só confirma que o treino roda. Apague depois a pasta `runs\teste`.

## 4. Treinar

```powershell
python train.py --lang en-US
```

- **Tempo:** num Mac com Apple Silicon, cada época do en-US levou ~45 s. Na GTX 1060, ainda não sabemos: a primeira linha impressa mostra os segundos por época, e basta multiplicar por 80 (o máximo). A estimativa é de 1 a 2 horas por idioma, e a parada antecipada pode encurtar.
- **Andamento:** uma linha por época, com a perda (deve cair) e, a cada 2 épocas, o erro na validação.
- **Melhor modelo:** fica em `runs\en-US\best.pt`, sempre o de menor erro de validação até ali.
- **Parada antecipada:** o treino para sozinho depois de 10 validações seguidas sem melhora.
- **Interromper:** **Ctrl+C** salva `last.pt`. Para continuar de onde parou: `python train.py --lang en-US --resume`.
- **Evite** que o Windows entre em suspensão durante o treino (Configurações → Sistema → Energia).
- **Acompanhar a GPU:** num outro PowerShell, `nvidia-smi -l 5` mostra o uso a cada 5 segundos.

Repita para os outros idiomas: `--lang en-GB` e `--lang fr-FR`.

### Ajustes possíveis

| Opção | Padrão | Quando mudar |
|---|---|---|
| `--batch` | 256 | `CUDA out of memory`: use 128 |
| `--d-model` / `--ff` | 192 / 768 | Modelo maior (`--d-model 256 --ff 1024`): talvez acerte mais, arquivo de ~11 MB |
| `--layers` | 3 | Idem; mais camadas = mais lento no navegador |
| `--epochs` | 80 | Limite máximo; a parada antecipada costuma vir antes |
| `--patience` | 10 | Validações sem melhora até parar |

Se testar variações, use `--out runs\en-US-grande` (por exemplo) para não sobrescrever o modelo anterior. Compare pelo `evaluate.py`.

## 5. Avaliar

```powershell
python evaluate.py --lang en-US
python evaluate.py --lang en-US --words zelenskyy brexit kubernetes
```

O primeiro comando mede o modelo nas ~6 mil palavras de teste, que ele nunca viu:

| Métrica | O que significa |
|---|---|
| erro por palavra | % de palavras cujo IPA previsto não bate com nenhuma variante do dicionário |
| erro por palavra, sem a tônica | Idem, ignorando `ˈ` e `ˌ`: separa o erro de som do erro de tônica |
| erro por caractere do IPA | Distância de edição média: quão longe a previsão fica, mesmo quando erra |

As métricas vão para `runs\en-US\metrics.json`, e os erros, para `test-errors.tsv`, que vale a pena abrir numa planilha. **Muitas diferenças de IPA somem na grafia PT-BR** (`ɑ` e `ɔ`, por exemplo, podem virar a mesma letra). Por isso, a medida que decide se o modelo serve é a da grafia final, feita na integração (etapa seguinte).

**Referência medida (2026-11-13):** um treino curto de teste (15 épocas, não as 80, no Mac) chegou a **36% de erro por palavra**, **31% sem a tônica** e **10,8% por caractere** no en-US, e o erro ainda caía. Exemplos: `zelenskyy` → `zəˈlɛnski`, `kubernetes` → `ˈkjubɚˌnits`, `brexit` → `ˈbɹɛksɪt`. O treino completo deve ficar abaixo disso; quanto, só ele dirá. Registre os números do PC na tabela abaixo.

| Data | Idioma | Épocas | Erro/palavra | Sem tônica | Por caractere | Observação |
|---|---|--:|--:|--:|--:|---|
| 2026-11-13 | en-US | 15 | 36,05% | 31,13% | 10,84% | teste curto no Mac (MPS), configuração padrão |

## 6. Exportar e trazer de volta

```powershell
python evaluate.py --lang en-US     # antes, para as métricas irem junto
python export.py --lang en-US
```

Em `export\en-US\`:

| Arquivo | Conteúdo |
|---|---|
| `g2p.json` | Configuração, vocabulários, índice dos pesos e a "ficha" do modelo: dados usados, fontes, parâmetros de treino e métricas |
| `g2p.bin` | Pesos em float16 (~6 MB; ~5,5 MB com gzip) |
| `fixtures.tsv` | 300 palavras com a saída do PyTorch usando os mesmos pesos exportados. A inferência no navegador tem de reproduzir esta coluna exatamente |

**Traga a pasta `export\{idioma}\` de volta ao Mac**, em `tools/g2p/export/{idioma}/`, e avise. Ela também fica fora do git até decidirmos como o modelo será publicado.

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `py` não é reconhecido | O Python não entrou no PATH: reinstale marcando a opção, ou use o caminho completo |
| `torch.cuda.is_available()` = `False` | torch sem CUDA (veio do PyPI comum) ou driver antigo. Reinstale com o `--index-url` do passo 2.3 e atualize o driver |
| `no kernel image is available for execution on the device` | Build do torch sem `sm_61`. Use a 2.14.1+cu126 ou a 2.7.1+cu118 |
| `CUDA out of memory` | `--batch 128`; feche jogos e navegadores pesados |
| `UnicodeEncodeError` ao imprimir IPA | Os scripts já forçam UTF-8. Se aparecer, rode `$env:PYTHONUTF8=1` antes |
| `FileNotFoundError: …\data\en-US\train.tsv` | A pasta `data\` não veio junto. Rode o `prepare.py` no Mac e copie de novo |
| Erro de validação parado em ~100% num treino completo | Não deveria acontecer. Mande o `log.tsv` e as primeiras linhas da saída |

## Licenças

O modelo é **derivado dos dados** com que foi treinado.

| Idioma | Situação |
|---|---|
| en-US | CMUdict (BSD-2) e Wikidata (CC0): licenças permissivas, só exigem crédito |
| en-GB, fr-FR | Têm dados do Wiktionary (CC BY-SA 4.0). Um modelo treinado com eles pode ter de seguir a mesma licença (crédito e compartilhamento pela mesma licença) |

O caso do CC BY-SA ainda precisa ser verificado na revisão da proposta. Para um en-GB só com fontes permissivas, há a opção `prepare.py --lang en-GB --sources britfone,cmudict`. O custo é ter menos palavras: o Britfone tem ~9,5 mil.

O `meta.json` (e o `g2p.json`) registra as fontes usadas em cada modelo.

## Antes de usar de verdade

Hoje isto é um experimento local. Para o modelo entrar no FalaGringo, a Política de Uso Ético e Seguro de IA da Rede Gazeta pede:
- **Idea Case** e **classificação de risco**. Sugestão: baixo, porque o modelo não usa dados pessoais, roda no navegador e só estima pronúncias;
- **documentação do modelo**: o `g2p.json` já guarda dados, fontes, parâmetros e métricas;
- **aviso na tela** de que a pronúncia foi **estimada** por um modelo, com destaque visual diferente da que vem do dicionário;
- **revisão humana** antes de qualquer uso em conteúdo publicado ou no ar, como já vale para todo o FalaGringo.

Problemas como vazamento, uso indevido, erro grave ou viés devem ser reportados a governanca@redegazeta.com.br.

## Próximos passos da T3.9 (no repositório)

1. Inferência em TypeScript puro no motor (`Estimator`), lendo `g2p.json` + `g2p.bin` e reproduzindo o `fixtures.tsv`. A interface `Estimator.estimate()` é síncrona, então o modelo é carregado antes, como o léxico.
2. Medir o acerto **na grafia PT-BR**: previsão → motor → grafia, comparada com a grafia do IPA do dicionário, nas palavras de teste.
3. ADR com a decisão e os números, e o aviso "estimado" na interface.
