# Runbook de Deploy — AWS (EC2 + RDS + CloudFront)

Guia operacional para provisionar a infraestrutura e fazer deploy da aplicação
(NestJS + Next.js) na AWS. Para o desenho e as decisões, ver
[`tasks/DEPLOY_AWS_EC2_PLAN.md`](../tasks/DEPLOY_AWS_EC2_PLAN.md).

---

## 1. Arquitetura (resumo)

```
*.<dominio>  →  Route 53  →  CloudFront (TLS/ACM)  →  HTTP  →  EC2 t3.micro
                                                              proxy nginx (:80) roteia por Host
                                                                ├─ api.<dominio> → backend (Nest :3001)
                                                                └─ *.<dominio>   → frontend (Next :3000)
                                                              redis (container)
                                                    backend → RDS PostgreSQL (privado, SG só do EC2)
```

- **TLS** termina na CloudFront (cert ACM wildcard); CloudFront → EC2 é **HTTP** (SG do EC2 só aceita 80 do prefix list do CloudFront).
- **Postgres** no RDS (durável, backup/PITR). **Redis** no container do EC2 (cache/lock efêmero).
- **Imagens** buildadas no **CI** e enviadas ao **ECR**; o EC2 só faz `pull` (build no t3.micro faria OOM).
- **Env em runtime** vem do **SSM Parameter Store** (`/pulso/<env>/backend/*`), carregado no boot do container.

### Contas AWS

| Conta | ID | Papel | Perfil AWS CLI |
|---|---|---|---|
| DevOps | `500905575906` | State do Terraform (S3) | `pulso-devops` |
| Workload | `796669927752` | Recursos da aplicação | `pulso-workload` |

### Ambientes e domínios

| Ambiente | Terraform env | Domínio servido | API | Hosted zone |
|---|---|---|---|---|
| Staging | `staging` | `*.staging.pulso.center` | `api.staging.pulso.center` | `pulso.center` (`Z05741901K0E017VXXPD2`) |
| Produção | `production` | `*.pulso.center` | `api.pulso.center` | `pulso.center` |

> **Free tier:** RDS e EC2 free tier cobrem **uma** instância cada. Hoje só o
> ambiente **staging** está aplicado. Aplicar production cria uma 2ª instância de
> cada (sai do free tier) e a `cdn` de production é **mutuamente exclusiva** com a
> de staging no mesmo domínio.

---

## 2. Pré-requisitos

- AWS CLI configurado com os perfis `pulso-devops` e `pulso-workload` (`aws configure --profile ...` ou SSO). Verifique:
  ```bash
  aws sts get-caller-identity --profile pulso-devops    # → 500905575906
  aws sts get-caller-identity --profile pulso-workload  # → 796669927752
  ```
- Terraform >= 1.10, `jq`, `openssl`.
- Hosted zone `pulso.center` já criada na conta Workload, com os NS delegados no registrar. (Já feito.)

---

## 3. Setup inicial de um ambiente (uma vez)

Ordem: **seed do SSM → `terraform apply` → GitHub → 1º deploy**. Exemplos com `staging`.

### 3.1. Popular o SSM Parameter Store

Grava a config do backend em `/pulso/staging/backend/*`. Os valores de domínio
(`COOKIE_DOMAIN`, `PUBLIC_API_URL`, `FRONTEND_URL`) são derivados do ambiente
(`staging` → `staging.pulso.center`). `DB_HOST/PORT/USER/NAME/PASS` **não** são
gravados aqui — o módulo RDS é a fonte de verdade deles.

```bash
# Dry-run (imprime só os NOMES, nunca valores):
JWT_SECRET=dummy bash infra/scripts/seed-ssm.sh staging

# Gravar de fato (guarde o JWT_SECRET com segurança — trocá-lo invalida sessões):
JWT_SECRET="$(openssl rand -base64 48)" bash infra/scripts/seed-ssm.sh staging apply
```

> Params opcionais de outros módulos (`AWS_S3_BUCKET`, `SMTP_HOST/USER/PASS`) podem
> ser passados por env var; se ausentes, são pulados e podem ser seedados depois a
> partir dos outputs do Terraform.

### 3.2. Aplicar a infraestrutura

```bash
# Revisar o plano:
bash infra/scripts/deploy.sh staging plan

# Aplicar (cria S3/SES/RDS/ECR/EC2/CloudFront/ACM/Route53/OIDC role):
bash infra/scripts/deploy.sh staging apply
```

> **⚠️ DNS/cert:** o apply cria/altera records no Route 53 e o cert ACM na zona
> `pulso.center`. RDS leva ~5–10 min; CloudFront + validação ACM, ~5–20 min.

Depois do apply, colete os outputs:

```bash
bash infra/scripts/deploy.sh staging output
# github_actions_role_arn, ec2_public_ip, cloudfront_domain_name, ecr_registry_url, ...
```

### 3.3. Configurar o GitHub

No repositório (`Settings → Environments`), crie o Environment **`staging`**
(e `production`, com **required reviewers**). Em cada um, adicione as **Variables**:

| Variable | Staging | Produção |
|---|---|---|
| `AWS_DEPLOY_ROLE_ARN` | output `github_actions_role_arn` do env | idem (role de produção) |
| `NEXT_PUBLIC_BASE_DOMAIN` | `staging.pulso.center` | `pulso.center` |
| `NEXT_PUBLIC_API_URL` | `https://api.staging.pulso.center` | `https://api.pulso.center` |

> Não há secret de AWS no GitHub — a autenticação é por **OIDC** (a role é assumível
> só pelo Environment correspondente).

---

## 4. Deploy de rotina

Todo deploy é **manual** (`workflow_dispatch`) — nunca automático em push.

1. **Actions → Deploy → Run workflow**.
2. Escolha o `environment` (`staging` ou `production`).
3. O workflow roda: **test** (unit) → **build & push** (imagens `pulso-backend`/`pulso-frontend` no ECR, tags `<sha>` + `latest`) → **deploy** (SSM Run Command no EC2: `docker compose pull && up -d`; o serviço `migrate` aplica as migrations antes do backend).

Convenção de branch (aplicada pelo operador ao disparar, não por trigger):
`develop` → `staging`, `main` → `production`.

### Versionamento (ao promover para produção)
Antes de disparar production, seguir o fluxo do `CLAUDE.md`: atualizar a `version`
no `package.json` do app, criar a tag git (`frontend/vX.Y.Z` / `backend/vX.Y.Z`) e
atualizar o `CHANGELOG.md` do app.

---

## 5. Verificação pós-deploy

```bash
# Health do backend (via CloudFront):
curl -i https://api.staging.pulso.center/health          # → 200

# Frontend de uma clínica (cadeado válido, wildcard):
curl -I https://<clinica>.staging.pulso.center           # → 200, HTML

# Cache: autenticado não cacheia; estáticos cacheiam
curl -I https://<clinica>.staging.pulso.center/_next/static/...  # X-Cache: Hit
```

No host (via SSM Session Manager — `aws ssm start-session --target <instance-id> --profile pulso-workload`):
```bash
docker compose -f /opt/pulso/app/docker-compose.prod.yml ps   # tudo healthy
free -h                                                        # swap ativo
```

---

## 6. Rollback

O deploy taggeia cada imagem com o `<git-sha>`. Para voltar a uma versão anterior,
faça o deploy do commit correspondente (Run workflow a partir do ref antigo) ou,
emergencialmente, no host:

```bash
# via SSM Session Manager, no EC2:
cd /opt/pulso/app
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=<sha-anterior>/' deploy.env
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <registry>
docker compose --env-file deploy.env -f docker-compose.prod.yml up -d
```

> Migrations não têm rollback automático — reverta com `migration:revert` só se a
> migration nova for incompatível (ver `CLAUDE.md`).

---

## 7. Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| `502`/`504` em `<clinica>.<dominio>` | Stack não subiu (sem imagens no ECR, ou containers down) | Rodar o workflow de deploy; conferir `docker compose ps` no host |
| Deploy falha no job **deploy** | Instância não encontrada / SSM sem conexão | Conferir tag `Name=pulso-<env>` e `running`; SSM agent registrado (`aws ssm describe-instance-information`) |
| `403` de CORS no browser | Origem fora da allowlist `*.<dominio>` | Conferir `main.ts` (CORS dinâmico) e o domínio buildado (`NEXT_PUBLIC_*`) |
| Login não persiste entre `slug.*` e `api.*` | `COOKIE_DOMAIN` errado | Deve ser `.<dominio>` (ex.: `.staging.pulso.center`) no SSM; re-seedar |
| Slug errado nas requests | Build do frontend com `NEXT_PUBLIC_BASE_DOMAIN` errado | Conferir a Variable do Environment e rebuildar |
| ACM não valida | Record de validação ausente na zona | Confirmar zona delegada; `aws acm describe-certificate` (status `ISSUED`) |
| Backend não sobe: "Missing required environment variable" | SSM incompleto / role sem acesso | Conferir `/pulso/<env>/backend/*` e a policy SSM do role da instância |

---

## 8. Referência rápida — staging (estado atual)

| Recurso | Valor |
|---|---|
| RDS | `pulso-staging.cuh4myyqm4zs.us-east-1.rds.amazonaws.com` |
| EC2 | `i-0e6215a9b9839f369` — EIP `18.211.167.222` |
| ECR | `796669927752.dkr.ecr.us-east-1.amazonaws.com/pulso-{backend,frontend}` |
| CloudFront | `E2OS15V1PU1G31` — `d14suz9lhx7m3i.cloudfront.net` |
| Hosted zone | `pulso.center` — `Z05741901K0E017VXXPD2` |
| SSM prefix | `/pulso/staging/backend/` |

> A borda de staging migra de `pulso.center` para `staging.pulso.center` no próximo
> `deploy.sh staging apply` (rework de ACM/CloudFront/Route 53). Ver o plano.
