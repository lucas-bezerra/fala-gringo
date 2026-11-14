# ADR 0003 — Componentes base sobre elementos nativos, sem Radix

- **Data:** 2026-11-13
- **Situação:** aceita
- **Tarefa:** T4.1

## Contexto

O plano previa os componentes base (botão, chip, abas, popover, painel inferior, aviso) "com Radix UI ou similar". O site tem uma **CSP rígida**: `style-src 'self'`, sem `unsafe-inline` (ver `apps/web/security-headers.ts`).

O Dialog do Radix trava a rolagem com o `react-remove-scroll`, que injeta um elemento `<style>` na página. Essa CSP bloqueia isso. Contornar exigiria afrouxar a CSP ou manter um nonce num site estático.

Os navegadores atuais já trazem, nativamente, o que mais pesava nessas bibliotecas:
- **`<dialog>` com `showModal()`:** camada superior, página atrás inerte, Esc e devolução do foco;
- **Popover API** (`popover="auto"`): camada superior, Esc, clique fora e devolução do foco.

## Decisão

Os componentes base ficam em `apps/web/src/ui/`, escritos sobre elementos nativos e **sem dependências novas**:

| Componente | Base |
|---|---|
| `Button`, `Chip` | `<button>`; o chip usa `aria-pressed` |
| `Tabs` | Padrão WAI-ARIA de abas: `tablist`/`tab`/`tabpanel`, tabindex móvel, setas, Home e End |
| `Popover` | Popover API. A posição é calculada em JS e aplicada via CSSOM (`el.style.top`), que a CSP permite |
| `BottomSheet` | `<dialog>` modal. A trava de rolagem usa `html:has(dialog.sheet[open])` no CSS |
| `Toast` | Região `role="status"` (aria-live polite), sempre montada |

## Consequências

- **Verificação:** zero `<style>` injetado e zero dependências no bundle. O e2e (`e2e/componentes.spec.ts`) confere CSP, axe (WCAG 2.2 AA) e teclado no catálogo (`/catalogo.html`).
- **Navegadores:** a Popover API exige Chrome/Edge 114+, Safari 17+ e Firefox 125+. Navegadores mais antigos mostram o conteúdo do popover fora da camada superior. Isso é aceitável para um uso interno.
- **Foco no modal:** o `<dialog>` não prende o foco de forma absoluta. O Tab pode ir para a interface do navegador, como manda a especificação, mas nunca para a página atrás.
- **Se precisarmos de algo que o nativo não dá** (combobox com busca, por exemplo), avaliamos uma biblioteca caso a caso, conferindo antes se ela injeta estilos.
