# Task — Módulo de Solicitação de Exames (Backend / CRUD + Snapshot)

## Descrição
Implementar o módulo `exams`: solicitação de **exames médicos** vinculados a uma consulta, com **snapshot imutável** em JSON contendo uma **lista de itens** (cada exame solicitado, com nome livre e observação opcional) e uma observação geral do pedido. Esta task cobre o CRUD (solicitar / listar por consulta / ver / excluir) e a construção do snapshot. A **geração do PDF** e o **upload de resultado** são tasks seguintes (`gerar-pdf-do-pedido-de-exames` e `criar-modulo-de-resultado-de-exames`).

---

## Contexto
- Espelha o módulo `prescriptions` (itens múltiplos em snapshot) e `medical-certificates` (estrutura de CRUD/RBAC/cache) — sem medicamentos, sem tipos condicionais.
- Recurso escopado por `clinic_id`. Modelo 1:N: uma consulta pode ter várias solicitações de exames. Cada solicitação é criada com uma lista de itens — não há edição de itens depois; corrigir é excluir (soft delete) e resolicitar.
- Diferente de `prescriptions`/`medical-certificates`, este documento tem um campo mutável: `status` (`requested` | `completed`), que será atualizado pela task `criar-modulo-de-resultado-de-exames`. **Nesta task**, todo registro é criado e permanece `requested` — não existe ainda nada que o complete.
- Só o **DOCTOR** solicita (na própria consulta). ADMIN não solicita, mas lê/exclui. USER não acessa.
- Cache de leitura por `appointmentId`.

---

## Contratos

### Enum (`@app/shared`)
`packages/shared/src/enums/exam-request-status.enum.ts`:
```ts
export enum ExamRequestStatus {
  REQUESTED = 'requested',
  COMPLETED = 'completed',
}
```
Exportar no barrel `packages/shared/src/enums/index.ts`.

### Input (DTO)

**CreateExamRequestItemDto:**
- `name: string` (`@IsString() @MinLength(1) @MaxLength(200)`)
- `observations?: string` (`@IsOptional() @IsString() @MaxLength(1000)`)

**CreateExamRequestDto** (DOCTOR):
- `appointmentId: string` (`@IsUUID()`, obrigatório)
- `items: CreateExamRequestItemDto[]` (`@ValidateNested({ each: true }) @Type(() => CreateExamRequestItemDto) @ArrayMinSize(1)`)
- `notes?: string` (`@IsOptional() @IsString() @MaxLength(2000)`) — observação geral do pedido

**ListExamRequestsQueryDto** (`modules/exams/dto/`):
- `appointmentId: string` (`@IsUUID()`, obrigatório)

### Output

**ExamRequestItemResponseDto:** `name`, `observations: string | null`.

**ExamRequestResponseDto:** `id`, `appointmentId`, `patientId`, `patientName`, `doctorId`, `doctorName`, `items: ExamRequestItemResponseDto[]`, `notes: string | null`, `status: ExamRequestStatus`, `issuedAt: Date`, `createdAt: Date`.

> O campo `results: ExamResultResponseDto[]` será adicionado a este DTO na task `criar-modulo-de-resultado-de-exames` (mesmo padrão de `ClinicResponseDto` ganhando `logoUrl`/`faviconUrl` na task de upload de logomarca). **Nesta task o DTO não tem esse campo ainda.**

---

## Types e DTOs compartilhados (`packages/shared`)
- `src/types/exam-request-snapshot.type.ts` → `ExamRequestSnapshot`:
```ts
export interface ExamRequestSnapshot {
  issuedAt: string
  clinic: {
    name: string
    address: {
      street: string | null
      number: string | null
      complement: string | null
      neighborhood: string | null
      city: string | null
      state: string | null
      zipCode: string | null
    } | null
    logoUrl: string | null
  }
  doctor: { name: string; crmNumber: string; specialtyName: string | null }
  patient: { name: string; documentNumber: string }
  items: Array<{ name: string; observations: string | null }>
  notes: string | null
}
```
- `src/dtos/create-exam-request.dto.ts` (`CreateExamRequestItemDto`, `CreateExamRequestDto`), `src/dtos/exam-request-response.dto.ts` (`ExamRequestItemResponseDto`, `ExamRequestResponseDto`).
- `ListExamRequestsQueryDto` em `modules/exams/dto/`.
- Exportar tudo via `index.ts` de `enums/`, `types/` e `dtos/` (nunca importar de subpasta direto).

---

## Assinaturas esperadas

**Use-cases (classes, `@Injectable`, `extends BaseUseCase`):**
- `CreateExamRequestUseCase.execute(dto, currentUser): Promise<ExamRequestResponseDto>`
- `FindExamRequestsByAppointmentUseCase.execute(appointmentId, currentUser): Promise<ExamRequestResponseDto[]>`
- `FindExamRequestByIdUseCase.execute(id, currentUser): Promise<ExamRequestResponseDto>`
- `DeleteExamRequestUseCase.execute(id, currentUser): Promise<void>`

> Exportar `FindExamRequestByIdUseCase` — a task de PDF precisa carregar a solicitação com a mesma checagem de acesso. Exportar também `toExamRequestResponse(entity)` do `create-exam-request.use-case.ts`, reusado pelos demais (espelha `toMedicalCertificateResponse`).

**IExamRequestsRepository:**
- `create(data, queryRunner?): Promise<ExamRequest>`
- `findByAppointment(appointmentId, clinicId): Promise<ExamRequest[]>`
- `findById(id, clinicId): Promise<ExamRequest | null>`
- `updateStatus(id, status: ExamRequestStatus, queryRunner?): Promise<void>` — não é usado por nenhum use-case desta task (só pela task de resultado), mas definir a assinatura aqui já fixa o contrato do repository.
- `delete(id, queryRunner?): Promise<void>` (softDelete)

---

## Fluxo principal

**POST /exam-requests** (DOCTOR)
1. `clinicId = currentUser.clinicId`. Carrega consulta por `appointmentId` + `clinicId` → `NotFoundException`.
2. RBAC own-resource: `doctorsRepository.findByUserId(currentUser.id, clinicId)`; se `doctor.id !== appointment.doctorId` → `ForbiddenException` (espelha `create-prescription.use-case.ts`).
3. `appointment.status === CANCELLED` → `UnprocessableEntityException`.
4. Carrega clínica (nome/endereço/logo via `FindClinicByIdUseCase`), médico (`user.fullName`, `crmNumber`, especialidade herdada de `appointment.specialtyId`), paciente (`user.fullName`, `documentNumber`).
5. Monta `ExamRequestSnapshot` (`issuedAt = now`, `items = dto.items.map(i => ({ name: i.name, observations: i.observations ?? null }))`, `notes = dto.notes ?? null`).
6. Persiste com `status` default `REQUESTED` (`patientId`/`doctorId` derivados do appointment, não do cliente); invalida `exam-requests:appointment:${dto.appointmentId}`; retorna `201`. **Sem transação.**

**GET /exam-requests?appointmentId=** (ADMIN, DOCTOR) — RBAC own (DOCTOR), cache TTL 60s, ordena `issued_at DESC`.

**GET /exam-requests/:id** (ADMIN, DOCTOR) — `findById` → `404`; RBAC own (DOCTOR) → `403`.

**DELETE /exam-requests/:id** (ADMIN, DOCTOR) — `findById` → `404`; RBAC own → `403`; `softDelete`; invalida cache; `204`.

---

## Fluxos alternativos
- Consulta inexistente/de outra clínica → `404`; DOCTOR em consulta alheia → `403`; consulta cancelada → `422`; `items` vazio ou item sem `name` → `400`; campo extra → `400`; solicitação inexistente → `404`; falha de cache → `warn` + segue.

---

## Regras de negócio
- Solicitação **imutável** quanto aos itens — sem update. Correção = DELETE + novo POST.
- `status` é o único campo mutável, mas **nesta task nunca muda** de `REQUESTED` (a transição é implementada na task de resultado).
- DOCTOR só nas próprias consultas; ADMIN lê/exclui qualquer da clínica; USER não acessa. Tudo com `clinicId`.
- `patientId`/`doctorId` sempre derivados do `appointment` (nunca do cliente).

---

## Permissões

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Solicitar (POST) | ✗ | ✓ própria | ✗ | ✗ |
| Listar por consulta | ✓ | ✓ própria | ✗ | ✗ |
| Ver por ID | ✓ | ✓ própria | ✗ | ✗ |
| Excluir | ✓ | ✓ própria | ✗ | ✗ |

POST = `@Roles(DOCTOR)` + `@Throttle({ default: { limit: 30, ttl: 60000 } })`; demais = `@Roles(ADMIN, DOCTOR)`. Own-resource no use-case.

---

## Dependências
- `IAppointmentsRepository`, `IDoctorsRepository`, `IPatientsRepository` (padrão cross-module de `create-prescription.use-case.ts`).
- `FindClinicByIdUseCase` (importar `ClinicsModule`).
- `CacheService` (`CacheModule`).

---

## Decisões técnicas
- Snapshot denormalizado em `jsonb` (`snapshot: ExamRequestSnapshot`).
- `status varchar(20)` default `'requested'`, **fora** do snapshot (único campo mutável).
- Sem transação na criação; cache `exam-requests:appointment:${id}` TTL 60s; soft delete; colunas union com `type` explícito; **sem `@VersionColumn`**.

---

## Restrições
- NÃO criar endpoint de update de itens. NÃO repository no controller. NÃO retornar entidade crua. NÃO persistir PDF. NÃO usar `process.env` fora de `env.config.ts`. NÃO esquecer `clinicId`. NÃO importar `MedicationsModule`.

---

## Estrutura esperada
```
modules/exams/
  controllers/ exam-requests.controller.ts (+ .spec)
  use-cases/ create-exam-request, find-exam-requests-by-appointment,
             find-exam-request-by-id, delete-exam-request (.use-case.ts)
  repositories/ exam-requests.repository.interface.ts, exam-requests.repository.ts (+ .spec)
  entities/ exam-request.entity.ts
  dto/ list-exam-requests-query.dto.ts
  tests/ *.use-case.spec.ts, exams.integration.spec.ts
  exams.module.ts
packages/shared/src/enums/ exam-request-status.enum.ts
packages/shared/src/types/ exam-request-snapshot.type.ts
packages/shared/src/dtos/ create-exam-request.dto.ts, exam-request-response.dto.ts
```

---

## Migration
`1752900000000-create-exam-requests-table.ts` (padrão `SET search_path TO "${schema}", public`): tabela `exam_requests` (`id`, `clinic_id`, `appointment_id`, `patient_id`, `doctor_id`, `snapshot jsonb`, `status varchar(20) default 'requested'`, `issued_at`, `created_at`, `updated_at`, `deleted_at`) + índices em `appointment_id`, `patient_id` e `clinic_id`. `down` dropa índices e tabela.

---

## Cenários de teste

### `CreateExamRequestUseCase`
- POST DOCTOR própria consulta, 2+ itens → `201`, snapshot com `items` preenchidos, `status` inicial `requested`.
- Item sem `observations` → snapshot com `observations: null`.
- `notes` ausente → snapshot com `notes: null`.
- Snapshot denormaliza clínica/médico/paciente; `patientId`/`doctorId` vêm do appointment.
- POST DOCTOR consulta alheia → `ForbiddenException`.
- POST consulta inexistente → `NotFoundException`.
- POST consulta cancelada → `UnprocessableEntityException`.
- Invalida cache após criar.

### `FindExamRequestsByAppointmentUseCase`
- ADMIN vê todos; DOCTOR só os próprios; DOCTOR alheio → `403`.
- Cache hit/miss (TTL 60s).

### `FindExamRequestByIdUseCase`
- Inexistente → `404`; DOCTOR alheio → `403`.

### `DeleteExamRequestUseCase`
- Inexistente → `404`; DOCTOR alheio → `403`; DOCTOR próprio → soft delete + invalidação de cache.

### Integração (`exams.integration.spec.ts`)
- POST com 1 item → `201`; POST com 3 itens → `201` com todos no snapshot.
- POST `items=[]` → `400`; item sem `name` → `400`; campo extra → `400`.
- POST ADMIN/USER → `403`; POST consulta cancelada → `422`.
- GET por consulta (ADMIN todas, DOCTOR próprio, DOCTOR alheio `403`, USER `403`).
- GET/DELETE id inexistente → `404`; DELETE DOCTOR próprio → `204`; sem token → `401`.

---

## Definition of Done
- [ ] `ExamRequestStatus`, `ExamRequestSnapshot` + DTOs no `@app/shared` exportados via `index.ts`
- [ ] POST (DOCTOR), GET lista, GET id, DELETE com permissões corretas
- [ ] Validação de `items` (`@ArrayMinSize(1)`, `@ValidateNested`)
- [ ] Own-resource validado no use-case
- [ ] Snapshot denormalizado (clínica + médico + paciente + itens + notes)
- [ ] Bloqueio em consulta cancelada (`422`)
- [ ] Migration criada e executada
- [ ] Cache aplicado e invalidado
- [ ] Soft delete; sem update de itens; sem `@VersionColumn`
- [ ] Testes unitários (100%) e integração cobrindo os cenários
- [ ] `ExamsModule` em `app.module.ts`; exporta `FindExamRequestByIdUseCase`
- [ ] Naming convention e estrutura seguidas
