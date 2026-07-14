# Task — Provisionar CloudFront, ACM e Route 53 (Terraform)

## Descrição

Criar o módulo Terraform `cdn` que provisiona a borda: um **certificado ACM wildcard** (`*.pulso.center`) em us-east-1, uma **distribution CloudFront** que termina TLS e encaminha para o origin (EC2) por HTTP, e os **records do Route 53** (ALIAS wildcard + apex → CloudFront, + validação do ACM) na hosted zone já existente. É o que expõe a aplicação em `https://<clinica>.pulso.center` e `https://api.pulso.center`.

---

## Contexto

- Decisões B/C/G: CloudFront na frente do EC2, TLS via ACM; multi-tenant por subdomínio; DNS no Route 53.
- **Hosted zone `pulso.center` já criada** na conta **Workload (796669927752)**, com os **NS já delegados** no GoDaddy (zona autoritativa) → a validação DNS do ACM resolve sozinha no apply.
- O origin é o **Elastic IP/DNS do EC2** (exportado pelo módulo `ec2-app`), acessível por HTTP :80, com o Security Group liberando só o prefix list do CloudFront.
- O EC2 roteia por **Host** (`api.pulso.center` → backend, resto → frontend), então o CloudFront precisa **encaminhar o Host original**.
- ACM para CloudFront **precisa estar em us-east-1** (independente da região dos demais recursos).

---

## Estrutura esperada

```
infra/terraform/
  modules/
    cdn/
      main.tf       → acm_certificate, acm_validation, cloudfront_distribution,
                      data aws_route53_zone, route53_record (wildcard, apex, validação)
      variables.tf
      outputs.tf
  environments/{staging,production}/
    main.tf         → module "cdn" (recebe o domínio do origin = EIP/DNS do EC2)
    outputs.tf      → cloudfront_domain_name
```

---

## Recursos a provisionar

### ACM (us-east-1)
- `aws_acm_certificate` com `domain_name = "*.pulso.center"` e SAN `pulso.center`, `validation_method = "DNS"`.
- `aws_acm_certificate_validation` + `aws_route53_record` de validação (na zona existente).
- Provider aliasado `aws.us_east_1` se a região default do ambiente não for us-east-1.

### CloudFront
- `aws_cloudfront_distribution`:
  - `aliases = ["*.pulso.center", "pulso.center"]` (o wildcard cobre `api.*` e as clínicas).
  - **origin** = domínio do EC2 (EIP/DNS), `custom_origin_config` **HTTP-only** (porta 80, `origin_protocol_policy = "http-only"`).
  - `viewer_certificate` = cert ACM, `minimum_protocol_version` TLS 1.2+.
  - **behavior default**: `cache_policy` **CachingDisabled**; `origin_request_policy` que encaminha **Host + Origin + Authorization + todos os cookies** (usar policy gerenciada `AllViewer` ou custom); métodos incluindo `OPTIONS`/`POST`.
  - **behavior `/_next/static/*`** (e assets): `CachingOptimized`, TTL longo (hash no nome evita colisão).
  - `price_class` econômico (ex.: `PriceClass_100`).

### Route 53 (zona existente)
- `data "aws_route53_zone" { name = "pulso.center" }` — **não** criar `aws_route53_zone`.
- `aws_route53_record` ALIAS A `*.pulso.center` → CloudFront (`alias { name, zone_id, evaluate_target_health = false }`).
- `aws_route53_record` ALIAS A apex `pulso.center` → CloudFront (opcional, landing/login).
- Records de validação do ACM (do bloco ACM acima).

---

## Variáveis / Outputs

```hcl
variable "environment"       { type = string }
variable "domain"            { type = string  default = "pulso.center" }
variable "origin_domain_name"{ type = string }   # EIP/DNS público do EC2
# outputs
output "cloudfront_domain_name" { value = aws_cloudfront_distribution.this.domain_name }
```

---

## Decisões técnicas

- **Um cert + um wildcard record + uma distribution** cobrindo `api.*` e todas as clínicas: o EC2 desambigua por Host.
- **CachingDisabled no default**: respostas autenticadas nunca são cacheadas (senão quebra login); só estáticos com hash são cacheados.
- **Encaminhar Host**: o proxy no EC2 e o `middleware.ts` dependem do host original (`slug.pulso.center` / `api.pulso.center`).
- **HTTP-only até o origin**: TLS termina no CloudFront; o EC2 não tem certificado. O `X-Forwarded-Proto https` (setado no nginx) garante que o app trate como HTTPS.
- **Zona já delegada**: `aws_acm_certificate_validation` conclui sozinho no apply; sem passo manual de DNS.

---

## Restrições

- NÃO cachear behaviors dinâmicos (default / API) — só `/_next/static/*` e assets.
- NÃO recriar a hosted zone (`data`, não `resource`).
- NÃO usar cert fora de us-east-1 para o CloudFront.
- NÃO deixar o origin aceitar tráfego que não seja do CloudFront (SG do EC2 já cuida).
- NÃO expor o EIP do EC2 publicamente como URL de uso — o acesso é sempre via CloudFront.

---

## Definition of Done

- [x] Módulo `infra/terraform/modules/cdn/` com ACM (us-east-1), CloudFront e records Route 53 na zona existente.
- [x] Instanciado em `staging` (e `production`), recebendo o `origin_domain_name` do `ec2-app` (output `public_dns`, derivado do EIP — CloudFront não aceita IP puro).
- [x] ACM em estado `ISSUED` (validado via DNS na zona delegada) — `arn:...:certificate/7b6ad839...`.
- [x] `terraform plan`/`apply` staging = 7 add / 0 change / 0 destroy; CloudFront `E2OS15V1PU1G31` `Deployed`.
- [~] `https://<clinica>.pulso.center` abre o frontend; `https://api.pulso.center/health` → 200. → **depende da task 9** (sem imagens no ECR a stack não sobe; hoje responde 502).
- [~] Autenticados `X-Cache: Miss`; `/_next/static/*` `Hit`. → verificável após a task 9 (comportamento de cache já modelado: default `CachingDisabled`, static `CachingOptimized`).
- [~] Login + CRUD ponta a ponta em duas clínicas. → **depende da task 9**.

> **Aplicado em staging (2026-07-14):** módulo `cdn` — `data "aws_route53_zone"` na zona `pulso.center` já delegada (Z05741901K0E017VXXPD2); `aws_acm_certificate` `*.pulso.center` + SAN `pulso.center` (DNS validation, `create_before_destroy`), records de validação com `allow_overwrite` (wildcard e apex compartilham o mesmo CNAME) + `aws_acm_certificate_validation`; `aws_cloudfront_distribution` (aliases `*.pulso.center` + apex, origin HTTP-only no EIP do EC2, default behavior `Managed-CachingDisabled` + `Managed-AllViewer`, behavior `/_next/static/*` `Managed-CachingOptimized`, TLS 1.2_2021 sni-only, PriceClass_100, IPv6); A ALIAS wildcard + apex → CloudFront. Wiring em staging (dona do domínio) e production (mutuamente exclusiva no mesmo domínio — só aplicar quando production virar a env viva). Novos outputs: `cloudfront_domain_name`, `cloudfront_distribution_id`, `acm_certificate_arn`. Verificado: cert `ISSUED` (inUseBy=1), CF `Deployed`, Route 53 com A wildcard/apex + CNAME de validação. **Pendente:** task 9 (pipeline) para a app subir; aí valida os itens `[~]` acima.
>
> **Ajuste de domínio (2026-07-14, pós-decisão):** staging migra de `pulso.center` para **`staging.pulso.center`** (reserva `pulso.center` p/ production). O módulo `cdn` passou a separar `zone_name` (hosted zone = `pulso.center`) do `domain` (servido = `staging.pulso.center`), pois os records do subdomínio vivem na zona do apex. Staging: `domain=staging.pulso.center`, `zone_name=pulso.center`; production: `domain=pulso.center`. `plan` staging = 10 add / 1 change / 6 destroy (cert `*.pulso.center`→`*.staging.pulso.center`, CloudFront in-place, records `pulso.center` destruídos → `staging.pulso.center` criados). **Falta aplicar** + re-seed do SSM (`seed-ssm.sh` já deriva `COOKIE_DOMAIN`/`PUBLIC_API_URL`/`FRONTEND_URL` de `BASE_DOMAIN` por ambiente).
>
> **Decisão de origin:** CloudFront não aceita IP puro como origin — usado o DNS público do EC2 derivado do EIP (`ec2-<eip-com-hifens>.compute-1.amazonaws.com`, output `public_dns` do `ec2-app`), determinístico e estável (evita o atributo `public_dns` do `aws_instance` ficar defasado após a associação do EIP). Assume us-east-1 (`compute-1`).
