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

**Ambiente único: `production`.** Não há mais ambiente de staging na AWS —
validação pré-deploy é local via Docker (ver `README.md` → "Infraestrutura local
(Docker)"). ECR e o GitHub OIDC provider (account-wide) vivem num ambiente
`shared` à parte (`infra/terraform/environments/shared/`), aplicado uma única vez
e independente de qualquer ambiente ser criado/destruído.

| Ambiente | Terraform env | Domínio servido | API | Hosted zone |
|---|---|---|---|---|
| Produção | `production` | `*.pulso.center` | `api.pulso.center` | `pulso.center` (`Z05741901K0E017VXXPD2`) |

> **Free tier:** RDS e EC2 free tier cobrem **uma** instância cada — com um único
> ambiente aplicado, o projeto permanece dentro do free tier.

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

Ordem: **`shared` (ECR + OIDC provider) → seed do SSM → `terraform apply` de
`production` → GitHub → 1º deploy**.

### 3.0. Aplicar o ambiente `shared`

Pré-requisito único, aplicado antes de qualquer ambiente: ECR (repositórios de
imagem) e o GitHub OIDC provider (account-wide) vivem em
`infra/terraform/environments/shared/`, para sobreviver independente de
`production` (ou qualquer ambiente futuro) ser recriado ou destruído.

```bash
bash infra/scripts/deploy.sh shared plan
bash infra/scripts/deploy.sh shared apply
```

### 3.1. Popular o SSM Parameter Store

Grava a config do backend em `/pulso/production/backend/*`. Os valores de domínio
(`COOKIE_DOMAIN`, `PUBLIC_API_URL`, `FRONTEND_URL`) são derivados do ambiente
(`production` → `pulso.center`). `DB_HOST/PORT/USER/NAME/PASS` **não** são
gravados aqui — o módulo RDS é a fonte de verdade deles.

```bash
# Dry-run (imprime só os NOMES, nunca valores):
JWT_SECRET=dummy bash infra/scripts/seed-ssm.sh production

# Gravar de fato (guarde o JWT_SECRET com segurança — trocá-lo invalida sessões):
JWT_SECRET="$(openssl rand -base64 48)" bash infra/scripts/seed-ssm.sh production apply
```

> Params opcionais de outros módulos (`AWS_S3_BUCKET`, `SMTP_HOST/USER/PASS`) podem
> ser passados por env var; se ausentes, são pulados e podem ser seedados depois a
> partir dos outputs do Terraform.

### 3.2. Aplicar a infraestrutura

```bash
# Revisar o plano:
bash infra/scripts/deploy.sh production plan

# Aplicar (cria S3/SES/RDS/EC2/CloudFront/ACM/Route53/role de CI):
bash infra/scripts/deploy.sh production apply
```

> **⚠️ DNS/cert:** o apply cria/altera records no Route 53 e o cert ACM na zona
> `pulso.center`. RDS leva ~5–10 min; CloudFront + validação ACM, ~5–20 min.

Depois do apply, colete os outputs:

```bash
bash infra/scripts/deploy.sh production output
# github_actions_role_arn, ec2_public_ip, cloudfront_domain_name, ...
```

### 3.3. Configurar o GitHub

No repositório (`Settings → Environments`), crie o Environment **`production`**
(com **required reviewers**) e adicione as **Variables**:

| Variable | Valor |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | output `github_actions_role_arn` |
| `NEXT_PUBLIC_BASE_DOMAIN` | `pulso.center` |
| `NEXT_PUBLIC_API_URL` | `https://api.pulso.center` |

> Não há secret de AWS no GitHub — a autenticação é por **OIDC** (a role é assumível
> só pelo Environment correspondente).

### 3.4. Primeiro admin da plataforma (backoffice)

A plataforma é fechada (`POST /users` não é público) e **seeds não rodam em
produção**, então o primeiro `PLATFORM_ADMIN` é criado uma vez com um script. Ele
roda um container backend efêmero no EC2 via SSM (sem SSH), reusando a imagem já
deployada e o carregamento de env do SSM. A senha é **hasheada localmente** (bcrypt),
então o texto puro nunca passa pelo SSM. Idempotente.

> O seed roda pelo caminho `apps/backend/scripts/seed-platform-admin.js` **dentro
> da imagem**, então a imagem deployada precisa ter sido buildada de um commit que
> já inclui esse arquivo — ou seja, rode um **Deploy** uma vez antes do primeiro seed.

```bash
ADMIN_EMAIL=admin@pulso.center ADMIN_PASSWORD='uma-senha-forte' \
  bash infra/scripts/seed-platform-admin.sh production
```

Depois, logar em `https://backoffice.pulso.center` com esse e-mail/senha. A senha
pode ser trocada depois pelo próprio app.

---

## 4. Deploy de rotina

Todo deploy é **manual** (`workflow_dispatch`) — nunca automático em push.

1. **Actions → Deploy → Run workflow**.
2. `environment: production` (único ambiente existente).
3. O workflow roda: **test** (unit) → **build & push** (imagens `pulso-backend`/`pulso-frontend`/`pulso-website` no ECR, tags `<sha>` + `latest`) → **deploy** (SSM Run Command no EC2: `docker compose pull && up -d`; o serviço `migrate` aplica as migrations antes do backend).

Disparado a partir de `main`. Validação pré-deploy é local via Docker (ver
`README.md` → "Infraestrutura local (Docker)"), não contra um ambiente
intermediário na AWS.

### Versionamento (ao promover para produção)
Antes de disparar production, seguir o fluxo do `CLAUDE.md`: atualizar a `version`
no `package.json` do app, criar a tag git (`frontend/vX.Y.Z` / `backend/vX.Y.Z`) e
atualizar o `CHANGELOG.md` do app.

---

## 5. Verificação pós-deploy

```bash
# Health do backend (via CloudFront):
curl -i https://api.pulso.center/health          # → 200

# Frontend de uma clínica (cadeado válido, wildcard):
curl -I https://<clinica>.pulso.center           # → 200, HTML

# Cache: autenticado não cacheia; estáticos cacheiam
curl -I https://<clinica>.pulso.center/_next/static/...  # X-Cache: Hit
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
| Login não persiste entre `slug.*` e `api.*` | `COOKIE_DOMAIN` errado | Deve ser `.pulso.center` no SSM; re-seedar |
| Slug errado nas requests | Build do frontend com `NEXT_PUBLIC_BASE_DOMAIN` errado | Conferir a Variable do Environment e rebuildar |
| ACM não valida | Record de validação ausente na zona | Confirmar zona delegada; `aws acm describe-certificate` (status `ISSUED`) |
| Backend não sobe: "Missing required environment variable" | SSM incompleto / role sem acesso | Conferir `/pulso/<env>/backend/*` e a policy SSM do role da instância |

---

## 8. Referência rápida — produção

| Recurso | Valor |
|---|---|
| RDS | preencher com `bash infra/scripts/deploy.sh production output` após o apply |
| EC2 | idem |
| ECR | `796669927752.dkr.ecr.us-east-1.amazonaws.com/pulso-{backend,frontend,website}` (ambiente `shared`) |
| CloudFront | preencher após o apply |
| Hosted zone | `pulso.center` — `Z05741901K0E017VXXPD2` |
| SSM prefix | `/pulso/production/backend/` |

> **Migração em andamento (2026-08-03):** produção está sendo provisionada pela
> primeira vez e staging está sendo descomissionado, para manter um único
> ambiente na AWS e reduzir custo — validação pré-deploy passa a ser local via
> Docker. Ver `tasks/RELIABILITY_BACKLOG.md`. Preencher esta tabela com os
> outputs reais assim que `infra/scripts/deploy.sh production apply` rodar.
