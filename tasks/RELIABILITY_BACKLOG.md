# Backlog — Confiabilidade e Observabilidade em Produção

> **Status: em andamento (2026-08-03).** Levantado durante a investigação de uma falha de deploy (2026-07-27). Retomado para reduzir custo (um único ambiente na AWS) — ver plano de migração. Os dois itens P0/P1 abaixo ("Produção ainda não está de fato provisionada" e "Fluxo de branches documentado não reflete a realidade") estão sendo resolvidos por essa migração; os demais (alerting/observabilidade, alta disponibilidade) seguem pendentes, a retomar antes de tráfego real.

## Objetivo

Registrar os riscos de confiabilidade identificados no sistema — tanto no código quanto na infraestrutura — para virarem tarefas priorizadas quando o time voltar a atenção para o lançamento em produção. Não é uma auditoria completa: reflete o que apareceu naturalmente durante o diagnóstico de um incidente de deploy (rename do repositório quebrando o trust do GitHub OIDC).

---

## P0 — Bloqueantes antes do go-live

### Nenhum alerting/observabilidade além de logs estruturados

Hoje, se algo quebrar em produção, o time só fica sabendo pelo usuário reclamando. Existem logs estruturados (Winston/JSON, ver `ai/context/backend.md`) e um health check (`GET /health` cobrindo DB + Redis), mas nada que **notifique** proativamente:
- Sem alerta em erro 5xx acima de um limiar
- Sem alerta quando o health check começa a falhar
- Sem APM (ex: Sentry) para agrupar/rastrear exceções não tratadas

**Sugestão:** no mínimo, um alarme simples (CloudWatch Alarm + SNS, ou Sentry) para health-check down e taxa de erro 5xx antes de qualquer tráfego real.

### ~~Produção ainda não está de fato provisionada~~ — **em execução (2026-08-03)**

Durante o diagnóstico de hoje, ficou claro que o ambiente de `production` nunca tinha sido totalmente aplicado — só existia a role de CI/CD (`pulso-production-ci-deploy`) com trust policy corrigida. Os módulos `rds` (banco) e `cdn` (CloudFront + Route 53 para `pulso.center`) em `infra/terraform/environments/production/main.tf` **nunca foram aplicados**. Não havia histórico de produção rodando de verdade.

**Resolvendo via:** migração para um único ambiente na AWS (ver `docs/DEPLOY_RUNBOOK.md` §3). ECR e o GitHub OIDC provider foram extraídos para um ambiente `shared` à parte (não são mais propriedade de staging), e o `terraform apply` completo de `production` está para ser executado como parte dessa migração — ao final, staging é destruído e produção passa a ser o único ambiente vivo.

### Arquitetura de instância única, sem alta disponibilidade

Produção roda em **uma única instância EC2** (`infra/terraform/modules/ec2-app`), sem auto-scaling group nem multi-AZ. Se a instância cair ou precisar reiniciar, o sistema fica fora do ar até a recuperação manual/automática do EC2 — não há failover.

**Sugestão:** avaliar se o volume esperado de uso justifica migrar para ECS/Auto Scaling Group antes do lançamento, ou aceitar o risco conscientemente por enquanto (custo vs. disponibilidade).

---

## P1 — Riscos que já se provaram reais

### Trust do GitHub OIDC é frágil a mudanças administrativas

O rename do repositório (`ai-boilerplate` → `pulso`) quebrou o deploy **duas vezes seguidas**:
1. A trust policy da IAM role (`infra/terraform/modules/github-oidc/main.tf`) tinha o nome do repo hardcoded via `var.github_repo` (default `"ai-boilerplate"`).
2. Mesmo depois de corrigir o nome, o GitHub usa por padrão os **IDs imutáveis** de owner/repo no `sub` claim do token OIDC (`repo:owner@ID/repo@ID:environment:...`), não só o nome — isso não é documentado de forma óbvia e exigiu inspecionar o CloudTrail para descobrir.

Isso mostra que uma mudança "administrativa" no GitHub (rename, transferência de owner) pode derrubar o deploy silenciosamente até a próxima tentativa de execução.

**Sugestão:** documentar essa pegadinha no `ai/context/backend.md` ou num README de infra, para não ser redescoberta do zero da próxima vez que algo do tipo acontecer (ex: transferência de owner, criação de um novo ambiente).

### ~~Fluxo de branches documentado não reflete a realidade~~ — **resolvido (2026-08-03)**

O `CLAUDE.md` e `ai/context/architecture.md` descreviam o fluxo `feature/* → develop → main`, com `develop` = staging e `main` = production. Na prática, **nunca existiu branch `develop`** no repositório — os PRs vão direto de `feature/*` para `main`, e o deploy é escolhido por um input manual no workflow (`environment`), não pela branch.

**Resolvido pela opção (b):** `CLAUDE.md`, `ai/context/architecture.md`, `README.md` e `docs/DEPLOY_RUNBOOK.md` foram atualizados para refletir o fluxo real — branch única (`feature/* → main`), escolha manual de ambiente no dispatch, e ambiente único (`production`, já que staging foi descomissionado na mesma migração).

### ~~Drift de AMI na instância EC2 de staging~~ — **aconteceu de verdade e foi corrigido (2026-07-27)**

O que este item previa como risco se confirmou no mesmo dia: um `apply` com `-target=module.github_oidc` (módulo inteiro, não o recurso específico) em staging arrastou `aws_instance.this` como dependência e encontrou uma AMI mais nova (`most_recent = true`), substituindo a instância EC2 de staging. A Elastic IP (`18.211.167.222`, a que o CloudFront/DNS aponta) não foi realocada automaticamente para a nova instância — ficou órfã — e o site ficou fora do ar com `504 Gateway Timeout` até o usuário notar e pedir verificação.

**Correção aplicada:**
1. Reassociada a EIP manualmente via `aws ec2 associate-address` (restaurou o site imediatamente, sem tocar na instância).
2. AMI fixada explicitamente (`ami_id = "ami-00adf8f2fe708c532"`) em `infra/terraform/environments/staging/main.tf`, eliminando o `most_recent = true` como fonte de drift — confirmado com `terraform plan` retornando "No changes" depois do fix.

**Lição prática:** `-target` no nível de módulo (`module.x`) não é seguro — ele arrasta qualquer dependência do módulo, incluindo recursos com drift pendente não relacionado à mudança pretendida. Sempre targetar o **recurso específico** (`module.x.recurso.nome`), nunca o módulo inteiro, ao usar `-target` para isolar uma correção.

---

## P2 — Pontos fortes a preservar (não são risco, são base a manter)

- Cobertura de testes obrigatória (100% unitário + integração + E2E completo) é um padrão sólido — manter a régua ao adicionar as features novas.
- Padrões de resiliência em adapters (timeout, retry só em 5xx, circuit breaker) e nos use-cases (transações, idempotência, locks otimista/pessimista) já mitigam boa parte dos erros transitórios.
- Soft delete como padrão e Problem Details (RFC 9457) para erros reduzem inconsistência de comportamento entre módulos.

---

## Referências

- `infra/terraform/modules/github-oidc/` — módulo de trust OIDC (fix aplicado no PR #14)
- `infra/terraform/environments/production/main.tf` — módulos `rds` e `cdn` ainda não aplicados
- `infra/terraform/environments/staging/main.tf` — drift de AMI observado no `plan`
- `ai/context/architecture.md` — tabela de branches (`develop` não existe de fato)
