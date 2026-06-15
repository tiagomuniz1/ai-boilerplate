# Task — Infraestrutura Terraform: Bucket S3 para Logomarcas

## Descrição
Criar a estrutura Terraform do projeto e provisionar o bucket S3 que armazenará as logomarcas das clínicas. Esta é a primeira task de infraestrutura como código (IaC) do projeto — estabelece as convenções e a estrutura base que serão reutilizadas em tasks futuras.

---

## Contexto
- O projeto não possui Terraform ainda — esta task cria a estrutura do zero.
- O bucket S3 será usado exclusivamente para armazenar arquivos estáticos das clínicas (logomarcas). Cada logo é salva em `clinics/{clinicId}/logo.{ext}`.
- O acesso ao bucket é feito pela aplicação backend (ECS) via IAM Role — sem credenciais hardcoded.
- Os objetos são públicos individualmente via ACL de objeto, permitindo que o frontend exiba a logo por URL direta sem presigned URLs.
- O nome do bucket e a região devem ser adicionados ao AWS Parameter Store para que o backend os consuma via `env.config.ts`.

---

## Estrutura esperada

```
infra/
  scripts/
    bootstrap.sh         → cria o bucket de remote state (executar antes do terraform init)
  terraform/
    environments/
      staging/
        main.tf          → instancia os módulos com variáveis de staging
        variables.tf
        outputs.tf
        backend.tf       → remote state (S3 native locking)
      production/
        main.tf          → instancia os módulos com variáveis de production
        variables.tf
        outputs.tf
        backend.tf
    modules/
      s3-clinic-assets/
        main.tf          → bucket, ACL, CORS, lifecycle, policy
        variables.tf
        outputs.tf
```

---

## Recursos a provisionar

### Bucket S3 (`aws_s3_bucket`)
- Nome: `clinic-assets-{environment}` (ex: `clinic-assets-staging`)
- Região: `us-east-1` (ou conforme convenção do projeto)
- Versionamento: desativado (logos são sobrescritas, não há histórico)
- Lifecycle: expirar versões antigas (caso versionamento seja ativado futuramente)

### Bloqueio de acesso público (`aws_s3_bucket_public_access_block`)
- `block_public_acls`: `false` — necessário para ACLs de objeto públicos
- `block_public_policy`: `false`
- `ignore_public_acls`: `false`
- `restrict_public_buckets`: `false`

### ACL do bucket (`aws_s3_bucket_acl`)
- `acl`: `public-read` — objetos herdam leitura pública por padrão ao ser enviados com a ACL correta

### CORS (`aws_s3_bucket_cors_configuration`)
- `allowed_origins`: `["*"]` em staging / URLs da aplicação em production
- `allowed_methods`: `["GET"]`
- `allowed_headers`: `["*"]`
- `max_age_seconds`: `3600`

### Política do bucket (`aws_s3_bucket_policy`)
- Permitir `s3:GetObject` para `Principal: "*"` em objetos do path `clinics/*`
- Restringir `s3:PutObject` e `s3:DeleteObject` à IAM Role da aplicação ECS

### IAM Policy (`aws_iam_policy`)
- Permissões para a aplicação backend:
  - `s3:PutObject` — upload de logo
  - `s3:DeleteObject` — remoção futura
  - `s3:GetObject` — verificação
- Escopo restrito ao bucket e path `clinics/*`
- Anexar à IAM Role existente do ECS (via `aws_iam_role_policy_attachment`)

### Remote State e Lock
- Bucket dedicado `terraform-state` armazena tanto o state quanto o lockfile do Terraform
- Lock via S3 native locking (Terraform ≥ 1.10 com `use_lockfile = true`) — sem DynamoDB, sem arquivo local
- Nem o state nem o lockfile são commitados no repositório

---

## Variáveis de ambiente (Parameter Store)

Após provisionar, adicionar ao AWS Parameter Store:

| Parâmetro | Valor |
|---|---|
| `/{app}/{env}/AWS_S3_BUCKET` | nome do bucket criado |
| `/{app}/{env}/AWS_REGION` | região do bucket |

Esses parâmetros são consumidos pelo backend via `env.config.ts` (já existente) — não requer mudança no código da aplicação, apenas o provisionamento dos valores.

---

## Autenticação AWS

O Terraform autentica usando um **AWS CLI profile pessoal** configurado em `~/.aws/credentials` ou `~/.aws/config`.

```hcl
# environments/staging/variables.tf
variable "aws_profile" {
  description = "AWS CLI profile to use for authentication"
  type        = string
  default     = "default"
}

# environments/staging/main.tf (provider block)
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}
```

Para rodar localmente, passar o profile como variável:

```bash
terraform plan  -var="aws_profile=<nome-do-profile>"
terraform apply -var="aws_profile=<nome-do-profile>"
```

Ou via arquivo `terraform.tfvars` (não commitado — já incluso no `.gitignore`):

```hcl
# infra/terraform/environments/staging/terraform.tfvars  (não commitar)
aws_profile = "nome-do-profile-pessoal"
```

> **CI/CD (GitHub Actions):** o provider AWS não deve ter `profile` hardcoded — usar variáveis de ambiente `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` injetadas pelos secrets do Actions. O atributo `profile` deve ser omitido ou controlado por variável para não quebrar o CI.

---

## Fluxo de provisionamento

### 1. Bootstrap (uma única vez, antes de qualquer `terraform init`)

Executar o script de bootstrap que cria o bucket de remote state:

```bash
bash infra/scripts/bootstrap.sh <environment> <aws-profile>
# ex: bash infra/scripts/bootstrap.sh staging nome-do-profile-pessoal
```

O script deve:
1. Verificar se o bucket `terraform-state` já existe — pular se sim
2. Criar o bucket S3 com versionamento ativado (protege o state contra sobrescrita acidental)
3. Bloquear acesso público ao bucket de state (este bucket nunca deve ser público)
4. Exibir mensagem de confirmação com o nome do bucket criado

O script usa `--profile` em todos os comandos AWS CLI:

```bash
aws s3api create-bucket --bucket terraform-state --profile "$AWS_PROFILE" ...
```

### 2. Provisionar infraestrutura

```bash
# Staging
cd infra/terraform/environments/staging
terraform init
terraform plan  -var="aws_profile=<nome-do-profile>"
terraform apply -var="aws_profile=<nome-do-profile>"

# Production (após validar staging)
cd infra/terraform/environments/production
terraform init
terraform plan  -var="aws_profile=<nome-do-profile>"
terraform apply -var="aws_profile=<nome-do-profile>"
```

---

## Decisões técnicas da task

- **Módulo reutilizável:** `s3-clinic-assets` é um módulo Terraform próprio — permite instanciar com parâmetros diferentes por ambiente sem duplicar código.
- **ACL de objeto público:** objetos são enviados com `ACL: public-read` pela aplicação — a URL pública não expira e pode ser usada diretamente no `<img>` do frontend.
- **Sem presigned URLs:** simplicidade operacional — logos são dados não sensíveis, URL pública é suficiente.
- **Remote state + lock no S3:** bucket `terraform-state` centraliza state e lock — sem DynamoDB, sem arquivos locais commitados. Lock via S3 native locking (`use_lockfile = true`, requer Terraform ≥ 1.10).
- **Naming com environment:** `clinic-assets-staging` e `clinic-assets-production` — isolamento completo entre ambientes.

---

## Restrições

- NÃO hardcodar credenciais AWS nem o nome do profile em nenhum arquivo `.tf` commitado — usar variável com `default` ou `terraform.tfvars` (no `.gitignore`).
- NÃO commitar `terraform.tfstate`, `*.tfstate.backup` nem `.terraform.lock.hcl` — tudo fica no bucket `terraform-state`.
- NÃO commitar `.tfvars` com valores sensíveis — usar Parameter Store ou variáveis de ambiente no CI.
- NÃO usar o mesmo bucket de assets para staging e production.
- NÃO dar permissões mais amplas que o necessário na IAM Policy (princípio do menor privilégio).
- Adicionar `infra/terraform/**/.terraform/`, `**/*.tfstate*` e `**/.terraform.lock.hcl` ao `.gitignore`.

---

## Definition of Done

- [ ] Script `infra/scripts/bootstrap.sh` criado e funcional (idempotente — seguro rodar mais de uma vez)
- [ ] Estrutura `infra/terraform/` criada com módulo `s3-clinic-assets` e environments `staging` / `production`
- [ ] Bucket `clinic-assets-staging` provisionado e acessível
- [ ] Objetos no path `clinics/*` acessíveis publicamente via URL direta
- [ ] IAM Policy restrita ao bucket e path `clinics/*` criada e anexada à Role do ECS
- [ ] CORS configurado permitindo `GET` de qualquer origem
- [ ] Remote state e lock configurados no bucket `terraform-state` (S3 native locking, sem DynamoDB)
- [ ] Parâmetros `AWS_S3_BUCKET` e `AWS_REGION` adicionados ao Parameter Store de staging e production
- [ ] `.gitignore` atualizado para excluir `.terraform/`, `*.tfstate`, `*.tfstate.backup`
- [ ] `terraform plan` sem erros ou diffs inesperados após o apply
- [ ] Bucket de production provisionado após validação em staging
