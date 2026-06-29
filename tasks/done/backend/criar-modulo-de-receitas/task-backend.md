# Task — Módulo de Receitas (Backend / CRUD + Snapshot)

## Descrição
Implementar o módulo `prescriptions`: emissão de **receitas médicas** vinculadas a uma consulta, com **snapshot imutável** em JSON. O médico emite a receita escolhendo medicamentos da base canônica (`medications`), com posologia por item e uma observação geral. Esta task cobre o CRUD (emitir / listar por consulta / ver / excluir) e a construção do snapshot. A **geração do PDF** é a task seguinte (`gerar-pdf-da-receita`).

---

## Contexto
- Continuação do módulo `medications` (base canônica, já existente e exportando `IMedicationsRepository`).
- Recurso **escopado por clínica** (`clinic_id`) — isolamento multi-tenant, como `medical-records`.
- Modelo **1:N**: uma consulta pode ter **várias** receitas. Cada receita é um **snapshot imutável** — não há edição; corrigir é excluir (soft delete) e reemitir.
- O snapshot **denormaliza** clínica (nome/endereço/logo), médico (nome/CRM/especialidade), paciente (nome/CPF) e itens (nome/princípio ativo/posologia) — para o documento ser reproduzível mesmo que as fontes mudem depois. Segue a filosofia do `templateSchemaSnapshot` de `medical-records`.
- Só o **DOCTOR** emite (assina com o próprio CRM), e somente na **própria consulta**. ADMIN não emite (não tem CRM), mas lê/exclui.
- A base muda pouco por consulta → cache de leitura por `appointmentId`.

---

## Contratos

### Input (DTO)

**CreatePrescriptionDto** (DOCTOR):
- `appointmentId: string` (uuid, obrigatório)
- `items: CreatePrescriptionItemDto[]` (`@ArrayMinSize(1)`, `@ValidateNested({ each: true })`, `@Type(() => CreatePrescriptionItemDto)`)
- `notes?: string` (opcional, max 2000)

**CreatePrescriptionItemDto:**
- `medicationId: string` (uuid, obrigatório)
- `instructions: string` (obrigatório, min 1, max 1000) — posologia

**PrescriptionListQueryDto:**
- `appointmentId: string` (uuid, obrigatório) — filtra as receitas da consulta

### Output

**PrescriptionItemResponseDto:**
- `medicationId: string | null`, `name: string`, `activeIngredient: string | null`, `instructions: string`

**PrescriptionResponseDto:**
- `id`, `appointmentId`, `patientId`, `patientName`, `doctorId`, `doctorName`, `issuedAt: Date`, `items: PrescriptionItemResponseDto[]`, `notes: string | null`, `createdAt: Date`

> O response expõe os dados do snapshot num shape amigável; o snapshot completo (com timbre da clínica) é interno e usado pela geração do PDF na task #2.

---

## Types e DTOs compartilhados (`packages/shared`)
- `src/types/prescription-snapshot.type.ts` → `PrescriptionSnapshot` (shape do `PRESCRIPTIONS_PLAN.md`) — exportar em `types/index.ts`.
- `src/dtos/create-prescription.dto.ts` (com `CreatePrescriptionItemDto`), `prescription-response.dto.ts` (com `PrescriptionItemResponseDto`).
- `PrescriptionListQueryDto` pode morar em `modules/prescriptions/dto/` (padrão de query DTOs de listagem do projeto).
- Exportar via `index.ts` (nunca importar de subpasta direto).

---

## Assinaturas esperadas

**Use-cases (classes, `@Injectable`, `extends BaseUseCase`):**
- `CreatePrescriptionUseCase.execute(dto: CreatePrescriptionDto, currentUser: ICurrentUser): Promise<PrescriptionResponseDto>`
- `FindPrescriptionsByAppointmentUseCase.execute(appointmentId: string, currentUser: ICurrentUser): Promise<PrescriptionResponseDto[]>`
- `FindPrescriptionByIdUseCase.execute(id: string, currentUser: ICurrentUser): Promise<PrescriptionResponseDto>`
- `DeletePrescriptionUseCase.execute(id: string, currentUser: ICurrentUser): Promise<void>`

> Exportar `FindPrescriptionByIdUseCase` (e um helper de RBAC, se houver) — a task #2 (PDF) precisa carregar a receita com a mesma checagem de acesso.

**IPrescriptionsRepository:**
- `create(data, queryRunner?): Promise<Prescription>`
- `findByAppointment(appointmentId: string, clinicId: string): Promise<Prescription[]>`
- `findById(id: string, clinicId: string): Promise<Prescription | null>`
- `delete(id: string, queryRunner?): Promise<void>` (softDelete)

---

## Fluxo principal

**POST /prescriptions** (DOCTOR)
1. `clinicId = currentUser.clinicId`. Carrega a consulta por `appointmentId` + `clinicId` → `NotFoundException` se não existir.
2. RBAC own-resource: carrega o doctor via `doctorsRepository.findByUserId(currentUser.id, clinicId)`; se `doctor.id !== appointment.doctorId` → `ForbiddenException`. (Espelha `create-medical-record.use-case.ts`.)
3. Se `appointment.status === AppointmentStatus.CANCELLED` → `UnprocessableEntityException('Cannot issue a prescription for a cancelled appointment')`.
4. Carrega os medicamentos pelos `medicationId` dos itens via `IMedicationsRepository.findById`; se algum não existir → `UnprocessableEntityException`. Denormaliza `name` e `activeIngredient` de cada um.
5. Carrega clínica (nome/endereço/logo), médico (nome via `user.fullName`, `crmNumber`, especialidade da consulta) e paciente (nome via `user.fullName`, `documentNumber`).
6. Monta o `PrescriptionSnapshot` (incluindo `issuedAt = now`, itens com `instructions` do DTO, `notes`).
7. Persiste `Prescription` (`clinicId`, `appointmentId`, `patientId = appointment.patientId`, `doctorId = appointment.doctorId`, `snapshot`, `issuedAt`).
8. Invalida cache `prescriptions:appointment:${appointmentId}`. Retorna `201` com `PrescriptionResponseDto` (derivado do snapshot).
- **Sem transação** — apenas leituras + 1 insert.

**GET /prescriptions?appointmentId=** (ADMIN, DOCTOR)
1. RBAC: se DOCTOR, valida que a consulta é própria (own doctor) → senão `ForbiddenException`. ADMIN: qualquer.
2. Cache `prescriptions:appointment:${appointmentId}` (TTL 60s) — hit retorna.
3. Miss → `findByAppointment` (ordenado por `issued_at DESC`), mapeia, salva cache, retorna `200` com array.

**GET /prescriptions/:id** (ADMIN, DOCTOR)
1. `findById(id, clinicId)` → `NotFoundException`.
2. RBAC: DOCTOR só própria consulta (comparar `doctorId`) → senão `ForbiddenException`. ADMIN: qualquer.
3. Retorna `200`.

**DELETE /prescriptions/:id** (ADMIN, DOCTOR)
1. `findById(id, clinicId)` → `NotFoundException`.
2. RBAC: DOCTOR só própria → senão `ForbiddenException`. ADMIN: qualquer.
3. `softDelete`; invalida `prescriptions:appointment:${appointmentId}`; retorna `204`.

---

## Fluxos alternativos
- Consulta inexistente / de outra clínica → `404`.
- DOCTOR em consulta de outro médico → `403`.
- Consulta cancelada → `422`.
- `items` vazio → `400` (validação `@ArrayMinSize(1)`).
- `medicationId` inexistente → `422`.
- Receita inexistente (GET por id / DELETE) → `404`.
- Falha de invalidação de cache → `warn` + segue (try/catch isolado).

---

## Regras de negócio
- Receita é **imutável** — não há endpoint de update. Correção = DELETE + novo POST.
- O snapshot é a fonte de verdade do documento; mudanças posteriores em clínica/médico/medicamento **não** afetam receitas já emitidas.
- DOCTOR só opera nas próprias consultas; ADMIN lê/exclui qualquer uma da clínica; USER não acessa.
- Toda operação respeita `clinicId` (multi-tenant).

---

## Permissões

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Emitir (POST) | ✗ | ✓ própria consulta | ✗ | ✗ |
| Listar por consulta (GET) | ✓ | ✓ própria | ✗ | ✗ |
| Ver por ID (GET) | ✓ | ✓ própria | ✗ | ✗ |
| Excluir (DELETE) | ✓ | ✓ própria | ✗ | ✗ |

Aplicar via `@Roles(...)`. POST é `@Roles(DOCTOR)`; demais `@Roles(ADMIN, DOCTOR)`. O own-resource (DOCTOR só própria consulta) é validado no use-case.

---

## Dependências
- `IMedicationsRepository` (exportado por `MedicationsModule`).
- `IAppointmentsRepository`, `IDoctorsRepository`, `IPatientsRepository` (mesmo padrão de injeção cross-module de `create-medical-record.use-case.ts`).
- Dados da clínica (nome/endereço/logo): reutilizar o repositório/use-case existente do módulo `clinics` (importar `ClinicsModule`).
- `CacheService` (existente).

---

## Decisões técnicas da task
- **Snapshot:** denormalizado em `jsonb`; coluna `snapshot` tipada como `PrescriptionSnapshot`.
- **Transação:** não (apenas leituras + 1 insert).
- **Cache:** `prescriptions:appointment:${appointmentId}` (TTL 60s); invalidar em create/delete.
- **Soft delete:** `@DeleteDateColumn deleted_at`.
- **Colunas union (`string | null` / `Date | null`):** `type` explícito.
- **Sem `@VersionColumn`** — imutável.

---

## Restrições
- NÃO criar endpoint de update — receita é imutável.
- NÃO acessar repository direto do controller.
- NÃO retornar a entidade crua — mapear para `PrescriptionResponseDto`.
- NÃO persistir PDF nem nada além do snapshot JSON.
- NÃO usar `process.env` fora de `env.config.ts`.
- NÃO esquecer o isolamento por `clinicId` em toda query.

---

## Estrutura esperada

```
modules/prescriptions/
  controllers/
    prescriptions.controller.ts
    prescriptions.controller.spec.ts
  use-cases/
    create-prescription.use-case.ts
    find-prescriptions-by-appointment.use-case.ts
    find-prescription-by-id.use-case.ts
    delete-prescription.use-case.ts
  repositories/
    prescriptions.repository.interface.ts
    prescriptions.repository.ts
    prescriptions.repository.spec.ts
  entities/
    prescription.entity.ts
  dto/
    prescription-list-query.dto.ts
  tests/
    create-prescription.use-case.spec.ts
    find-prescriptions-by-appointment.use-case.spec.ts
    find-prescription-by-id.use-case.spec.ts
    delete-prescription.use-case.spec.ts
    prescriptions.integration.spec.ts
  prescriptions.module.ts

packages/shared/src/types/
  prescription-snapshot.type.ts
packages/shared/src/dtos/
  create-prescription.dto.ts
  prescription-response.dto.ts
```

---

## Migration

`1752000000000-create-prescriptions-table.ts` (padrão `SET search_path TO "${schema}", public`):

```sql
CREATE TABLE "prescriptions" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id"      uuid        NOT NULL,
  "appointment_id" uuid        NOT NULL,
  "patient_id"     uuid        NOT NULL,
  "doctor_id"      uuid        NOT NULL,
  "snapshot"       jsonb       NOT NULL,
  "issued_at"      timestamptz NOT NULL DEFAULT now(),
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "updated_at"     timestamptz NOT NULL DEFAULT now(),
  "deleted_at"     timestamptz NULL
);
CREATE INDEX "IDX_prescriptions_appointment_id" ON "prescriptions" ("appointment_id");
CREATE INDEX "IDX_prescriptions_patient_id" ON "prescriptions" ("patient_id");
```

`down`: dropar índices e tabela.

---

## Cenários de teste adicionais
- POST como DOCTOR na própria consulta → `201`; snapshot com clínica/médico/paciente/itens denormalizados; `notes` preservada.
- POST como DOCTOR em consulta de outro médico → `403`.
- POST como ADMIN/USER → `403` (role).
- POST em consulta cancelada → `422`.
- POST com `items: []` → `400`.
- POST com `medicationId` inexistente → `422`.
- POST com campo extra (whitelist) → `400`.
- GET por consulta como ADMIN → todas; como DOCTOR próprio → as suas; como DOCTOR de outra consulta → `403`; como USER → `403`.
- GET/DELETE por id inexistente → `404`.
- DELETE como DOCTOR próprio → `204` (soft delete; some das queries); reemitir cria nova receita.
- Sem token → `401`.
- Cache invalidado após create/delete.

---

## Definition of Done
- [ ] `PrescriptionSnapshot` + DTOs no `@app/shared` exportados via `index.ts`
- [ ] Endpoints POST (DOCTOR), GET (lista por consulta), GET por id, DELETE com permissões corretas
- [ ] Own-resource (DOCTOR só própria consulta) validado no use-case
- [ ] Snapshot denormalizado construído a partir de medicamentos + clínica + médico + paciente
- [ ] Bloqueio de emissão em consulta cancelada (`422`)
- [ ] Migration criada e executada
- [ ] Cache `prescriptions:appointment:*` aplicado e invalidado após mutations
- [ ] Soft delete; sem endpoint de update (imutável)
- [ ] Testes unitários (100%) de use-cases, repository e controller
- [ ] Testes de integração cobrindo os cenários acima
- [ ] `PrescriptionsModule` registrado em `app.module.ts`; importa `MedicationsModule`/`AppointmentsModule`/`DoctorsModule`/`PatientsModule`/`ClinicsModule`/`CacheModule`; exporta `FindPrescriptionByIdUseCase` (para a task de PDF)
- [ ] Naming convention e estrutura de pastas seguidas
