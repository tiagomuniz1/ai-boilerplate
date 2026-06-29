# Task — Infraestrutura Terraform: AWS SES para Envio de E-mails

## Descrição

Provisionar o AWS Simple Email Service (SES) para habilitar o envio de e-mails transacionais da plataforma — começando pelo e-mail de definição de senha para médicos recém-cadastrados. A task cria um novo módulo Terraform `ses-email`, adiciona nos dois ambientes e documenta o que precisa ser configurado manualmente (DNS e saída do sandbox).

---

## Contexto

- O backend usará **Nodemailer + SMTP** para envio (implementado na task `definir-senha-do-medico-por-email`). O SES oferece um endpoint SMTP próprio, compatível com Nodemailer sem nenhuma dependência extra.
- O projeto já possui estrutura Terraform em `infra/terraform/` com módulos e environments `staging` / `production`. Esta task segue o mesmo padrão do módulo `s3-clinic-assets`.
- As credenciais SMTP do SES são geradas a partir de um **IAM user dedicado** — diferentes das credenciais de API da AWS. O Terraform cria o usuário e a política; as credenciais em si são geradas uma única vez via CLI e armazenadas no Parameter Store.
- Contas novas da AWS ficam no **modo sandbox** do SES: só enviam para endereços verificados. É necessário solicitar produção à AWS antes do deploy em production.

---

## Estrutura esperada

```
infra/terraform/
  modules/
    ses-email/
      main.tf          → identity, DKIM, IAM user, IAM policy, IAM access key
      variables.tf
      outputs.tf
  environments/
    staging/
      main.tf          → adicionar module "ses_email"
      variables.tf     → adicionar var "ses_from_email"
      outputs.tf       → adicionar outputs do SES
    production/
      main.tf          → idem
      variables.tf     → idem
      outputs.tf       → idem
```

---

## Recursos a provisionar

### Identidade de e-mail SES (`aws_ses_email_identity` ou `aws_ses_domain_identity`)

Duas estratégias possíveis, a ser decidida na execução conforme o domínio disponível:

| Estratégia | Quando usar |
|---|---|
| **Email identity** (`aws_ses_email_identity`) | Sem domínio próprio ainda; testes iniciais; staging |
| **Domain identity** (`aws_ses_domain_identity`) | Domínio próprio disponível; production |

Recomendar **domain identity** para production (envia de qualquer endereço `@{dominio}`). Para staging, email identity é suficiente.

### DKIM (`aws_ses_domain_dkim`)

- Gera 3 tokens DKIM que precisam ser adicionados como registros `CNAME` no DNS.
- Outputs devem expor os tokens para que possam ser configurados no Route 53 ou no provedor de DNS.
- Aplicável apenas quando usar domain identity.

### IAM user para SMTP (`aws_iam_user`)

- Nome: `ses-smtp-{environment}`
- Sem console access — apenas programático.

### IAM policy (`aws_iam_policy` + `aws_iam_user_policy_attachment`)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSESSend",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```

### IAM access key (`aws_iam_access_key`)

- Terraform cria a access key do IAM user.
- A **senha SMTP** não é a `secret_access_key` diretamente — é derivada dela usando um algoritmo específico da AWS (HMAC-SHA256 sobre a string `"SendRawEmail"`, em formato legado v4).
- Terraform expõe o `ses_smtp_password_v4` como `sensitive output`; esse valor é então armazenado no Parameter Store manualmente após o apply.

---

## Variáveis do módulo

```hcl
# modules/ses-email/variables.tf
variable "environment" {
  description = "Environment name (staging or production)"
  type        = string
}

variable "from_email" {
  description = "E-mail de origem para verificação. Usado quando identity_type = email."
  type        = string
  default     = "noreply@pulso.center"
}

variable "identity_type" {
  description = "Tipo de identidade SES: 'email' ou 'domain'"
  type        = string
  default     = "email"

  validation {
    condition     = contains(["email", "domain"], var.identity_type)
    error_message = "identity_type must be 'email' or 'domain'."
  }
}

variable "domain" {
  description = "Domínio a verificar no SES. Obrigatório quando identity_type = 'domain'."
  type        = string
  default     = ""
}
```

---

## Outputs do módulo

```hcl
# modules/ses-email/outputs.tf
output "smtp_username" {
  description = "SMTP username (IAM access key ID) — salvar no Parameter Store como SMTP_USER"
  value       = aws_iam_access_key.ses_smtp.id
}

output "smtp_password" {
  description = "SMTP password derivada da IAM secret key — salvar no Parameter Store como SMTP_PASS. Sensitive."
  value       = aws_iam_access_key.ses_smtp.ses_smtp_password_v4
  sensitive   = true
}

output "smtp_host" {
  description = "Endpoint SMTP do SES — salvar no Parameter Store como SMTP_HOST"
  value       = "email-smtp.${data.aws_region.current.name}.amazonaws.com"
}

output "dkim_tokens" {
  description = "Tokens DKIM a adicionar no DNS como CNAME ({token}._domainkey.{domain} → {token}.dkim.amazonses.com). Aplicável apenas para domain identity."
  value       = try(aws_ses_domain_dkim.email[0].dkim_tokens, [])
}
```

---

## Outputs de ambiente (staging e production)

```hcl
# environments/staging/outputs.tf — adicionar
output "ses_smtp_host" {
  description = "SMTP host do SES — adicionar ao Parameter Store como SMTP_HOST"
  value       = module.ses_email.smtp_host
}

output "ses_smtp_username" {
  description = "SMTP username — adicionar ao Parameter Store como SMTP_USER"
  value       = module.ses_email.smtp_username
}

output "ses_smtp_password" {
  description = "SMTP password — adicionar ao Parameter Store como SMTP_PASS"
  value       = module.ses_email.smtp_password
  sensitive   = true
}

output "ses_dkim_tokens" {
  description = "Tokens CNAME para DKIM — adicionar no DNS"
  value       = module.ses_email.dkim_tokens
}
```

Para obter o `smtp_password` após o apply:
```bash
terraform output -raw ses_smtp_password
```

---

## Parameter Store

Após o apply, adicionar manualmente ao AWS Parameter Store:

| Parâmetro | Valor | Tipo |
|---|---|---|
| `/{app}/{env}/SMTP_HOST` | `email-smtp.{region}.amazonaws.com` | String |
| `/{app}/{env}/SMTP_PORT` | `587` | String |
| `/{app}/{env}/SMTP_USER` | output `ses_smtp_username` | String |
| `/{app}/{env}/SMTP_PASS` | output `ses_smtp_password` | SecureString |
| `/{app}/{env}/SMTP_FROM` | endereço de origem verificado (ex: `noreply@pulso.center`) | String |

---

## Configurações manuais pós-apply (não automatizáveis via Terraform)

### 1. Verificação de identidade

- **Email identity:** a AWS envia um e-mail de confirmação para o endereço cadastrado. Clicar no link para verificar.
- **Domain identity:** adicionar os registros DNS fornecidos pelos outputs (TXT para verificação do domínio + 3 CNAMEs para DKIM).

### 2. Saída do sandbox (production)

Por padrão, o SES fica em **modo sandbox** — só envia para endereços verificados. Para production:

1. Acessar o console AWS SES → **Account dashboard** → **Request production access**.
2. Preencher: tipo de uso (transacional), volume estimado, processo de opt-in, política de bounce/complaint.
3. A aprovação pode levar de algumas horas a 1–2 dias úteis.
4. Staging pode permanecer em sandbox — adicionar e-mails de teste como identidades verificadas conforme necessário.

### 3. SPF (opcional mas recomendado para deliverability)

Adicionar registro TXT no DNS do domínio:
```
v=spf1 include:amazonses.com ~all
```

---

## Fluxo de provisionamento

```bash
# Staging
cd infra/terraform/environments/staging
terraform init
terraform plan  -var="aws_profile=<profile>" -var="ses_from_email=noreply@pulso.center"
terraform apply -var="aws_profile=<profile>" -var="ses_from_email=noreply@pulso.center"

# Obter a senha SMTP (sensitive)
terraform output -raw ses_smtp_password

# Adicionar outputs ao Parameter Store
aws ssm put-parameter --name "/umi/staging/SMTP_HOST" --value "$(terraform output -raw ses_smtp_host)" --type String --overwrite --profile <profile>
aws ssm put-parameter --name "/umi/staging/SMTP_PORT" --value "587" --type String --overwrite --profile <profile>
aws ssm put-parameter --name "/umi/staging/SMTP_USER" --value "$(terraform output -raw ses_smtp_username)" --type String --overwrite --profile <profile>
aws ssm put-parameter --name "/umi/staging/SMTP_PASS" --value "$(terraform output -raw ses_smtp_password)" --type SecureString --overwrite --profile <profile>
aws ssm put-parameter --name "/umi/staging/SMTP_FROM" --value "noreply@pulso.center" --type String --overwrite --profile <profile>

# Production — após validar staging e obter aprovação de saída do sandbox
cd infra/terraform/environments/production
terraform init
terraform plan  -var="aws_profile=<profile>" -var="ses_from_email=noreply@pulso.center" -var="identity_type=domain" -var="domain=pulso.center"
terraform apply -var="aws_profile=<profile>" ...
```

---

## Decisões técnicas

- **IAM user dedicado para SMTP** em vez de usar a IAM Role do ECS diretamente: o Nodemailer autentica via SMTP (usuário/senha), não via SDK da AWS. A senha SMTP é derivada da secret key de um IAM user — não é possível derivá-la de um role temporário. Para remover essa limitação futuramente, migrar o adapter para `@aws-sdk/client-ses` (usa role diretamente).
- **`ses_smtp_password_v4`**: atributo nativo do resource `aws_iam_access_key` no Terraform — já realiza a derivação correta (HMAC-SHA256) sem script auxiliar.
- **Porta 587** (STARTTLS): padrão recomendado; evitar 25 (bloqueada por muitos ISPs/ECS) e 465 (SSL legado).
- **Staging com email identity**: mais simples para validar o fluxo sem configurar DNS do domínio inteiro.
- **Production com domain identity**: envia de qualquer endereço `@dominio`, sem precisar verificar cada remetente.

---

## Restrições

- NÃO commitar `terraform.tfvars` com valores de `ses_from_email` nem credenciais.
- NÃO hardcodar a access key ou SMTP password em nenhum arquivo commitado.
- NÃO compartilhar o IAM user de SMTP entre staging e production — um por ambiente.
- NÃO usar a mesma identidade SES para staging e production (risco de reputação — bounces de staging afetam a reputação do domínio production).
- `smtp_password` deve ser sempre `sensitive = true` nos outputs.

---

## Definition of Done

- [ ] Módulo `ses-email` criado em `infra/terraform/modules/ses-email/` com `main.tf`, `variables.tf`, `outputs.tf`.
- [ ] Módulo instanciado nos ambientes `staging` e `production`.
- [ ] Identidade SES criada e verificada em staging (e-mail de confirmação clicado ou DNS configurado).
- [ ] IAM user `ses-smtp-staging` criado com policy de `ses:SendEmail` / `ses:SendRawEmail`.
- [ ] Parâmetros `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` adicionados ao Parameter Store de staging.
- [ ] `terraform plan` em staging sem diffs inesperados após apply.
- [ ] Envio de e-mail de teste confirmado em staging (ex: via `swaks` ou código local apontando para os parâmetros).
- [ ] Saída do sandbox solicitada para production antes do deploy em production.
- [ ] Identidade e parâmetros de production configurados após aprovação do sandbox.
- [ ] Registros DKIM e SPF adicionados no DNS (quando domain identity).
- [ ] `outputs.tf` dos ambientes documentam quais parâmetros precisam ir ao Parameter Store.
