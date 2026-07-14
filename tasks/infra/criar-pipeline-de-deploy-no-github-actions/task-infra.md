# Task — Criar pipeline de deploy no GitHub Actions

## Descrição

Criar o workflow de CI/CD que builda as imagens Docker, envia ao ECR e faz o deploy no EC2 — com **acionamento manual** (`workflow_dispatch`), alinhado ao fluxo do projeto (`develop`→staging, `main`→production). O build acontece no CI (não no EC2, que tem só 1GB de RAM), e o deploy roda `docker compose pull && up -d` no host via SSM Run Command.

---

## Contexto

- Decisão A: CI builda + push pro ECR; o EC2 faz `pull`. Evita OOM no t3.micro e prepara pra ECS.
- Hoje **não existe** `.github/` no repo — todo o CI/CD é novo. A doc (`CLAUDE.md`) descreve acionamento manual e `develop`/`main` → staging/production.
- Depende de: ECR e EC2 provisionados (task de ECR/EC2), `docker-compose.prod.yml` + `nginx.conf` (task de compose), imagens hardened (task de imagens), build args do frontend (task de auth).
- O frontend tem build args **build-time**: `NEXT_PUBLIC_BASE_DOMAIN=pulso.center`, `NEXT_PUBLIC_API_URL=https://api.pulso.center`.
- O EC2 tem `AmazonSSMManagedInstanceCore` no role → deploy via **SSM Run Command** sem abrir SSH.

---

## Escopo

### `.github/workflows/deploy.yml` (novo)

`on: workflow_dispatch` com input `environment` (`staging` | `production`). Jobs:

1. **Test**: checkout, setup Node 22 + Yarn 4, `yarn install --immutable`, `yarn test` (unit). Falha barra o deploy.
2. **Build & push**:
   - Autenticar na AWS via **OIDC role** (preferir a `AWS_ACCESS_KEY_ID`/`SECRET` estáticos) — conta Workload.
   - `docker login` no ECR.
   - Build + push `pulso-backend` e `pulso-frontend`. O **frontend** recebe `--build-arg NEXT_PUBLIC_BASE_DOMAIN=pulso.center --build-arg NEXT_PUBLIC_API_URL=https://api.pulso.center`.
   - Tags: `<git-sha>` **e** `latest` (ou `<environment>`).
3. **Deploy**:
   - **SSM Run Command** na instância do ambiente: sincroniza `docker-compose.prod.yml` + `infra/proxy/nginx.conf` (via `git pull` no host **ou** cópia por SSM) e roda `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`.
   - O serviço `migrate` roda as migrations antes do backend subir.
   - (Opcional) invalidar `/_next/static/*` no CloudFront — geralmente desnecessário (hash no nome).

### Segredos / configuração do repositório
- Role OIDC (ou credenciais) da conta Workload com permissão de push no ECR e `ssm:SendCommand` na instância.
- Mapear `environment` → conta/instância/repos ECR (via GitHub Environments `staging`/`production`, com required reviewers em production).

**Arquivos:** `.github/workflows/deploy.yml` (novo); referência a `docker-compose.prod.yml` e `infra/proxy/nginx.conf`.

---

## Decisões técnicas

- **Build no CI, não no EC2**: t3.micro (1GB) faz OOM buildando Next.js; o CI builda e o host só puxa.
- **OIDC** em vez de chaves estáticas: sem secret de longa duração no GitHub; role assumida por federação.
- **SSM Run Command** em vez de SSH: não precisa abrir 22 pro GitHub nem gerenciar chave; usa o agent já presente no AL2023.
- **`workflow_dispatch`**: deploy é sempre manual (requisito do projeto); GitHub Environments dá gate/approval em production.
- **Migrations no deploy** via serviço `migrate` do compose — o pipeline não roda migration separadamente, evita drift.

---

## Restrições

- NÃO buildar imagens no EC2.
- NÃO commitar credenciais AWS — usar OIDC/GitHub Secrets/Environments.
- NÃO fazer deploy automático em push (só `workflow_dispatch`).
- NÃO expor secrets nos logs do Actions (mascarar; não `echo` de env sensível).
- Deploy nunca feito da máquina local — sempre pelo workflow.

---

## Definition of Done

- [x] `.github/workflows/deploy.yml` com `workflow_dispatch` (input `environment`) e jobs test → build/push → deploy.
- [x] Autenticação AWS via OIDC role (conta Workload) — módulo `github-oidc` (provider + role por ambiente), `role-to-assume` no workflow.
- [x] Imagens `pulso-backend`/`pulso-frontend` no ECR, tagueadas por sha + latest; frontend com build args (via variáveis do GitHub Environment).
- [x] Deploy via SSM Run Command (`.github/scripts/ssm-deploy.sh`) roda `docker compose pull && up -d`; `migrate` aplica migrations antes do backend (via `depends_on` do compose).
- [~] GitHub Environments `staging`/`production` configurados (approval em production). → **config manual no GitHub** (não versionável) — passos abaixo.
- [~] Rodar o workflow para staging conclui sem intervenção; app no ar via CloudFront. → **depende do `apply` da role + config dos Environments + 1º dispatch**.
- [ ] `CHANGELOG.md` / doc de deploy — n/a por ora.

> **Execução (2026-07-14) — código pronto, `plan`-only:**
> - **Workflow `.github/workflows/deploy.yml`:** `workflow_dispatch` com input `environment` (staging|production). Jobs: **test** (Node 22 + corepack/Yarn 4, `yarn install --immutable`, `test:unit` de frontend e backend) → **build-and-push** (OIDC via `aws-actions/configure-aws-credentials@v4` + `amazon-ecr-login@v2`; build/push `pulso-backend` e `pulso-frontend` com tags `<sha>` + `latest`; frontend recebe `--build-arg NEXT_PUBLIC_BASE_DOMAIN/NEXT_PUBLIC_API_URL` das **variáveis do Environment**, com guard se vazias) → **deploy** (roda `ssm-deploy.sh`). `permissions: id-token: write`. Os jobs build/deploy usam `environment: ${{ inputs.environment }}` para casar o `sub` do OIDC (`repo:owner/repo:environment:<env>`).
> - **`.github/scripts/ssm-deploy.sh`:** descobre a instância por tag `Name=pulso-<env>`; embarca `docker-compose.prod.yml` + `infra/proxy/nginx.conf` em base64 num script remoto; `aws ssm send-command` (`AWS-RunShellScript`, via `--cli-input-json`/`jq` p/ evitar o `cli_follow_urlparam`); faz poll do `get-command-invocation` até `Success`, imprime stdout/stderr, falha o job se não sucesso. O remoto escreve os arquivos em `/opt/pulso/app`, gera `deploy.env` (`ECR_REGISTRY`/`IMAGE_TAG`/`AWS_REGION`), faz `ecr login` e `docker compose pull && up -d`.
> - **Módulo `github-oidc`:** `aws_iam_openid_connect_provider` (account-wide — staging cria, production referencia via data source com `create_oidc_provider=false`) + role `pulso-<env>-ci-deploy` com trust OIDC escopado ao **GitHub Environment** (`...:environment:<env>`); policies: ECR push (nos ARNs dos repos), `ssm:SendCommand` (escopado à instância do env + document `AWS-RunShellScript`) + leitura do resultado + `ec2:DescribeInstances`. Output `role_arn` exposto como `github_actions_role_arn` no ambiente.
> - **Validação:** `validate` OK nos dois ambientes; `plan` staging = **4 add / 0 change / 0 destroy** (provider + role + 2 policies); YAML do workflow válido; sem OIDC provider pré-existente na conta.
>
> **Setup manual no GitHub (após `deploy.sh staging apply` da role):**
> 1. Pegar o ARN: `terraform output -raw github_actions_role_arn` (via `deploy.sh staging output`).
> 2. Criar os **Environments** `staging` e `production` (Settings → Environments); em production, marcar **required reviewers**.
> 3. Em cada Environment, criar as **Variables**: `AWS_DEPLOY_ROLE_ARN` (o ARN da role do ambiente), `NEXT_PUBLIC_BASE_DOMAIN`, `NEXT_PUBLIC_API_URL`.
> 4. Actions → **Deploy** → Run workflow → escolher `staging`.
>
> **⚠️ Domínio de staging:** os `NEXT_PUBLIC_*` são build-time e precisam bater com a borda. Hoje a borda de staging está em `pulso.center`. Se `pulso.center` for reservado p/ production, definir o domínio de staging (ex.: `staging.pulso.center`) e ajustar a task 8 (ACM/CloudFront/Route53) + SSM de staging **antes** do 1º deploy.
