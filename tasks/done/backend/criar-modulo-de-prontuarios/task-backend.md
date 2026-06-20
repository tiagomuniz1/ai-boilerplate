# Task — Prontuários / Medical Records (Backend)

## Descrição
Implementar o módulo `medical-records`: o prontuário preenchido pelo médico em uma consulta, seguindo o template vigente da `clinic + specialty`. Cada consulta gera no máximo um prontuário (1:1). O prontuário herda a especialidade da consulta, congela a estrutura do template (`template_schema_snapshot`) e armazena os valores preenchidos (`data`). O histórico do paciente é o conjunto de prontuários do paciente naquela clínica.

---

## Contexto
- Depende das tasks de **templates** (B2) e **especialidade na consulta** (B3).
- 1:1 com `appointment` (índice único parcial).
- `specialty_id` **herdado do appointment** — o cliente nunca envia.
- `template_schema_snapshot` (JSONB) = cópia imutável de `template.fields` no momento da criação. A renderização e a validação usam o snapshot, não o template atual.
- `data` (JSONB) = `{ "<field.key>": valor }`.
- Invariante forte: `template.specialtyId === medical_record.specialtyId` SEMPRE — garantido por guard no use-case **e** por FK composta no banco.
- Dado clínico/legal: USER (recepcionista) não acessa; soft delete só ADMIN; sem hard delete.

---

## Contratos

### Input (DTO)
**CreateMedicalRecordDto:** appointmentId (uuid), data (`Record<string, unknown>`), notes? (string max 5000). **Não inclui `specialtyId` nem `templateId`** (herdados/resolvidos no backend).

**UpdateMedicalRecordDto:** data?, notes?.

**MedicalRecordListQueryDto (extends PaginationDto):** patientId?, doctorId?.

### Output
**MedicalRecordResponseDto:** id, appointmentId, patientId, patientName, doctorId, doctorName, specialtyId, specialtyName, templateId, templateSchemaSnapshot (field[]), data (Record), notes (string|null), createdAt, updatedAt.

**PaginatedMedicalRecordsResponseDto:** data, total, page, limit.

---

## Assinaturas esperadas
**Use-cases:**
- `CreateMedicalRecordUseCase.execute(dto, currentUser): Promise<MedicalRecordResponseDto>`
- `UpdateMedicalRecordUseCase.execute(id, dto, currentUser): Promise<MedicalRecordResponseDto>`
- `FindMedicalRecordByIdUseCase.execute(id, currentUser): Promise<MedicalRecordResponseDto>`
- `FindMedicalRecordByAppointmentUseCase.execute(appointmentId, currentUser): Promise<MedicalRecordResponseDto | null>`
- `FindMedicalRecordsByPatientUseCase.execute(patientId, query, currentUser): Promise<PaginatedMedicalRecordsResponseDto>`
- `DeleteMedicalRecordUseCase.execute(id, currentUser): Promise<void>`

**IMedicalRecordsRepository:**
- `findById(id, clinicId): Promise<MedicalRecord | null>`
- `findByAppointment(appointmentId, clinicId): Promise<MedicalRecord | null>`
- `findByPatient(clinicId, patientId, page, limit, doctorId?): Promise<[MedicalRecord[], number]>`
- `create(data, clinicId, queryRunner?): Promise<MedicalRecord>`
- `update(id, data, clinicId, queryRunner?): Promise<MedicalRecord>`
- `delete(id, clinicId, queryRunner?): Promise<void>`

---

## Fluxo principal

**POST /medical-records** (ADMIN, DOCTOR)
1. Carrega `appointment` por `appointmentId` + `clinicId`. DOCTOR só pode criar para as próprias consultas → senão `ForbiddenException`. Exige `appointment.specialtyId` definido → senão `UnprocessableEntityException`.
2. **Herda** `specialtyId = appointment.specialtyId`. Resolve template via `FindTemplateByClinicAndSpecialtyUseCase(clinicId, specialtyId)` → `NotFoundException`/`UnprocessableEntityException` se não houver template ativo.
3. **Guard de invariante:** se `template.specialtyId !== specialtyId` → `logger.error` + `UnprocessableEntityException('Template does not belong to the appointment specialty')`.
4. Copia `template.fields` → `template_schema_snapshot`; grava `specialtyId`, `templateId`, `doctorId` (= appointment.doctorId), `patientId` (= appointment.patientId).
5. **Valida `data`** contra o snapshot: campos `required` preenchidos; tipos coerentes (number/boolean/date/text); chaves desconhecidas rejeitadas; em select/multiselect o(s) `value` ∈ `options`.
6. Garante 1:1 com a consulta (índice único + checagem → `ConflictException` se já existe prontuário).
7. Persiste; invalida cache do histórico do paciente; retorna `201`.

**GET /medical-records/:id** (ADMIN todos; DOCTOR só os próprios) — escopo por clínica; `NotFoundException` fora da clínica; `ForbiddenException`/`NotFoundException` se DOCTOR tenta ver de outro médico.

**GET /medical-records?patientId=...** (ADMIN, DOCTOR) — histórico do paciente, paginado, ordenado por `created_at DESC`. DOCTOR vê apenas os próprios registros.

**GET /medical-records/by-appointment/:appointmentId** (ADMIN, DOCTOR) — retorna o prontuário da consulta ou `null`/`404`.

**PATCH /medical-records/:id** (ADMIN; DOCTOR só os próprios)
1. Busca por id+clinic → `NotFoundException`.
2. **Edição permitida apenas enquanto a consulta não está `completed`** (D3). Após `complete`, bloquear edição estrutural de `data` → `UnprocessableEntityException` (apenas `notes` pode ser permitido se decidido; padrão: bloquear).
3. Revalida `data` contra o `template_schema_snapshot` (nunca contra o template atual).
4. Optimistic lock → `ConflictException`.

**DELETE /medical-records/:id** (ADMIN) — soft delete; `204`.

---

## Fluxos alternativos
- appointment inexistente/de outra clínica → `404`
- DOCTOR cria/edita/vê prontuário de consulta de outro médico → `403`/`404`
- appointment sem specialtyId → `422`
- template inexistente para clinic+specialty → `404`/`422`
- mismatch template×specialty (guard) → `422` + log de erro
- `data` com campo required ausente / tipo inválido / value fora de options / chave desconhecida → `422`
- prontuário já existe para a consulta → `409`
- edição após `completed` → `422`
- optimistic lock → `409`
- falha de cache → `warn` + segue

---

## Regras de negócio
- 1:1 prontuário ↔ consulta.
- `specialty_id` herdado da consulta — imutável; sem override.
- Validação de `data` sempre contra o `template_schema_snapshot`.
- USER não acessa prontuários. PATIENT/PLATFORM_ADMIN não acessam.
- Soft delete só ADMIN; sem hard delete (retenção legal).

---

## Permissões

| Ação | ADMIN | DOCTOR | USER | PATIENT | PLATFORM_ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Criar | ✓ | só os próprios | ✗ | ✗ | ✗ |
| Ver/Listar | ✓ todos | só os próprios | ✗ | ✗ | ✗ |
| Editar | ✓ | só os próprios (pré-`completed`) | ✗ | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ | ✗ |

`@Roles(...)` + checagem own-resource no use-case via `currentUser` (doctor via `userId`).

---

## Dependências
- `FindTemplateByClinicAndSpecialtyUseCase` (exportado por `MedicalRecordTemplatesModule`).
- `IAppointmentsRepository` / `AppointmentsModule` — carregar consulta (com status, doctorId, patientId, specialtyId).
- `IDoctorsRepository` — resolver doctor do currentUser (DOCTOR) e nome.
- `CacheService`.

---

## Decisões técnicas da task
- **Transação:** criação é registro único → sem transação, a não ser que se opte por orquestrar com `complete-appointment` (fora do escopo desta task).
- **Cache:** `medical_records:patient:${patientId}` (60s) para o histórico; **não cachear** prontuário individual (dado clínico sensível).
- **Concorrência:** Optimistic Lock (`@VersionColumn`).
- **Validação data×schema:** serviço/util puro, testável isoladamente (recebe snapshot + data).
- **FK composta:** `(template_id, specialty_id) → medical_record_templates(id, specialty_id)`.

---

## Restrições
- NÃO aceitar `specialtyId`/`templateId` no DTO de criação.
- NÃO validar `data` contra o template atual — sempre contra o snapshot.
- NÃO permitir USER/PATIENT/PLATFORM_ADMIN.
- NÃO hard delete.
- NÃO retornar entidade crua.
- NÃO `process.env` fora de `env.config.ts`.

---

## Estrutura esperada
```
modules/medical-records/
  controllers/medical-records.controller.ts (+ .spec)
  use-cases/
    create-medical-record.use-case.ts
    update-medical-record.use-case.ts
    find-medical-record-by-id.use-case.ts
    find-medical-record-by-appointment.use-case.ts
    find-medical-records-by-patient.use-case.ts
    delete-medical-record.use-case.ts
  repositories/
    medical-records.repository.interface.ts
    medical-records.repository.ts (+ .spec)
  entities/medical-record.entity.ts
  dto/medical-record-list-query.dto.ts
  services/validate-record-data.service.ts (+ .spec)   # data × snapshot
  tests/ (use-cases .spec + integration.spec)
  medical-records.module.ts

packages/shared/src/dtos/
  create-medical-record.dto.ts
  update-medical-record.dto.ts
  medical-record-response.dto.ts
  paginated-medical-records-response.dto.ts
```

---

## Migration
`1750900000000-create-medical-records-table.ts`:
```sql
CREATE TABLE "medical_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
  "appointment_id" uuid NOT NULL REFERENCES "appointments"("id"),
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "doctor_id" uuid NOT NULL REFERENCES "doctors"("id"),
  "specialty_id" uuid NOT NULL REFERENCES "specialties"("id"),
  "template_id" uuid NOT NULL,
  "template_schema_snapshot" jsonb NOT NULL,
  "data" jsonb NOT NULL DEFAULT '{}',
  "notes" text NULL,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz NULL,
  CONSTRAINT "FK_medical_record_template_specialty"
    FOREIGN KEY ("template_id","specialty_id")
    REFERENCES "medical_record_templates" ("id","specialty_id")
);
CREATE UNIQUE INDEX "UQ_medical_record_appointment"
  ON "medical_records" ("appointment_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "IDX_medical_records_clinic_patient" ON "medical_records" ("clinic_id","patient_id");
CREATE INDEX "IDX_medical_records_clinic_doctor" ON "medical_records" ("clinic_id","doctor_id");
```

---

## Seed (dev)
1–2 prontuários de exemplo para consultas seed concluídas, casando com o template seed da especialidade.

---

## Cenários de teste adicionais
- POST cria prontuário herdando specialtyId da consulta; snapshot = fields do template.
- POST com data sem campo required → `422`.
- POST com value de select fora de options → `422`.
- POST com chave desconhecida em data → `422`.
- POST duplicado para a mesma consulta → `409`.
- POST guard mismatch template×specialty (forçado) → `422`.
- DOCTOR cria para consulta de outro médico → `403`.
- GET histórico por paciente ordenado DESC; DOCTOR só vê os próprios.
- PATCH após consulta `completed` → `422`.
- PATCH valida contra snapshot mesmo que template tenha mudado.
- DELETE como DOCTOR → `403`; como ADMIN → `204`.
- USER em qualquer endpoint → `403`.
- `validate-record-data.service` testado isoladamente (todos os tipos).
- FK composta impede insert com specialty divergente (teste de integração).

---

## Definition of Done
- [ ] DTOs no `@app/shared` exportados (sem specialtyId/templateId no create)
- [ ] CRUD + histórico por paciente + by-appointment
- [ ] Herança de specialty + guard de invariante + FK composta
- [ ] Validação `data` × snapshot (serviço testado)
- [ ] Bloqueio de edição após `completed`
- [ ] 1:1 com consulta (índice único + checagem)
- [ ] Permissões (own-resource DOCTOR; USER/PATIENT/PLATFORM_ADMIN bloqueados)
- [ ] Migration criada e executada (incl. FK composta)
- [ ] Cache do histórico (sem cache do individual)
- [ ] Soft delete só ADMIN
- [ ] Testes unitários (100%) + integração cobrindo cenários (incl. FK composta)
- [ ] `MedicalRecordsModule` registrado; importa templates + appointments
- [ ] Naming convention e estrutura seguidas
