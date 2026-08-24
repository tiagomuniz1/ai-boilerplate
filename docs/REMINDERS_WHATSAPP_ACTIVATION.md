# Ativação dos Lembretes por WhatsApp (produção)

Runbook para **ligar** os lembretes de consulta por **WhatsApp via Twilio** depois
que a feature já está deployada. A AWS negou o SMS nesta conta, então o canal é
WhatsApp pela Twilio (HTTPS externo — sem infra AWS de mensageria).

Enquanto os passos abaixo não forem feitos, o código roda em produção mas **não
envia**: o cron fica em no-op (`REMINDERS_ENABLED=false`) e o adapter faz skip
gracioso enquanto as credenciais Twilio / o template não existirem (nesse caso o
claim é **liberado**, então nada é perdido — os lembretes saem sozinhos quando
tudo estiver configurado e a flag ligada).

Pré-requisito: AWS CLI logado no profile `pulso-workload` (para o SSM) e uma conta
**Twilio**.

---

## 0. Onboarding Twilio + WhatsApp (externo)

1. **Conta Twilio** → pegue o `Account SID` e o `Auth Token`.
2. **Sender de WhatsApp**: habilite um número para WhatsApp na Twilio (*Messaging →
   Senders → WhatsApp senders*). A Twilio conduz a verificação do WhatsApp Business
   / Meta. O sender fica no formato `whatsapp:+55XXXXXXXXXXX`.
3. **Content template aprovado** (obrigatório para mensagem iniciada pela empresa):
   crie um *Content Template* utilitário (*Content Template Builder* / Content API)
   com **5 variáveis posicionais**, na ordem que o backend envia:
   `{{1}}` nome do paciente · `{{2}}` profissional · `{{3}}` clínica · `{{4}}` data (DD/MM) · `{{5}}` hora (HH:MM).
   Exemplo de corpo:
   > `Olá, {{1}}! Lembrete da sua consulta com {{2}} na {{3}} em {{4}} às {{5}}. Dúvidas? Fale com a clínica.`
   Após aprovado, anote o **Content SID** (`HX...`).

> **Testar já, sem esperar aprovação:** use o **Twilio WhatsApp Sandbox** (*Messaging
> → Try it out*). O `from` é o número compartilhado `whatsapp:+14155238886`, cada
> testador manda o *join code* para esse número, e há templates de teste prontos. É
> só usar esses valores no passo 2 (mesmo código).

---

## 1. Infra (Terraform) — opcional, só limpeza

Não há infra AWS nova para o WhatsApp. Este branch **removeu** as peças da tentativa
de SMS (policy IAM `sms-send`, `configuration_set` e `opt_out_list` do Pinpoint). Um
`terraform apply` vai **destruir** esses recursos órfãos (seguro — nada os usa):

```bash
cd infra/terraform/environments/production
terraform init -backend-config="profile=pulso-devops"
terraform plan  -var="aws_profile=pulso-workload" -var="frontend_url=https://pulso.center"
terraform apply -var="aws_profile=pulso-workload" -var="frontend_url=https://pulso.center"
```

> A AMI da EC2 continua **pinada** (`ami_id` no módulo `ec2_app`) — nenhum apply
> recria a instância. Passe sempre `frontend_url=https://pulso.center` (valor vivo)
> para não mexer no CORS.

---

## 2. SSM — ligar a flag + credenciais Twilio

Grave só as chaves de reminder (não precisa re-seedar tudo). O `TWILIO_AUTH_TOKEN`
é **SecureString**:

```bash
REGION=us-east-1
P=pulso-workload

aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/REMINDERS_ENABLED --type String --value "true"

aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/TWILIO_ACCOUNT_SID --type String --value "ACxxxxxxxx"

aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/TWILIO_AUTH_TOKEN --type SecureString --value "<auth-token>"

# sender aprovado (ou o sandbox whatsapp:+14155238886)
aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/TWILIO_WHATSAPP_FROM --type String --value "whatsapp:+55XXXXXXXXXXX"

# Content SID do template aprovado
aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/TWILIO_REMINDER_CONTENT_SID --type String --value "HXxxxxxxxx"
```

> Alternativa (reseed completo): `REMINDERS_ENABLED=true TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_WHATSAPP_FROM=... TWILIO_REMINDER_CONTENT_SID=... JWT_SECRET=... SMTP_PASS=... ... bash infra/scripts/seed-ssm.sh production apply` — só se tiver TODOS os segredos em mãos (o script reescreve o conjunto inteiro).

---

## 3. Recarregar a config no backend

O backend lê o SSM **no boot**. Reaplicar o mesmo commit não recria o container —
recrie o backend na instância via SSM Run Command (conta Workload):

```bash
INSTANCE_ID=i-005e1c16fbe738142   # EC2 de produção (confirme: aws ec2 describe-instances --profile pulso-workload --filters Name=tag:Name,Values=pulso-production Name=instance-state-name,Values=running --query 'Reservations[].Instances[].InstanceId')
aws ssm send-command --profile pulso-workload --region us-east-1 \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --comment "reload SSM env + recreate backend for reminders" \
  --parameters 'commands=["cd /opt/pulso || cd /home/ec2-user/pulso","docker compose -f docker-compose.prod.yml up -d --force-recreate backend"]'
```

---

## 4. Verificar

1. Cadastre uma consulta de teste ~24h e/ou ~3h à frente para um número que tenha
   **entrado no sandbox** (ou qualquer número, se já estiver em produção) e aguarde o
   próximo tick (o cron roda a cada 10 min).
2. Confira a tabela de tracking:
   ```sql
   SELECT appointment_id, offset_label, channel, status, provider_message_id, created_at
   FROM production.appointment_reminders
   ORDER BY created_at DESC LIMIT 20;
   ```
   Esperado: `channel='whatsapp'`, `status='sent'` com `provider_message_id` (o `SM...`
   da Twilio). `skipped` = telefone inválido; `failed` + `error` = a Twilio recusou
   (veja o `error`); se o claim sumir, foi liberado por falta de config (Twilio ainda
   não setado).
3. Logs do backend (JSON): `Failed to send appointment reminder` / `Twilio WhatsApp
   not fully configured` — nunca deve aparecer telefone/CPF (só `appointmentId`).

---

## Reverter / desligar rapidamente

```bash
aws ssm put-parameter --profile pulso-workload --region us-east-1 --overwrite \
  --name /pulso/production/backend/REMINDERS_ENABLED --type String --value "false"
# depois recarregue o backend (passo 3). O cron volta a no-op imediatamente.
```

---

## Notas de arquitetura

- Trocar de provedor é barato: todo o pipeline (cron, janela 24h+3h, dedup por
  `INSERT ... ON CONFLICT`, tracking, self-heal via `release`) é agnóstico. Só a
  implementação de `IWhatsAppReminderAdapter` (hoje `TwilioWhatsAppAdapter`) conhece
  a Twilio. Um SMS de fallback no futuro seria outro adapter + um branch de canal.
- O template é **posicional** (`{{1}}`..`{{5}}`): se você mudar a ordem/qtde das
  variáveis no template da Twilio, ajuste `buildTemplateVariables` no
  `send-appointment-reminders.use-case.ts`.
