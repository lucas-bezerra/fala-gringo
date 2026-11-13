# FalaGringo — IPA → PT-BR

Aplicação web que mostra a um falante de português brasileiro como pronunciar palavras em outro idioma, a partir da transcrição fonética (IPA) e de uma grafia aproximada em PT-BR.

> Em reconstrução (v2). Plano: [docs/PLANO-V2.md](docs/PLANO-V2.md) · Notação: [docs/notacao.md](docs/notacao.md)

## Requisitos

- Node.js 20 ou superior
- pnpm 11

## Uso

```bash
pnpm install
pnpm dev       # http://localhost:5173
pnpm build     # site estático em apps/web/dist
pnpm preview   # serve o build localmente
```

O site é 100% estático e pode ser publicado em qualquer hospedagem de arquivos (servir `apps/web/dist`).

## Estrutura

```
apps/web/          frontend (React + Vite)
packages/data/     dicionários e pipeline de dados
packages/engine/   motor fonético (v2)
packages/content/  dicas e guia de sons (v2)
docs/              plano e especificações
```

## Dados e licenças

Os dicionários vêm do projeto [ipa-dict](https://github.com/open-dict-data/ipa-dict), e cada um mantém a licença da sua fonte. Créditos: [packages/data/raw/ipa-dict/LICENSES.md](packages/data/raw/ipa-dict/LICENSES.md). Política de fontes: [packages/data/SOURCES.md](packages/data/SOURCES.md).

## Aviso

As pronúncias são aproximações automáticas. Confirme antes de usar em conteúdo publicado ou no ar.
