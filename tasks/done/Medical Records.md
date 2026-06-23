# Tasks — Feature de Dashboard

Plano de testes de referência: [`DASHBOARD_TEST_PLAN.md`](./DASHBOARD_TEST_PLAN.md).

Cada task é uma pasta com dois arquivos:
- `task-<area>.md` — a especificação completa (contratos, fluxos, regras, testes, DoD).
- `prompt-<area>.md` — cabeçalho de execução + a especificação (arquivo a ser enviado ao agente de implementação).

Estrutura espelha `tasks/done/`: `tasks/backend/<task>` e `tasks/frontend/<task>`. Ao concluir uma task, mover a pasta para `tasks/done/<area>/`.

---

## Ordem de execução

Executar **uma a uma, nesta ordem**. O backend inteiro precede o frontend porque mudanças no `@app/shared` (novos enums + `DashboardResponseDto`) atravessam os dois lados.

| # | Área | Task | Depende de | Resumo |
|---|---|---|---|---|
| 1 | backend | `evoluir-consulta-confirmacao-falta-e-convenio` | — | Adiciona status `CONFIRMED`/`NO_SHOW` (com endpoints de transição) e o campo `insuranceType` à consulta. Pré-requisito de dados para os KPIs e o gráfico de convênio. |
| 2 | backend | `criar-modulo-de-dashboard` | #1 | Endpoint read-only `GET /dashboard` que agrega KPIs, pacientes, procedimentos, convênio, duração, timeline, distribuição etária e aniversariantes — escopo por clínica, DOCTOR own-resource. |
| 3 | frontend | `criar-tela-de-dashboard` | #2 | Tela com `recharts`: faixa de KPIs, 4 cards de gráficos, timeline em largura total, distribuição etária e painel de aniversariantes; filtro de período via React Query. |

### Grafo de dependências

```
#1 ──> #2 ──> #3
```

---

## Migrations (ordem dos timestamps)

| Task | Migration |
|---|---|
| #1 | `1751000000000-add-confirmed-no-show-and-insurance-type-to-appointments` |
| #2 | — (módulo somente leitura, sem migration) |

---

## Decisões-chave já fechadas

- **KPIs** mapeiam status: agendados=`SCHEDULED`, confirmados=`CONFIRMED`, atendidos=`COMPLETED`, faltaram=`NO_SHOW`.
- **Máquina de estados:** `SCHEDULED → CONFIRMED → COMPLETED`; `SCHEDULED|CONFIRMED → NO_SHOW`; `SCHEDULED|CONFIRMED → CANCELLED`. Estados terminais: `COMPLETED`, `CANCELLED`, `NO_SHOW`.
- **Procedimentos realizados** = consultas `COMPLETED` agrupadas por `specialty.name` (sem catálogo de procedimentos próprio — fora de escopo). Sem especialidade → bucket "Sem especialidade".
- **Convênio** = novo campo `insuranceType` (`particular` | `convenio`), informado na criação; nulos ignorados nas métricas de convênio.
- **Novos vs recorrentes:** paciente é *novo* se a primeira consulta na clínica cai dentro do período; senão *recorrente*.
- **Período padrão:** últimos 30 dias quando `from`/`to` omitidos. `appointmentsByDay` preenche dias sem consulta com `count: 0` (no use-case).
- **Permissão:** dashboard visível para ADMIN, DOCTOR e USER (matriz da sidebar). DOCTOR vê apenas os próprios dados; PATIENT não acessa.
- **Lib de gráficos:** `recharts` (PieChart / AreaChart / BarChart). Primeira lib de chart do projeto.
- **Dashboard é read-only:** sem mutation, sem tabela nova; agregação cacheada (`dashboard:<clinicId>:...`, TTL 60s).

---

## Definition of Done (transversal a todas as tasks)
- Testes unitários 100% + integração; E2E nos fluxos críticos (frontend).
- Sem violação de arquitetura, sem `process.env` fora de `env.config.ts` (backend), sem axios fora do API Client (frontend).
- Dados da API via React Query — nunca Zustand (frontend).
- Ao finalizar a feature: atualizar `ai/context/permissions.md` (adicionar a linha do Dashboard / transições de consulta) e o `CHANGELOG.md` de cada app.
