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
- Espelhar os módulos `prescriptions` (itens múltiplos em snapshot) e `medical-certificates` (CRUD/RBAC/cache) existentes

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Módulo de Solicitação de Exames (Backend / CRUD + Snapshot)

## Descrição
Implementar o módulo `exams`: solicitação de exames médicos vinculados a uma consulta, com snapshot imutável em JSON contendo uma lista de itens (nome livre + observação opcional) e uma observação geral. Cobre o CRUD (solicitar / listar por consulta / ver / excluir) e a construção do snapshot. Geração de PDF e upload de resultado são tasks seguintes.

## Contexto
- Espelha `prescriptions` (itens múltiplos) e `medical-certificates` (CRUD/RBAC/cache), sem medicamentos, sem tipos condicionais.
- Escopado por `clinic_id`. Modelo 1:N por consulta. Sem edição de itens — corrigir = excluir + resolicitar.
- Campo mutável `status` (`requested` | `completed`) existe no schema desde já, mas nesta task nunca muda de `requested` (a transição é implementada em outra task).
- Só o DOCTOR solicita (própria consulta). ADMIN lê/exclui. USER não acessa.

## Enum (`@app/shared`)
`src/enums/exam-request-status.enum.ts` → `ExamRequestStatus { REQUESTED = 'requested', COMPLETED = 'completed' }`. Exportar no barrel de `enums/`.

## Contratos

### Input — `CreateExamRequestItemDto`
- `name: string` (`@IsString() @MinLength(1) @MaxLength(200)`)
- `observations?: string` (`@IsOptional() @IsString() @MaxLength(1000)`)

### Input — `CreateExamRequestDto` (DOCTOR)
- `appointmentId: string` (`@IsUUID()`)
- `items: CreateExamRequestItemDto[]` (`@ValidateNested({each:true}) @Type(() => CreateExamRequestItemDto) @ArrayMinSize(1)`)
- `notes?: string` (`@IsOptional() @IsString() @MaxLength(2000)`)

**ListExamRequestsQueryDto** (em `modules/exams/dto/`): `appointmentId: string` (`@IsUUID()`).

### Output — `ExamRequestResponseDto`
`id`, `appointmentId`, `patientId`, `patientName`, `doctorId`, `doctorName`, `items: {name, observations: string|null}[]`, `notes: string | null`, `status: ExamRequestStatus`, `issuedAt: Date`, `createdAt: Date`. (Sem campo `results` ainda — será adicionado em outra task.)

## Snapshot (`@app/shared`, `src/types/exam-request-snapshot.type.ts` → `ExamRequestSnapshot`)
```ts
{
  issuedAt: string
  clinic: { name; address: {street,number,complement,neighborhood,city,state,zipCode} | null; logoUrl: string | null }
  doctor: { name: string; crmNumber: string; specialtyName: string | null }
  patient: { name: string; documentNumber: string }
  items: Array<{ name: string; observations: string | null }>
  notes: string | null
}
```
Exportar DTOs/type/enum via os `index.ts` correspondentes.

## Assinaturas esperadas

**Use-cases (classes, `@Injectable`, `extends BaseUseCase`):**
- `CreateExamRequestUseCase.execute(dto, currentUser): Promise<ExamRequestResponseDto>`
- `FindExamRequestsByAppointmentUseCase.execute(appointmentId, currentUser): Promise<ExamRequestResponseDto[]>`
- `FindExamRequestByIdUseCase.execute(id, currentUser): Promise<ExamRequestResponseDto>`
- `DeleteExamRequestUseCase.execute(id, currentUser): Promise<void>`

> Exportar `FindExamRequestByIdUseCase` (task de PDF reusa a busca-com-RBAC). Exportar `toExamRequestResponse(entity)` do create use-case, reusado pelos demais.

**IExamRequestsRepository:** `create(data, queryRunner?)`, `findByAppointment(appointmentId, clinicId)`, `findById(id, clinicId)`, `updateStatus(id, status, queryRunner?)` (não usado nesta task, mas fixa o contrato), `delete(id, queryRunner?)` (softDelete).

## Fluxo principal

**POST /exam-requests** (DOCTOR)
1. `clinicId = currentUser.clinicId`. Carrega consulta (`appointmentId` + `clinicId`) → `NotFoundException`.
2. RBAC own: `doctorsRepository.findByUserId(currentUser.id, clinicId)`; `doctor.id !== appointment.doctorId` → `ForbiddenException`.
3. `appointment.status === CANCELLED` → `UnprocessableEntityException`.
4. Carrega clínica (`FindClinicByIdUseCase`), médico (`user.fullName`, `crmNumber`, especialidade de `appointment.specialtyId`), paciente (`user.fullName`, `documentNumber`).
5. Monta `ExamRequestSnapshot` (`issuedAt = now`, `items` mapeados, `notes = dto.notes ?? null`).
6. Persiste com `status` default `REQUESTED` (`patientId`/`doctorId` do appointment); invalida `exam-requests:appointment:${appointmentId}`; retorna `201`. Sem transação.

**GET ?appointmentId=** (ADMIN, DOCTOR) — RBAC own (DOCTOR), cache 60s, `issued_at DESC`.
**GET /:id** (ADMIN, DOCTOR) — `findById` → `404`; RBAC own → `403`.
**DELETE /:id** (ADMIN, DOCTOR) — `findById` → `404`; RBAC own → `403`; `softDelete`; invalida cache; `204`.

## Permissões
POST = `@Roles(DOCTOR)` + `@Throttle({ default: { limit: 30, ttl: 60000 } })`; demais = `@Roles(ADMIN, DOCTOR)`. Own-resource no use-case.

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Solicitar | ✗ | ✓ própria | ✗ | ✗ |
| Listar/Ver/Excluir | ✓ | ✓ própria | ✗ | ✗ |

## Dependências
`IAppointmentsRepository`, `IDoctorsRepository`, `IPatientsRepository`, `FindClinicByIdUseCase` (`ClinicsModule`), `CacheService`. NÃO importar `MedicationsModule`.

## Decisões técnicas
Snapshot `jsonb`; `status varchar(20)` default `'requested'` fora do snapshot; sem transação; cache `exam-requests:appointment:${id}` TTL 60s; soft delete; colunas union com `type` explícito; sem `@VersionColumn`.

## Restrições
- NÃO criar update de itens. NÃO repository no controller. NÃO retornar entidade crua. NÃO persistir PDF. NÃO `process.env` fora de `env.config.ts`. NÃO esquecer `clinicId`.

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

## Migration
`1752900000000-create-exam-requests-table.ts` (`SET search_path TO "${schema}", public`): tabela `exam_requests` (`id`, `clinic_id`, `appointment_id`, `patient_id`, `doctor_id`, `snapshot jsonb`, `status varchar(20) default 'requested'`, `issued_at`, `created_at`, `updated_at`, `deleted_at`) + índices em `appointment_id`, `patient_id`, `clinic_id`. `down` dropa índices e tabela.

## Cenários de teste
- Create com 2+ itens → snapshot com `items` preenchidos, `status: requested`. Item sem `observations` → `null`. `notes` ausente → `null`.
- DOCTOR consulta alheia → `403`; consulta inexistente → `404`; cancelada → `422`; invalida cache.
- Find por consulta: ADMIN todas, DOCTOR próprio, DOCTOR alheio `403`; cache TTL 60s.
- Find/Delete inexistente → `404`; delete DOCTOR próprio → soft delete + invalidação.
- Integração: POST 1 item `201`; POST 3 itens `201`; `items=[]` `400`; item sem `name` `400`; campo extra `400`; ADMIN/USER POST `403`; cancelada `422`; GET/DELETE conforme role; sem token `401`.

## Definition of Done
- [ ] Enum + snapshot + DTOs exportados via `index.ts`
- [ ] POST/GET/GET id/DELETE com permissões corretas e validação de `items`
- [ ] Own-resource no use-case; snapshot denormalizado; `422` em consulta cancelada
- [ ] Migration criada e executada; cache aplicado/invalidado; soft delete; sem update; sem `@VersionColumn`
- [ ] Testes unitários (100%) e integração
- [ ] `ExamsModule` em `app.module.ts`; exporta `FindExamRequestByIdUseCase`
- [ ] Naming convention e estrutura seguidas
