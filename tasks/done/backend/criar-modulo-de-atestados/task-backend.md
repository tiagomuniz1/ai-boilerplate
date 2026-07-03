# Task — Módulo de Atestados (Backend / CRUD + Snapshot)

## Descrição
Implementar o módulo `medical-certificates`: emissão de **atestados médicos** vinculados a uma consulta, com **snapshot imutável** em JSON. O atestado tem **dois tipos** (`leave` = afastamento, `attendance` = comparecimento), escolhidos na emissão, que definem os campos preenchidos. Esta task cobre o CRUD (emitir / listar por consulta / ver / excluir) e a construção do snapshot. A **geração do PDF** é a task seguinte (`gerar-pdf-do-atestado`).

---

## Contexto
- Espelha o módulo `prescriptions` (já existente), sem a parte de medicamentos.
- Recurso **escopado por clínica** (`clinic_id`) — isolamento multi-tenant, como `prescriptions`/`medical-records`.
- Modelo **1:N**: uma consulta pode ter **vários** atestados. Cada atestado é um **snapshot imutável** — não há edição; corrigir é excluir (soft delete) e reemitir.
- O snapshot **denormaliza** clínica (nome/endereço/logo), médico (nome/CRM/especialidade), paciente (nome/CPF) e os campos do atestado conforme o tipo.
- Só o **DOCTOR** emite (assina com o próprio CRM), e somente na **própria consulta**. ADMIN não emite, mas lê/exclui.
- Cache de leitura por `appointmentId`.

---

## Contratos

### Enum (`@app/shared`)
`packages/shared/src/enums/medical-certificate-type.enum.ts`:
```ts
export enum MedicalCertificateType {
  LEAVE = 'leave',           // afastamento
  ATTENDANCE = 'attendance', // comparecimento
}
```
Exportar no barrel `packages/shared/src/enums/index.ts`.

### Input (DTO)

**CreateMedicalCertificateDto** (DOCTOR):
- `appointmentId: string` (`@IsUUID()`, obrigatório)
- `type: MedicalCertificateType` (`@IsEnum(MedicalCertificateType)`, obrigatório)
- **LEAVE** (`@ValidateIf((o) => o.type === MedicalCertificateType.LEAVE)`):
  - `daysOff: number` (`@IsInt() @Min(1) @Max(365)`)
  - `startDate: string` (`@IsDateString()`)
  - `cidCode?: string` (`@IsOptional() @IsString() @MaxLength(20)`)
- **ATTENDANCE** (`@ValidateIf((o) => o.type === MedicalCertificateType.ATTENDANCE)`):
  - `attendanceDate: string` (`@IsDateString()`)
  - `checkInTime: string` (`@IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)`) — "HH:MM"
  - `checkOutTime: string` (`@IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)`) — "HH:MM"
- `observations?: string` (`@IsOptional() @IsString() @MaxLength(2000)`)

**ListMedicalCertificatesQueryDto** (`modules/medical-certificates/dto/`):
- `appointmentId: string` (`@IsUUID()`, obrigatório)

### Output

**MedicalCertificateResponseDto:** `id`, `appointmentId`, `patientId`, `patientName`, `doctorId`, `doctorName`, `type: MedicalCertificateType`, `daysOff: number | null`, `startDate: string | null`, `cidCode: string | null`, `attendanceDate: string | null`, `checkInTime: string | null`, `checkOutTime: string | null`, `observations: string | null`, `issuedAt: Date`, `createdAt: Date`.

---

## Types e DTOs compartilhados (`packages/shared`)
- `src/types/medical-certificate-snapshot.type.ts` → `MedicalCertificateSnapshot`:
```ts
import { MedicalCertificateType } from '../enums/medical-certificate-type.enum'

export interface MedicalCertificateSnapshot {
  issuedAt: string
  type: MedicalCertificateType
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
  daysOff: number | null
  startDate: string | null
  cidCode: string | null
  attendanceDate: string | null
  checkInTime: string | null
  checkOutTime: string | null
  observations: string | null
}
```
- `src/dtos/create-medical-certificate.dto.ts` (`CreateMedicalCertificateDto`), `src/dtos/medical-certificate-response.dto.ts` (`MedicalCertificateResponseDto`).
- `ListMedicalCertificatesQueryDto` em `modules/medical-certificates/dto/`.
- Exportar tudo via `index.ts` de `enums/`, `types/` e `dtos/` (nunca importar de subpasta direto).

---

## Assinaturas esperadas

**Use-cases (classes, `@Injectable`, `extends BaseUseCase`):**
- `CreateMedicalCertificateUseCase.execute(dto, currentUser): Promise<MedicalCertificateResponseDto>`
- `FindMedicalCertificatesByAppointmentUseCase.execute(appointmentId, currentUser): Promise<MedicalCertificateResponseDto[]>`
- `FindMedicalCertificateByIdUseCase.execute(id, currentUser): Promise<MedicalCertificateResponseDto>`
- `DeleteMedicalCertificateUseCase.execute(id, currentUser): Promise<void>`

> Exportar `FindMedicalCertificateByIdUseCase` — a task #2 (PDF) precisa carregar o atestado com a mesma checagem de acesso. Exportar também um `toMedicalCertificateResponse(entity)` do `create-medical-certificate.use-case.ts`, reusado pelos demais (espelha `toPrescriptionResponse`).

**IMedicalCertificatesRepository:**
- `create(data, queryRunner?): Promise<MedicalCertificate>`
- `findByAppointment(appointmentId, clinicId): Promise<MedicalCertificate[]>`
- `findById(id, clinicId): Promise<MedicalCertificate | null>`
- `delete(id, queryRunner?): Promise<void>` (softDelete)

---

## Fluxo principal

**POST /medical-certificates** (DOCTOR)
1. `clinicId = currentUser.clinicId`. Carrega consulta por `appointmentId` + `clinicId` → `NotFoundException`.
2. RBAC own-resource: `doctorsRepository.findByUserId(currentUser.id, clinicId)`; se `doctor.id !== appointment.doctorId` → `ForbiddenException` (espelha `create-prescription.use-case.ts`).
3. `appointment.status === CANCELLED` → `UnprocessableEntityException`.
4. Carrega clínica (nome/endereço/logo via `FindClinicByIdUseCase`), médico (`user.fullName`, `crmNumber`, especialidade herdada de `appointment.specialtyId`), paciente (`user.fullName`, `documentNumber`).
5. Monta `MedicalCertificateSnapshot` (`issuedAt = now`, `type`, campos do tipo preenchidos e os do outro tipo como `null`, `observations`).
6. Persiste (`patientId`/`doctorId` derivados do **appointment**, não do cliente); invalida `medical-certificates:appointment:${appointmentId}`; retorna `201`.
- **Sem transação**.

**GET /medical-certificates?appointmentId=** (ADMIN, DOCTOR) — RBAC own (DOCTOR), cache TTL 60s, ordena `issued_at DESC`.

**GET /medical-certificates/:id** (ADMIN, DOCTOR) — `findById` → `404`; RBAC own (DOCTOR) → `403`.

**DELETE /medical-certificates/:id** (ADMIN, DOCTOR) — `findById` → `404`; RBAC own → `403`; `softDelete`; invalida cache; `204`.

---

## Fluxos alternativos
- Consulta inexistente/de outra clínica → `404`; DOCTOR em consulta alheia → `403`; consulta cancelada → `422`; DTO inválido (ex.: `type=leave` sem `daysOff`, `checkInTime` fora do formato) → `400`; campo extra → `400`; atestado inexistente → `404`; falha de cache → `warn` + segue.

---

## Regras de negócio
- Atestado **imutável** — sem update. Correção = DELETE + novo POST.
- Snapshot é a fonte de verdade do documento; os campos do tipo não usado ficam `null`.
- DOCTOR só nas próprias consultas; ADMIN lê/exclui qualquer da clínica; USER não acessa. Tudo com `clinicId`.
- `patientId`/`doctorId` sempre derivados do `appointment` (nunca do cliente).

---

## Permissões

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Emitir (POST) | ✗ | ✓ própria | ✗ | ✗ |
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
- Snapshot denormalizado em `jsonb` (`snapshot: MedicalCertificateSnapshot`).
- Sem transação; cache `medical-certificates:appointment:${id}` TTL 60s; soft delete; colunas union com `type` explícito; **sem `@VersionColumn`**.

---

## Restrições
- NÃO criar endpoint de update. NÃO repository no controller. NÃO retornar entidade crua. NÃO persistir PDF. NÃO usar `process.env` fora de `env.config.ts`. NÃO esquecer `clinicId`. NÃO importar `MedicationsModule` (atestado não usa medicamentos).

---

## Estrutura esperada
```
modules/medical-certificates/
  controllers/ medical-certificates.controller.ts (+ .spec)
  use-cases/ create-medical-certificate, find-medical-certificates-by-appointment,
             find-medical-certificate-by-id, delete-medical-certificate (.use-case.ts)
  repositories/ medical-certificates.repository.interface.ts, medical-certificates.repository.ts (+ .spec)
  entities/ medical-certificate.entity.ts
  dto/ list-medical-certificates-query.dto.ts
  tests/ *.use-case.spec.ts, medical-certificates.integration.spec.ts
  medical-certificates.module.ts
packages/shared/src/enums/ medical-certificate-type.enum.ts
packages/shared/src/types/ medical-certificate-snapshot.type.ts
packages/shared/src/dtos/ create-medical-certificate.dto.ts, medical-certificate-response.dto.ts
```

---

## Migration
`1752800000000-create-medical-certificates-table.ts` (padrão `SET search_path TO "${schema}", public`): tabela `medical_certificates` (`id`, `clinic_id`, `appointment_id`, `patient_id`, `doctor_id`, `snapshot jsonb`, `issued_at`, `created_at`, `updated_at`, `deleted_at`) + índices em `appointment_id`, `patient_id` e `clinic_id`. `down` dropa índices e tabela.

---

## Cenários de teste

### `CreateMedicalCertificateUseCase`
- POST DOCTOR própria consulta, `type=leave` → `201`, snapshot com `daysOff`/`startDate`/`cidCode` preenchidos e campos de attendance `null`.
- POST DOCTOR própria consulta, `type=attendance` → `201`, snapshot com `attendanceDate`/`checkInTime`/`checkOutTime` preenchidos e campos de leave `null`.
- `cidCode` ausente → snapshot com `cidCode: null`.
- Snapshot denormaliza clínica/médico/paciente; `patientId`/`doctorId` vêm do appointment.
- POST DOCTOR consulta alheia → `ForbiddenException`.
- POST consulta inexistente → `NotFoundException`.
- POST consulta cancelada → `UnprocessableEntityException`.
- Invalida cache após criar.

### `FindMedicalCertificatesByAppointmentUseCase`
- ADMIN vê todos; DOCTOR só os próprios; DOCTOR alheio → `403`.
- Cache hit/miss (grava com TTL 60s).

### `FindMedicalCertificateByIdUseCase`
- Inexistente → `404`; DOCTOR alheio → `403`.

### `DeleteMedicalCertificateUseCase`
- Inexistente → `404`; DOCTOR alheio → `403`; DOCTOR próprio → soft delete + invalidação de cache.

### Integração (`medical-certificates.integration.spec.ts`)
- POST `type=leave` → `201`; POST `type=attendance` → `201`.
- POST `type=leave` sem `daysOff` → `400`; `checkInTime` inválido → `400`; campo extra → `400`.
- POST ADMIN/USER → `403`; POST consulta cancelada → `422`.
- GET por consulta (ADMIN todas, DOCTOR próprio, DOCTOR alheio `403`, USER `403`).
- GET/DELETE id inexistente → `404`; DELETE DOCTOR próprio → `204`; sem token → `401`.

---

## Definition of Done
- [ ] `MedicalCertificateType`, `MedicalCertificateSnapshot` + DTOs no `@app/shared` exportados via `index.ts`
- [ ] POST (DOCTOR), GET lista, GET id, DELETE com permissões corretas
- [ ] Validação condicional por `type` (`@ValidateIf`) cobrindo os dois tipos
- [ ] Own-resource validado no use-case
- [ ] Snapshot denormalizado (clínica + médico + paciente + campos do tipo)
- [ ] Bloqueio em consulta cancelada (`422`)
- [ ] Migration criada e executada
- [ ] Cache aplicado e invalidado
- [ ] Soft delete; sem update (imutável); sem `@VersionColumn`
- [ ] Testes unitários (100%) e integração cobrindo os cenários
- [ ] `MedicalCertificatesModule` em `app.module.ts`; importa os módulos citados; exporta `FindMedicalCertificateByIdUseCase`
- [ ] Naming convention e estrutura seguidas
