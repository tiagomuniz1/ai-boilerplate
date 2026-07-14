# Task — Preparar imagens Docker para produção

## Descrição

Endurecer os Dockerfiles do backend e do frontend para produção e **fechar o vazamento de secrets** no build. Hoje não existe `.dockerignore` em lugar nenhum — o `COPY . .` dos stages de build inclui `node_modules`, `.git`, terraform state e, criticamente, os arquivos `.env`/`.env.local` (com secrets) dentro da imagem. Esta é a task fundação: destrava todas as demais e corrige o problema de segurança mais urgente.

---

## Contexto

- Os dois Dockerfiles já são multi-stage e funcionais (`apps/backend/Dockerfile`, `apps/frontend/Dockerfile`, Node 22 alpine). O frontend já usa `output: 'standalone'`.
- Ambos os builders fazem `COPY . .` sem `.dockerignore` → contexto de build enorme e secrets copiados pra dentro das camadas.
- Existe um `.env` na raiz com um `ANTHROPIC_API_KEY` de aparência real (usado pelo `tools/ai-cli`). O `.gitignore` já ignora `.env`/`.env.local`, mas o Docker **não lê** o `.gitignore`.
- Os containers hoje rodam como **root** (sem `USER`).

---

## Escopo

### 1. `.dockerignore` na raiz (novo, `/.dockerignore`)

Espelhar o `.gitignore` + itens de build. Cobrir no mínimo:

```
node_modules
**/node_modules
.next
**/.next
dist
**/dist
coverage
coverage-integration
.git
.github
.env
.env.local
.env.*.local
**/.env
**/.env.local
infra/**/.terraform
**/*.tfstate
**/*.tfstate.*
apps/backend/uploads
apps/backend/uploads-private
**/*.log
frontend-code.html
.DS_Store
tasks
docs
```

> Validar que o build ainda funciona depois de ignorar `dist`/`.next` (os stages recompilam) — o `.dockerignore` não pode remover nada que o build precise.

### 2. Rodar como não-root

- Nos dois Dockerfiles, no stage `runner`: adicionar `USER node` (usuário já existe na imagem `node:22-alpine`). Garantir que os diretórios copiados (`dist`, `.next/standalone`, etc.) sejam legíveis pelo usuário `node`.

### 3. `.env` da raiz — apenas garantir exclusão (sem rotacionar)

- O `.env` da raiz tem um `ANTHROPIC_API_KEY` usado **só pelo `tools/ai-cli`**, não pela aplicação que sobe pra AWS. **Não rotacionar** — deixar como está. Basta garantir que o novo `.dockerignore` (item 1) cobre `.env` (já está no `.gitignore`), então a chave não entra em imagem nem no deploy.

### 4. (Opcional) Podar `node_modules` de produção no backend

- No stage `runner` do backend, em vez de copiar o `node_modules` completo, instalar só produção (`yarn workspaces focus @app/backend --production`) ou copiar um `node_modules` podado. **Manter** `@aws-sdk/client-ssm` e `@aws-sdk/client-s3` (usados em runtime). Reduz tamanho e superfície. Não bloqueante — priorizar itens 1–3.

**Arquivos:** `/.dockerignore` (novo), `apps/backend/Dockerfile`, `apps/frontend/Dockerfile`.

---

## Decisões técnicas

- **`.dockerignore` único na raiz**: o contexto de build é a raiz do monorepo (ambos os Dockerfiles usam `context: .`), então um único arquivo cobre os dois builds.
- **`USER node`**: usuário não-privilegiado padrão da imagem oficial; evita criar um novo.
- **Não rotacionar o `ANTHROPIC_API_KEY`**: é usada só pelo `tools/ai-cli`, está no `.gitignore` e passa a estar no `.dockerignore` — não vaza pra imagem nem pro deploy. Rotacionar seria esforço sem ganho.

---

## Restrições

- NÃO commitar nenhum `.env` / `.env.local` / secret.
- NÃO remover via `.dockerignore` arquivos necessários ao build (conferir com um build limpo).
- NÃO mudar as portas expostas (`3001` backend, `3000` frontend) nem os `CMD` nesta task (o entrypoint muda na task de Parameter Store).

---

## Definition of Done

- [x] `/.dockerignore` criado e cobrindo secrets, `node_modules`, `.git`, terraform state, uploads e artefatos de build.
- [x] `docker build` dos dois apps funciona com o `.dockerignore` no lugar.
- [x] `docker run --rm <img> sh -c 'test ! -f /app/.env && test ! -f /app/.env.local'` passa nas duas imagens.
- [x] Stage `runner` roda como `USER node` nos dois Dockerfiles.
- [x] `.env` da raiz confirmado no `.dockerignore` (chave do `tools/ai-cli` não entra em imagem) — sem rotação.
- [x] Sem regressão: `docker compose up` local continua subindo backend e frontend saudáveis.

> **Execução (2026-07-13):** item 4 (podar `node_modules` de prod) **não** foi feito — é opcional/não-bloqueante. Regressão encontrada e corrigida durante a validação: `USER node` causava `EACCES` no frontend ao ler `public/fonts/satoshi` (dir copiado como root sem read pro `node`) → resolvido com `COPY --chown=node:node` nas três cópias do stage `runner` do frontend.
>
> **Nota para a task 2 (Parameter Store):** o `WORKDIR /app` do backend é **root-owned** e o `runner` roda como `node`. O entrypoint que rodará `load-env.js` para escrever `.env.local` precisará de um caminho **gravável pelo `node`** (ex.: `--chown=node:node` no dir do backend, escrever em `/tmp`, ou ajustar o destino do `.env.local`). O backend subiu `healthy` como `node` porque o `/health` não escreve em disco.
