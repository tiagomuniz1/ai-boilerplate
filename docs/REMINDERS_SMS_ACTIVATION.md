# Ativação dos Lembretes por SMS (produção)

Runbook para **ligar** o envio de lembretes de consulta por SMS depois que a feature
já está deployada. Enquanto estes passos não forem feitos, o código roda em produção
mas **não envia** (o cron fica em no-op por `REMINDERS_ENABLED=false` e o adapter faz
skip gracioso sem `AWS_SMS_ORIGINATION_IDENTITY`).

Pré-requisitos: AWS CLI logado nos profiles `pulso-workload` (conta Workload
796669927752) e `pulso-devops` (conta DevOps 500905575906, só para o state do Terraform).

---

## 0. Onboarding do remetente (AWS End User Messaging SMS) — externo, com lead time

Feito **uma vez** no console AWS (região `us-east-1`), fora do código:

1. **Registrar a identidade de origem para o Brasil** em *AWS End User Messaging → SMS → Phone numbers / Sender IDs*. Para o Brasil normalmente é um **Sender ID** (exige registro da empresa) ou um número dedicado. Anote o identificador resultante — é o valor de `AWS_SMS_ORIGINATION_IDENTITY` (aceita `SenderId`, `PhoneNumberId`, `PhoneNumberArn`, `PoolId`/`PoolArn`).
2. **Pedir production access** (sair do *sandbox*). A conta começa em sandbox (só **números de destino verificados** recebem, limite de US$ 1/mês).

> **Atenção (Brasil):** o registro do Sender ID é o bloqueador real — **sem uma identidade de origem registrada não sai SMS nenhum, nem mesmo em sandbox** (o `SendTextMessage` exige `OriginationIdentity`). O fluxo "número verificado em sandbox" só valida a chegada do código de verificação, não o nosso envio. Então a ordem prática é: registrar o Sender ID → (production access + aumento de limite) → passo 2.
>
> Enquanto o registro não sai, deixe a infra/config prontas (passos 1 e 2 com `REMINDERS_ENABLED=false`): o adapter faz skip e **libera o claim**, então nada é perdido — os lembretes começam a sair sozinhos assim que o remetente existir e a flag for ligada.

---

## 1. Terraform — IAM de envio + configuration set + opt-out list

> **Já aplicado.** A policy IAM `sms-send`, o `configuration_set` e o `opt_out_list`
> já estão em produção, e `terraform plan` reporta "No changes". Esta seção fica como
> referência / para reaplicar de outra máquina.

```bash
cd infra/terraform/environments/production

# init (só na primeira vez / se mudou de máquina): state fica na conta DevOps
terraform init -backend-config="profile=pulso-devops"

# sempre passe frontend_url = valor vivo (https://pulso.center) para NÃO mexer no
# CORS do bucket de assets; aws_profile = conta Workload
terraform plan \
  -var="aws_profile=pulso-workload" \
  -var="frontend_url=https://pulso.center"

terraform apply \
  -var="aws_profile=pulso-workload" \
  -var="frontend_url=https://pulso.center"
```

Isso concede `sms-voice:SendTextMessage` à role da EC2 e cria o config set
`pulso-production-reminders` (nome que já é o default de `AWS_SMS_CONFIG_SET`).

> A AMI da EC2 está **pinada** (`ami_id` no módulo `ec2_app`). Se um dia você
> precisar rolar a imagem base, atualize esse `ami_id` de propósito — e rode um
> deploy depois, porque trocar a AMI **recria a instância**.

---

## 2. SSM — ligar a flag e apontar o remetente

As 3 chaves novas ainda **não existem** no Parameter Store (o app usa defaults:
`REMINDERS_ENABLED=false`, remetente vazio). Grave só elas, direto (não precisa
re-seedar tudo — o `seed-ssm.sh` reescreveria todos os params e exigiria os segredos
de novo):

```bash
REGION=us-east-1
P=pulso-workload

# valor real vindo do passo 0 (ex.: um Sender ID "PULSO" ou um PhoneNumberId)
ORIGINATION_IDENTITY="<sender-id-ou-phone-number-id-aprovado>"

aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/REMINDERS_ENABLED --type String --value "true"

aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/AWS_SMS_ORIGINATION_IDENTITY --type String --value "$ORIGINATION_IDENTITY"

aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/AWS_SMS_CONFIG_SET --type String --value "pulso-production-reminders"
```

> Alternativa (reseed completo): `REMINDERS_ENABLED=true AWS_SMS_ORIGINATION_IDENTITY=... JWT_SECRET=... SMTP_PASS=... ... bash infra/scripts/seed-ssm.sh production apply` — só se você tiver TODOS os segredos em mãos, pois o script reescreve o conjunto inteiro.

---

## 3. Recarregar a config no backend

O backend lê o SSM **no boot** (`apps/backend/scripts/load-env.js`). Reaplicar um
deploy com o mesmo commit **não** recria o container, então recrie o backend na
instância via SSM Run Command (conta Workload):

```bash
INSTANCE_ID=i-005e1c16fbe738142   # EC2 de produção (confirme com: aws ec2 describe-instances --profile pulso-workload --filters Name=tag:Name,Values=pulso-production Name=instance-state-name,Values=running --query 'Reservations[].Instances[].InstanceId')
aws ssm send-command --profile pulso-workload --region us-east-1 \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --comment "reload SSM env + recreate backend for reminders" \
  --parameters 'commands=["cd /opt/pulso || cd /home/ec2-user/pulso","docker compose -f docker-compose.prod.yml up -d --force-recreate backend"]'
```

> Confirme o diretório do compose na instância (`/opt/pulso` vs `/home/ec2-user/pulso`) — ajuste o `cd` se necessário. Como o entrypoint do backend roda o `load-env.js`, o `--force-recreate` já repuxa as novas chaves do SSM.

---

## 4. Verificar

1. Cadastre uma consulta de teste ~24h e/ou ~3h à frente para um **número verificado**
   (enquanto em sandbox) e aguarde o próximo tick (o cron roda a cada 10 min).
2. Confira a tabela de tracking na EC2 (via Session Manager → `docker compose exec db ...`
   ou consultando o RDS):
   ```sql
   SELECT appointment_id, offset_label, channel, status, provider_message_id, created_at
   FROM production.appointment_reminders
   ORDER BY created_at DESC LIMIT 20;
   ```
   Esperado: `status='sent'` com `provider_message_id` preenchido (ou `skipped` se o
   telefone for inválido / remetente ainda ausente; `failed` + `error` se a AWS recusou).
3. Logs do backend (JSON): procure `Failed to send appointment reminder` /
   `Skipping reminder` — nunca deve aparecer telefone/CPF (só `appointmentId`).

---

## Reverter / desligar rapidamente

```bash
aws ssm put-parameter --profile pulso-workload --region us-east-1 --overwrite \
  --name /pulso/production/backend/REMINDERS_ENABLED --type String --value "false"
# depois recarregue o backend (passo 3). O cron volta a no-op imediatamente.
```

---

## Fase 2 — WhatsApp (quando a conta Meta estiver pronta)

Requer conta **WhatsApp Business (Meta)** verificada + **templates aprovados**, ligados
via **AWS End User Messaging Social**. No código: novo `IWhatsAppAdapter`
(`@aws-sdk/client-socialmessaging`, `SendWhatsAppMessageCommand`), um branch de canal
no use-case, e acrescentar `social-messaging:SendWhatsAppMessage` à policy
`aws_iam_role_policy.sms_send` (`infra/terraform/modules/ec2-app/main.tf`).
```
