# FalaGringo – IPA to PT-BR

Aplicação web para transcrição fonética de palavras ou textos em IPA (Alfabeto Fonético Internacional) para a pronúncia aproximada em Português Brasileiro (PT-BR).

---

## Stack do Projeto

- **Frontend**: Vite + React + TypeScript  
- **Backend**: Node.js + Express + TypeScript  
- **Gerenciador de pacotes**: pnpm  

---

## Requisitos

Para executar o projeto (desenvolvimento ou produção), é necessário:

- **Node.js** v18 ou superior  
- **pnpm** v8 ou superior  

Verifique as versões instaladas:

```bash
node -v
pnpm -v
```

---

## Estrutura do Projeto

```plaintext
.
├─ backend
│  ├─ dictionaries    # Dicionários de transcrição IPA → PT-BR
│  ├─ dist            # Backend compilado (produção)
│  └─ server.ts       # Ponto de entrada do backend
├─ components         # Componentes React
├─ services           # Serviços e lógica de transcrição
├─ App.tsx
├─ index.tsx
├─ vite.config.ts
├─ package.json
└─ pnpm-lock.yaml
```

---

## Instalação

Instale todas as dependências do projeto:

```bash
pnpm install
```

---

## Desenvolvimento Local

### Frontend (Vite)

Inicie o frontend em modo desenvolvimento:

```bash
pnpm dev
```

Disponível por padrão em `http://localhost:5173`.

---

### Backend (API)

Inicie o backend em modo desenvolvimento:

```bash
pnpm backend
```

O servidor normalmente roda em `http://localhost:3000`.

---

## Build para Produção

### Frontend

Gere os arquivos estáticos do frontend:

```bash
pnpm build
```

Após a execução, será criada a pasta ``dist`` contendo o frontend otimizado para produção.

---

### Backend

Compile o backend TypeScript para JavaScript:

```bash
pnpm build:backend
```

O código compilado será gerado em ``backend/dist``.

---

### Build Completo (Frontend + Backend)

Execute o build completo do projeto:

```bash
pnpm build:all
```

---

## Execução em Produção

Inicie a aplicação em modo produção (frontend servido pelo backend):

```bash
pnpm start
```

A aplicação ficará disponível em `http://localhost:3000`.

---

## Deploy em Produção

### Deploy único (Frontend + Backend)

Recomendado para projetos pequenos e MVPs.

- Build Command: ``pnpm build:all``
- Start Command: ``pnpm start``

Plataformas compatíveis:
- Render  
- Railway  
- Fly.io  
- VPS com Node.js  

---

### Variáveis de Ambiente

Se necessário, crie um arquivo ``.env`` na raiz do backend (não versionado).

Exemplo:

```env
PORT=3000
```

Ajuste conforme sua necessidade.

---

## Tecnologias Utilizadas

- Vite  
- React  
- TypeScript  
- Node.js  
- Express  
- pnpm  

---

Divirta-se transcrevendo! 🇺🇸 → 🇧🇷
