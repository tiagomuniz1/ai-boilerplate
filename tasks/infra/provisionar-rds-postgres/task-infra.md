# Task — Provisionar RDS PostgreSQL (Terraform)

## Descrição

Criar um módulo Terraform `rds` que provisiona um **PostgreSQL gerenciado no RDS free tier** (db.t4g.micro), fora do EC2, com backup automático e acesso privado restrito ao Security Group da instância EC2. Grava o endpoint e a senha no Parameter Store para o backend consumir. Move o dado durável (prontuários, pacientes, receitas) para um serviço com backup/PITR — em vez de um container no host efêmero.

---

## Contexto

- Decisão F: Postgres no RDS free tier; Redis permanece em container no EC2.
- Já existe estrutura Terraform de dois ambientes (`staging`/`production`) com módulos `s3-clinic-assets` e `ses-email`, dirigida por `infra/scripts/deploy.sh` (perfil DevOps para o state, Workload para os recursos).
- O EC2 e o RDS ficam na **mesma VPC**. Para economizar setup, usar a **default VPC** da conta Workload (`data "aws_default_vpc"` + `aws_default_subnets`).
- O backend lê `DB_HOST/PORT/USER/PASS/NAME/SCHEMA` do SSM (`/pulso/<env>/backend/`). `DB_HOST` e `DB_PASS` serão gravados por este módulo.

---

## Estrutura esperada

```
infra/terraform/
  modules/
    rds/
      main.tf          → db_instance, db_subnet_group, security_group, random_password, ssm parameters
      variables.tf
      outputs.tf
  environments/
    staging/ | production/
      main.tf          → module "rds" (recebe o SG do EC2)
      variables.tf     → db_name, db_username, etc. (defaults)
      outputs.tf       → endpoint (não sensível)
```

---

## Recursos a provisionar

- **`aws_db_instance`**: `engine = "postgres"` (16), `instance_class = "db.t4g.micro"`, `allocated_storage = 20`, `storage_type = "gp3"`, `multi_az = false`, `backup_retention_period = 7`, `deletion_protection = true`, `publicly_accessible = false`, `skip_final_snapshot = false` (com `final_snapshot_identifier`), `apply_immediately` conforme ambiente.
- **`aws_db_subnet_group`**: subnets da default VPC.
- **`aws_security_group`** do RDS: ingress **5432 apenas do Security Group do EC2** (passado por variável), egress padrão.
- **`random_password`** para a senha master → gravada como **SSM SecureString** em `/pulso/<env>/backend/DB_PASS`.
- **`aws_ssm_parameter`**: `DB_HOST` (endpoint sem porta) e `DB_PASS` (SecureString). Opcionalmente `DB_PORT`, `DB_NAME`, `DB_USER` se centralizar aqui.

---

## Variáveis do módulo

```hcl
variable "environment"        { type = string }                 # staging | production
variable "vpc_id"             { type = string }
variable "subnet_ids"         { type = list(string) }
variable "ec2_security_group_id" { type = string }              # fonte liberada no ingress 5432
variable "db_name"            { type = string  default = "app" }
variable "db_username"        { type = string  default = "postgres" }
variable "instance_class"     { type = string  default = "db.t4g.micro" }
variable "allocated_storage"  { type = number  default = 20 }
variable "ssm_prefix"         { type = string  default = "/pulso" } # /pulso/<env>/backend/
```

---

## Outputs do módulo

```hcl
output "db_endpoint"  { value = aws_db_instance.this.address }        # host (sem :5432)
output "db_port"      { value = aws_db_instance.this.port }
output "sg_id"        { value = aws_security_group.rds.id }
# senha NÃO exposta como output — vai direto pro SSM SecureString
```

---

## Decisões técnicas

- **Free tier db.t4g.micro / single-AZ / 20GB**: dentro do free tier (12 meses). `deletion_protection` e `backup_retention_period = 7` protegem o dado clínico.
- **Senha via `random_password` → SSM**: nunca aparece em código nem em `terraform.tfvars`; o backend a lê do SSM no boot.
- **Acesso só do SG do EC2**: RDS não público; a fonte do ingress é o Security Group da instância (referência de SG, não CIDR).
- **Default VPC**: reduz o escopo de rede agora; um módulo VPC dedicado pode vir depois sem afetar o app.
- **Ordem de dependência**: o SG do EC2 precisa existir antes (a task de EC2 exporta o `sg_id`); no `main.tf` do ambiente, `module.rds` recebe `ec2_security_group_id = module.ec2_app.security_group_id`.

---

## Restrições

- NÃO deixar o RDS `publicly_accessible`.
- NÃO liberar 5432 por CIDR aberto — só pelo SG do EC2.
- NÃO expor a senha como output normal (apenas SecureString no SSM).
- NÃO commitar `terraform.tfvars` com credenciais.
- `skip_final_snapshot = false` em production.

---

## Definition of Done

- [x] Módulo `infra/terraform/modules/rds/` com `main.tf`, `variables.tf`, `outputs.tf`.
- [x] Instanciado em `staging` (e `production`). O SG do EC2 é passado por `ec2_security_group_id` + `enable_ec2_ingress` (a task 7 conecta `module.ec2_app.security_group_id` e liga o ingress).
- [x] `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME` e `DB_PASS` (SecureString) gravados no SSM `/pulso/<env>/backend/` — **centralizados no módulo** (o `seed-ssm.sh` deixou de escrevê-los; mantém só `DB_SCHEMA`).
- [x] `terraform plan` valida sem erros (harness isolado no scratchpad, state local, **nada aplicado**): `12 to add, 0 to change, 0 to destroy`; `terraform validate` dos ambientes staging e production → `Success`.
- [x] RDS não público, single-AZ, backup 7 dias, `storage_encrypted`, gp3, `db.t4g.micro`, engine 16 — confirmado no plan. `deletion_protection` on por default (production); staging sobrescreve p/ off (dados descartáveis).
- [x] **Aplicado em staging (2026-07-14):** `deploy.sh staging apply` → `random_password` → SSM, `db_subnet_group`, `security_group` (egress; ingress 5432 ainda desligado — `enable_ec2_ingress` vira `true` só quando a task 7 for aplicada), `db_instance` (`pulso-staging.cuh4myyqm4zs.us-east-1.rds.amazonaws.com`), e `DB_HOST/PORT/USER/NAME/PASS` no SSM `/pulso/staging/backend/`. **Production não aplicada** (2ª instância sairia do free tier).
- [~] Do EC2 (mesma VPC/SG), conexão ao RDS na 5432 funciona; de fora, não. → **depende do `apply` da task 7** (cria o SG do EC2 + a regra de ingress `rds_ingress_from_ec2`).
- [~] `migrate` cria schema + tabelas no RDS. → **depende do `apply` da task 7** (EC2 rodando o compose); a lógica do `migrate` já foi validada contra Postgres limpo na task 3.

> **Bug corrigido no `apply` (2026-07-14):** a `GroupDescription` do `aws_security_group.rds` continha um em dash (`—`), rejeitado pela API EC2 (`Character sets beyond ASCII are not supported`). Trocado por `-`. O `plan` não valida ASCII em descrições — só o `apply` pegou. Regra geral: manter strings que vão pra API AWS (descrições de SG, nomes) em ASCII puro.

> **Execução (2026-07-13) — plan-only (sem `apply`, a pedido):**
> - **Módulo `rds`:** `random_password` (32, sem chars proibidos do RDS) → SSM SecureString; `db_subnet_group` nas subnets da default VPC; `security_group` com **ingress 5432 só do SG do EC2** (via `source_security_group_id`, não CIDR) + egress all; `db_instance` (postgres 16, db.t4g.micro, 20GB gp3, single-AZ, não público, encrypted, backup 7d, deletion protection, final snapshot). Escreve `DB_HOST/PORT/USER/NAME/PASS` no SSM.
> - **Fix de design:** o ingress é gated por um **bool literal `enable_ec2_ingress`** (não pelo valor do SG id) — senão `count` quebraria quando o SG id é computado (`known after apply`), que é como a task 7 vai passá-lo.
> - **Centralização:** `DB_HOST/PORT/USER/NAME/PASS` viram responsabilidade única do módulo RDS (fonte de verdade, sem drift). `seed-ssm.sh` ajustado para não duplicá-los.
> - **Wiring:** default VPC via `data "aws_vpc" { default = true }` (read-only, não adota a VPC como `aws_default_vpc` faria) + `data "aws_subnets"`. `module "rds"` em staging (apply imediato, protections off) e production (protections on).
> - **Validação isolada:** harness no scratchpad rodou `terraform plan` real contra a AWS (data sources da VPC reais, profile `pulso-workload`) com **state local** — nunca o state S3 compartilhado, nunca `apply`. Artefatos `.terraform` limpos ao final.
> - **Pendente para a task 7:** no `main.tf` dos ambientes, setar `enable_ec2_ingress = true` e `ec2_security_group_id = module.ec2_app.security_group_id`.
