# Task — Módulo de Dashboard (Backend)

## Descrição
Implementar o módulo `dashboard`: um endpoint **somente leitura** que agrega indicadores da clínica num período, alimentando a tela de dashboard. Tudo é calculado a partir de `appointments` (+ `patients` e `specialties` via JOIN). Não há tabela nova — é uma camada de agregação. O escopo é sempre por `clinicId`; DOCTOR vê apenas os próprios dados.

---

## Contexto
- Depende da task **`evoluir-consulta-confirmacao-falta-e-convenio`** (status `CONFIRMED`/`NO_SHOW` e campo `insuranceType`).
- Fonte dos dados:
  - KPIs e gráficos de status → `appointments.status`.
  - Novos vs recorrentes → histórico de consultas do paciente na clínica.
  - Procedimentos realizados → agrupado por `specialty.name` das consultas atendidas (`COMPLETED`).
  - Convênio → `appointments.insuranceType`.
  - Duração → `endTime - startTime` das consultas `COMPLETED`.
  - Distribuição etária e Aniversariantes → `patients.birthDate`.
- Período padrão: **últimos 30 dias** (de `today-29` a `today`) quando `from`/`to` omitidos.
- "Atendido" / KPI "atendidos" = `COMPLETED`. "Agendados" = `SCHEDULED`. "Confirmados" = `CONFIRMED`. "Faltaram" = `NO_SHOW`.

---

## Contratos

### Input — `DashboardQueryDto`
```ts
from?: string   // YYYY-MM-DD  (default: today-29)
to?: string     // YYYY-MM-DD  (default: today)
doctorId?: string (uuid)  // ADMIN/USER podem filtrar; DOCTOR ignorado (sempre o próprio)
```
Validar `from`/`to` com `@Matches(/^\d{4}-\d{2}-\d{2}$/)`; `doctorId` com `@IsUUID()`; todos `@IsOptional()`.

### Output — `DashboardResponseDto` (shared)
```ts
{
  period: { from: string; to: string }
  kpi: { scheduled: number; confirmed: number; completed: number; noShow: number }
  patients: {
    total: number            // pacientes distintos atendidos no período
    newPatients: number      // primeira consulta na clínica dentro do período
    returningPatients: number
    byGender: { male: number; female: number }
  }
  procedures: {
    total: number                                   // total de consultas COMPLETED no período
    items: { label: string; value: number }[]       // por specialty.name (DESC); sem specialty → "Sem especialidade"
  }
  insurance: { total: number; particular: number; convenio: number }   // total = part + conv (ignora null)
  duration: {
    averageMinutes: number                          // média (COMPLETED) arredondada
    byInsuranceType: { particular: number; convenio: number }   // contagem por tipo
  }
  appointmentsByDay: { date: string; count: number }[]   // COMPLETED por dia no período (todos os dias, count 0 incluído)
  ageDistribution: { age: number; count: number }[]      // idade dos pacientes atendidos no período
  todayBirthdays: { patientId: string; fullName: string; age: number }[]  // independe do período
}
```
Exportar todos no `index.ts` do shared.

---

## Assinaturas esperadas
**Use-case:**
- `GetDashboardStatsUseCase.execute(query: DashboardQueryDto, currentUser: ICurrentUser): Promise<DashboardResponseDto>`

**IDashboardRepository** (abstract class):
- `countByStatus(clinicId, from, to, doctorId?): Promise<Record<AppointmentStatus, number>>`
- `getPatientStats(clinicId, from, to, doctorId?): Promise<{ total; newPatients; returning; male; female }>`
- `getProceduresBySpecialty(clinicId, from, to, doctorId?): Promise<{ label: string; value: number }[]>`
- `getInsuranceStats(clinicId, from, to, doctorId?): Promise<{ particular: number; convenio: number }>`
- `getDurationStats(clinicId, from, to, doctorId?): Promise<{ averageMinutes: number; particular: number; convenio: number }>`
- `getCompletedCountByDay(clinicId, from, to, doctorId?): Promise<{ date: string; count: number }[]>`
- `getAgeDistribution(clinicId, from, to, doctorId?): Promise<{ age: number; count: number }[]>`
- `getTodayBirthdays(clinicId, doctorId?): Promise<{ patientId: string; fullName: string; age: number }[]>`

> Todos os métodos são read-only (sem `QueryRunner`, sem transação). Usar `createQueryBuilder` com queries parametrizadas — nunca concatenar SQL.

---

## Fluxo principal

**GET /dashboard** (ADMIN, DOCTOR, USER)
1. `clinicId = currentUser.clinicId!`.
2. Resolve período: `from`/`to` do query ou default (últimos 30 dias). Validar `from <= to`; senão `UnprocessableEntityException`.
3. Resolve `doctorId` efetivo:
   - DOCTOR → resolve o próprio doctor (`doctorsRepository.findByUserId`); ignora `query.doctorId`. Se não houver perfil de doctor → `ForbiddenException`.
   - ADMIN/USER → usa `query.doctorId` se enviado (senão, clínica inteira).
4. Dispara as agregações (pode ser `Promise.all`) e monta o `DashboardResponseDto`.
5. Preenche `appointmentsByDay` com **todos** os dias do intervalo (dias sem consulta → `count: 0`) — o preenchimento de lacunas é responsabilidade do **use-case**, não do SQL.
6. Retorna `200`.

---

## Regras de negócio / definições
- **Novos vs recorrentes:** paciente é *novo* se a sua **primeira consulta na clínica** (menor `date`, qualquer status que não `CANCELLED`) está dentro do período; caso contrário, *recorrente*. `total = novos + recorrentes` (pacientes distintos com consulta no período).
- **Procedimentos:** apenas `COMPLETED`; agrupar por `specialty.name`; `specialty_id` nulo → bucket `"Sem especialidade"`; ordenar por `value` DESC.
- **Convênio:** apenas consultas com `insuranceType` não nulo entram em `particular`/`convenio`.
- **Duração:** apenas `COMPLETED`; minutos = `endTime - startTime` (campos `HH:mm`); média arredondada (`Math.round`); `0` quando não há dados.
- **Distribuição etária:** idade dos pacientes **distintos atendidos** (`COMPLETED`) no período, calculada de `birthDate` na data de referência (`today`).
- **Aniversariantes:** `EXTRACT(MONTH/DAY FROM birth_date) = hoje`, escopo da clínica (e do doctor, se aplicável, via consultas — ou todos os pacientes da clínica; **decisão:** todos os pacientes da clínica, independente do período/doctor).
- DOCTOR sempre restrito ao próprio `doctorId` em todas as métricas.

---

## Permissões

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| `GET /dashboard` | ✓ clínica | só os próprios dados | ✓ clínica (leitura) | ✗ |

`@Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER)`. Consistente com a matriz da sidebar (Dashboard visível para os três).

---

## Dependências
- `AppointmentsModule` / acesso à tabela `appointments` (a repository do dashboard pode ter sua própria `@InjectRepository(Appointment)` — é leitura de agregação, não regra de negócio de consulta).
- `IDoctorsRepository` (resolver doctor do currentUser).
- `CacheService`.

---

## Decisões técnicas da task
- **Camada:** repository dedicado `DashboardRepository` com queries de agregação (`COUNT`, `GROUP BY`, `AVG`); use-case orquestra e monta o DTO + preenche lacunas de dias.
- **Sem transação** (read-only).
- **Cache:** `dashboard:<clinicId>:<doctorId|all>:<from>:<to>` TTL `60s` (estratégia cache-aside no use-case). Aniversariantes podem ficar no mesmo payload (TTL curto aceitável). Invalidação por TTL (não há mutation aqui).
- **Datas:** comparação por coluna `date` (`>= from AND <= to`).
- **Cálculo de duração e idade:** preferir SQL (`AVG`, `AGE`/`EXTRACT`) quando direto; preenchimento de dias faltantes em TS.

---

## Restrições
- NÃO criar tabela/migration — módulo é só leitura.
- NÃO permitir PATIENT.
- NÃO retornar entidades cruas — apenas o `DashboardResponseDto`.
- NÃO deixar DOCTOR ver dados de outro médico.
- NÃO concatenar SQL — usar query builder parametrizado.
- NÃO `process.env` fora de `env.config.ts`.

---

## Estrutura esperada
```
modules/dashboard/
  controllers/dashboard.controller.ts (+ .spec)
  dto/dashboard-query.dto.ts
  repositories/
    dashboard.repository.interface.ts
    dashboard.repository.ts (+ .spec)
  use-cases/get-dashboard-stats.use-case.ts
  tests/
    get-dashboard-stats.use-case.spec.ts
    dashboard.integration.spec.ts
  dashboard.module.ts

packages/shared/src/dtos/
  dashboard-response.dto.ts          # + sub-tipos
  (index.ts exporta)
```

---

## Cenários de teste adicionais
### Unitários (use-case, repo mockado)
- período default (sem from/to) = últimos 30 dias.
- `from > to` → `422`.
- DOCTOR → força `doctorId` próprio; ignora `query.doctorId`; sem perfil doctor → `403`.
- ADMIN/USER → respeita `query.doctorId` quando enviado.
- `appointmentsByDay` preenche dias sem consulta com `count: 0` e cobre todo o intervalo inclusive.
- montagem do DTO: KPIs mapeados de `countByStatus`; `procedures.total` = soma; `insurance.total` = part+conv.
- cache hit retorna sem chamar o repository; cache miss popula.
### Integração (com banco de teste, seed via faker)
- `GET /dashboard` retorna a forma completa do DTO.
- KPIs refletem contagem real por status.
- procedimentos agrupados por especialidade; consulta sem specialty cai em "Sem especialidade".
- convênio soma particular+convenio e ignora null.
- aniversariantes do dia retornam paciente com `birth_date` = hoje (mês/dia).
- DOCTOR só recebe os próprios números (criar consultas de 2 médicos e verificar isolamento).
- USER recebe dados da clínica (`200`); PATIENT → `403`.
- escopo por clínica: dados de outra clínica não vazam.

---

## Definition of Done
- [ ] `DashboardResponseDto` (+ sub-tipos) exportado no `@app/shared`
- [ ] `DashboardQueryDto` com validação de from/to/doctorId
- [ ] `IDashboardRepository` + implementação com queries de agregação parametrizadas
- [ ] `GetDashboardStatsUseCase` montando o DTO + preenchendo lacunas de dias
- [ ] `GET /dashboard` com `@Roles(ADMIN, DOCTOR, USER)` e isolamento own-resource do DOCTOR
- [ ] Escopo por `clinicId` em todas as queries
- [ ] Cache-aside (`dashboard:<clinicId>:...`, TTL 60s)
- [ ] Testes unitários (100%) + integração cobrindo os cenários
- [ ] `DashboardModule` registrado no `AppModule`
- [ ] Sem migration, sem mutation, sem mistura de camadas; naming convention seguida
