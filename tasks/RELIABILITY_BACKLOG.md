# Backlog — Confiabilidade e Observabilidade em Produção

> **Status: não iniciado.** Levantado durante a investigação de uma falha de deploy (2026-07-27), sem execução imediata — produção ainda não vai ao ar no curto prazo, o foco agora é novas features. Retomar antes do go-live real.

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

### Produção ainda não está de fato provisionada

Durante o diagnóstico de hoje, ficou claro que o ambiente de `production` nunca tinha sido totalmente aplicado — só existe hoje a role de CI/CD (`pulso-production-ci-deploy`) com trust policy corrigida. Os módulos `rds` (banco) e `cdn` (CloudFront + Route 53 para `pulso.center`) em `infra/terraform/environments/production/main.tf` **nunca foram aplicados**. Não há histórico de produção rodando de verdade.

**Sugestão:** antes do go-live, rodar um `terraform apply` completo de production (com `frontend_url` e demais variáveis) como um dry-run, validando o fluxo ponta a ponta antes de haver usuários reais.

### Arquitetura de instância única, sem alta disponibilidade

Cada ambiente (`staging`/`production`) roda em **uma única instância EC2** (`infra/terraform/modules/ec2-app`), sem auto-scaling group nem multi-AZ. Se a instância cair ou precisar reiniciar, o sistema fica fora do ar até a recuperação manual/automática do EC2 — não há failover.

**Sugestão:** avaliar se o volume esperado de uso justifica migrar para ECS/Auto Scaling Group antes do lançamento, ou aceitar o risco conscientemente por enquanto (custo vs. disponibilidade).

---

## P1 — Riscos que já se provaram reais

### Trust do GitHub OIDC é frágil a mudanças administrativas

O rename do repositório (`ai-boilerplate` → `pulso`) quebrou o deploy **duas vezes seguidas**:
1. A trust policy da IAM role (`infra/terraform/modules/github-oidc/main.tf`) tinha o nome do repo hardcoded via `var.github_repo` (default `"ai-boilerplate"`).
2. Mesmo depois de corrigir o nome, o GitHub usa por padrão os **IDs imutáveis** de owner/repo no `sub` claim do token OIDC (`repo:owner@ID/repo@ID:environment:...`), não só o nome — isso não é documentado de forma óbvia e exigiu inspecionar o CloudTrail para descobrir.

Isso mostra que uma mudança "administrativa" no GitHub (rename, transferência de owner) pode derrubar o deploy silenciosamente até a próxima tentativa de execução.

**Sugestão:** documentar essa pegadinha no `ai/context/backend.md` ou num README de infra, para não ser redescoberta do zero da próxima vez que algo do tipo acontecer (ex: transferência de owner, criação de um novo ambiente).

### Fluxo de branches documentado não reflete a realidade

O `CLAUDE.md` e `ai/context/architecture.md` descrevem o fluxo `feature/* → develop → main`, com `develop` = staging e `main` = production. Na prática, **não existe branch `develop`** no repositório — os PRs vão direto de `feature/*` para `main`, e os deploys de staging/produção são escolhidos por um input manual no workflow (`environment: staging|production`), não pela branch.

**Sugestão:** decidir entre (a) recriar o fluxo `develop` de verdade, com PR e testes em staging antes de chegar em `main`, ou (b) atualizar a documentação para refletir o fluxo real (branch única + escolha manual de ambiente no dispatch). Deixar como está gera dissonância entre o que o time acha que está seguindo e o que de fato acontece.

### Drift de AMI na instância EC2 de staging

Um `terraform plan` em staging (rodado durante esse mesmo diagnóstico) mostrou que a AMI referenciada mudou (`ami-0fd6240f599091088` → `ami-004f790b835b26145`), forçando a substituição completa da instância EC2 num próximo `apply` sem `-target`. Isso é efeito de uma data source `aws_ami` com `most_recent = true` (padrão comum), que vai "descobrir" uma AMI mais nova a qualquer momento e pedir replace da instância.

**Sugestão:** fixar a AMI por ID explícito (atualizado deliberadamente via PR) em vez de `most_recent = true`, para que substituições de instância sejam sempre uma decisão consciente, não um efeito colateral de rodar `plan`/`apply` por outro motivo.

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
