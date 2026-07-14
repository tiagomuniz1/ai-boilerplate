# Task — Provisionar ECR e EC2 (Terraform)

## Descrição

Criar os módulos Terraform `ecr` (repositórios das imagens) e `ec2-app` (a instância que roda a stack Docker de produção). O EC2 é um `t3.micro` free tier, Amazon Linux 2023, com swap, Docker, IAM Role para SSM/ECR/S3/SES, Security Group restrito e Elastic IP fixo para ser o origin do CloudFront.

---

## Contexto

- Decisão A: imagens buildadas no CI e enviadas ao **ECR**; o EC2 só faz `pull`.
- Decisão E: novo Terraform para EC2 + ECR (além de RDS, CloudFront/ACM/Route53 em tasks próprias).
- O EC2 roda o `docker-compose.prod.yml` (task de compose): proxy nginx :80, frontend, backend, redis, migrate.
- Env em runtime vem do SSM (`/pulso/<env>/backend/`); o backend usa o instance profile para ler.
- O RDS (task própria) libera 5432 apenas para o **SG do EC2** — este módulo exporta o `security_group_id`.
- Segue o padrão dos módulos existentes e do `infra/scripts/deploy.sh` (perfil Workload).

---

## Estrutura esperada

```
infra/terraform/
  modules/
    ecr/       → aws_ecr_repository (backend, frontend) + lifecycle policy
    ec2-app/   → instance, security_group, eip, iam_role/profile, user_data
  environments/{staging,production}/
    main.tf    → module "ecr" + module "ec2-app"
    outputs.tf → public ip/eip, ecr repo urls, security_group_id
```

---

## Recursos a provisionar

### Módulo `ecr`
- `aws_ecr_repository` `pulso-backend` e `pulso-frontend` (scan on push habilitado).
- `aws_ecr_lifecycle_policy`: expirar imagens não-tagueadas / manter as N últimas.

### Módulo `ec2-app`
- **`aws_instance`** `t3.micro`, AMI Amazon Linux 2023, na default VPC. `user_data`:
  - instala Docker + plugin `docker compose`;
  - cria **swap de 2GB** (`/swapfile`, persistente em `/etc/fstab`);
  - `aws ecr get-login-password | docker login`;
  - baixa `docker-compose.prod.yml` + `infra/proxy/nginx.conf` (via `git` ou artefato) e `docker compose -f docker-compose.prod.yml up -d`.
- **`aws_security_group`**: ingress **80** apenas do managed prefix list `com.amazonaws.global.cloudfront.origin-facing` (`data "aws_ec2_managed_prefix_list"`); ingress **22** apenas do IP do operador (variável); egress all.
- **`aws_eip`** associado à instância (origin fixo do CloudFront).
- **`aws_iam_role`** + `aws_iam_instance_profile` com policies:
  - leitura SSM escopada a `/pulso/<env>/*` (`ssm:GetParametersByPath`, `GetParameter`, `kms:Decrypt` para SecureString);
  - pull do ECR (`ecr:GetAuthorizationToken`, `BatchGetImage`, `GetDownloadUrlForLayer`);
  - o `iam_policy_arn` já exportado pelo módulo `s3-clinic-assets` (S3 write);
  - `ses:SendEmail` / `ses:SendRawEmail`.
  - **AmazonSSMManagedInstanceCore** (para deploy via SSM Run Command — task de pipeline).

### Variáveis principais
```hcl
variable "environment"       { type = string }
variable "operator_ip_cidr"  { type = string }   # /32 para o SSH
variable "instance_type"     { type = string  default = "t3.micro" }
variable "backend_image"     { type = string }   # ECR repo url:tag
variable "frontend_image"    { type = string }
```

### Outputs
```hcl
output "public_ip"          { value = aws_eip.this.public_ip }
output "security_group_id"  { value = aws_security_group.ec2.id }   # usado pelo RDS
output "backend_repo_url"   { value = module.ecr... }               # se ecr no mesmo env
output "frontend_repo_url"  { value = ... }
```

---

## Decisões técnicas

- **Swap de 2GB**: com o Postgres no RDS, a RAM do t3.micro (1GB) fica folgada, mas o swap é rede de segurança para picos.
- **Ingress 80 só do prefix list do CloudFront**: o origin não fica exposto ao mundo; só o CloudFront alcança o EC2.
- **Elastic IP**: origin estável para o CloudFront e para o DNS, sobrevive a stop/start.
- **Deploy via SSM depois** (task de pipeline): o `AmazonSSMManagedInstanceCore` no role permite `docker compose pull && up -d` sem abrir SSH.
- **Ordem**: `ec2-app` exporta `security_group_id`, consumido pelo `module.rds`; ambos na default VPC.

---

## Restrições

- NÃO abrir 22 para `0.0.0.0/0` — só o IP do operador.
- NÃO abrir 80 para o mundo — só o prefix list do CloudFront.
- NÃO colocar secrets no `user_data` (env vem do SSM).
- NÃO buildar imagem no EC2 (risco de OOM) — só `pull` do ECR.
- NÃO commitar chave SSH nem `terraform.tfvars` com o IP do operador.

---

## Definition of Done

- [x] Módulo `ecr` com repos `pulso-backend`/`pulso-frontend` + lifecycle policy (expira untagged > 14d, mantém últimas 10).
- [x] Módulo `ec2-app`: instância t3.micro, swap 2GB, Docker, EIP, SG restrito, IAM role (SSM/ECR/S3/SES/SSM-core), user-data, IMDSv2, root gp3 encrypted.
- [x] Instanciados em `staging` (cria os ECR) e `production` (referencia os ECR compartilhados por nome, via account/region — sem dependência de ordem entre states); `security_group_id` exportado e consumido pelo RDS (`enable_ec2_ingress = true`).
- [x] `terraform validate` OK nos dois ambientes; `terraform apply` staging = **17 to add, 0 to change, 0 to destroy** (RDS/SES/S3 existentes intocados; adiciona EC2 + ECR + a regra `rds_ingress_from_ec2`).
- [~] Após apply: `docker compose ps` saudável; `migrate` completou. → EC2 no ar, mas a stack **ainda não sobe**: sem imagens no ECR (task 9) e `app_repository_url` vazio (arquivos do compose entregues pela pipeline via SSM). Verificável após o 1º deploy.
- [~] Backend conecta no RDS e carrega env do SSM. → **depende do 1º deploy** (task 9).
- [x] Porta 80 só via CloudFront; SSH só do operador. → **verificado no `apply`:** ingress 80 só do prefix list `com.amazonaws.global.cloudfront.origin-facing` (`pl-3b927c52`), sem regra 22 (`operator_ip_cidr` vazio → SSM Session Manager), sem `0.0.0.0/0`. RDS 5432 só do SG do EC2 (`sg-0c2c30fba1cb6671a`).

> **Aplicado em staging (2026-07-14):** `deploy.sh staging apply` → EC2 `i-0e6215a9b9839f369` (t3.micro, `running`, IMDSv2, EIP `18.211.167.222`), ECR `pulso-backend`/`pulso-frontend` (`796669927752.dkr.ecr.us-east-1.amazonaws.com`), IAM role `pulso-staging-ec2`, e a regra de ingress 5432 no RDS. Production não aplicada (free tier). Próximo: task 8 (CloudFront/ACM/Route53) e task 9 (pipeline build→ECR→deploy).
>
> **Execução (2026-07-14) — detalhe do código:**
> - **Módulo `ecr`:** `for_each` sobre `["pulso-backend","pulso-frontend"]` (nomes sem sufixo de env de propósito — o `docker-compose.prod.yml` referencia `<registry>/pulso-backend`; staging/production se distinguem por tag e **compartilham** os repos), scan-on-push, lifecycle policy. Outputs: `repository_urls`, `repository_arns`, `registry_url`.
> - **Módulo `ec2-app`:** SG (ingress 80 do prefix list do CloudFront via `data "aws_ec2_managed_prefix_list"`, 22 opcional do operador, egress all) com `aws_security_group_rule` separados (consistente com o módulo RDS); IAM role + instance profile (SSM read escopado a `/pulso/<env>/*` + `kms:Decrypt` na chave `alias/aws/ssm`; ECR pull; SES send; attach `AmazonSSMManagedInstanceCore`; attach opcional da policy S3 do módulo `s3-clinic-assets`); `aws_instance` (AL2023 via `data "aws_ami"`, IMDSv2, root gp3 encrypted, `user_data_replace_on_change`); `aws_eip`. `user-data.sh.tftpl` instala Docker + plugin compose, cria swap 2GB, escreve `deploy.env` (`ECR_REGISTRY`/`IMAGE_TAG`/`AWS_REGION`), instala helper `pulso-deploy` (ecr login + `docker compose pull && up -d`) e tenta subir best-effort (só sobe quando as imagens existem no ECR — task 9).
> - **Wiring:** staging cria `module.ecr` + `module.ec2_app` e liga `module.rds` (`enable_ec2_ingress = true`, `ec2_security_group_id = module.ec2_app.security_group_id`). Production idem, mas o registry/ARNs do ECR são montados de `account.dkr.ecr.region…` (repos compartilhados, criados pelo state de staging). Novas variáveis: `operator_ip_cidr` (default `""`), `app_repository_url` (default `""` — arquivos do compose entregues pela pipeline da task 9 via SSM). Novos outputs: `ecr_registry_url`, `ec2_public_ip`, `ec2_instance_id`, `ec2_security_group_id`.
> - **Bug corrigido:** descrição da variável `repository_names` continha `${ECR_REGISTRY}` — o Terraform interpretava como interpolação (`Variables not allowed`); reescrita sem `${...}`. E o output `registry_url` usava `one()` sobre 2 repos (erro `must be 0 or 1 elements`) → trocado por `split("/", values(...)[0].repository_url)[0]`.
> - **Pendente:** task 8 (CloudFront/ACM/Route53) e task 9 (pipeline build→ECR→deploy) para a app efetivamente subir; depois validar Verificação 5–6 do plano (staging real via CloudFront). Production quando sair do free tier for aceitável.
