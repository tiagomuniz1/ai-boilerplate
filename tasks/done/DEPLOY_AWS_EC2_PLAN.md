# Deploy AWS — EC2 (free tier) com Docker + CloudFront

> **Runbook operacional** (setup, deploy de rotina, rollback, troubleshooting): [`docs/DEPLOY_RUNBOOK.md`](../docs/DEPLOY_RUNBOOK.md).

## Contexto

A aplicação (monorepo Yarn 4: NestJS + Next.js + `packages/shared`) roda hoje só localmente. O objetivo é subir na AWS num **único EC2 free tier (t3.micro)** rodando os apps em Docker (backend, frontend, Redis e reverse proxy), com **PostgreSQL no RDS free tier** (fora do EC2), de forma que a migração futura para ECS seja simples.

Boa parte da base já existe: Dockerfiles multi-stage prontos, `docker-compose.yml` completo, `/health` com ping no banco, e Terraform em duas contas AWS (DevOps = state, Workload = recursos) com módulos `s3-clinic-assets` e `ses-email`. Falta compute/rede, CI/CD, hardening de Docker e a borda (CloudFront/TLS).

## Decisões confirmadas

| # | Tema | Escolha |
|---|---|---|
| A | Build das imagens | CI (GitHub Actions) builda e faz push pro **ECR**; o EC2 só faz `pull` (evita OOM em 1GB e prepara pra ECS) |
| B | Domínio + TLS | Domínio na **GoDaddy** → AWS. **CloudFront** na frente do EC2, TLS terminado no CloudFront com **certificado ACM** (grátis). EC2 não termina TLS |
| C | Multi-tenant | **Subdomain-mode** (`slug.pulso.center`) → `NEXT_PUBLIC_BASE_DOMAIN=pulso.center`, exige DNS + ACM **wildcard `*.pulso.center`** |
| D | Secrets em runtime | Reaproveitar **SSM Parameter Store** via entrypoint que busca no boot (consistente com `load-env.js`, pronto pra ECS) |
| E | IaC | Novo Terraform para **EC2 + ECR + CloudFront + ACM + RDS** + artefatos de deploy |
| F | Data stores | **PostgreSQL no RDS free tier** (db.t4g.micro, 20GB, single-AZ, backup automático/PITR) — fora do EC2. **Redis no container** do EC2 (cache/lock efêmero, perda tolerável) |
| G | DNS | **Route 53** — hosted zone `pulso.center` **já criada** na conta **Workload (796669927752)**, **NS já delegados** no GoDaddy. Records gerenciados pelo **Terraform** (data source na zona existente) |

> **RAM (free tier = 1GB):** com o Postgres no RDS, sobra Redis + 2 apps Node + proxy no host — folgado. Ainda assim: **swap de 2GB** no `user_data` e build fora da instância (A). CloudFront alivia cacheando estáticos. RDS free tier grátis por 12 meses, depois ~US$12–15/mês.

---

## Arquitetura alvo

```
  *.pulso.center  (frontend: slug.pulso.center · API: api.pulso.center)
        │  Route 53 (zona pulso.center, conta Workload) — ALIAS wildcard cobre api.* também
        ▼
  CloudFront ── TLS (ACM wildcard *.pulso.center, us-east-1) · alt name *.pulso.center
    · /_next/static/*, assets ▶ cache
    · default                 ▶ no-cache, encaminha Host + cookies + Origin + Authorization
        │  HTTP-only → origin (SG restrito ao prefix list do CloudFront)
        ▼
  EC2 t3.micro (free tier) — docker-compose.prod.yml
    proxy nginx/Caddy (:80) — roteia por Host
      ├─ Host api.pulso.center → backend  (Nest :3001, rotas na raiz)
      └─ Host *.pulso.center   → frontend (Next standalone :3000)
    redis:7 (vol redis_data) ◀─ backend        [único stateful no box]
          │
  backend ─┴──▶ RDS PostgreSQL (db.t4g.micro, VPC privada, SG só do EC2)
```

- TLS termina no CloudFront; CloudFront → EC2 é **HTTP** (sem cert no EC2). O cert wildcard `*.pulso.center` cobre `api.pulso.center` e todas as clínicas com **um** distribution + **um** origin.
- Security Group EC2: **80** só do prefix list `com.amazonaws.global.cloudfront.origin-facing`; **22** só do seu IP. Redis **sem** porta no host.
- **RDS**: não público, na mesma VPC do EC2, SG liberando **5432 só do SG do EC2**. Backup automático + PITR.
- IAM Role da instância: SSM (`/pulso/<env>/*`), ECR pull, S3 clinic-assets (policy já exportada pelo módulo existente), `ses:SendEmail`.
- Único volume Docker stateful no EC2: `redis_data` (cache, descartável). Dado durável (Postgres) fica no RDS.

### Pontos críticos de auth (subdomain-mode + API em host dedicado + CloudFront)

Com a API em `api.pulso.center` (host separado do frontend `slug.pulso.center`), o browser faz chamada **cross-origin** — porém **same-site** (mesmo domínio registrável `pulso.center`). Isso tem duas consequências obrigatórias no **backend**:

1. **Cookies com `Domain=.pulso.center`** (não host-only). Motivo: o `middleware.ts` roda em `slug.pulso.center` e lê `access_token`/`refresh_token` para o gate de auth; se o cookie for host-only de `api.pulso.center`, o middleware não o enxerga. Com `Domain=.pulso.center` o cookie é enviado tanto pra `slug.pulso.center` (middleware lê) quanto pra `api.pulso.center` (API recebe). `SameSite=Strict` continua funcionando — subdomínios do mesmo site são same-site.
   - **Isolamento multi-clínica (verificado no código):** os cookies são nomeados por slug — `access_token_${slug}` / `refresh_token_${slug}` (`auth.controller.ts` `cookieNames()`, `middleware.ts`, `jwt.strategy.ts`). Logado em várias clínicas no mesmo navegador, os cookies **não se misturam** (nomes distintos); o backend desambigua pelo header `x-clinic-slug`. **Guard-rail:** ao adicionar `Domain`, **preservar os nomes por-slug** — nunca colapsar para um `access_token` genérico. Caveat aceito: com `Domain` compartilhado, toda request pra `api.pulso.center` carrega os cookies de todas as clínicas logadas (o backend ignora os que não batem com o slug).
2. **CORS dinâmico**: hoje o `main.ts` usa `origin: process.env.FRONTEND_URL` (origem única). Precisa refletir **qualquer `*.pulso.center`** com `credentials: true` (validar via regex/allowlist e ecoar a origem exata — não dá pra usar `*` com credentials). Cobrir o preflight `OPTIONS` (o Nest resolve automático depois de configurado).
3. **`NEXT_PUBLIC_API_URL=https://api.pulso.center`** — absoluto e estático (build-time friendly). O `middleware.ts` já monta `${NEXT_PUBLIC_API_URL}/auth/refresh` absoluto → **sem mudança** no middleware. Rotas do Nest ficam na raiz (`/auth`, `/users`…) → **sem strip de `/api`**.
   - **⚠️ Frontend `api-client.ts` é path-mode (bloqueante em prod):** o `lib/api-client.ts` deriva o `x-clinic-slug` do **path** (`window.location.pathname`), não do subdomínio. Em subdomain-mode isso manda o slug errado (`clinica-a.pulso.center/patients` → envia `patients`) e o backend lê o cookie errado → auth quebra. Precisa tornar `getClinicSlug()` + o redirect de 401 **subdomain-aware** (reutilizar `extractSlugFromSubdomain` do `middleware.ts`); `backoffice.pulso.center` → slug genérico. Ver task `ajustar-auth-para-multidominio-com-api-dedicada` (escopo #5).
4. CloudFront deve **encaminhar o `Host` original** (Origin Request Policy) — o proxy roteia por Host e o `middleware.ts` deriva o slug dele. Encaminhar também `Origin`, `Authorization` e cookies.
5. CloudFront **não pode cachear respostas autenticadas** → CachingDisabled no default; cachear só `/_next/static/*` e assets. Cuidar do preflight (não cachear `OPTIONS` errado).
6. **DNS = Route 53** (decisão G). Hosted zone `pulso.center` **já criada** na conta **Workload**, **NS já delegados** no GoDaddy (zona autoritativa). ACM wildcard `*.pulso.center` **em us-east-1**, validação DNS na própria zona. O ALIAS wildcard cobre `api.*` **e** as clínicas com um record. Terraform gerencia os records via `data "aws_route53_zone"` (não recria a zona) — ver Fase 6.

---

## Tasks

O detalhe de execução de cada item está na respectiva pasta em `tasks/infra/<nome>/task-<area>.md`.

**Legenda de status:** ✅ concluída e validada · 🟡 código pronto, falta `terraform apply` · ⬜ não iniciada.

> **Progresso (2026-07-14):** tasks **1–5 concluídas e validadas** localmente. Tasks **6, 7 e 8 APLICADAS em staging** — RDS `pulso-staging.*.rds.amazonaws.com` no ar; EC2 t3.micro `i-0e6215a9b9839f369` (EIP `18.211.167.222`, IMDSv2) rodando; ECR `pulso-backend`/`pulso-frontend` criados; SG do EC2 com **80 só do prefix list do CloudFront** (sem SSH aberto) e RDS liberando **5432 só do SG do EC2**; borda no ar: ACM `*.pulso.center` **ISSUED**, CloudFront `E2OS15V1PU1G31` (`d14suz9lhx7m3i.cloudfront.net`) `Deployed`, Route 53 com A wildcard + apex → CloudFront. `DB_*` + JWT/Redis/etc. no SSM `/pulso/staging/backend/`. **Production não aplicada** (2ª instância RDS/EC2 sairia do free tier; a `cdn` de production é mutuamente exclusiva com a de staging no mesmo domínio). Task **9 aplicada e com deploy verde em staging** (run `29359378822`): backend/frontend/redis/proxy no ar, `migrate` criou o schema `staging` e rodou as migrations, `api.staging.pulso.center/health` → **200** (RDS via TLS), CORS 204 pros subdomínios de staging. **Staging LIVE em `staging.pulso.center`.** Falta só criar o 1º usuário admin (seed não roda em prod — a plataforma é fechada).

> **Bugs encontrados e corrigidos no 1º deploy (todos no `main`):** (a) `load-env.js` montava o path do SSM a partir do `NODE_ENV` (`production`) em vez do ambiente de deploy → `PARAMETER_STORE_ENV` (`2003fa4`); (b) RDS força TLS (`rds.force_ssl`) e os clients conectavam em cleartext → SSL nos dois clients (`57291e4`); (c) `nginx server_name` fixo em `api.pulso.center` → regex `~^api\.` p/ casar qualquer domínio + reload no deploy (`96842cb`); (d) regex de CORS só aceitava 1 nível de subdomínio → `*` p/ cobrir `*.staging.pulso.center` (`bf609d8`). Também: `pull --quiet` p/ o log do SSM não ser engolido pelo progresso (`65fe6d5`).
>
> **Domínio de staging decidido = `staging.pulso.center`** (reserva `pulso.center` p/ production). Código já ajustado (task 8 + `seed-ssm.sh`); **a borda ainda está no ar em `pulso.center`** — falta aplicar o rework (`deploy.sh staging apply`: 10 add / 1 change / 6 destroy) + re-seed do SSM, antes do 1º deploy. Os `NEXT_PUBLIC_*` (build-time) devem casar: `staging.pulso.center` / `api.staging.pulso.center`.
>
> **Bugs corrigidos no caminho:** (a) `seed-ssm.sh` falhava em valores `https://…` (`PUBLIC_API_URL`/`FRONTEND_URL`) por causa do `cli_follow_urlparam` do AWS CLI — reescrito para usar `--cli-input-json` via `jq`; (b) módulo `rds` tinha um em dash (`—`) na `GroupDescription` do Security Group, rejeitado pela API EC2 (só ASCII) — trocado por `-`. Ambos só apareceram no `apply` (o `plan` não pega).

| # | Status | Área | Task (pasta) | Depende de | Resumo |
|---|---|---|---|---|---|
| 1 | ✅ | infra | `preparar-imagens-docker-para-producao` | — | `.dockerignore` (fecha vazamento de `.env`), `USER node`, (opcional) podar `node_modules`. Fundação. |
| 2 | ✅ | infra | `carregar-variaveis-do-parameter-store-no-container` | 1 | Entrypoint que busca env do SSM no boot; padroniza path `/pulso/<env>/backend/`; script de seed do SSM. |
| 3 | ✅ | backend | `configurar-migrations-e-schema-no-deploy` | — | `migration:run:prod` (dataSource compilado) + `CREATE SCHEMA` (o `init.sql` não roda no RDS). |
| 4 | ✅ | backend + frontend | `ajustar-auth-para-multidominio-com-api-dedicada` | — | Cookie `Domain=.pulso.center` (preservando nomes por-slug) + CORS dinâmico `*.pulso.center` + build args + **api-client derivando slug do subdomínio** (bloqueante em prod). |
| 5 | ✅ | infra | `criar-reverse-proxy-e-compose-de-producao` | 1, 2, 3 | `docker-compose.prod.yml` (sem postgres/mailpit) + nginx roteando por Host (`api.*`→backend). |
| 6 | ✅ | infra | `provisionar-rds-postgres` | — | Módulo Terraform RDS (db.t4g.micro, privado, backup); grava `DB_HOST/PORT/USER/NAME/PASS` no SSM. **Aplicado em staging** (production pendente). |
| 7 | ✅ | infra | `provisionar-ecr-e-ec2-com-terraform` | 5, 6 | Módulos ECR + EC2 (t3.micro, swap, IAM, SG, EIP). Exporta o SG usado pelo RDS (liga `enable_ec2_ingress`). **Aplicado em staging** (EIP `18.211.167.222`; production pendente). |
| 8 | ✅ | infra | `provisionar-cloudfront-acm-e-route53` | 7 | ACM wildcard (us-east-1) + CloudFront + records na zona `pulso.center` existente. **Aplicado em staging** (cert `ISSUED`, CF `d14suz9lhx7m3i.cloudfront.net`). |
| 9 | ✅ | infra | `criar-pipeline-de-deploy-no-github-actions` | 5, 7 | Workflow manual: build→ECR→deploy via SSM Run Command. **Aplicado + deploy verde em staging** (`/health` 200, CORS ok). |

### O que falta para finalizar (checklist de conclusão)

- [x] **Task 6 — `apply` (staging):** SSM seedado (`seed-ssm.sh staging apply`) + `deploy.sh staging apply` → RDS + SES criados, `DB_HOST/DB_PASS` no SSM. **Falta o `apply` de production** (fora do free tier: 2ª instância RDS).
- [x] **Task 7 — aplicada em staging:** módulos `ecr` (repos `pulso-backend`/`pulso-frontend` + lifecycle) e `ec2-app` (t3.micro, swap 2GB, Docker, EIP `18.211.167.222`, SG restrito, IAM SSM/ECR/S3/SES/SSM-core, user-data). `apply` = 17 add / 0 change / 0 destroy. Verificado: EC2 `running` (IMDSv2), 80 só do prefix list `com.amazonaws.global.cloudfront.origin-facing`, RDS 5432 só do SG do EC2. **Production pendente.**
- [x] **Task 8 — aplicada em staging:** ACM wildcard `*.pulso.center` (us-east-1) `ISSUED`, CloudFront `E2OS15V1PU1G31` (`d14suz9lhx7m3i.cloudfront.net`) `Deployed` com aliases `*.pulso.center` + apex, origin HTTP-only no EIP do EC2, default `CachingDisabled` + `AllViewer`, `/_next/static/*` `CachingOptimized`; A wildcard + apex → CloudFront na zona `pulso.center`. **Production pendente** (cdn mutuamente exclusiva no mesmo domínio).
- [x] **Task 9 — código:** `.github/workflows/deploy.yml` (workflow_dispatch, jobs test→build/push→deploy) + `.github/scripts/ssm-deploy.sh` (deploy via SSM Run Command, embarca compose+nginx em base64) + módulo Terraform `github-oidc` (OIDC provider + role por ambiente). Build args `NEXT_PUBLIC_*` vêm de **variáveis do GitHub Environment** (não hardcoded — staging e production usam domínios distintos). `plan` staging = 4 add. **Falta:** `apply` da role OIDC (`deploy.sh staging apply`), configurar os GitHub Environments (`staging`/`production` com `AWS_DEPLOY_ROLE_ARN`, `NEXT_PUBLIC_BASE_DOMAIN`, `NEXT_PUBLIC_API_URL` + required reviewers em production) e disparar o 1º deploy.
- [x] **Domínio de staging decidido: `staging.pulso.center`** (reserva `pulso.center` p/ production). Código ajustado (módulo `cdn` separa `zone_name` do `domain`; staging `domain=staging.pulso.center`, `zone_name=pulso.center`; `seed-ssm.sh` deriva `COOKIE_DOMAIN`/`PUBLIC_API_URL`/`FRONTEND_URL` do env). **Falta aplicar:** `plan` staging = 10 add / 1 change / 6 destroy (troca cert `*.pulso.center`→`*.staging.pulso.center`, CloudFront in-place, records `pulso.center` destruídos e `staging.pulso.center` criados) + re-seed do SSM (`bash infra/scripts/seed-ssm.sh staging apply`). GitHub Environment `staging`: `NEXT_PUBLIC_BASE_DOMAIN=staging.pulso.center`, `NEXT_PUBLIC_API_URL=https://api.staging.pulso.center`.
- [ ] **Verificação end-to-end** (seção abaixo, itens 4–7): staging real, login/CRUD em 2 clínicas, cache do CloudFront não quebra auth.

### Grafo de dependências

```
1 ─► 2 ─┐
        ├─► 5 ─► 7 ─► 8
3 ──────┤        │
        │        └─► 9
4 (independente — código de auth; precisa estar pronto antes do build das imagens no CI, task 9)
6 ──────────────► 7
```

- **3, 4 e 6** são independentes no início — podem correr em paralelo. **4** precisa estar pronta antes do build das imagens (task 9), pois `NEXT_PUBLIC_*` são build-time.
- Sequência recomendada: **1 → 2 → 3 → 4 → 5** (validar Verificação 1–3 localmente) **→ 6 → 7 → 8 → 9** (staging) → replicar em production.

---

## Verificação (end-to-end)

1. **Local (imagens de prod)**: `docker compose -f docker-compose.prod.yml up -d` (Redis no container; pra teste local, um Postgres local temporário apontado via `DB_HOST` — em prod é o RDS):
   - `migrate` completa (`docker compose logs migrate`), cria o schema e as tabelas;
   - `curl -H "Host: api.pulso.center" http://localhost/health` → 200 (valida roteamento por Host → backend);
   - `curl -H "Host: clinica-teste.pulso.center" http://localhost/` → HTML do frontend (roteamento por Host → frontend);
   - **CORS/preflight**: `curl -i -X OPTIONS -H "Host: api.pulso.center" -H "Origin: https://clinica-teste.pulso.center" -H "Access-Control-Request-Method: POST" http://localhost/auth/login` → responde `Access-Control-Allow-Origin: https://clinica-teste.pulso.center` + `Allow-Credentials: true`;
   - front carrega com `Host: clinica-teste.pulso.center`, slug derivado, login seta cookie com `Domain=.pulso.center` e chamadas seguintes pra `api.pulso.center` o enviam (same-site, Strict).
2. **`.dockerignore`**: `docker run --rm <img> sh -c 'ls -la /app && test ! -f /app/.env'` — sem `.env`, `.git`, `node_modules` de dev.
3. **SSM entrypoint**: backend com instance profile loga `✓ .env.local generated with N variables from Parameter Store` e sobe sem "Missing required environment variable".
4. **Terraform**: `bash infra/scripts/deploy.sh staging plan` — revisar EC2 + ECR + CloudFront/ACM + **RDS** (single-AZ, não público, SG só do EC2, backup on) + Route 53 antes do `apply`. Após apply: confirmar `DB_HOST`/`DB_PASS` gravados no SSM, ACM `ISSUED`, e que o `migrate` criou schema + tabelas no RDS.
5. **EC2 + CloudFront reais**: com ACM validado → `https://alguma-clinica.pulso.center`, cadeado (wildcard), login + CRUD completo em **duas clínicas** (isolamento por slug). No host: `free -h` (swap ativo), `docker compose ps` tudo `healthy`. Confirmar que o backend conecta no RDS (não em container local).
6. **Cache não quebra auth**: login/refresh repetidos → respostas autenticadas com `X-Cache: Miss` (não cacheado); `/_next/static/*` com `Hit`.
7. **CI**: `workflow_dispatch` staging → push ECR + deploy EC2 sem intervenção manual.
