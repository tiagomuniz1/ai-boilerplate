# Infraestrutura (Terraform)

A infraestrutura do projeto vive em `infra/terraform/` e é provisionada com Terraform,
em três ambientes (`infra/terraform/environments/`):

| Ambiente | O quê |
|---|---|
| `shared` | ECR (imagens Docker) + o GitHub OIDC provider (account-wide) — sobrevive independente de qualquer ambiente ser criado/destruído |
| `production` | EC2, RDS, S3 (assets de clínica), SES, CloudFront/ACM/Route 53 — o único ambiente vivo na AWS |

Não há mais ambiente de `staging` na AWS — validação pré-deploy é local via Docker
(ver `README.md` → "Infraestrutura local (Docker)").

## Contas AWS

O setup usa **duas contas / dois profiles** — é o detalhe que os scripts encapsulam:

| Papel | Conta | Profile local | Para quê |
|---|---|---|---|
| DevOps | `500905575906` | `pulso-devops` | Guarda o **state** remoto (bucket S3 do Terraform) |
| Workload | `796669927752` | `pulso-workload` | Onde os **recursos** são criados |

O profile DevOps autentica o backend S3 (via `terraform init -backend-config`).
O profile Workload autentica o provider AWS (via `-var="aws_profile=..."`).

## Pré-requisitos

- [Terraform](https://developer.hashicorp.com/terraform) `>= 1.10`
- AWS CLI com os dois profiles configurados. Confirme com:

  ```bash
  aws configure list-profiles
  ```

  Devem aparecer `pulso-devops` e `pulso-workload`. Se usar SSO, faça login antes:
  `aws sso login --profile pulso-devops` e `aws sso login --profile pulso-workload`.

## Uso via scripts do package.json (recomendado)

Cada comando já vem com o ambiente e a ação fixados:

```bash
# Shared (ECR + GitHub OIDC provider — aplicar antes de production)
yarn infra:shared:plan
yarn infra:shared:apply
yarn infra:shared:output

# Production
yarn infra:production:plan
yarn infra:production:apply
yarn infra:production:output
yarn infra:production:destroy
```

## Uso direto do script

Os atalhos acima chamam `infra/scripts/deploy.sh`, que pode ser usado direto:

```bash
bash infra/scripts/deploy.sh <environment> [action]

#   environment : shared | production
#   action      : plan (padrão) | apply | destroy | init | output
```

O script:

1. Valida que os dois profiles resolvem para as contas AWS esperadas
   (`aws sts get-caller-identity`) — falha cedo se você estiver logado na conta errada.
2. Roda `terraform init` com o profile do backend (DevOps).
3. Executa a ação passando `-var="aws_profile=<workload>"`.

### Sobrescrevendo os profiles

Os profiles padrão são `pulso-devops` (DevOps) e `pulso-workload` (Workload).
Para usar outros sem editar o script:

```bash
DEVOPS_PROFILE=outro WORKLOAD_PROFILE=outro yarn infra:production:apply
```

## Bootstrap (primeira vez)

O bucket de state precisa existir antes do primeiro `init`. Ele é criado uma única vez
por `infra/scripts/bootstrap.sh`:

```bash
bash infra/scripts/bootstrap.sh <environment> <devops-aws-profile>
# ex: bash infra/scripts/bootstrap.sh production pulso-devops
```

## CI/CD

Em GitHub Actions os profiles são omitidos — a autenticação vai por
`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (secrets do repositório), conforme
documentado em `infra/terraform/environments/*/backend.tf`.
