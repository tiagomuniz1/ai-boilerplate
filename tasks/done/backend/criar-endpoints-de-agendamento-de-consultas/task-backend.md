# Task — Agendamento de Consultas (Backend)

## Descrição

Implementar o módulo `appointments` (consultas) que permite agendar uma consulta entre um **paciente** e um **médico** em um horário concreto derivado da **agenda do médico** (`Schedule`). O resultado final é um módulo `appointments` funcional, testado e integrado aos módulos `schedules`, `doctors` e `patients`, contemplando: agendamento com cálculo de slots disponíveis, listagem com filtros, consulta de disponibilidade, cancelamento e conclusão.

Esta task também **substitui o stub** `AppointmentsRepositoryStub` do módulo `schedules` pela integração real — a partir de agora a verificação de "consultas futuras" que bloqueia edição/remoção de agenda passa a consultar consultas reais.

---

## Contexto

- Uma consulta (`Appointment`) é a reserva de um **slot** concreto: um par `date` (YYYY-MM-DD) + `startTime` (HH:mm) de um médico, com duração herdada da agenda (`Schedule`) que originou o slot.
- A disponibilidade de horários **deriva sempre da agenda do médico** (`Schedule`): dia da semana recorrente, janela `startTime`/`endTime`, `slotDurationInMinutes` e vigência `validFrom`/`validUntil`. Não existe consulta fora de um slot válido da agenda.
- Multi-tenancy obrigatório: toda operação é isolada por `clinicId`, derivado de `currentUser.clinicId` (nunca recebido do cliente). Padrão idêntico aos módulos `schedules`, `doctors` e `patients`.
- **Permissões** (decisão desta feature — `permissions.md` deve ser atualizado nesta task):
  - **ADMIN**: agenda/cancela/conclui consultas de qualquer médico da clínica; vê todas.
  - **DOCTOR**: agenda/cancela/conclui apenas consultas da própria agenda; vê apenas as próprias. O `doctorId` enviado no body é ignorado — derivado de `currentUser.id` via `doctorsRepository.findByUserId`.
  - **USER (recepcionista)**: **somente leitura** — lista, vê detalhes e consulta disponibilidade, mas não cria, cancela nem conclui.
  - **PATIENT**: sem acesso (não loga no sistema).
- O acesso de `DOCTOR` aos dados de paciente acontece **através da consulta** (a resposta inclui `patientName`) — conforme nota em `permissions.md` ("acesso de DOCTOR a dados de pacientes será implementado no módulo de consultas").
- Ciclo de vida **mínimo** (sem confirmação/no-show/remarcação dedicada):
  - `SCHEDULED` → `CANCELLED` (cancelamento)
  - `SCHEDULED` → `COMPLETED` (conclusão)
  - `CANCELLED` e `COMPLETED` são **terminais**.
  - Remarcar = cancelar a consulta e criar uma nova (não há endpoint de update de horário).
- Soft delete obrigatório na entidade (`@DeleteDateColumn`) por convenção do projeto — porém **não há endpoint de DELETE**; o encerramento de uma consulta é via cancelamento. Consultas canceladas permanecem no histórico.

---

## Contratos

### Enums (`packages/shared/src/enums/`)

**AppointmentStatus** (`appointment-status.enum.ts`):
```ts
export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}
```
Exportar via `packages/shared/src/enums/index.ts`.

### Input (DTOs — `packages/shared/src/dtos/`)

**CreateAppointmentDto** (`create-appointment.dto.ts`):
- `doctorId?: string` (UUID) — obrigatório apenas para `ADMIN`; ignorado para `DOCTOR` (use-case usa `currentUser.id`)
- `patientId: string` (UUID) — obrigatório
- `date: string` — `@Matches(/^\d{4}-\d{2}-\d{2}$/)` (YYYY-MM-DD)
- `startTime: string` — `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/)` (HH:mm). **Não** recebe `endTime` nem `scheduleId` — ambos derivados no backend a partir da agenda.
- `reason?: string` — `@IsOptional() @IsString() @MaxLength(500)` (motivo da consulta)

**CancelAppointmentDto** (`cancel-appointment.dto.ts`):
- `cancellationReason?: string` — `@IsOptional() @IsString() @MaxLength(500)`

**ListAppointmentsQueryDto** (estende `PaginationDto` — fica em `modules/appointments/dto/`):
- `doctorId?: string` (UUID) — opcional para `ADMIN`/`USER`; ignorado para `DOCTOR` (forçado ao próprio)
- `patientId?: string` (UUID)
- `status?: AppointmentStatus`
- `from?: string` (YYYY-MM-DD) — limite inferior de `date` (inclusivo)
- `to?: string` (YYYY-MM-DD) — limite superior de `date` (inclusivo)

**AvailabilityQueryDto** (`modules/appointments/dto/`):
- `doctorId?: string` (UUID) — obrigatório para `ADMIN`/`USER`; ignorado para `DOCTOR`
- `date: string` — `@Matches(/^\d{4}-\d{2}-\d{2}$/)` (obrigatório)

### Output (DTOs — `packages/shared/src/dtos/`)

**AppointmentResponseDto** (`appointment-response.dto.ts`):
- `id: string`
- `doctorId: string`
- `doctorName: string`
- `patientId: string`
- `patientName: string`
- `scheduleId: string`
- `date: string` (YYYY-MM-DD)
- `startTime: string` (HH:mm)
- `endTime: string` (HH:mm)
- `status: AppointmentStatus`
- `reason: string | null`
- `cancellationReason: string | null`
- `createdAt: Date`
- `updatedAt: Date`

**PaginatedAppointmentsResponseDto** (`paginated-appointments-response.dto.ts`):
- `data: AppointmentResponseDto[]`
- `total: number`
- `page: number`
- `limit: number`

**AvailableSlotDto** + **AvailabilityResponseDto** (`availability-response.dto.ts`):
```ts
export class AvailableSlotDto {
  startTime: string            // HH:mm
  endTime: string              // HH:mm
  scheduleId: string
  slotDurationInMinutes: number
}

export class AvailabilityResponseDto {
  doctorId: string
  date: string                 // YYYY-MM-DD
  slots: AvailableSlotDto[]     // apenas slots LIVRES, ordenados por startTime
}
```

Todos exportados via `packages/shared/src/index.ts`.

---

## Assinaturas esperadas

**Use-cases (`appointments`):**
- `CreateAppointmentUseCase.execute(dto: CreateAppointmentDto, currentUser: ICurrentUser): Promise<AppointmentResponseDto>`
- `CancelAppointmentUseCase.execute(id: string, dto: CancelAppointmentDto, currentUser: ICurrentUser): Promise<AppointmentResponseDto>`
- `CompleteAppointmentUseCase.execute(id: string, currentUser: ICurrentUser): Promise<AppointmentResponseDto>`
- `FindAppointmentByIdUseCase.execute(id: string, currentUser: ICurrentUser): Promise<AppointmentResponseDto>`
- `ListAppointmentsUseCase.execute(query: ListAppointmentsQueryDto, currentUser: ICurrentUser): Promise<PaginatedAppointmentsResponseDto>`
- `GetAvailabilityUseCase.execute(query: AvailabilityQueryDto, currentUser: ICurrentUser): Promise<AvailabilityResponseDto>`
- `HasFutureAppointmentsByScheduleUseCase.execute(scheduleId: string, clinicId: string): Promise<boolean>` — **exportado** para o módulo `schedules`.

`ICurrentUser` = `{ id: string; role: UserRole; clinicId: string | null }` (existente em `modules/auth/types/current-user.type.ts`).

**Repository (`IAppointmentsRepository` — novo, em `modules/appointments/repositories/`):**
- `findAll(filters: ListAppointmentsQueryDto, clinicId: string): Promise<[Appointment[], number]>`
- `findById(id: string, clinicId: string): Promise<Appointment | null>`
- `findActiveByDoctorAndDate(doctorId: string, date: string, clinicId: string): Promise<Appointment[]>` — status `SCHEDULED`, mesma data; usado por disponibilidade e overlay da agenda
- `findActiveBySlot(doctorId: string, date: string, startTime: string, clinicId: string, queryRunner?: QueryRunner): Promise<Appointment | null>` — double-booking check
- `hasFutureByScheduleId(scheduleId: string, clinicId: string): Promise<boolean>` — status `SCHEDULED` e `date >= hoje (UTC)`
- `create(data: CreateAppointmentData, queryRunner?: QueryRunner): Promise<Appointment>`
- `update(id: string, data: UpdateAppointmentData, queryRunner?: QueryRunner): Promise<Appointment>` — usado para transições de status

Onde:
```ts
export interface CreateAppointmentData {
  clinicId: string
  doctorId: string
  patientId: string
  scheduleId: string
  date: string
  startTime: string
  endTime: string
  reason: string | null
}
export interface UpdateAppointmentData {
  status?: AppointmentStatus
  cancellationReason?: string | null
}
```

**Dependências de outros módulos:**
- `IDoctorsRepository` (existente — `findById(id, clinicId)`, `findByUserId(userId, clinicId)`)
- `IPatientsRepository` (existente — `findById(id, clinicId)`)
- `GetActiveSchedulesForDoctorUseCase` (**novo — adicionar e exportar no `SchedulesModule` nesta task**):
  - `execute(doctorId: string, clinicId: string, date: string): Promise<Schedule[]>` — retorna as agendas do médico ativas naquela data (mesmo `dayOfWeek` do `date` e vigência cobrindo `date`).

---

## Fluxo principal

### Agendar consulta (POST /appointments)
1. Controller (`@Roles(ADMIN, DOCTOR)`) recebe `CreateAppointmentDto` + `currentUser`.
2. `clinicId = currentUser.clinicId!`.
3. Resolve `doctorId` efetivo: se `DOCTOR`, `doctor = doctorsRepository.findByUserId(currentUser.id, clinicId)` (ignora `dto.doctorId`); se `ADMIN`, exige `dto.doctorId` (`UnprocessableEntityException` se ausente) e `doctor = doctorsRepository.findById(dto.doctorId, clinicId)`. `NotFoundException('Doctor not found')` se não existir.
4. Valida paciente: `patient = patientsRepository.findById(dto.patientId, clinicId)` → `NotFoundException('Patient not found')`.
5. Valida que `date` + `startTime` **não está no passado** (comparar com `now` em UTC) → `UnprocessableEntityException('Cannot book an appointment in the past')`.
6. Deriva `dayOfWeek` a partir de `dto.date` em **UTC** (`new Date(`${date}T00:00:00Z`).getUTCDay()` → mapear `0=SUNDAY … 6=SATURDAY` para `DayOfWeek`).
7. Busca agendas ativas: `schedules = GetActiveSchedulesForDoctorUseCase.execute(doctorId, clinicId, date)`.
8. Encontra o slot: para cada `schedule`, gera a grade de slots (`startTime` somando `slotDurationInMinutes` até `< endTime`). Seleciona o slot cujo `startTime === dto.startTime`. Se nenhum slot bater → `UnprocessableEntityException('Requested time is not an available slot')`. Do slot encontrado, deriva `scheduleId`, `endTime` (= `startTime + slotDurationInMinutes`).
9. **Concorrência (reserva de slot):** envolver os passos 10–12 em `DistributedLockService.runWithLock` com chave `appointment:${clinicId}:${doctorId}:${date}:${startTime}` (TTL 10s) **e** dentro de `runInTransaction`.
10. Dentro do lock+transação: `findActiveBySlot(doctorId, date, startTime, clinicId, queryRunner)` — se já houver consulta `SCHEDULED` nesse slot → `ConflictException('This slot is already booked')`.
11. Persiste via `appointmentsRepository.create({ clinicId, doctorId, patientId, scheduleId, date, startTime, endTime, reason: dto.reason ?? null }, queryRunner)` com `status = SCHEDULED`.
12. A constraint `UNIQUE` parcial do banco (ver migration) garante a atomicidade mesmo sob corrida; violação de unicidade é convertida em `ConflictException('This slot is already booked')`.
13. Invalida cache (fora da transação, em `try/catch`): `delByPrefix('appointments:list:${clinicId}:')` e `delByPrefix('appointments:availability:${clinicId}:${doctorId}:')`.
14. Retorna `AppointmentResponseDto` (com `doctorName` e `patientName` resolvidos).

### Listar consultas (GET /appointments)
1. `@Roles(ADMIN, DOCTOR, USER)`.
2. Se `DOCTOR`: resolve `doctor = findByUserId(currentUser.id, clinicId)` (`NotFoundException` se não tiver perfil) e força `query.doctorId = doctor.id`.
3. `ADMIN`/`USER`: usa filtros como vieram (sem `doctorId` = todos os médicos da clínica).
4. Cache `appointments:list:${clinicId}:${doctorId ?? 'all'}:${patientId ?? 'all'}:${status ?? 'all'}:${from ?? 'all'}:${to ?? 'all'}:${page}:${limit}` (TTL 30s) — leitura/escrita em `try/catch`.
5. Em miss, `appointmentsRepository.findAll(effectiveQuery, clinicId)`; resolve `doctorName`/`patientName` em lote; retorna paginado.

### Disponibilidade (GET /appointments/availability)
1. `@Roles(ADMIN, DOCTOR, USER)`.
2. Resolve `doctorId` efetivo (DOCTOR = próprio; ADMIN/USER = `query.doctorId`, obrigatório → `UnprocessableEntityException('doctorId is required')` se ausente). Valida médico existe.
3. Cache `appointments:availability:${clinicId}:${doctorId}:${date}` (TTL 30s).
4. Em miss: `schedules = GetActiveSchedulesForDoctorUseCase.execute(doctorId, clinicId, date)`; gera todos os slots da grade; remove os ocupados (`findActiveByDoctorAndDate` → set de `startTime` com status `SCHEDULED`); retorna `slots` livres ordenados por `startTime`.

### Consultar por ID (GET /appointments/:id)
1. `@Roles(ADMIN, DOCTOR, USER)`. Busca por ID + `clinicId` → `NotFoundException('Appointment not found')`.
2. Se `DOCTOR` e a consulta não é da própria agenda → `ForbiddenException('You are not allowed to view this appointment')`.
3. Retorna a consulta.

### Cancelar (PATCH /appointments/:id/cancel)
1. `@Roles(ADMIN, DOCTOR)`. Busca por ID + `clinicId` → `NotFoundException`.
2. Ownership: se `DOCTOR` e não dono → `ForbiddenException('You are not allowed to manage this appointment')`.
3. Status deve ser `SCHEDULED` → senão `UnprocessableEntityException('Only scheduled appointments can be cancelled')`.
4. `update(id, { status: CANCELLED, cancellationReason: dto.cancellationReason ?? null })`.
5. Invalida caches de list e availability (o slot volta a ficar livre).

### Concluir (PATCH /appointments/:id/complete)
1. `@Roles(ADMIN, DOCTOR)`. Busca + ownership como no cancelamento.
2. Status deve ser `SCHEDULED` → senão `UnprocessableEntityException('Only scheduled appointments can be completed')`.
3. A consulta não pode estar no futuro: `date > hoje (UTC)` → `UnprocessableEntityException('Cannot complete a future appointment')`.
4. `update(id, { status: COMPLETED })`. Invalida caches.

### Verificação para o módulo schedules (interno)
- `HasFutureAppointmentsByScheduleUseCase.execute(scheduleId, clinicId)` → `appointmentsRepository.hasFutureByScheduleId(scheduleId, clinicId)` (status `SCHEDULED` e `date >= hoje UTC`).

---

## Integração com o módulo `schedules`

1. **Adicionar e exportar** no `SchedulesModule` o use-case `GetActiveSchedulesForDoctorUseCase` (consome `ISchedulesRepository`). Adicionar ao `ISchedulesRepository` o método `findActiveByDoctorAndDate(doctorId: string, dayOfWeek: DayOfWeek, date: string, clinicId: string): Promise<Schedule[]>` (filtra por `dayOfWeek` e vigência cobrindo `date`).
2. **Remover** `appointments.repository.stub.ts` e seu spec do módulo `schedules`.
3. **Substituir o binding** do token `IAppointmentsRepository` (que hoje aponta para o stub) por um adapter `AppointmentsRepositoryAdapter` (em `modules/schedules/repositories/`) que implementa `hasFutureAppointmentsByScheduleId` delegando ao `HasFutureAppointmentsByScheduleUseCase` exportado pelo `AppointmentsModule`.
   - O `clinicId` necessário ao use-case exportado deve ser propagado: ajustar a assinatura do token `IAppointmentsRepository` (no `schedules`) e dos use-cases de `update`/`delete` de agenda para passar `clinicId` (eles já têm `currentUser.clinicId`). Mantenha a semântica atual (bloquear update/delete quando há consultas futuras).
4. **Dependência circular** `SchedulesModule` ↔ `AppointmentsModule`: resolver com `forwardRef(() => …)` em ambos. `AppointmentsModule` importa `forwardRef(() => SchedulesModule)` (para `GetActiveSchedulesForDoctorUseCase`); `SchedulesModule` importa `forwardRef(() => AppointmentsModule)` (para `HasFutureAppointmentsByScheduleUseCase`).
5. Após a integração, editar/excluir agenda com consulta `SCHEDULED` futura deve retornar `409 Conflict` (comportamento já especificado no módulo `schedules`, agora com dados reais).

---

## Fluxos alternativos / Exceções

- Médico não encontrado → `NotFoundException('Doctor not found')`
- Paciente não encontrado → `NotFoundException('Patient not found')`
- Consulta não encontrada → `NotFoundException('Appointment not found')`
- `ADMIN` agenda sem `doctorId` → `UnprocessableEntityException('doctorId is required for admin')`
- `ADMIN`/`USER` consulta disponibilidade sem `doctorId` → `UnprocessableEntityException('doctorId is required')`
- `startTime` não corresponde a nenhum slot da agenda na data → `UnprocessableEntityException('Requested time is not an available slot')`
- Agendar no passado → `UnprocessableEntityException('Cannot book an appointment in the past')`
- Slot já reservado → `ConflictException('This slot is already booked')`
- `DOCTOR` acessa consulta de outro médico → `ForbiddenException('You are not allowed to view this appointment')`
- `DOCTOR` cancela/conclui consulta de outro médico → `ForbiddenException('You are not allowed to manage this appointment')`
- Cancelar consulta não-`SCHEDULED` → `UnprocessableEntityException('Only scheduled appointments can be cancelled')`
- Concluir consulta não-`SCHEDULED` → `UnprocessableEntityException('Only scheduled appointments can be completed')`
- Concluir consulta futura → `UnprocessableEntityException('Cannot complete a future appointment')`

---

## Regras de negócio

- Toda consulta nasce `SCHEDULED`. Transições válidas: `SCHEDULED → CANCELLED` e `SCHEDULED → COMPLETED`. `CANCELLED`/`COMPLETED` são terminais.
- Slots derivam **exclusivamente** da agenda (`Schedule`) do médico ativa na data. Cálculo de slot e `endTime` são **responsabilidade do backend** — o cliente nunca envia `endTime`/`scheduleId`.
- `dayOfWeek` da data é calculado em **UTC** para evitar drift de fuso. Datas trafegam como `YYYY-MM-DD`.
- Só existe conflito de slot entre consultas `SCHEDULED` (canceladas/concluídas liberam o horário).
- Isolamento por `clinicId` em todas as queries e operações — derivado de `currentUser.clinicId`, nunca do cliente.
- Não há hard delete nem endpoint de remoção — soft delete por convenção; encerramento via cancelamento.
- `DOCTOR` só enxerga/gerencia consultas da própria agenda; `doctorId` do body/query é sempre sobrescrito por `currentUser.id`. `USER` é somente leitura. `ADMIN` opera qualquer médico.

---

## Dependências

- `IAppointmentsRepository` (novo)
- `IDoctorsRepository`, `IPatientsRepository` (existentes — importar `DoctorsModule` e `PatientsModule`; seguir o padrão já usado pelo `SchedulesModule`, que injeta `IDoctorsRepository` diretamente). Se `IPatientsRepository` ainda não for exportado pelo `PatientsModule`, exportá-lo.
- `GetActiveSchedulesForDoctorUseCase` (novo no `SchedulesModule`)
- `CacheService` (com `delByPrefix` já existente)
- `DistributedLockService` (existente em `cache/`)
- `DataSource` (TypeORM)

---

## Decisões técnicas da task

- **Transação:** Sim no agendamento (check-then-insert do slot precisa ser atômico). Cancelamento/conclusão são mutações de uma única entidade — não exigem transação.
- **Distributed Lock:** Sim no agendamento — reserva de slot é equivalente a "reservar assento" (`backend.md`). Chave `appointment:${clinicId}:${doctorId}:${date}:${startTime}`, TTL 10s.
- **Garantia de atomicidade real:** índice **`UNIQUE` parcial** no banco em `(clinic_id, doctor_id, date, start_time)` `WHERE status = 'scheduled' AND deleted_at IS NULL`. Esta constraint é a garantia forte contra double-booking sob corrida; o distributed lock reduz trabalho desperdiçado. Como a reserva é um **INSERT** (não há linha pré-existente para `pessimistic_write`), a garantia vem da constraint + lock, não de pessimistic lock — decisão deliberada e documentada (o pessimistic lock de `backend.md` aplica-se a linhas mutáveis compartilhadas). Converter `QueryFailedError` de violação de unicidade em `ConflictException('This slot is already booked')`.
- **Optimistic Lock:** `@VersionColumn` na entidade para transições de status concorrentes — converter `OptimisticLockVersionMismatchError` em `ConflictException`.
- **Cache:** listagem (`appointments:list:…`, TTL 30s) e disponibilidade (`appointments:availability:…`, TTL 30s). Invalidação por `delByPrefix` em qualquer mutação (create/cancel/complete), isolada em `try/catch`.
- **Resolução de nomes:** `doctorName`/`patientName` resolvidos via query em lote (`innerJoin` em `users`), padrão idêntico ao `fetchDoctorNames` já usado em `ListSchedulesUseCase`.

---

## Restrições

- NÃO aceitar `endTime`, `scheduleId` ou `status` no `CreateAppointmentDto` — todos derivados/definidos no backend.
- NÃO aceitar `clinicId` do cliente — sempre `currentUser.clinicId`.
- NÃO usar `dto.doctorId` para `DOCTOR` — derivar de `currentUser.id`.
- NÃO permitir que `USER` crie, cancele ou conclua consultas (apenas leitura) — controlar via `@Roles` no controller.
- NÃO validar formato de data/hora manualmente no use-case — usar `@Matches` no DTO.
- NÃO usar `cacheService.del` com chave exata para listagens — usar `delByPrefix`.
- NÃO permitir hard delete — `@DeleteDateColumn`; sem endpoint de DELETE.
- NÃO instanciar repositórios manualmente — sempre via DI.
- NÃO logar dados sensíveis de paciente/médico.
- NÃO acessar `process.env` fora de `env.config.ts`.

---

## Estrutura esperada

```
modules/appointments/
  controllers/
    appointments.controller.ts
  use-cases/
    create-appointment.use-case.ts
    cancel-appointment.use-case.ts
    complete-appointment.use-case.ts
    find-appointment-by-id.use-case.ts
    list-appointments.use-case.ts
    get-availability.use-case.ts
    has-future-appointments-by-schedule.use-case.ts
  repositories/
    appointments.repository.interface.ts
    appointments.repository.ts
  dto/
    list-appointments-query.dto.ts
    availability-query.dto.ts
  entities/
    appointment.entity.ts
  tests/
    appointments.integration.spec.ts
  appointments.module.ts

modules/schedules/  (alterações)
  use-cases/
    get-active-schedules-for-doctor.use-case.ts   (novo, exportado)
  repositories/
    appointments.repository.adapter.ts            (novo — substitui o stub)
    appointments.repository.stub.ts               (REMOVER)
    appointments.repository.stub.spec.ts          (REMOVER)
    schedules.repository.interface.ts             (+ findActiveByDoctorAndDate)
    schedules.repository.ts                       (impl do novo método)
  schedules.module.ts                             (forwardRef + binding adapter)

packages/shared/src/
  enums/appointment-status.enum.ts
  dtos/create-appointment.dto.ts
  dtos/cancel-appointment.dto.ts
  dtos/appointment-response.dto.ts
  dtos/paginated-appointments-response.dto.ts
  dtos/availability-response.dto.ts
```

Adicionar a tabela `appointments` via migration e o módulo ao `AppModule`.

---

## Migration — tabela `appointments`

- Colunas: `id` (uuid PK), `clinic_id` (uuid, FK clinics), `doctor_id` (uuid, FK doctors), `patient_id` (uuid, FK patients), `schedule_id` (uuid, FK schedules), `date` (date), `start_time` (varchar), `end_time` (varchar), `status` (varchar, default `'scheduled'`), `reason` (text null), `cancellation_reason` (text null), `version` (int), `created_at`, `updated_at`, `deleted_at` (timestamptz null).
- Índice **`UNIQUE` parcial**: `(clinic_id, doctor_id, date, start_time) WHERE status = 'scheduled' AND deleted_at IS NULL`.
- Índices de consulta: `(clinic_id, doctor_id, date)`, `(clinic_id, patient_id)`, `(clinic_id, status)`, `(schedule_id)`.
- Colunas com union type (`reason`, `cancellation_reason`, `deleted_at`) com `type` explícito (`text`/`timestamptz`) — ver `backend.md` ("Entidades — Tipos de Coluna").

---

## Atualização de documentação

Atualizar `ai/context/permissions.md`:
- Nova seção **Consultas (`/appointments`)** com a matriz: Criar/Cancelar/Concluir → ADMIN ✓ (qualquer), DOCTOR ✓ (só as próprias), USER ✗, PATIENT ✗; Listar/Ver/Disponibilidade → ADMIN ✓ (todas), DOCTOR ✓ (só as próprias), USER ✓ (leitura), PATIENT ✗.
- Nota: o acesso de `DOCTOR` a dados de paciente passa a existir **através da consulta** (substituir a nota "implementação futura" na seção Pacientes).
- Adicionar linha **Consultas** na tabela "Sidebar — Itens visíveis por role" (ADMIN ✓, DOCTOR ✓, USER ✓).

---

## Cenários de teste

### Agendamento
- DOCTOR agenda em slot válido da própria agenda (sem enviar `doctorId`) → `201`, status `SCHEDULED`, `endTime`/`scheduleId` derivados.
- DOCTOR envia `doctorId` de outro médico → ignorado, usa o próprio.
- ADMIN agenda informando `doctorId` → `201`.
- ADMIN agenda sem `doctorId` → `422`.
- Agendar com `startTime` fora da grade de slots → `422`.
- Agendar em dia sem agenda ativa do médico → `422` (nenhum slot).
- Agendar fora da vigência (`validFrom`/`validUntil`) da agenda → `422` (a agenda não está ativa na data).
- Agendar no passado → `422`.
- Agendar slot já ocupado (`SCHEDULED`) → `409`.
- Agendar slot cujo único conflito está `CANCELLED` → `201` (slot livre).
- USER tenta agendar → `403` (role).
- Paciente inexistente → `404`. Médico inexistente (admin) → `404`.
- Duas requisições concorrentes para o mesmo slot → uma `201`, a outra `409` (lock + unique index).
- Agendar de outra clínica (paciente/médico de outra clínica) → `404` (isolamento por `clinicId`).

### Disponibilidade
- DOCTOR consulta a própria disponibilidade → slots livres da grade.
- Slots já reservados não aparecem; após cancelar, voltam a aparecer.
- ADMIN/USER sem `doctorId` → `422`.
- Data sem agenda ativa → `slots: []`.
- Múltiplas agendas no mesmo dia (manhã + tarde) → grade combinada.
- Cache: segunda chamada idêntica usa cache; invalida após agendamento/cancelamento.

### Listagem / detalhe
- DOCTOR lista → apenas as próprias (mesmo enviando `doctorId` de outro).
- ADMIN lista sem filtro → todas da clínica; filtra por `doctorId`, `patientId`, `status`, `from`/`to`.
- USER lista (read-only) → `200`.
- DOCTOR busca por ID consulta de outro médico → `403`.
- Buscar consulta inexistente → `404`.

### Cancelamento / conclusão
- Cancelar `SCHEDULED` → `200`, status `CANCELLED`, `cancellationReason` salvo; slot liberado.
- Cancelar consulta já `CANCELLED`/`COMPLETED` → `422`.
- DOCTOR cancela/conclui consulta de outro médico → `403`.
- USER tenta cancelar/concluir → `403` (role).
- Concluir `SCHEDULED` passada/hoje → `200`, `COMPLETED`.
- Concluir consulta futura → `422`.
- Transições concorrentes na mesma consulta → segunda falha com `409` (optimistic lock).

### Integração com schedules
- Editar/excluir agenda com consulta `SCHEDULED` futura → `409`.
- Editar/excluir agenda cujas consultas estão todas `CANCELLED`/`COMPLETED` ou passadas → sucesso.
- `HasFutureAppointmentsByScheduleUseCase` retorna `true`/`false` corretamente por status e data.

### Cache
- Listagem e disponibilidade usam cache; invalidação após create/cancel/complete; falha de cache não quebra o fluxo.

---

## Definition of Done

- [ ] Entidade `Appointment` com FKs (`clinic`, `doctor`, `patient`, `schedule`), `@VersionColumn`, soft delete e `type` explícito em colunas nullable
- [ ] Migration com índice `UNIQUE` parcial (slot) + índices de consulta
- [ ] Enum `AppointmentStatus` e todos os DTOs exportados via `@app/shared`
- [ ] CRUD de ciclo de vida: agendar, listar, detalhar, cancelar, concluir
- [ ] Endpoint de disponibilidade derivando slots da agenda do médico
- [ ] `doctorId` derivado de `currentUser.id` para DOCTOR; `USER` somente leitura via `@Roles`
- [ ] Isolamento por `clinicId` em todas as operações
- [ ] Concorrência: distributed lock + transação + índice `UNIQUE` parcial; unique violation → `409`
- [ ] Optimistic lock nas transições de status → `409`
- [ ] Cache de listagem e disponibilidade com invalidação por `delByPrefix` em `try/catch`
- [ ] `GetActiveSchedulesForDoctorUseCase` adicionado e exportado no `SchedulesModule` (+ `findActiveByDoctorAndDate` no repo)
- [ ] Stub `AppointmentsRepositoryStub` removido e substituído por adapter real (forwardRef entre módulos)
- [ ] `permissions.md` atualizado (seção Consultas + sidebar + nota de acesso DOCTOR↔paciente)
- [ ] Testes unitários com 100% de cobertura
- [ ] Testes de integração para todos os endpoints e cenários de concorrência
- [ ] Naming convention respeitada; sem `process.env` fora de `env.config.ts`; sem dados sensíveis em logs
