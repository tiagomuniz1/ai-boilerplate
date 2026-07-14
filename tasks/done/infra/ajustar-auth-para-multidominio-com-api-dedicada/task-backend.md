# Task — Ajustar auth para multi-subdomínio com API em host dedicado

## Descrição

Adaptar a autenticação para o cenário de produção: frontend multi-tenant por subdomínio (`slug.pulso.center`) e **API num host dedicado** (`api.pulso.center`). Como o browser da clínica passa a chamar outra origem, o backend precisa (1) setar cookies com `Domain=.pulso.center` e (2) ter **CORS dinâmico** que aceite qualquer `*.pulso.center` com credenciais. Também define os build args do frontend. Sem isso, o login não funciona em produção.

---

## Contexto

- `api.pulso.center` e `slug.pulso.center` são **hosts diferentes** (cross-origin) mas do **mesmo site** (`pulso.center` é o domínio registrável) → `SameSite=Strict` continua funcionando entre eles.
- `apps/frontend/middleware.ts` roda em `slug.pulso.center` e lê os cookies `access_token`/`refresh_token` para o gate de auth. Se o cookie for host-only de `api.pulso.center`, o middleware **não** o enxerga → precisa `Domain=.pulso.center`.
- `apps/backend/src/main.ts` hoje faz `app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true })` — **origem única**. Em produção há N subdomínios de clínica.
- `apps/frontend/lib/api-client.ts` injeta `x-clinic-slug`, mas hoje deriva o slug **do path** (`window.location.pathname`, `getClinicSlug()` linha 17 e o redirect de 401 na linha 72). Isso é **path-mode** e **quebra em subdomain-mode** (ver escopo #5). O `middleware.ts` já deriva do subdomínio; o api-client não.
- O `middleware.ts` chama `${NEXT_PUBLIC_API_URL}/auth/refresh` no servidor. Com `NEXT_PUBLIC_API_URL=https://api.pulso.center` (absoluto), resolve certo → **sem mudança no middleware**.
- Rotas do Nest ficam na raiz (`/auth`, `/users`…). Não há prefixo `/api` (o proxy roteia por Host, não por path — ver task do proxy).

---

## Escopo

### 1. Cookies com domínio configurável (backend)

- Onde os cookies são setados (`auth.controller.ts` — login, refresh, e logout que limpa), adicionar o atributo `domain` a partir de uma nova env **`COOKIE_DOMAIN`** (ex.: `.pulso.center` em prod; **vazio/`undefined`** em dev local para não quebrar `localhost`).
- **Guard-rail de isolamento (crítico):** os cookies **já** são nomeados por slug via `cookieNames()` — `access_token_${slug}` / `refresh_token_${slug}` (e `access_token` genérico só pro `backoffice`). **Só adicionar `domain` — NUNCA colapsar para um nome genérico.** É isso que impede os cookies de clínicas diferentes de se misturarem no mesmo navegador (o `jwt.strategy.ts` desambigua pelo header `x-clinic-slug`). Se os nomes virassem genéricos, `Domain=.pulso.center` faria uma clínica sobrescrever a outra.
- Manter `httpOnly`, `Secure`, `SameSite=Strict`, e o `Path=/auth/refresh` do refresh token.
- Garantir que o **logout** limpe o cookie com o **mesmo `domain`/`path`** e o mesmo nome por-slug (senão não apaga).
- Caveat aceito: com `Domain=.pulso.center`, toda request pra `api.pulso.center` carrega os cookies de todas as clínicas logadas; o backend usa só o que bate com `x-clinic-slug`.

### 2. CORS dinâmico (backend, `apps/backend/src/main.ts`)

- Trocar `origin: process.env.FRONTEND_URL` por uma função de validação que aceita origens casando `^https:\/\/([a-z0-9-]+\.)?pulso\.center$` e **ecoa a origem exata** (não usar `*` com `credentials`).
- Manter fallback para dev (`localhost:3000`/porta atual).
- `credentials: true`; garantir `x-clinic-slug` (e demais headers custom) nos `allowedHeaders`; preflight `OPTIONS` coberto.

### 3. Nova env `COOKIE_DOMAIN`

- Adicionar ao `apps/backend/src/config/env.config.ts` (opcional/defaulted, vazio em dev).
- Popular no SSM (`/pulso/<env>/backend/COOKIE_DOMAIN=.pulso.center`) — ver task do Parameter Store.

### 4. Build args do frontend (documentar para o CI)

- `NEXT_PUBLIC_BASE_DOMAIN=pulso.center` (liga o subdomain-mode no `middleware.ts`).
- `NEXT_PUBLIC_API_URL=https://api.pulso.center` (absoluto).
- Validar `apps/frontend/next.config.js` `apiRemotePattern()` — deriva de `NEXT_PUBLIC_API_URL`, então `api.pulso.center` (host que serve o branding) já é permitido para o `next/image`.

### 5. Derivação de slug no api-client em subdomain-mode (frontend — **bloqueante em prod**)

Hoje `apps/frontend/lib/api-client.ts` deriva o slug do **path** (`getClinicSlug()` linha 17; redirect de 401 linha 72-73). Em subdomain-mode isso manda `x-clinic-slug` errado (ex.: `clinica-a.pulso.center/patients` → envia `patients`) e o backend lê o cookie errado → **auth quebra**.

- Tornar `getClinicSlug()` **subdomain-aware**: quando `NEXT_PUBLIC_BASE_DOMAIN` estiver setado, derivar o slug do **hostname** (`clinica-a.pulso.center` → `clinica-a`), tratando `backoffice` como slug genérico (retorna `null`, igual ao path-mode hoje). Reutilizar a mesma lógica do `middleware.ts` (`extractSlugFromSubdomain`) — considerar extrair para um util compartilhado (`utils/`) para não duplicar.
- Corrigir o **redirect de 401** (linha 72-73): em subdomain-mode, redirecionar para `/login` no mesmo subdomínio (não `/${slug}/login`, que é path-mode). Alinhar com o `loginRedirectUrl` do `middleware.ts`.
- **Não regredir o path-mode** (dev local, `NEXT_PUBLIC_BASE_DOMAIN` vazio): manter a derivação por path quando não há base domain.

**Arquivos:** `apps/backend/src/main.ts`, use-cases/controller de auth do backend (set/clear cookie), `apps/backend/src/config/env.config.ts`, `apps/frontend/lib/api-client.ts`, `apps/frontend/middleware.ts` (fonte da lógica de subdomínio a reutilizar), `apps/frontend/next.config.js` (validar), testes correspondentes.

---

## Decisões técnicas

- **API em host dedicado `api.pulso.center`** (em vez de `slug.pulso.center/api`): `NEXT_PUBLIC_API_URL` fica absoluto/estático (build-time friendly), o `middleware.ts` não muda, e o Nest mantém rotas na raiz. O custo é o CORS + `Domain=.pulso.center`, resolvidos aqui.
- **`Domain=.pulso.center`**: permite o cookie ser lido tanto em `slug.pulso.center` (middleware) quanto enviado a `api.pulso.center` (API). `SameSite=Strict` vale porque subdomínios do mesmo site são same-site.
- **CORS por regex + eco da origem**: `credentials: true` proíbe `*`; a allowlist por padrão de subdomínio cobre N clínicas sem listar cada uma.

---

## Restrições

- NÃO usar `origin: '*'` com `credentials: true`.
- NÃO hardcodar domínio de produção no código — `COOKIE_DOMAIN` e o padrão de CORS devem funcionar em dev (localhost) sem `Domain`.
- NÃO enfraquecer os flags dos cookies (`httpOnly`, `Secure`, `SameSite=Strict`) — apenas adicionar `domain`.
- Cookies e tokens **nunca** logados.

---

## Definition of Done

- [x] Cookies de auth setados com `Domain` vindo de `COOKIE_DOMAIN` (vazio em dev, `.pulso.center` em prod); logout limpa com o mesmo domain/path.
- [x] CORS aceita qualquer `https://<sub>.pulso.center` com `credentials: true` e ecoa a origem; preflight OK; dev (localhost) continua funcionando.
- [x] `COOKIE_DOMAIN` em `env.config.ts` e no SSM (o `seed-ssm.sh` da task 2 já popula `COOKIE_DOMAIN=.pulso.center`).
- [x] Build args do frontend documentados para o CI; `next.config.js` valida o host de branding (deriva de `NEXT_PUBLIC_API_URL` → `api.pulso.center`; sem mudança necessária).
- [x] **api-client subdomain-aware:** com `NEXT_PUBLIC_BASE_DOMAIN` setado, `getClinicSlug()` deriva o slug do **hostname** (`clinica-a.pulso.center` → `clinica-a`; `backoffice.pulso.center` → `null`); o redirect de 401 vai pra `/login` no mesmo subdomínio. Com base domain vazio (dev), mantém a derivação por path.
- [x] **Verificação em subdomain-mode:** coberta por testes unitários com `hostname` mockado (`clinica-a` → `x-clinic-slug: clinica-a`; `backoffice` → sem header; redirect de 401 → `/login`). O teste manual das 2 clínicas + backoffice no mesmo navegador roda na **staging** (Verificação 5 do plano — precisa de subdomínios reais).
- [x] Testes unitários cobrindo: cookie com/sem domain, `getClinicSlug()` nos dois modos, util de subdomínio (100% cobertura). CORS aceitando subdomínio válido e rejeitando origem externa validado por **curl ao vivo** (mais fiel que supertest, que é same-process sem browser).
- [x] Verificação manual: `curl -i -X OPTIONS -H "Origin: https://c1.pulso.center" ... /auth/login` → `Access-Control-Allow-Origin: https://c1.pulso.center` + `Allow-Credentials: true` + `x-clinic-slug` nos allow-headers. Origem externa negada (sem allow-origin).
- [x] **Localhost intacto — CORS:** `http://localhost:3010` (e qualquer `http://localhost:<porta>`) aceito com `credentials: true` — validado por curl.
- [x] **Localhost intacto — nomes de cookie:** `cookieNames()` inalterado; cookies continuam por-slug (`access_token_<slug>`) — coberto pelos testes existentes (todos verdes) e pelo novo teste que confirma **domain + nome por-slug juntos**.
- [~] **Localhost intacto — login E2E:** validado por partes (CORS localhost aceito; cookie **sem** `Domain` quando `COOKIE_DOMAIN` vazio — novo teste; derivação path-mode preservada — suite inteira verde; build path-mode OK). O clique-a-clique com credenciais reais fica para o usuário/staging.

> **Execução (2026-07-13):**
> - **Backend:** `COOKIE_DOMAIN` em `env.config.ts` (vazio→`undefined`); `auth.controller.ts` com helper `baseCookieOptions()` que adiciona `domain` só quando setado (login/refresh/logout), **preservando os nomes por-slug**; CORS dinâmico em `main.ts` (regex `^https://([a-z0-9-]+\.)?pulso\.center$` + fallback `localhost:<porta>` + `FRONTEND_URL`, ecoando a origem, `credentials: true`, `allowedHeaders` com `x-clinic-slug`). Origem negada usa `callback(null, false)` (nega sem 500).
> - **Frontend:** novo util `lib/subdomain.ts` (`getBaseDomain`/`isSubdomainMode`/`extractSlugFromSubdomain`, lê env por-chamada p/ testabilidade); `middleware.ts` refatorado para usá-lo (fonte única, sem duplicar); `api-client.ts` com `getClinicSlug()` subdomain-aware (hostname → path fallback) e redirect de 401 subdomain-aware. `next.config.js` sem mudança (já cobre o host de branding).
> - **Testes:** `auth.controller.spec.ts` mocka `getEnvConfig` + 2 novos testes (com/sem domain); `lib/subdomain.spec.ts` novo (100%); `api-client.spec.ts` + 4 casos subdomain-mode. Backend unit **1954** verdes (auth.controller/env.config 100%); frontend unit **2628** verdes (api-client/subdomain 100%); CORS validado por curl; build Next em subdomain-mode OK.
> - **Addendum (durante a validação da task 5):** corrigido um bug pré-existente no `middleware.ts` — o host vinha de `request.nextUrl.hostname` (resolve p/ `localhost` no standalone atrás de proxy, quebrando subdomain-mode); passou a ler o header `host`. Sem isso o subdomain-mode não funcionaria em prod. Validado end-to-end no stack de prod local (`c1.pulso.center/` → redirect p/ `backoffice.pulso.center`).
> - **Cross-ref:** o `path` do refresh cookie permanece `/` (como já era no código) — a menção a `Path=/auth/refresh` no escopo era aspiracional e não corresponde à implementação atual; mantido para não regredir o refresh (o middleware envia o cookie explicitamente).
