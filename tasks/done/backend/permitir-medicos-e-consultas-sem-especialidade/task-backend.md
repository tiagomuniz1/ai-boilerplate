# Task — Permitir médicos e consultas sem especialidade (generalistas) (Backend)

## Descrição

Habilitar **médicos generalistas** — profissionais com apenas CRM, **sem especialidade vinculada** — em clínicas que não têm especialidades atribuídas. Hoje a especialidade é obrigatória em três pontos de aplicação (o schema já tolera a ausência). Esta task relaxa esses pontos e cria o caminho de **prontuário de generalista** via um template de clínica sem especialidade.

> **Escopo:** apenas a Parte A (habilitar generalista). A cobrança de valores (preço por consulta) é a Parte B e **não** entra aqui.

Três frentes, feitas juntas por comporem um único fluxo ponta a ponta:

- **1) Cadastro do médico** — deixar de exigir ≥1 especialidade (mantendo ≥1 CRM).
- **2) Criação de consulta** — permitir consulta sem especialidade quando o médico não tem nenhuma.
- **3) Prontuário de generalista** — template de clínica com `specialty_id IS NULL` e criação de prontuário sem especialidade.

---

## Contexto

- **Especialidade não é obrigatória no schema.** `doctors` não tem coluna de especialidade (vínculo via `doctor_specialties`); `appointments.specialty_id` já é **nullable** (`appointment.entity.ts` + migration `1750800000000`). Generalista = médico com CRM(s) e **zero** linhas em `doctor_specialties`.
- **Bloqueios de aplicação a relaxar:**
  - `packages/shared/src/dtos/create-doctor.dto.ts` → `specialties` tem `@ArrayMinSize(1)`.
  - `packages/shared/src/dtos/update-doctor.dto.ts` → `specialties?` tem `@ArrayMinSize(1)` quando presente.
  - `create-appointment.use-case.ts` → `resolveSpecialty` (linhas 166-187) lança `UnprocessableEntityException('Doctor has no active specialty')` quando `specialties.length === 0`.
- **Único obstáculo de schema:** `medical_record_templates.specialty_id` é **NOT NULL** (`medical-record-template.entity.ts:40`, migration `1750700000000`), com índice único `UQ_template_clinic_specialty ON (clinic_id, specialty_id)` e `UQ_template_id_specialty UNIQUE (id, specialty_id)`.
- **Consumidores de leitura já toleram `specialtyId` nulo** — `list-appointments.use-case.ts` (linha 51) filtra `id !== null` antes de juntar `specialties`; `find-appointment-by-id` e as transições idem. **Nenhuma mudança neles.**
- `create-medical-record.use-case.ts` (linhas 69-78): hoje lança `'Appointment has no specialty defined'` se `specialtyId` nulo, e resolve o template por `findTemplateByClinicAndSpecialtyUseCase.execute(clinicId, specialtyId)`.
- `create-medical-record-template.use-case.ts`: valida vínculo `clinicSpecialtiesRepository.findByClinicAndSpecialty(...)` (linha 50) e duplicidade `templatesRepository.findByClinicAndSpecialty(...)` (linha 56) antes de criar.

**Decisões de shape:**
- Consulta de generalista grava `specialty_id = NULL`. `AppointmentResponseDto.specialtyName` vira `null` nesse caso (já é opcional para consumidores).
- Template de generalista é identificado por `specialty_id IS NULL` (escopo apenas `clinic_id`). **Um por clínica.**
- Prontuário de generalista herda `specialty_id = NULL` da consulta.

---

## PARTE 1 — Cadastro de médico sem especialidade

### 1.1 Shared — DTOs
- **`packages/shared/src/dtos/create-doctor.dto.ts`**: remover `@ArrayMinSize(1)` de `specialties` (manter `@IsArray()`, `@ValidateNested({ each: true })`, `@Type(() => DoctorSpecialtyInputDto)`). Array vazio passa a ser válido.
- **`packages/shared/src/dtos/update-doctor.dto.ts`**: remover `@ArrayMinSize(1)` de `specialties?` (manter `@IsOptional()`).
- **Manter** `@ArrayMinSize(1)` em `crms` nos dois DTOs — generalista continua obrigado a ter ≥1 CRM.

### 1.2 Use-cases (create/update doctor)
- `create-doctor.use-case.ts` / `update-doctor.use-case.ts`: `resolveSpecialties` já mapeia lista vazia → `[]` sem erro (a validação de "IDs não encontrados" só roda quando há itens). **Confirmar** que nenhum passo assume ≥1 especialidade; `toResponse` já mapeia `doctorSpecialties` (vazio → `specialties: []`).
- Nenhuma mudança de repository (persiste `doctorSpecialties` vazio normalmente).

---

## PARTE 2 — Criação de consulta sem especialidade

### 2.1 `create-appointment.use-case.ts`
- Alterar a assinatura de `resolveSpecialty` para retornar `{ id: string; name: string } | null`:
  - Se `requestedSpecialtyId` informado → validar pertencimento (comportamento atual).
  - Se **não** informado e `specialties.length === 0` → **retornar `null`** (consulta de generalista) em vez de lançar `'Doctor has no active specialty'`.
  - `specialties.length > 1` sem `specialtyId` → manter `UnprocessableEntityException('specialtyId is required')`.
  - Exatamente 1 → auto-herdar (atual).
- No `execute`: `chosenSpecialty` pode ser `null`.
  - Persistir `specialtyId: chosenSpecialty?.id ?? null` (linha ~131).
  - `toResponse(appointment, doctorName, patientName, chosenSpecialty?.name ?? null)` (linha ~163) — ajustar o parâmetro/tipo de `specialtyName` para aceitar `null`.
- `CreateAppointmentDto.specialtyId` já é opcional — nenhuma mudança de DTO.

---

## PARTE 3 — Template e prontuário de generalista

### 3.1 Migration `<ts>-make-template-specialty-id-nullable.ts`
`up()` (com `search_path` a partir de `connection.options.schema`, padrão das migrations do projeto):
1. `ALTER TABLE medical_record_templates ALTER COLUMN specialty_id DROP NOT NULL`.
2. **Substituir o índice único** `UQ_template_clinic_specialty` por dois índices parciais (NULLs são distintos num unique padrão — precisamos garantir 1 template de generalista por clínica):
   - `CREATE UNIQUE INDEX "UQ_template_clinic_specialty" ON medical_record_templates (clinic_id, specialty_id) WHERE specialty_id IS NOT NULL AND deleted_at IS NULL`.
   - `CREATE UNIQUE INDEX "UQ_template_clinic_generalist" ON medical_record_templates (clinic_id) WHERE specialty_id IS NULL AND deleted_at IS NULL`.
3. `UQ_template_id_specialty UNIQUE (id, specialty_id)`: **verificar** se é alvo de FK composta a partir de `medical_records` (`template_id, specialty_id`). Como `id` já é único, manter a constraint é seguro; ajustar apenas se a FK exigir. Documentar a verificação no PR.
4. **Verificar `medical_records.specialty_id`** — o prontuário de generalista herda `NULL`. Se a coluna for NOT NULL, `ALTER COLUMN specialty_id DROP NOT NULL` (na mesma migration).

`down()`: reverter índices e `SET NOT NULL` (assumindo ausência de linhas com NULL).

### 3.2 Entidade `medical-record-template.entity.ts`
```ts
@Column({ name: 'specialty_id', type: 'uuid', nullable: true })
specialtyId: string | null
```
> `type: 'uuid'` explícito é obrigatório por ser union type (`string | null`) — inferência falharia (`"Object"`).

### 3.3 Repository — resolução com `specialtyId` nulo
- `medical-record-templates.repository.interface.ts` e `.repository.ts`: `findByClinicAndSpecialty(clinicId: string, specialtyId: string | null)`. Na implementação, `findOneBy` com `specialty_id` nulo precisa de `IsNull()` (passar `null` cru gera `= NULL`, que nunca casa):
  ```ts
  return this.repository.findOneBy({ clinicId, specialtyId: specialtyId ?? IsNull() })
  ```

### 3.4 `find-template-by-clinic-and-specialty.use-case.ts`
- Assinatura `execute(clinicId: string, specialtyId: string | null)` — repassar ao repository.

### 3.5 `create-medical-record.use-case.ts`
- Remover o `if (!appointment.specialtyId) throw UnprocessableEntityException('Appointment has no specialty defined')` (linhas 69-71).
- `const specialtyId = appointment.specialtyId` (pode ser `null`).
- `findTemplateByClinicAndSpecialtyUseCase.execute(clinicId, specialtyId)` → busca o template de generalista quando `null`. Manter `NotFoundException('No active template found for this specialty')` se não houver.
- A checagem `template.specialtyId !== specialtyId` continua válida (`null === null`).
- `record.specialtyId = specialtyId` (pode ser `null`).

### 3.6 Cadastro de template de generalista
- **`packages/shared/src/dtos/create-medical-record-template.dto.ts`**: `specialtyId` passa a `@IsOptional() @IsUUID()` (omitido = template de generalista). Refletir em `update-medical-record-template.dto.ts` e nos response DTOs (`specialtyId: string | null`).
- **`create-medical-record-template.use-case.ts`**:
  - Pular a validação de vínculo `clinicSpecialtiesRepository.findByClinicAndSpecialty` quando `specialtyId` ausente (generalista não depende de vínculo de especialidade).
  - Duplicidade: `templatesRepository.findByClinicAndSpecialty(clinicId, null)` para bloquear um 2º template de generalista → `ConflictException('A generalist template already exists')`.
- `update-medical-record-template.use-case.ts`: aplicar o mesmo tratamento de `null` onde relevante.

---

## Comum
- **Seeds** (`dev.seed.ts`, `carga.seed.ts`): adicionar ao menos **um médico generalista** (CRM, sem `doctorSpecialties`) e um **template de generalista** (`specialtyId: null`) para exercitar o fluxo. Não remover os cenários com especialidade.

---

## Regras de negócio
- Médico pode ter **0..N** especialidades; **≥1 CRM** continua obrigatório.
- Consulta de médico sem especialidade → `specialty_id = NULL`; de médico com 1 → herda; com >1 sem `specialtyId` → `422`.
- Template de generalista: **um por clínica** (`specialty_id IS NULL`), sem exigir vínculo em `clinic_specialties`.
- Prontuário de generalista herda `specialty_id = NULL`; resolve o template de generalista da clínica; sem template → `404` (mensagem clara).
- Sem regressão para especialistas (herança, mismatch de template, unicidade por especialidade preservados).

---

## Estrutura de arquivos
```
packages/shared/src/dtos/
  create-doctor.dto.ts                       ← − @ArrayMinSize(1) em specialties
  update-doctor.dto.ts                       ← − @ArrayMinSize(1) em specialties?
  create-medical-record-template.dto.ts      ← specialtyId → @IsOptional() @IsUUID()
  update-medical-record-template.dto.ts      ← specialtyId opcional/nullable
  medical-record-template-response.dto.ts    ← specialtyId: string | null

apps/backend/src/modules/appointments/
  use-cases/create-appointment.use-case.ts   ← resolveSpecialty → | null; persistir/responder null

apps/backend/src/modules/medical-record-templates/
  entities/medical-record-template.entity.ts        ← specialtyId: string | null (type explícito)
  repositories/medical-record-templates.repository.interface.ts ← findByClinicAndSpecialty(..., string | null)
  repositories/medical-record-templates.repository.ts           ← IsNull() quando null
  use-cases/find-template-by-clinic-and-specialty.use-case.ts   ← execute(clinicId, string | null)
  use-cases/create-medical-record-template.use-case.ts          ← pular vínculo + duplicidade de generalista
  use-cases/update-medical-record-template.use-case.ts          ← tratamento de null

apps/backend/src/modules/medical-records/
  use-cases/create-medical-record.use-case.ts       ← remover throw; template/record com specialtyId null

apps/backend/src/database/
  migrations/<ts>-make-template-specialty-id-nullable.ts ← NOVO (drop not null + índices parciais)
  seeds/dev/dev.seed.ts, seeds/carga/carga.seed.ts       ← médico generalista + template generalista
```

---

## Cenários de teste
### Unitário
- `resolveSpecialty`: 0 especialidades + sem `specialtyId` → **retorna null** (não lança); 1 → herda; >1 sem id → `422`; id que não pertence → `422`.
- `create-appointment`: médico generalista → persiste `specialtyId: null`, `toResponse` com `specialtyName: null`.
- `create-medical-record`: consulta sem especialidade → resolve template de generalista; sem template → `404`; especialista segue casando por especialidade.
- `create-medical-record-template`: sem `specialtyId` → cria generalista sem checar vínculo; segundo generalista da clínica → `409`.
- Repository `findByClinicAndSpecialty(clinicId, null)` → usa `IsNull()`, encontra o template de generalista.
- Migration: `specialty_id` nullable; índice parcial de generalista impede 2º template null por clínica.

### Integração
- `POST /doctors` com `specialties: []` (e `crms` válidos) → **201**; body com `specialties: []`.
- `POST /appointments` para médico generalista sem `specialtyId` → **201** com `specialtyId: null`.
- `POST /medical-record-templates` sem `specialtyId` → **201** (generalista); repetir → **409**.
- Fluxo de prontuário: criar template de generalista → agendar consulta generalista → criar prontuário → **201** com `specialtyId: null`.
- Ajustar specs afetadas em `doctors`, `appointments`, `medical-records`, `medical-record-templates` (aparecem no `git status`).

---

## Definition of Done
- [ ] Shared: `@ArrayMinSize(1)` removido de `specialties` (create/update doctor); `crms` mantém `@ArrayMinSize(1)`
- [ ] `create-appointment`: `resolveSpecialty` retorna `null` para generalista; consulta persiste/responde `specialtyId` null
- [ ] Migration: `medical_record_templates.specialty_id` nullable; índices parciais (especialista + generalista único por clínica); `medical_records.specialty_id` verificado/nullable
- [ ] Entidade + repository + use-case de template resolvem `specialtyId` null (`IsNull()`)
- [ ] `create-medical-record`: sem throw de "no specialty"; prontuário de generalista criado
- [ ] Cadastro de template de generalista (sem vínculo de especialidade; único por clínica)
- [ ] Seeds com médico e template de generalista
- [ ] Testes unitários 100% + integração (doctor/appointment/template/medical-record generalistas)
- [ ] Build e lint sem erros
```
