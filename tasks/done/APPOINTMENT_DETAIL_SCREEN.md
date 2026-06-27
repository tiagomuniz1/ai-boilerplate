# Tasks — Tela própria de consulta

Plano de referência: [`appointment-detail-screen.md`](./appointment-detail-screen.md).

Cada task é uma pasta com dois arquivos:
- `task-<area>.md` — a especificação completa (contratos, fluxos, regras, testes, DoD).
- `prompt-<area>.md` — cabeçalho de execução + a especificação (arquivo a ser enviado ao agente de implementação).

Estrutura espelha `tasks/done/`: `tasks/backend/<task>` e `tasks/frontend/<task>`. Ao concluir uma task, mover a pasta para `tasks/done/<area>/`.

---

## Ordem de execução

Executar **nesta ordem**. O backend precede o frontend porque a mudança de DTO no `@app/shared` (bloco `patient` no detalhe da consulta) atravessa os dois lados.

| # | Área | Task | Depende de | Resumo |
|---|---|---|---|---|
| 1 | backend | `embarcar-dados-do-paciente-no-detalhe-da-consulta` | — | `GET /appointments/:id` passa a retornar `AppointmentDetailResponseDto` com o bloco `patient` (nome, e-mail, telefone, nascimento, documento, gênero). Listagem inalterada. |
| 2 | frontend | `criar-tela-propria-de-consulta` | #1 | Nova rota `/[slug]/appointments/[id]` (dados do paciente + detalhes + ações + prontuário); modal vira enxuto com botão "Ir para a consulta"; `MedicalRecordSection` extraída para componente próprio. |

### Grafo de dependências
```
#1 (backend: bloco patient no detalhe) ──> #2 (frontend: tela própria + modal enxuto)
```

---

## Decisões-chave já fechadas (ver plano para o racional)

- Clique na consulta mantém um **modal enxuto** com botão "Ir para a consulta" — não navega direto.
- Dados do paciente são **embarcados no detalhe da consulta** (não se chama `/patients`), respeitando a regra: DOCTOR vê o paciente apenas via vínculo da consulta.
- O bloco `patient` fica **só** no endpoint de detalhe (`:id`); a listagem paginada permanece magra.
- Sem migration — é só agregação de leitura.
- A tela é montada em **seções**, deixando o ponto de extensão pronto para **receitas, atestados e exames** (evolução futura).

---

## Definition of Done (transversal a todas as tasks)
- Testes unitários 100% + integração; E2E nos fluxos críticos (frontend).
- Sem violação de arquitetura, sem `process.env` fora de `env.config.ts` (backend), sem axios fora do API Client (frontend).
- Dados da API via React Query — nunca Zustand (frontend).
- Own-resource do DOCTOR preservado; USER em leitura; PATIENT sem acesso.
