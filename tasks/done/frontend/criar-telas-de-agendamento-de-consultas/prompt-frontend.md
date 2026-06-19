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
# Task — Agendamento de Consultas (Frontend)

## Descrição

Implementar as telas de **agendamento de consultas** com uma **agenda visual** (grade dia/semana) por médico. A partir da agenda o usuário visualiza os slots do dia (livres e ocupados), agenda uma consulta clicando em um slot livre e gerencia consultas existentes (ver detalhes, cancelar, concluir). Tudo integrado à API `/appointments`, seguindo a arquitetura em camadas (UI → Hooks → Use Cases → Services → API Client) e o comportamento por papel (ADMIN / DOCTOR / USER).

---

## Contexto

- A grade de horários **deriva da agenda do médico** (`Schedule`) — o frontend não calcula slots: a lista de slots livres vem de `GET /appointments/availability` e as consultas marcadas de `GET /appointments`. A grade visual é a **união ordenada** de slots livres + consultas ocupadas.
- A API expõe os endpoints sob `/appointments`:
  - `POST /appointments` — agendar
  - `GET /appointments` — listar (filtros `doctorId`, `patientId`, `status`, `from`, `to`, paginação)
  - `GET /appointments/:id` — detalhe
  - `GET /appointments/availability?doctorId&date` — slots livres do dia
  - `PATCH /appointments/:id/cancel` — cancelar (body `{ cancellationReason? }`)
  - `PATCH /appointments/:id/complete` — concluir
- DTOs vêm do `@app/shared`: `AppointmentResponseDto`, `CreateAppointmentDto`, `CancelAppointmentDto`, `PaginatedAppointmentsResponseDto`, `AvailabilityResponseDto`, `AvailableSlotDto`, `AppointmentStatus`.
- **Comportamento por papel** (lido de `useAuthStore().user.role`):
  - **ADMIN**: seletor de médico (via `useDoctors()`) para escolher de quem ver a agenda; pode agendar/cancelar/concluir em qualquer médico.
  - **DOCTOR**: seletor de médico **oculto** — agenda fixa na própria; pode agendar/cancelar/concluir.
  - **USER (recepcionista)**: seletor de médico visível; **somente leitura** — vê a agenda e os detalhes, mas **sem** ações de agendar/cancelar/concluir (slots livres não são clicáveis para reservar).
  - **PATIENT**: sem acesso (bloqueado no `middleware.ts`).
- Apenas usuários autenticados acessam o módulo (proteção via `middleware.ts`, rota dentro de `app/[slug]/(authenticated)/`).

---

## Contratos

### `IAppointmentModel` — modelo de domínio
```ts
import { AppointmentStatus } from '@app/shared'

export interface IAppointmentModel {
  id: string
  doctorId: string
  doctorName: string
  patientId: string
  patientName: string
  scheduleId: string
  date: string                 // YYYY-MM-DD
  startTime: string            // HH:MM
  endTime: string              // HH:MM
  status: AppointmentStatus
  reason: string | null
  cancellationReason: string | null
  createdAt: Date
  updatedAt: Date
}
```

### `IAvailableSlotModel`
```ts
export interface IAvailableSlotModel {
  startTime: string
  endTime: string
  scheduleId: string
  slotDurationInMinutes: number
}
```

### `IAgendaSlot` — célula da grade visual (derivado no frontend)
```ts
export type AgendaSlotStatus = 'free' | 'booked'

export interface IAgendaSlot {
  startTime: string            // HH:MM
  endTime: string              // HH:MM
  status: AgendaSlotStatus
  appointment: IAppointmentModel | null   // preenchido quando booked
}
```

### Inputs de formulário (interfaces locais — não reutilizar DTOs)
```ts
export interface IBookAppointmentInput {
  doctorId?: string            // obrigatório apenas para ADMIN
  patientId: string
  date: string                 // YYYY-MM-DD
  startTime: string            // HH:MM
  reason?: string
}

export interface ICancelAppointmentInput {
  cancellationReason?: string
}

export interface IAppointmentListParams {
  doctorId?: string
  patientId?: string
  status?: AppointmentStatus
  from?: string                // YYYY-MM-DD
  to?: string                  // YYYY-MM-DD
  page?: number
  limit?: number
}

export interface IAvailabilityParams {
  doctorId: string
  date: string                 // YYYY-MM-DD
}
```

---

## Assinaturas esperadas

```ts
// Hooks
useAppointments(params?: IAppointmentListParams): UseQueryResult<IPaginatedAppointmentsModel>
useAppointment(id: string): UseQueryResult<IAppointmentModel>
useAvailability(params: IAvailabilityParams | null): UseQueryResult<IAvailableSlotModel[]>
useBookAppointment(): UseMutationResult<IAppointmentModel, IApiError, IBookAppointmentInput>
useCancelAppointment(): UseMutationResult<IAppointmentModel, IApiError, { id: string; data: ICancelAppointmentInput }>
useCompleteAppointment(): UseMutationResult<IAppointmentModel, IApiError, string>
// Hook de composição da grade (combina availability + appointments do dia)
useDayAgenda(doctorId: string | null, date: string): {
  slots: IAgendaSlot[]; isLoading: boolean; isError: boolean
}

// Use-cases
listAppointmentsUseCase(params?: IAppointmentListParams): Promise<IPaginatedAppointmentsModel>
getAppointmentUseCase(id: string): Promise<IAppointmentModel>
getAvailabilityUseCase(params: IAvailabilityParams): Promise<IAvailableSlotModel[]>
bookAppointmentUseCase(input: IBookAppointmentInput): Promise<IAppointmentModel>
cancelAppointmentUseCase(id: string, input: ICancelAppointmentInput): Promise<IAppointmentModel>
completeAppointmentUseCase(id: string): Promise<IAppointmentModel>

// Service
appointmentsService.getAll(params?): Promise<PaginatedAppointmentsResponseDto>
appointmentsService.getById(id): Promise<AppointmentResponseDto>
appointmentsService.getAvailability(params): Promise<AvailabilityResponseDto>
appointmentsService.book(data: CreateAppointmentDto): Promise<AppointmentResponseDto>
appointmentsService.cancel(id, data: CancelAppointmentDto): Promise<AppointmentResponseDto>
appointmentsService.complete(id): Promise<AppointmentResponseDto>
```

`IPaginatedAppointmentsModel = { data: IAppointmentModel[]; total: number; page: number; limit: number }`.

---

## Composição da grade visual (`useDayAgenda`)

A grade de um dia é montada combinando:
1. `useAvailability({ doctorId, date })` → slots **livres** (`status: 'free'`).
2. `useAppointments({ doctorId, from: date, to: date, status: AppointmentStatus.SCHEDULED })` → consultas **ocupadas** (`status: 'booked'`, com `appointment`).

Mesclar em uma única lista `IAgendaSlot[]` ordenada por `startTime`. Como o backend é a fonte do cálculo de slots e as consultas são criadas em fronteiras de slot, a união reconstrói a grade do dia. A semana (week view) repete essa composição para cada um dos 7 dias.

`doctorId === null` (ADMIN/USER sem médico selecionado) → não dispara as queries (`enabled: false`) e a grade exibe um estado vazio "Selecione um médico".

---

## Fluxo principal por tela

### Agenda (`/appointments`)
1. Página renderiza `AppointmentAgenda`.
2. `AppointmentAgenda` lê `role` do `useAuthStore`.
3. Toolbar (`AgendaToolbar`): navegação de data (anterior/hoje/próximo), seletor de visão **Dia/Semana**, e — para ADMIN/USER — seletor de médico (`useDoctors()`). DOCTOR não vê o seletor (usa o próprio perfil; `doctorId` resolvido pelo backend, então o frontend não precisa do `doctorId` para chamar a API como DOCTOR — ver "Resolução de doctorId" abaixo).
4. **Day view** (`AgendaDayGrid`): coluna de horários + células de slot (`AppointmentSlotCell`). Slot `free` → clicável (abre `BookAppointmentDialog`) quando o usuário pode agendar (ADMIN/DOCTOR); para USER, slot livre é exibido mas não clicável. Slot `booked` → clicável (abre `AppointmentDetailsDialog`) para todos.
5. **Week view** (`AgendaWeekGrid`): 7 colunas (dias da semana a partir da data de referência), cada coluna com seus slots do dia. Mesmas interações por célula.
6. Estados: loading → `AgendaSkeleton`; erro → `Alert`; vazio (sem agenda no dia) → mensagem "Sem horários disponíveis nesta data".

### Agendar (dialog)
1. `BookAppointmentDialog` abre pré-preenchido com `date` e `startTime` do slot clicado (somente leitura no dialog).
2. Campos editáveis: **paciente** (select obrigatório, populado por `usePatients()`), **motivo** (`reason`, textarea opcional).
3. Para ADMIN o `doctorId` do médico selecionado na toolbar é enviado; para DOCTOR é omitido (backend usa o próprio).
4. Submit → `useBookAppointment`.
5. Sucesso → fecha dialog, invalida `['appointments']` e `['availability']`, toast/mensagem de sucesso; a grade reflete o slot agora ocupado.
6. Erro `409` (slot já reservado) → alerta no dialog "Este horário acabou de ser reservado" + refetch da agenda.
7. Erro `422` (slot inválido/passado) → mensagem amigável.

### Detalhes / ações (dialog)
1. `AppointmentDetailsDialog` exibe paciente, médico, data, horário, status (badge), motivo.
2. Ações por papel/estado (apenas quando `status === SCHEDULED` e o usuário pode gerenciar — ADMIN sempre; DOCTOR se for o dono; USER nunca):
   - **Cancelar** → abre `CancelAppointmentDialog` (confirmação + campo `cancellationReason` opcional) → `useCancelAppointment`.
   - **Concluir** → `useCompleteAppointment` (com confirmação).
3. Sucesso → invalida `['appointments']` e `['availability']`; fecha dialog; grade atualizada (cancelado libera o slot).
4. Status `CANCELLED`/`COMPLETED` → sem ações (somente visualização; exibir `cancellationReason` quando houver).

---

## Resolução de `doctorId` por papel

- **DOCTOR**: a API resolve o médico pelo usuário autenticado. Para `useAvailability`/`useAppointments`, o frontend pode chamar **sem** `doctorId` (o backend força o próprio). Use um marcador estável para `queryKey` (ex: `'self'`) e habilite as queries sempre.
- **ADMIN/USER**: `doctorId` vem do seletor da toolbar; queries só habilitam quando há médico selecionado (`enabled: !!doctorId`). Sem seleção → estado vazio "Selecione um médico".

---

## Validação do formulário (Zod) — `BookAppointmentDialog`
```ts
const bookSchema = z.object({
  patientId: z.string().uuid('Selecione um paciente'),
  reason: z.string().max(500).optional().or(z.literal('')),
})
```
`date`/`startTime` não entram no schema (são fixos do slot). Para ADMIN, `doctorId` é injetado a partir da toolbar no submit (não é campo do form).

`CancelAppointmentDialog`:
```ts
const cancelSchema = z.object({
  cancellationReason: z.string().max(500).optional().or(z.literal('')),
})
```

---

## Labels e formatação

- `APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string>` → `{ scheduled: 'Agendada', cancelled: 'Cancelada', completed: 'Concluída' }`, em `types/appointment-model.types.ts`.
- Reutilizar `DAY_OF_WEEK_LABELS` já existente em `components/features/schedules/` para os cabeçalhos da week view (ou importar/duplicar a constante conforme o padrão do projeto — preferir importar do feature de schedules se já exportado).
- Badge de status com cor por estado (agendada / cancelada / concluída).

---

## Mappers
```ts
// to-appointment-model.mapper.ts
export function toAppointmentModel(dto: AppointmentResponseDto): IAppointmentModel {
  return {
    id: dto.id,
    doctorId: dto.doctorId,
    doctorName: dto.doctorName,
    patientId: dto.patientId,
    patientName: dto.patientName,
    scheduleId: dto.scheduleId,
    date: dto.date,
    startTime: dto.startTime,
    endTime: dto.endTime,
    status: dto.status,
    reason: dto.reason,
    cancellationReason: dto.cancellationReason,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}

// to-available-slot-model.mapper.ts
export function toAvailableSlotModel(dto: AvailableSlotDto): IAvailableSlotModel { /* 1:1 */ }

// to-book-appointment-dto.mapper.ts
export function toBookAppointmentDto(input: IBookAppointmentInput): CreateAppointmentDto {
  return {
    doctorId: input.doctorId,           // undefined para DOCTOR
    patientId: input.patientId,
    date: input.date,
    startTime: input.startTime,
    reason: input.reason || undefined,
  }
}
```

---

## Service
```ts
export const appointmentsService = {
  getAll: (params?: IAppointmentListParams): Promise<PaginatedAppointmentsResponseDto> => {
    const sp = new URLSearchParams()
    if (params?.doctorId) sp.set('doctorId', params.doctorId)
    if (params?.patientId) sp.set('patientId', params.patientId)
    if (params?.status) sp.set('status', params.status)
    if (params?.from) sp.set('from', params.from)
    if (params?.to) sp.set('to', params.to)
    if (params?.page) sp.set('page', String(params.page))
    if (params?.limit) sp.set('limit', String(params.limit))
    const q = sp.toString()
    return apiClient.get<PaginatedAppointmentsResponseDto>(`/appointments${q ? `?${q}` : ''}`)
  },
  getById: (id: string) => apiClient.get<AppointmentResponseDto>(`/appointments/${id}`),
  getAvailability: (params: IAvailabilityParams) => {
    const sp = new URLSearchParams()
    if (params.doctorId) sp.set('doctorId', params.doctorId)
    sp.set('date', params.date)
    return apiClient.get<AvailabilityResponseDto>(`/appointments/availability?${sp.toString()}`)
  },
  book: (data: CreateAppointmentDto) => apiClient.post<AppointmentResponseDto>('/appointments', data),
  cancel: (id: string, data: CancelAppointmentDto) =>
    apiClient.patch<AppointmentResponseDto>(`/appointments/${id}/cancel`, data),
  complete: (id: string) => apiClient.patch<AppointmentResponseDto>(`/appointments/${id}/complete`, {}),
}
```

---

## Query Keys
```ts
['appointments']                                  // invalidação geral
['appointments', params]                          // listagem filtrada (inclui from/to do dia)
['appointments', id]                              // item individual
['availability', doctorId ?? 'self', date]        // disponibilidade do dia
```

---

## Navegação

Adicionar item "Consultas" em `lib/constants.tsx` dentro de `NAVIGATION_ITEMS` (ícone de calendário/relógio), visível para ADMIN, DOCTOR e USER:
```tsx
{ id: 'appointments', label: 'Consultas', href: '/appointments', icon: <svg .../> }
```

---

## Estados e feedbacks

- **Loading**: `AgendaSkeleton` na grade; spinners nos dialogs; botões com `isPending`.
- **Erro de rede/servidor**: `Alert` com mensagem amigável (sem `detail` técnico).
- **403**: "Você não tem permissão para acessar esta consulta".
- **404**: "Consulta não encontrada".
- **409 (slot reservado)**: alerta no `BookAppointmentDialog` + refetch da agenda.
- **422 (slot inválido / passado / regra)**: mensagem amigável no dialog.
- **Sucesso** agendar/cancelar/concluir: fecha dialog, invalida queries, mensagem de sucesso.
- Botões de ação desabilitados enquanto `isPending`; confirmação obrigatória antes de cancelar/concluir.

---

## Decisões técnicas

| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| UX | Agenda visual (grade dia/semana); CRUD via dialogs (sem rotas new/edit) |
| Cálculo de slots | Sempre no backend; frontend só compõe `availability` + `appointments` |
| Formulários | react-hook-form + zod resolver |
| Diferenciação por role | `useAuthStore().user.role` — no componente, nunca no use-case/service |
| Seletor de médico | `useDoctors()` para ADMIN/USER; oculto para DOCTOR |
| Seletor de paciente | `usePatients()` no `BookAppointmentDialog` |
| Optimistic update | Não — apenas invalidação após sucesso |
| `doctorId` para DOCTOR | omitido nas chamadas (backend resolve pelo usuário) |

---

## Estrutura esperada

```
apps/frontend/
  app/[slug]/(authenticated)/
    appointments/
      page.tsx                          → agenda visual

components/features/appointments/
  types/
    appointment-model.types.ts          → IAppointmentModel, IAvailableSlotModel, IAgendaSlot, IPaginatedAppointmentsModel, APPOINTMENT_STATUS_LABELS
    appointment-input.types.ts          → IBookAppointmentInput, ICancelAppointmentInput, IAppointmentListParams, IAvailabilityParams
  services/
    appointments.service.ts
    appointments.service.spec.ts
  mappers/
    to-appointment-model.mapper.ts (+ .spec)
    to-available-slot-model.mapper.ts (+ .spec)
    to-book-appointment-dto.mapper.ts (+ .spec)
  use-cases/
    list-appointments.use-case.ts (+ .spec)
    get-appointment.use-case.ts (+ .spec)
    get-availability.use-case.ts (+ .spec)
    book-appointment.use-case.ts (+ .spec)
    cancel-appointment.use-case.ts (+ .spec)
    complete-appointment.use-case.ts (+ .spec)
  hooks/
    use-appointments.hook.ts (+ .spec)
    use-appointment.hook.ts (+ .spec)
    use-availability.hook.ts (+ .spec)
    use-day-agenda.hook.ts (+ .spec)
    use-book-appointment.hook.ts (+ .spec)
    use-cancel-appointment.hook.ts (+ .spec)
    use-complete-appointment.hook.ts (+ .spec)
  components/
    appointment-agenda.tsx (+ .integration.spec.tsx)
    agenda-toolbar.tsx
    agenda-day-grid.tsx (+ .integration.spec.tsx)
    agenda-week-grid.tsx (+ .integration.spec.tsx)
    appointment-slot-cell.tsx
    book-appointment-dialog.tsx (+ .integration.spec.tsx)
    appointment-details-dialog.tsx (+ .integration.spec.tsx)
    cancel-appointment-dialog.tsx
    agenda-skeleton.tsx

cypress/
  e2e/appointments/
    appointments-book.cy.ts
    appointments-cancel.cy.ts
    appointments-complete.cy.ts
    appointments-agenda-views.cy.ts
  fixtures/
    appointments.json
    availability.json
```

---

## Cenários de teste

### Unitários (mappers, use-cases, hooks)
- `toAppointmentModel`: converte `createdAt`/`updatedAt` para `Date`; mantém `reason`/`cancellationReason` como `string | null`.
- `toBookAppointmentDto`: omite `doctorId` quando undefined; transforma `reason` vazio em `undefined`.
- `getAvailabilityUseCase`: mapeia `AvailabilityResponseDto.slots` para `IAvailableSlotModel[]`.
- `useDayAgenda`: mescla free + booked em `IAgendaSlot[]` ordenado; `doctorId=null` desabilita queries e retorna vazio.
- `useBookAppointment`/`useCancelAppointment`/`useCompleteAppointment`: invalidam `['appointments']` e `['availability']`; propagam erro.

### Integração (componentes)
- `AppointmentAgenda` (ADMIN): seletor de médico visível; sem seleção → "Selecione um médico".
- `AppointmentAgenda` (DOCTOR): seletor oculto; agenda própria carrega.
- `AgendaDayGrid`: loading → skeleton; erro → alerta; vazio → mensagem; slots free/booked renderizados corretamente.
- `AppointmentSlotCell` (USER): slot livre não clicável para agendar; slot ocupado abre detalhes.
- `AppointmentSlotCell` (ADMIN/DOCTOR): slot livre abre `BookAppointmentDialog`.
- `BookAppointmentDialog`: paciente obrigatório; erro 409 → alerta e mantém aberto; erro 422 → mensagem; sucesso → fecha.
- `AppointmentDetailsDialog`: ações cancelar/concluir só em `SCHEDULED` e para quem pode gerenciar; `CANCELLED`/`COMPLETED` somente leitura com `cancellationReason`.
- `AgendaWeekGrid`: renderiza 7 colunas com slots por dia.

### E2E (Cypress) — `data-testid`
- DOCTOR: abre agenda → clica slot livre → seleciona paciente → agenda → slot fica ocupado.
- DOCTOR: cancela consulta própria → slot volta a ficar livre.
- DOCTOR: conclui consulta passada/hoje.
- ADMIN: seleciona médico → agenda carrega → agenda consulta.
- USER: vê agenda em modo leitura → sem botão de agendar/cancelar/concluir.
- Alterna Dia/Semana e navega entre datas.

---

## Dependências

- `appointmentsService` (novo)
- `apiClient` (existente)
- `useAuthStore` (existente) — `role`
- `useDoctors` (existente — `components/features/doctors/`) — seletor de médico (ADMIN/USER)
- `usePatients` (existente — `components/features/patients/`) — seletor de paciente
- `DAY_OF_WEEK_LABELS` (existente — `components/features/schedules/`)
- `@app/shared` — `AppointmentResponseDto`, `CreateAppointmentDto`, `CancelAppointmentDto`, `PaginatedAppointmentsResponseDto`, `AvailabilityResponseDto`, `AvailableSlotDto`, `AppointmentStatus`, `UserRole`
- React Query; React Hook Form + Zod

---

## Restrições

- NÃO importar `axios` fora de `lib/api-client.ts`.
- NÃO armazenar dados de consultas/disponibilidade em Zustand — sempre React Query.
- NÃO calcular slots no frontend — usar `availability` do backend.
- NÃO mapear DTOs dentro de componentes/hooks — usar mappers dedicados.
- NÃO usar `useState` para campos de formulário — react-hook-form.
- NÃO exibir `detail` técnico de erro ao usuário.
- NÃO reutilizar DTOs do shared como tipo de formulário — criar interfaces locais.
- NÃO renderizar ações de agendar/cancelar/concluir para USER (somente leitura).
- NÃO aplicar lógica de role em use-cases/service — apenas nos componentes.

---

## Definition of Done

- [ ] Item "Consultas" adicionado ao `NAVIGATION_ITEMS` (visível ADMIN/DOCTOR/USER)
- [ ] Agenda visual com views Dia e Semana e navegação de data
- [ ] Grade composta a partir de `availability` (livres) + `appointments` (ocupadas) via `useDayAgenda`
- [ ] Agendamento via dialog (paciente + motivo) a partir de slot livre
- [ ] Detalhes com ações cancelar/concluir respeitando role e status
- [ ] Comportamento por papel: ADMIN (seletor de médico), DOCTOR (própria agenda), USER (somente leitura)
- [ ] Estados loading/error/empty/success em todas as telas e dialogs
- [ ] Tratamento de 403/404/409/422 com mensagens amigáveis
- [ ] Mappers DTO → Model (datas como `Date`); inputs como interfaces locais
- [ ] Service consome apenas `apiClient`
- [ ] Hooks invalidando `['appointments']` e `['availability']` após mutações
- [ ] Testes unitários com 100% de cobertura (mappers, use-cases, hooks)
- [ ] Testes de integração (loading/error/success) por componente
- [ ] Testes E2E dos fluxos críticos para DOCTOR, ADMIN e USER com `data-testid`
- [ ] Sem warnings de lint, `console.log` ou código comentado
- [ ] Naming convention respeitada; nenhum axios fora do API Client; nenhum dado de consulta em Zustand
