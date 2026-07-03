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
- Espelhar o módulo `prescriptions` existente (sem a parte de medicamentos)

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Módulo de Atestados (Backend / CRUD + Snapshot)

## Descrição
Implementar o módulo `medical-certificates`: emissão de **atestados médicos** vinculados a uma consulta, com **snapshot imutável** em JSON. Dois tipos: `leave` (afastamento) e `attendance` (comparecimento), escolhidos na emissão, que definem os campos preenchidos. Esta task cobre o CRUD (emitir / listar por consulta / ver / excluir) e a construção do snapshot. A geração do PDF é a task seguinte.

---

## Contexto
- Espelha `prescriptions` (mesma arquitetura de snapshot imutável, RBAC, cache), sem medicamentos.
- Escopado por `clinic_id` (multi-tenant). Modelo 1:N por consulta. Sem edição — corrigir = excluir + reemitir.
- Só o DOCTOR emite (assina com CRM), na própria consulta. ADMIN lê/exclui.

---

## Enum (`@app/shared`)
`src/enums/medical-certificate-type.enum.ts` → `MedicalCertificateType { LEAVE = 'leave', ATTENDANCE = 'attendance' }`. Exportar no barrel de `enums/`.

## Contratos

### Input (DTO) — `CreateMedicalCertificateDto` (DOCTOR)
- `appointmentId: string` (`@IsUUID()`)
- `type: MedicalCertificateType` (`@IsEnum`)
- LEAVE (`@ValidateIf((o) => o.type === MedicalCertificateType.LEAVE)`): `daysOff` (`@IsInt @Min(1) @Max(365)`), `startDate` (`@IsDateString`), `cidCode?` (`@IsOptional @IsString @MaxLength(20)`)
- ATTENDANCE (`@ValidateIf((o) => o.type === MedicalCertificateType.ATTENDANCE)`): `attendanceDate` (`@IsDateString`), `checkInTime` e `checkOutTime` (`@IsString @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)`)
- `observations?` (`@IsOptional @IsString @MaxLength(2000)`)

**ListMedicalCertificatesQueryDto** (em `modules/medical-certificates/dto/`): `appointmentId: string` (`@IsUUID()`).

### Output — `MedicalCertificateResponseDto`
`id`, `appointmentId`, `patientId`, `patientName`, `doctorId`, `doctorName`, `type`, `daysOff: number | null`, `startDate: string | null`, `cidCode: string | null`, `attendanceDate: string | null`, `checkInTime: string | null`, `checkOutTime: string | null`, `observations: string | null`, `issuedAt: Date`, `createdAt: Date`.

## Snapshot (`@app/shared`, `src/types/medical-certificate-snapshot.type.ts` → `MedicalCertificateSnapshot`)
```ts
{
  issuedAt: string
  type: MedicalCertificateType
  clinic: { name; address: {street,number,complement,neighborhood,city,state,zipCode} | null; logoUrl: string | null }
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
Exportar DTOs/type/enum via os `index.ts` correspondentes.

## Assinaturas esperadas

**Use-cases (classes, `@Injectable`, `extends BaseUseCase`):**
- `CreateMedicalCertificateUseCase.execute(dto, currentUser): Promise<MedicalCertificateResponseDto>`
- `FindMedicalCertificatesByAppointmentUseCase.execute(appointmentId, currentUser): Promise<MedicalCertificateResponseDto[]>`
- `FindMedicalCertificateByIdUseCase.execute(id, currentUser): Promise<MedicalCertificateResponseDto>`
- `DeleteMedicalCertificateUseCase.execute(id, currentUser): Promise<void>`

> Exportar `FindMedicalCertificateByIdUseCase` (a task de PDF reusa a busca-com-RBAC). Exportar `toMedicalCertificateResponse(entity)` do create use-case, reusado pelos demais.

**IMedicalCertificatesRepository:** `create(data, queryRunner?)`, `findByAppointment(appointmentId, clinicId)`, `findById(id, clinicId)`, `delete(id, queryRunner?)` (softDelete).

## Fluxo principal

**POST /medical-certificates** (DOCTOR)
1. `clinicId = currentUser.clinicId`. Carrega consulta (`appointmentId` + `clinicId`) → `NotFoundException`.
2. RBAC own: `doctorsRepository.findByUserId(currentUser.id, clinicId)`; `doctor.id !== appointment.doctorId` → `ForbiddenException`.
3. `appointment.status === CANCELLED` → `UnprocessableEntityException`.
4. Carrega clínica (`FindClinicByIdUseCase`), médico (`user.fullName`, `crmNumber`, especialidade de `appointment.specialtyId`), paciente (`user.fullName`, `documentNumber`).
5. Monta `MedicalCertificateSnapshot` (`issuedAt = now`, `type`, campos do tipo preenchidos, os do outro tipo `null`, `observations`).
6. Persiste (`patientId`/`doctorId` do appointment); invalida `medical-certificates:appointment:${appointmentId}`; retorna `201`. Sem transação.

**GET ?appointmentId=** (ADMIN, DOCTOR) — RBAC own (DOCTOR), cache 60s, `issued_at DESC`.
**GET /:id** (ADMIN, DOCTOR) — `findById` → `404`; RBAC own → `403`.
**DELETE /:id** (ADMIN, DOCTOR) — `findById` → `404`; RBAC own → `403`; `softDelete`; invalida cache; `204`.

## Permissões
POST = `@Roles(DOCTOR)` + `@Throttle({ default: { limit: 30, ttl: 60000 } })`; demais = `@Roles(ADMIN, DOCTOR)`. Own-resource no use-case.

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Emitir | ✗ | ✓ própria | ✗ | ✗ |
| Listar/Ver/Excluir | ✓ | ✓ própria | ✗ | ✗ |

## Dependências
`IAppointmentsRepository`, `IDoctorsRepository`, `IPatientsRepository`, `FindClinicByIdUseCase` (`ClinicsModule`), `CacheService`. NÃO importar `MedicationsModule`.

## Decisões técnicas
Snapshot `jsonb`; sem transação; cache `medical-certificates:appointment:${id}` TTL 60s; soft delete; colunas union com `type` explícito; sem `@VersionColumn`.

## Restrições
- NÃO criar update. NÃO repository no controller. NÃO retornar entidade crua. NÃO persistir PDF. NÃO `process.env` fora de `env.config.ts`. NÃO esquecer `clinicId`.

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

## Migration
`1752800000000-create-medical-certificates-table.ts` (`SET search_path TO "${schema}", public`): tabela `medical_certificates` (`id`, `clinic_id`, `appointment_id`, `patient_id`, `doctor_id`, `snapshot jsonb`, `issued_at`, `created_at`, `updated_at`, `deleted_at`) + índices em `appointment_id`, `patient_id`, `clinic_id`. `down` dropa índices e tabela.

## Cenários de teste
- Create `type=leave` → snapshot com campos de leave; attendance `null`. Create `type=attendance` → inverso. `cidCode` ausente → `null`.
- DOCTOR consulta alheia → `403`; consulta inexistente → `404`; cancelada → `422`; invalida cache.
- Find por consulta: ADMIN todas, DOCTOR próprio, DOCTOR alheio `403`; cache TTL 60s.
- Find/Delete inexistente → `404`; delete DOCTOR próprio → soft delete + invalidação.
- Integração: POST cada tipo `201`; `type=leave` sem `daysOff` `400`; `checkInTime` inválido `400`; campo extra `400`; ADMIN/USER POST `403`; cancelada `422`; GET/DELETE conforme role; sem token `401`.

## Definition of Done
- [ ] Enum + snapshot + DTOs exportados via `index.ts`
- [ ] POST/GET/GET id/DELETE com permissões corretas e validação condicional por `type`
- [ ] Own-resource no use-case; snapshot denormalizado; `422` em consulta cancelada
- [ ] Migration criada e executada; cache aplicado/invalidado; soft delete; sem update; sem `@VersionColumn`
- [ ] Testes unitários (100%) e integração
- [ ] `MedicalCertificatesModule` em `app.module.ts`; exporta `FindMedicalCertificateByIdUseCase`
- [ ] Naming convention e estrutura seguidas
