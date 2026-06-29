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
# Task — Módulo de Receitas (Backend / CRUD + Snapshot)

## Descrição
Implementar o módulo `prescriptions`: emissão de **receitas médicas** vinculadas a uma consulta, com **snapshot imutável** em JSON. O médico emite a receita escolhendo medicamentos da base canônica (`medications`), com posologia por item e uma observação geral. Esta task cobre o CRUD (emitir / listar por consulta / ver / excluir) e a construção do snapshot. A **geração do PDF** é a task seguinte (`gerar-pdf-da-receita`).

---

## Contexto
- Continuação do módulo `medications` (base canônica, já existente e exportando `IMedicationsRepository`).
- Recurso **escopado por clínica** (`clinic_id`) — isolamento multi-tenant, como `medical-records`.
- Modelo **1:N**: uma consulta pode ter **várias** receitas. Cada receita é um **snapshot imutável** — não há edição; corrigir é excluir (soft delete) e reemitir.
- O snapshot **denormaliza** clínica (nome/endereço/logo), médico (nome/CRM/especialidade), paciente (nome/CPF) e itens (nome/princípio ativo/posologia). Segue a filosofia do `templateSchemaSnapshot` de `medical-records`.
- Só o **DOCTOR** emite (assina com o próprio CRM), e somente na **própria consulta**. ADMIN não emite, mas lê/exclui.
- Cache de leitura por `appointmentId`.

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
- `appointmentId: string` (uuid, obrigatório)

### Output

**PrescriptionItemResponseDto:** `medicationId: string | null`, `name: string`, `activeIngredient: string | null`, `instructions: string`

**PrescriptionResponseDto:** `id`, `appointmentId`, `patientId`, `patientName`, `doctorId`, `doctorName`, `issuedAt: Date`, `items: PrescriptionItemResponseDto[]`, `notes: string | null`, `createdAt: Date`

---

## Types e DTOs compartilhados (`packages/shared`)
- `src/types/prescription-snapshot.type.ts` → `PrescriptionSnapshot`:
```ts
export interface PrescriptionSnapshot {
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
  items: Array<{
    medicationId: string | null
    name: string
    activeIngredient: string | null
    instructions: string
  }>
  notes: string | null
}
```
- `src/dtos/create-prescription.dto.ts` (com `CreatePrescriptionItemDto`), `prescription-response.dto.ts` (com `PrescriptionItemResponseDto`).
- `PrescriptionListQueryDto` em `modules/prescriptions/dto/`.
- Exportar via `index.ts` (nunca importar de subpasta direto).

---

## Assinaturas esperadas

**Use-cases (classes, `@Injectable`, `extends BaseUseCase`):**
- `CreatePrescriptionUseCase.execute(dto, currentUser): Promise<PrescriptionResponseDto>`
- `FindPrescriptionsByAppointmentUseCase.execute(appointmentId, currentUser): Promise<PrescriptionResponseDto[]>`
- `FindPrescriptionByIdUseCase.execute(id, currentUser): Promise<PrescriptionResponseDto>`
- `DeletePrescriptionUseCase.execute(id, currentUser): Promise<void>`

> Exportar `FindPrescriptionByIdUseCase` — a task #2 (PDF) precisa carregar a receita com a mesma checagem de acesso. Considere extrair a busca-com-RBAC num use-case/método reutilizável.

**IPrescriptionsRepository:**
- `create(data, queryRunner?): Promise<Prescription>`
- `findByAppointment(appointmentId, clinicId): Promise<Prescription[]>`
- `findById(id, clinicId): Promise<Prescription | null>`
- `delete(id, queryRunner?): Promise<void>` (softDelete)

---

## Fluxo principal

**POST /prescriptions** (DOCTOR)
1. `clinicId = currentUser.clinicId`. Carrega consulta por `appointmentId` + `clinicId` → `NotFoundException`.
2. RBAC own-resource: `doctorsRepository.findByUserId(currentUser.id, clinicId)`; se `doctor.id !== appointment.doctorId` → `ForbiddenException` (espelha `create-medical-record.use-case.ts`).
3. `appointment.status === CANCELLED` → `UnprocessableEntityException`.
4. Carrega medicamentos por `medicationId` (`IMedicationsRepository.findById`); inexistente → `UnprocessableEntityException`. Denormaliza `name`/`activeIngredient`.
5. Carrega clínica (nome/endereço/logo), médico (`user.fullName`, `crmNumber`, especialidade da consulta), paciente (`user.fullName`, `documentNumber`).
6. Monta `PrescriptionSnapshot` (`issuedAt = now`, itens com `instructions`, `notes`).
7. Persiste; invalida `prescriptions:appointment:${appointmentId}`; retorna `201`.
- **Sem transação**.

**GET /prescriptions?appointmentId=** (ADMIN, DOCTOR) — RBAC own (DOCTOR), cache TTL 60s, ordena `issued_at DESC`.

**GET /prescriptions/:id** (ADMIN, DOCTOR) — `findById` → `404`; RBAC own (DOCTOR) → `403`.

**DELETE /prescriptions/:id** (ADMIN, DOCTOR) — `findById` → `404`; RBAC own → `403`; `softDelete`; invalida cache; `204`.

---

## Fluxos alternativos
- Consulta inexistente/de outra clínica → `404`; DOCTOR em consulta alheia → `403`; consulta cancelada → `422`; `items: []` → `400`; `medicationId` inexistente → `422`; receita inexistente → `404`; falha de cache → `warn` + segue.

---

## Regras de negócio
- Receita **imutável** — sem update. Correção = DELETE + novo POST.
- Snapshot é a fonte de verdade do documento.
- DOCTOR só nas próprias consultas; ADMIN lê/exclui qualquer da clínica; USER não acessa. Tudo com `clinicId`.

---

## Permissões

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Emitir (POST) | ✗ | ✓ própria | ✗ | ✗ |
| Listar por consulta | ✓ | ✓ própria | ✗ | ✗ |
| Ver por ID | ✓ | ✓ própria | ✗ | ✗ |
| Excluir | ✓ | ✓ própria | ✗ | ✗ |

POST = `@Roles(DOCTOR)`; demais = `@Roles(ADMIN, DOCTOR)`. Own-resource no use-case.

---

## Dependências
- `IMedicationsRepository` (de `MedicationsModule`).
- `IAppointmentsRepository`, `IDoctorsRepository`, `IPatientsRepository` (padrão cross-module de `create-medical-record.use-case.ts`).
- Repositório/use-case do módulo `clinics` (importar `ClinicsModule`).
- `CacheService`.

---

## Decisões técnicas
- Snapshot denormalizado em `jsonb` (`snapshot: PrescriptionSnapshot`).
- Sem transação; cache `prescriptions:appointment:${id}` TTL 60s; soft delete; colunas union com `type` explícito; sem `@VersionColumn`.

---

## Restrições
- NÃO criar endpoint de update. NÃO repository no controller. NÃO retornar entidade crua. NÃO persistir PDF. NÃO usar `process.env` fora de `env.config.ts`. NÃO esquecer `clinicId`.

---

## Estrutura esperada
```
modules/prescriptions/
  controllers/ prescriptions.controller.ts (+ .spec)
  use-cases/ create-prescription, find-prescriptions-by-appointment, find-prescription-by-id, delete-prescription (.use-case.ts)
  repositories/ prescriptions.repository.interface.ts, prescriptions.repository.ts (+ .spec)
  entities/ prescription.entity.ts
  dto/ prescription-list-query.dto.ts
  tests/ *.use-case.spec.ts, prescriptions.integration.spec.ts
  prescriptions.module.ts
packages/shared/src/types/ prescription-snapshot.type.ts
packages/shared/src/dtos/ create-prescription.dto.ts, prescription-response.dto.ts
```

---

## Migration
`1752000000000-create-prescriptions-table.ts` (padrão `SET search_path TO "${schema}", public`): tabela `prescriptions` (`id`, `clinic_id`, `appointment_id`, `patient_id`, `doctor_id`, `snapshot jsonb`, `issued_at`, `created_at`, `updated_at`, `deleted_at`) + índices em `appointment_id` e `patient_id`. `down` dropa índices e tabela.

---

## Cenários de teste adicionais
- POST DOCTOR própria consulta → `201`, snapshot denormalizado, `notes` preservada.
- POST DOCTOR consulta alheia → `403`; POST ADMIN/USER → `403`; POST consulta cancelada → `422`; `items: []` → `400`; `medicationId` inexistente → `422`; campo extra → `400`.
- GET por consulta: ADMIN todas; DOCTOR próprio; DOCTOR alheio → `403`; USER → `403`.
- GET/DELETE id inexistente → `404`; DELETE DOCTOR próprio → `204`; sem token → `401`; cache invalidado após create/delete.

---

## Definition of Done
- [ ] `PrescriptionSnapshot` + DTOs no `@app/shared` exportados via `index.ts`
- [ ] POST (DOCTOR), GET lista, GET id, DELETE com permissões corretas
- [ ] Own-resource validado no use-case
- [ ] Snapshot denormalizado (medicamentos + clínica + médico + paciente)
- [ ] Bloqueio em consulta cancelada (`422`)
- [ ] Migration criada e executada
- [ ] Cache aplicado e invalidado
- [ ] Soft delete; sem update (imutável)
- [ ] Testes unitários (100%) e integração cobrindo os cenários
- [ ] `PrescriptionsModule` em `app.module.ts`; importa os módulos citados; exporta `FindPrescriptionByIdUseCase`
- [ ] Naming convention e estrutura seguidas
