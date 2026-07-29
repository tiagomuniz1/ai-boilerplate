# Template — `tasks/<FEATURE_SLUG>_PLAN.md`

Use este arquivo **só quando a feature se quebra em múltiplas unidades implementáveis** (mais de um `task-backend.md`/`task-frontend.md`), tipicamente porque atravessa backend + frontend, ou porque um módulo backend tem uma dependência de infra que precisa existir antes (ex.: um método novo num adapter compartilhado antes do módulo que o usa). Para uma mudança de unidade única, pule este arquivo e vá direto para `tasks/{backend,frontend}/<slug>/`.

Nome do arquivo: `tasks/<NOME_DA_FEATURE_EM_CAIXA_ALTA_COM_UNDERSCORE>_PLAN.md` (ex.: `FOTOS_CONSULTA_PLAN.md`).

```markdown
# <Nome da Feature>

> **Status: planejado, não iniciado.** Levantado em <data> a partir de <origem do pedido — ex: "um pedido do usuário para X">. Ver ordem de execução ao final.

## Contexto
Parágrafo(s) explicando o problema real, o que já existe de parecido no sistema (e por que não serve/precisa ser estendido), e as decisões de produto que foram confirmadas com o usuário antes de prosseguir — liste-as explicitamente como "confirmado com o usuário" quando envolverem escolha de comportamento, não só implementação.

## Decisão: <nome de uma decisão estrutural não óbvia, se houver>
Quando a feature exige uma escolha arquitetural que vale a pena destacar (ex.: "vamos corrigir um gap na camada compartilhada em vez de replicar o problema") — uma sub-seção dedicada, com a alternativa descartada e por quê.

## Backend
Prosa (não lista de tarefas ainda) descrevendo o módulo novo/alterado: entidade, migration, repository, use-cases (um parágrafo cada, citando qual módulo existente serve de molde), controller (rotas + roles), módulo (imports/exports), DTOs compartilhados. Termina com uma nota sobre o que precisa ser adicionado em `ai/context/permissions.md`.

## Frontend
Prosa equivalente: feature nova/alterada, componentes principais (um parágrafo cada, citando o padrão existente que espelham), pontos de wiring em páginas existentes (citar arquivo:linha reais, confirmados por leitura direta do código).

## Testes
Visão geral de cobertura esperada nas três camadas (unitário, integração, E2E) — só o suficiente para justificar a ordem de execução abaixo, o detalhe fino vai em cada `task-*.md`.

## Ordem de execução
Lista numerada das unidades, na ordem em que devem ser implementadas (dependências primeiro). Cada item aponta para o slug da pasta correspondente em `tasks/{backend,frontend}/<slug>/`.

1. `<slug-1>` — <uma linha do que é>
2. `<slug-2>` — <uma linha, citando se depende do item anterior>
...

## Verificação
Comandos exatos para rodar depois que tudo estiver implementado (testes unitários com coverage, integração, migration, cypress, e passos de verificação manual ponta a ponta cobrindo o cenário crítico de permissão/isolamento, se houver).
```
