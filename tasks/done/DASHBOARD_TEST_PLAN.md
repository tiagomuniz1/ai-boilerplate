# Plano de Testes — Dashboard

Plano a ser **seguido** para validar a feature de Dashboard (tasks #1 a #3 em [`README.md`](./README.md)). Cobre backend (unit + integração), frontend (unit + integração) e E2E. Cada cenário tem um critério de aceite objetivo.

---

## 1. Escopo

| Bloco do dashboard | Fonte de dado | Tasks |
|---|---|---|
| KPIs (agendados / confirmados / atendidos / faltaram) | `appointments.status` | #1, #2, #3 |
| Pacientes (novos vs recorrentes + gênero) | `appointments` + `patients.gender` | #2, #3 |
| Procedimentos realizados (por especialidade) | `appointments COMPLETED` + `specialties` | #2, #3 |
| Pacientes x Convênio | `appointments.insuranceType` | #1, #2, #3 |
| Duração do atendimento (média + por convênio) | `appointments COMPLETED` (`endTime-startTime`) | #1, #2, #3 |
| Atendimentos no período (timeline) | `appointments COMPLETED` por dia | #2, #3 |
| Distribuição etária | `patients.birthDate` | #2, #3 |
| Aniversariantes do dia | `patients.birthDate` | #2, #3 |

---

## 2. Pré-condições e dados de teste

- **Banco de teste** isolado (schema `test`), migrations via `beforeAll`, limpeza via `afterEach`.
- **Seed determinístico (faker)** para integração, garantindo, no período de referência (últimos 30 dias):
  - consultas em **cada** status: `SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`;
  - mix de `insuranceType`: `particular`, `convenio` e `null`;
  - ao menos **2 médicos** distintos (para testar isolamento do DOCTOR);
  - pacientes com `birthDate` variados, **incluindo um aniversariante de hoje**;
  - ao menos um paciente "novo" (primeira consulta dentro do período) e um "recorrente" (consulta anterior ao período);
  - consultas `COMPLETED` em dias distintos para a timeline e **pelo menos um dia sem consulta** dentro do intervalo (para validar o preenchimento com `count: 0`);
  - consulta `COMPLETED` **sem** `specialtyId` (bucket "Sem especialidade").
- **Fixture do frontend:** `cypress/fixtures/dashboard.json` e mock do `dashboardService` nos testes de integração — cobrindo um payload completo e um payload com aniversariantes vazio.

---

## 3. Backend — Task #1 (status + convênio)

### 3.1 Unitários (use-case, repository mockado) — 100%
| ID | Cenário | Aceite |
|---|---|---|
| B1-U1 | `confirm`: `SCHEDULED → CONFIRMED` | status atualizado; `200` |
| B1-U2 | `confirm` em estado não-`SCHEDULED` | `UnprocessableEntityException` |
| B1-U3 | `confirm` por DOCTOR em consulta de outro médico | `ForbiddenException` |
| B1-U4 | `confirm` consulta inexistente / outra clínica | `NotFoundException` |
| B1-U5 | `confirm` com versão divergente | `ConflictException` (optimistic lock) |
| B1-U6 | `no-show`: `SCHEDULED → NO_SHOW` e `CONFIRMED → NO_SHOW` | status atualizado |
| B1-U7 | `no-show` em consulta futura | `UnprocessableEntityException` |
| B1-U8 | `no-show` em estado terminal (`COMPLETED`/`CANCELLED`/`NO_SHOW`) | `UnprocessableEntityException` |
| B1-U9 | `complete` aceita `CONFIRMED → COMPLETED` | status atualizado (regressão) |
| B1-U10 | `cancel` aceita `CONFIRMED → CANCELLED` | status atualizado (regressão) |
| B1-U11 | `create` grava `insuranceType` quando enviado / `null` quando ausente | valor persistido correto |
| B1-U12 | invalidação de cache chamada nas transições | `cacheService` invocado; falha de cache não quebra o fluxo |

### 3.2 Integração (HTTP)
| ID | Cenário | Aceite |
|---|---|---|
| B1-I1 | `PATCH /appointments/:id/confirm` happy path | `200`; body com `status: confirmed` |
| B1-I2 | `PATCH /appointments/:id/no-show` happy path | `200`; body com `status: no_show` |
| B1-I3 | `POST /appointments` com `insuranceType=convenio` | persistido; refletido no `GET` |
| B1-I4 | `GET /appointments?status=confirmed` e `?status=no_show` | filtra corretamente |
| B1-I5 | USER em `/confirm` ou `/no-show` | `403` |
| B1-I6 | DOCTOR em consulta de outro médico | `403` |

---

## 4. Backend — Task #2 (módulo dashboard)

### 4.1 Unitários (use-case, repository mockado) — 100%
| ID | Cenário | Aceite |
|---|---|---|
| B2-U1 | período default (sem `from`/`to`) | usa últimos 30 dias (`today-29`..`today`) |
| B2-U2 | `from > to` | `UnprocessableEntityException` |
| B2-U3 | DOCTOR força o próprio `doctorId` e ignora `query.doctorId` | repo chamado com doctorId do currentUser |
| B2-U4 | DOCTOR sem perfil de médico | `ForbiddenException` |
| B2-U5 | ADMIN/USER respeitam `query.doctorId` quando enviado | repo chamado com o filtro |
| B2-U6 | `appointmentsByDay` preenche dias sem consulta | todos os dias do intervalo presentes; faltantes com `count: 0` |
| B2-U7 | montagem do DTO | KPIs de `countByStatus`; `procedures.total` = soma dos itens; `insurance.total` = particular+convenio |
| B2-U8 | cache hit | retorna sem chamar o repository |
| B2-U9 | cache miss | popula o cache; falha de cache não quebra |

### 4.2 Integração (HTTP + banco)
| ID | Cenário | Aceite |
|---|---|---|
| B2-I1 | `GET /dashboard` | `200`; payload com todas as chaves do `DashboardResponseDto` |
| B2-I2 | KPIs refletem contagem real por status do seed | números conferem |
| B2-I3 | procedimentos agrupados por especialidade; consulta sem specialty | bucket "Sem especialidade" presente |
| B2-I4 | convênio soma particular+convenio e ignora `null` | `total` correto |
| B2-I5 | aniversariantes do dia | retorna o paciente com `birthDate` = hoje |
| B2-I6 | novos vs recorrentes | classificação correta conforme primeira consulta |
| B2-I7 | duração média (`COMPLETED`) | valor arredondado coerente; `0` sem dados |
| B2-I8 | isolamento do DOCTOR | DOCTOR só recebe os próprios números (2 médicos no seed) |
| B2-I9 | USER recebe dados da clínica | `200` |
| B2-I10 | PATIENT | `403` |
| B2-I11 | escopo por clínica | dados de outra clínica não vazam |

---

## 5. Frontend — Task #3 (tela)

### 5.1 Unitários — 100%
| ID | Cenário | Aceite |
|---|---|---|
| F-U1 | `toDashboardModel` converte datas | `period.from/to` e `appointmentsByDay[].date` viram `Date`; números preservados |
| F-U2 | `getDashboardStatsUseCase` | chama `dashboardService.getStats` + `toDashboardModel` |
| F-U3 | `useDashboardStats` | `queryKey` deriva dos filtros; muda ao trocar período |

### 5.2 Integração (RTL, service mockado via `jest.mock`)
| ID | Cenário | Aceite |
|---|---|---|
| F-I1 | estado loading | renderiza `dashboard-loading` (skeleton) |
| F-I2 | estado erro | renderiza `dashboard-error` (mensagem amigável, sem `detail` técnico) |
| F-I3 | estado sucesso | todos os cards visíveis pelos `data-testid` |
| F-I4 | KPIs | números do mock nos testids `dashboard-kpi-*` |
| F-I5 | `PatientsChartCard` | novos/recorrentes + total por gênero exibidos |
| F-I6 | `ProceduresChartCard` / `InsuranceChartCard` | total central exibido |
| F-I7 | `DurationCard` | número grande (ex.: "39min") + barras Particular/Convênio |
| F-I8 | `BirthdayPanel` com dados | lista os nomes |
| F-I9 | `BirthdayPanel` vazio | exibe "Nenhum aniversariante hoje." |
| F-I10 | `DashboardDateRangeFilter` | trocar período dispara novo fetch (nova queryKey) |

### 5.3 E2E (Cypress — estende `dashboard.cy.ts`, mantém os testes atuais)
| ID | Cenário | Aceite |
|---|---|---|
| F-E1 | autenticado vê KPIs e cards principais | interceptar `GET /dashboard` (fixture); `data-testid` visíveis |
| F-E2 | aniversariantes vazio | mensagem "Nenhum aniversariante hoje." renderizada |
| F-E3 | troca de período | refaz a chamada (verificar via `cy.intercept`) |
| F-E4 | (regressão) testes atuais de sidebar/auth | continuam passando |

> Seletores E2E **sempre** `data-testid` — nunca classe/texto. Cada teste independente.

---

## 6. Matriz de permissões (validar no backend e refletir na UI)

| Endpoint | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| `PATCH /appointments/:id/confirm` | ✓ | só a própria | ✗ `403` | ✗ |
| `PATCH /appointments/:id/no-show` | ✓ | só a própria | ✗ `403` | ✗ |
| `GET /dashboard` | ✓ clínica | só os próprios dados | ✓ clínica | ✗ `403` |

---

## 7. Comandos

```bash
# Backend
NODE_ENV=test yarn workspace @app/backend seed:run
yarn workspace @app/backend test:unit --coverage
yarn workspace @app/backend test:integration

# Frontend
yarn workspace @app/frontend test:unit --coverage
yarn workspace @app/frontend test:integration
yarn workspace @app/frontend cypress:run
```

---

## 8. Critérios de saída (gate da feature)
- [ ] Cobertura unitária **100%** em backend e frontend (use-cases, repos, mappers, hooks).
- [ ] Todos os cenários de integração das seções 3, 4 e 5 passando.
- [ ] E2E F-E1..F-E4 verdes (incl. regressão dos testes atuais).
- [ ] Matriz de permissões (seção 6) validada por teste.
- [ ] Sem violação de arquitetura, sem axios fora do API Client, sem dados de API em Zustand.
- [ ] `ai/context/permissions.md` e `CHANGELOG.md` (backend + frontend) atualizados.
