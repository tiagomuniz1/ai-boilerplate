Você é um engenheiro de software sênior especialista na arquitetura deste projeto.

Sua tarefa é implementar exatamente o que está descrito abaixo.

Siga TODAS as regras e contexto definidos na task.

---
## INSTRUCTIONS
- Não inventar padrões
- Não ignorar regras
- Não simplificar a solução
- Código deve ser production-ready
- Seguir estritamente a arquitetura definida
- Se faltar informação, não inventar

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Tela de Dashboard (Frontend)

## Descrição
Implementar a tela de dashboard da clínica conforme o layout de referência: uma faixa de KPIs no topo, quatro cards de gráficos (Pacientes, Procedimentos realizados, Pacientes x Convênio, Duração do atendimento), um gráfico de área "Atendimentos no período" em largura total, e na base "Distribuição etária" + painel "Aniversariantes do dia". Todos os dados vêm de um único endpoint `GET /dashboard` (React Query) e são filtrados por período.

---

## Contexto
- Backend: `GET /dashboard?from&to&doctorId` retorna `DashboardResponseDto` (KPIs, pacientes, procedimentos, convênio, duração, timeline, distribuição etária, aniversariantes).
- Página atual é um placeholder: `app/[slug]/(authenticated)/dashboard/page.tsx` (`<main data-testid="dashboard"><h1>Dashboard</h1></main>`).
- Dashboard visível para ADMIN, DOCTOR e USER (matriz da sidebar). DOCTOR recebe apenas os próprios dados (o backend já restringe).
- Período padrão: últimos 30 dias; usuário pode trocar o intervalo.
- **Biblioteca de gráficos:** instalar `recharts` (`yarn workspace @app/frontend add recharts`). Justificativa: React-first, TS nativo, cobre `PieChart` (donuts), `AreaChart` (timeline / etária) e `BarChart` (tipo de atendimento) — todos os gráficos do layout. Não há lib de chart no projeto hoje.

---

## Layout de referência
```
[ KPI agendados ] [ KPI confirmados ] [ KPI atendidos ] [ KPI faltaram ]   (faixa, 4 colunas)

[ Pacientes ]  [ Procedimentos ]  [ Pacientes x ]  [ Duração do ]          (grid 4 colunas)
[ (donut +  ]  [ realizados   ]  [ Convênio    ]  [ atendimento ]
[  gênero)   ]  [ (donut)      ]  [ (donut)     ]  [ (nº + barras) ]

[ Atendimentos no período (AreaChart, largura total) ]

[ Distribuição etária (AreaChart) .......................... ] [ Aniversariantes do dia ]
```
- KPIs: número grande + label + ícone. "atendidos" em verde, "faltaram" em vermelho, demais neutros.
- Donut "Pacientes": Novos vs Recorrentes; abaixo, dois mini-indicadores Homens/Mulheres com total.
- Donut "Procedimentos": rótulo central com total de procedimentos; legenda por especialidade.
- Donut "Convênio": rótulo central com total de pacientes; legenda Particular/Convênio.
- Card "Duração": número grande (ex.: "39min") + título "Tipo de atendimento" + `BarChart` Particular x Convênio.
- "Atendimentos no período": `AreaChart` azul, eixo X = dias, eixo Y = contagem.
- "Distribuição etária": `AreaChart`, eixo X = idade.
- "Aniversariantes do dia": lista ou estado vazio ("Nenhum aniversariante hoje.") + botão "VER LISTA COMPLETA".

---

## Contratos (types locais)
```ts
export interface IDashboardModel {
  period: { from: Date; to: Date }
  kpi: { scheduled: number; confirmed: number; completed: number; noShow: number }
  patients: {
    total: number; newPatients: number; returningPatients: number
    byGender: { male: number; female: number }
  }
  procedures: { total: number; items: { label: string; value: number }[] }
  insurance: { total: number; particular: number; convenio: number }
  duration: { averageMinutes: number; byInsuranceType: { particular: number; convenio: number } }
  appointmentsByDay: { date: Date; count: number }[]
  ageDistribution: { age: number; count: number }[]
  todayBirthdays: { patientId: string; fullName: string; age: number }[]
}
export interface IDashboardFilters { from?: string; to?: string; doctorId?: string }
```

---

## Assinaturas esperadas
```ts
// service
dashboardService.getStats(filters: IDashboardFilters): Promise<DashboardResponseDto>
// mapper
toDashboardModel(dto: DashboardResponseDto): IDashboardModel   // string→Date
// use-case
getDashboardStatsUseCase(filters): Promise<IDashboardModel>
// hook
useDashboardStats(filters): UseQueryResult<IDashboardModel>    // queryKey: ['dashboard', filters]
```

---

## Camadas e regras
- Dados da API **somente via React Query** — nunca Zustand.
- `axios` apenas em `lib/api-client.ts` — service usa `apiClient`.
- Mapeamento DTO→Model **só no mapper** (converter datas; nunca mapear em componente/hook).
- Filtros de período em estado local (`useState`/`useReducer`) que compõem o `queryKey` — refetch automático ao mudar.
- Tratar sempre os três estados: **loading** (skeletons por card), **error** (`ErrorMessage` amigável — nunca `detail` técnico), **success**.

---

## Estrutura esperada
```
components/features/dashboard/
  types/dashboard.types.ts
  services/dashboard.service.ts (+ .spec)
  mappers/to-dashboard-model.ts (+ .spec)
  use-cases/get-dashboard-stats.use-case.ts (+ .spec)
  hooks/use-dashboard-stats.hook.ts (+ .spec)
  components/
    DashboardKpiCard.tsx (+ integration.spec)
    DashboardKpiRow.tsx
    PatientsChartCard.tsx (+ integration.spec)
    ProceduresChartCard.tsx (+ integration.spec)
    InsuranceChartCard.tsx (+ integration.spec)
    DurationCard.tsx (+ integration.spec)
    AppointmentsTimelineCard.tsx (+ integration.spec)
    AgeDistributionCard.tsx (+ integration.spec)
    BirthdayPanel.tsx (+ integration.spec)
    DashboardDateRangeFilter.tsx (+ integration.spec)
    DashboardSkeleton.tsx
  DashboardView.tsx (+ integration.spec)

app/[slug]/(authenticated)/dashboard/page.tsx   # renderiza <DashboardView />

cypress/e2e/dashboard.cy.ts                      # estender (mantém testes atuais)
cypress/fixtures/dashboard.json                  # novo
```

---

## data-testid (obrigatórios para E2E)
- raiz: `dashboard` (manter o existente)
- KPIs: `dashboard-kpi-scheduled`, `dashboard-kpi-confirmed`, `dashboard-kpi-completed`, `dashboard-kpi-no-show`
- cards: `dashboard-patients-chart`, `dashboard-procedures-chart`, `dashboard-insurance-chart`, `dashboard-duration-card`, `dashboard-timeline-chart`, `dashboard-age-distribution`, `dashboard-birthdays`
- estados: `dashboard-loading`, `dashboard-error`
- filtro: `dashboard-date-range`
- aniversariantes vazio: dentro de `dashboard-birthdays`, texto "Nenhum aniversariante hoje."

---

## Estados e feedbacks
- Loading → `DashboardSkeleton` (placeholders dos cards).
- Erro → `ErrorMessage` única no lugar do conteúdo (`dashboard-error`).
- Vazio por widget: donuts sem dados → mensagem/estado neutro; timeline/etária sem dados → eixo vazio; aniversariantes → "Nenhum aniversariante hoje.".
- "VER LISTA COMPLETA" navega para a listagem de pacientes filtrada por aniversariantes (ou abre o painel completo) — usar `next/navigation`; se a rota não existir ainda, linkar para `/patients`.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Dados da API | React Query (`useDashboardStats`) — nunca Zustand |
| Lib de gráficos | `recharts` (PieChart, AreaChart, BarChart) |
| Conversão de tipos | mapper converte `from/to/date` string→Date |
| Filtro de período | estado local → compõe `queryKey` |
| Responsividade | grid Tailwind (4 col desktop → empilha no mobile); charts em `ResponsiveContainer` |
| Cores | usar tokens do design system existente (azul primário; verde/vermelho para KPIs) |

---

## Restrições
- NÃO importar axios fora do API Client.
- NÃO guardar dados do dashboard em Zustand.
- NÃO mapear DTO em componentes/hooks — usar o mapper.
- NÃO exibir `detail` técnico de erro ao usuário.
- NÃO usar classe/id CSS interno como seletor de teste — usar `data-testid`.
- NÃO duplicar a chamada — um único `useDashboardStats` alimenta toda a view.

---

## Cenários de teste adicionais
### Unitários
- `toDashboardModel` converte `period.from/to`, `appointmentsByDay[].date` para `Date` e preserva números.
- `getDashboardStatsUseCase` chama service + mapper.
- `useDashboardStats` usa `queryKey` derivado dos filtros (muda a key ao trocar período).
### Integração (service mockado via jest.mock)
- `DashboardView`: loading→`dashboard-loading`; erro→`dashboard-error`; sucesso→todos os cards visíveis.
- KPIs exibem os números do mock nos testids corretos.
- `PatientsChartCard` mostra novos/recorrentes e total por gênero.
- `ProceduresChartCard`/`InsuranceChartCard` mostram o total central.
- `BirthdayPanel`: com aniversariantes lista os nomes; vazio mostra "Nenhum aniversariante hoje.".
- `DashboardDateRangeFilter`: trocar período dispara novo fetch (nova queryKey).
### E2E (estender `dashboard.cy.ts`, manter os testes atuais)
- Autenticado vê a faixa de KPIs e os cards principais (interceptar `GET /dashboard` com a fixture).
- Estado de aniversariantes vazio renderiza a mensagem.
- Trocar o período refaz a chamada (verificar via intercept).

---

## Definition of Done
- [ ] `recharts` adicionado ao `@app/frontend`
- [ ] Service (só `apiClient`) + mapper (DTO→Model com datas) + use-case + hook React Query
- [ ] `DashboardView` compondo KPIs + 4 cards + timeline + etária + aniversariantes no grid do layout
- [ ] Filtro de período controlando o `queryKey` (default últimos 30 dias)
- [ ] Estados loading (skeleton) / error / success em toda a view
- [ ] Todos os `data-testid` listados presentes
- [ ] Responsivo (grid Tailwind + `ResponsiveContainer`)
- [ ] Testes unitários 100% (mapper/use-case/hook) + integração por componente
- [ ] E2E estendido cobrindo render dos KPIs, aniversariantes vazio e troca de período
- [ ] Sem axios fora do API Client; nada em Zustand; sem mapear DTO em componente
- [ ] Naming convention e arquitetura seguidas
