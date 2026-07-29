---
name: planejador
description: Investiga este projeto (código real + CLAUDE.md/ai/context) e produz um plano de execução detalhado em tasks/ (task-*.md + prompt-*.md, e um _PLAN.md de visão geral quando a feature tem múltiplas unidades) para o desenvolvedor revisar ANTES de qualquer linha de código de produção ser escrita. Use sempre que o usuário pedir para planejar, especificar, detalhar, quebrar em tasks, ou simplesmente descrever uma feature/bug/mudança nova pedindo para "ver o plano antes" — mesmo que não diga literalmente "planejador" ou "plano". Depois que os arquivos de plano são escritos, a implementação (pelo code builder, a partir do prompt-*.md) só começa com aprovação explícita do desenvolvedor — esta skill nunca escreve código de aplicação.
---

# Planejador

Este projeto já tem um formato de plano provado, usado em features reais (ver `tasks/backend/**` e `tasks/frontend/**` existentes) — esta skill formaliza e automatiza a produção desse formato. Não é uma skill de "plan mode" genérica: o artefato final são arquivos Markdown persistidos em `tasks/`, revisados como qualquer outro documento do projeto (ex.: via `git diff`), não uma aprovação inline efêmera.

**Fronteira rígida desta skill: ela só escreve arquivos dentro de `tasks/`. Nunca edita código de `apps/` ou `packages/` durante esta skill** — nem "só um ajuste rápido para confirmar que funciona". Investigação lê o código, não o modifica.

## Passo 1 — Entender o pedido

Leia o pedido do usuário como um tech lead leria um ticket vago: extraia o que já está claro e liste o que falta.

Só pergunte ao usuário (via `AskUserQuestion`) decisões de **produto/UX genuinamente ambíguas** — coisas que nenhum documento do projeto resolve e que mudam o comportamento observável (ex.: "a galeria agrega fotos de quais consultas — só as do profissional logado, ou todas da clínica?"). Não pergunte sobre:
- Arquitetura/camadas/naming — isso já está definido em `ai/context/backend.md`/`frontend.md`/`architecture.md` (já carregados no seu contexto via `CLAUDE.md`).
- Permissões — já estão em `ai/context/permissions.md`; se o pedido envolve um recurso já existente, a tabela de permissões dali é a fonte, não uma pergunta.
- Qualquer coisa que a investigação do Passo 2 vai responder sozinha (ex.: "existe um util pra isso?" — vá ver, não pergunte).

Se o pedido já veio detalhado (o usuário descreveu o comportamento esperado em várias frases, como no pedido que gerou este arquivo de skill), não invente perguntas artificiais só para ter uma etapa de interview — vá direto para a investigação.

## Passo 2 — Investigar o projeto de verdade

O valor deste plano vem de estar embasado em código real, não em suposição. Para cada decisão do plano, prefira citar um arquivo:linha existente a descrever em abstrato. Concretamente:

1. **Ache o molde mais próximo.** Quase toda feature nova neste projeto é uma variação de um módulo que já existe (ex.: um módulo de upload novo geralmente clona a estrutura de `exams` ou `atestados`; uma tela de listagem nova segue o padrão de `users`/`professionals`). Grep pelo domínio (nomes de entidade, rotas, componentes parecidos) e leia o candidato mais próximo por completo antes de escrever a task.
2. **Confirme o que já existe para reaproveitar** (utils, hooks, DTOs, componentes) — a task deve dizer explicitamente "reaproveitar X, não duplicar" quando aplicável, citando o caminho exato.
3. **Confirme a tabela de permissões** em `ai/context/permissions.md` para o recurso em questão (ou o resumo por perfil, se for um recurso novo que se encaixa num perfil existente).
4. **Para tasks de frontend com sintoma visual**, rode o grep que prova o problema (ex.: dois mapas de label duplicados) — a seção "Contexto" da task deve conter esse achado concreto, não uma descrição genérica do sintoma.
5. Se a investigação for ampla (muitos candidatos possíveis, módulo grande), considere usar o agente `Explore` em vez de gastar múltiplas buscas manuais.

Não avance para o Passo 3 com lacunas que a investigação deveria ter fechado — "não sei se existe um util pra isso" não é uma frase aceitável numa task deste projeto.

## Passo 3 — Decidir granularidade e camadas

- **Camadas**: a feature é só backend, só frontend, ou as duas? A maioria é as duas.
- **Unidade única vs múltiplas unidades**: se a feature cabe numa mudança coesa por camada (a maioria dos casos), cada camada vira **uma** pasta `tasks/{backend,frontend}/<slug>/`. Se a feature se quebra naturalmente em partes com dependência entre si (ex.: "adicionar um método num adapter compartilhado" precisa existir antes do "módulo novo que o usa"), ou atravessa múltiplos módulos, quebre em várias unidades — cada uma com sua própria pasta — e escreva primeiro um `tasks/<FEATURE_SLUG>_PLAN.md` de visão geral (ver `references/plan-overview-template.md`) com a ordem de execução entre elas.
- **Slug**: kebab-case em português, verbo no infinitivo + objeto, como as pastas já existentes (`criar-modulo-de-fotos-da-consulta`, `esclarecer-perfil-de-acesso-e-profissao-em-usuarios`). O slug vira o nome da pasta em ambos `tasks/backend/<slug>/` e `tasks/frontend/<slug>/` quando a mesma unidade lógica tem as duas camadas (elas podem ter slugs diferentes se as unidades de trabalho não coincidirem 1:1 entre camadas — julgue pelo caso).

## Passo 4 — Escrever os arquivos

Nesta ordem, por unidade:

1. Se multi-unidade: `tasks/<FEATURE_SLUG>_PLAN.md` primeiro — siga `references/plan-overview-template.md`.
2. Para cada unidade backend: `tasks/backend/<slug>/task-backend.md` — siga `references/task-backend-template.md`.
3. Para cada unidade frontend: `tasks/frontend/<slug>/task-frontend.md` — siga `references/task-frontend-template.md`.
4. Para cada `task-*.md` escrito, o `prompt-*.md` correspondente na mesma pasta — siga `references/prompt-template.md`. Escreva-o **logo depois** do `task-*.md` da mesma unidade, condensando o que acabou de escrever (nunca divergindo em conteúdo).

Os templates têm instruções inline sobre o que cada seção deve conter e quando omitir uma seção. Releia os exemplos reais do projeto (`tasks/backend/**/task-backend.md`, `tasks/frontend/**/task-frontend.md`) se precisar recalibrar o tom — eles são dense, citam arquivo:linha, e nunca descrevem em abstrato o que dá pra apontar em concreto.

Toda task termina com uma seção **Definition of Done** em checklist e uma seção de **Cenários de teste** cobrindo unitário + integração (+ E2E, sempre, para frontend — nenhuma funcionalidade é pequena demais para ficar sem teste E2E, por regra do próprio projeto).

## Passo 5 — Entregar e parar

Depois de escrever os arquivos:

1. Liste os arquivos criados (caminhos).
2. Dê um resumo curto (3-5 frases) do que o plano cobre e da ordem de execução, se houver múltiplas unidades.
3. Diga explicitamente que a implementação não começa agora — o desenvolvedor revisa os arquivos (normalmente via `git diff`/leitura direta) e só depois disso alguém (você mesmo, retomando a conversa, ou o code builder a partir do `prompt-*.md`) implementa.
4. **Não commite os arquivos automaticamente** — commit é uma ação que precisa de confirmação explícita do usuário, como qualquer outro commit neste projeto.

Não abra `ExitPlanMode` nem peça aprovação inline de plano — a aprovação aqui é assíncrona, via os arquivos em `tasks/`, não uma interação de plan-mode dentro da mesma conversa.

## Regras invioláveis

- Nunca escrever ou editar código de aplicação (`apps/`, `packages/*/src` fora de `packages/shared` quando a task explicitamente pedir um DTO — e mesmo assim, só como parte da implementação real, nunca durante o planejamento) enquanto estiver executando esta skill.
- Nunca citar um arquivo, linha, util ou padrão que você não verificou de fato existir — se não teve tempo de confirmar, diga que precisa ser confirmado na implementação, não invente.
- As regras de arquitetura/testes/segurança de `CLAUDE.md` e `ai/context/*.md` são herdadas pela task, não reinventadas — a task referencia essas regras quando relevante, não as reescreve.
- `task-*.md` e `prompt-*.md` da mesma unidade descrevem a mesma decisão em dois níveis de detalhe — nunca deixe um deles com informação que o outro não tem.
- Pergunte ao usuário só o que é genuinamente decisão de produto — o resto se resolve investigando o projeto.
