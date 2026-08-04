# Task — Relacionar pacientes por grau de parentesco: dependente sem CPF (Backend)

## Descrição

Permitir que um paciente seja cadastrado como **dependente** de outro paciente já existente na mesma clínica (o **titular**), com um **grau de parentesco** (`KinshipType`). Quando um paciente está vinculado como dependente, o CPF (`documentNumber`) deixa de ser obrigatório — cobre o caso real de recém-nascidos e menores que ainda não têm documento emitido. Paciente sem vínculo continua exigindo CPF normalmente (nenhuma regressão na regra atual).

Esta task cobre shared (enum, config, DTOs), entidade, migration, repository, use-cases e a correção de null-safety nos módulos que hoje assumem `documentNumber` como string não-nula (receitas, atestados, pedidos de exame, consultas).

---

## Contexto

- `Patient` (`apps/backend/src/modules/patients/entities/patient.entity.ts`): `id, user (ManyToOne User, obrigatório), clinic (ManyToOne Clinic, obrigatório), documentNumber (@Column simples, not-null, sem type explícito), phoneNumber, birthDate (date), gender (PatientGender), version (@VersionColumn), createdAt/updatedAt/deletedAt (soft-delete)`. **Não existe nenhuma relação auto-referenciada em nenhuma entidade do backend hoje** — confirmado via busca por `ManyToOne` apontando para a própria classe. Este será o primeiro caso.
- Migrations da tabela `patients`, em ordem: `1747000000000-create-patients-table.ts` (`document_number char(11) NOT NULL` + índice único parcial `patients_document_number_active_unique` `WHERE deleted_at IS NULL`), `1748200000000-link-patients-to-users.ts` (adiciona `user_id`), `1749300000002-add-clinic-id-to-patients.ts` (adiciona `clinic_id NOT NULL` + **substitui** o índice por `patients_document_number_clinic_active_unique` em `(document_number, clinic_id) WHERE deleted_at IS NULL` — este é o índice vigente hoje, referenciado em código como `DB_UNIQUE_CONSTRAINTS.PATIENTS_DOCUMENT` em `apps/backend/src/common/utils/db-constraint.utils.ts:6`), `1751200000000-add-patient-user-lookup-indexes.ts` (índices de performance, irrelevante aqui). O Postgres trata múltiplos `NULL` como distintos num índice único — logo tornar `document_number` nullable **não exige mudança no índice existente**.
- `CreatePatientDto` (`packages/shared/src/dtos/create-patient.dto.ts`): `documentNumber` é `@IsString() @Matches(/^\d{11}$/) documentNumber!: string` — obrigatório, sem `@IsOptional`. O mesmo arquivo já tem o precedente exato de campo condicional: `@ValidateIf(o => !o.userId) fullName?`/`email?` (obrigatórios só quando não se está vinculando um usuário existente).
- `UpdatePatientDto` (`packages/shared/src/dtos/update-patient.dto.ts`): **não tem campo `documentNumber`** — CPF é imutável após criação hoje.
- `PatientResponseDto` (`packages/shared/src/dtos/patient-response.dto.ts`): `documentNumber!: string` (obrigatório).
- `IPatientsRepository`/`PatientsRepository` (`apps/backend/src/modules/patients/repositories/`): tem `findByDocumentNumber(documentNumber, clinicId)`, usado em `create-patient.use-case.ts` para checar duplicidade antes do insert (`ConflictException` se encontrar) — essa checagem precisa ser **pulada** quando `documentNumber` não vier preenchido.
- `PatientsController` (`apps/backend/src/modules/patients/controllers/patients.controller.ts`): `POST`/`PATCH`/`DELETE` restritos a `@Roles(UserRole.ADMIN)`; `GET` (lista e por id) liberado para `ADMIN, USER, PROFESSIONAL` (leitura) — confirma exatamente `ai/context/permissions.md`, seção "Pacientes (`/patients`)". **Nenhuma mudança de RBAC nesta task.**
- Padrão de enum+config a espelhar (`packages/shared/src/enums/council-type.enum.ts` + `packages/shared/src/config/council-type-label.config.ts`): enum simples de string, config `Record<Enum, string>` separado, ambos exportados nos respectivos `index.ts`.
- **Risco crítico identificado na investigação** — os seguintes pontos assumem `documentNumber` sempre como string de 11 dígitos e vão lançar `TypeError` em `.replace()` se o valor for `null`/`undefined`:
  - `apps/backend/src/modules/prescriptions/services/prescription-mask.util.ts` (`maskCpf`) — usado por `verify-prescription.use-case.ts` no endpoint **público** `GET /prescriptions/verify/:token` (`ai/context/permissions.md`, seção "Verificação Pública de Receita").
  - `apps/backend/src/modules/prescriptions/services/prescription-pdf-builder.service.ts` (`formatCpf`, usado em `buildPatientBlock`).
  - `apps/backend/src/modules/exams/services/exam-request-pdf-builder.service.ts` (`formatCpf`, mesmo padrão duplicado).
  - `apps/backend/src/modules/medical-certificates/services/medical-certificate-pdf-builder.service.ts` (`formatCpf`, mesmo padrão duplicado).
  - Os tipos de snapshot `packages/shared/src/types/prescription-snapshot.type.ts`, `medical-certificate-snapshot.type.ts`, `exam-request-snapshot.type.ts` tipam `patient: { name: string; documentNumber: string }` como obrigatório — usados nos respectivos `create-*-use-case.ts`, que já fazem `documentNumber: patient.documentNumber` (não precisam de mudança de lógica, só o tipo acompanha).
  - `packages/shared/src/dtos/appointment-patient.dto.ts` (`documentNumber: string`), usado por `apps/backend/src/modules/appointments/use-cases/find-appointment-by-id.use-case.ts` (`fetchPatientDetails`, query raw que já retorna `null` naturalmente do Postgres — só o tipo local e o DTO precisam acompanhar) e exibido em `apps/frontend/components/features/appointments/components/patient-info-card.tsx` (o `formatCpf` do frontend já trata falsy com segurança, então não crasha — é correção de tipo, não de lógica).

**Decisões de shape (confirmadas com o usuário):**
- Titular sempre é outro `Patient` da mesma clínica (nunca texto livre).
- CPF obrigatório por padrão; opcional apenas quando `responsiblePatientId` está setado.
- Um único nível: dependente não pode ter dependentes; titular não pode ele mesmo ser dependente.

---

## Novo enum e config compartilhados (`packages/shared`)

### `src/enums/kinship-type.enum.ts` (novo)
```ts
export enum KinshipType {
  FILHO = 'filho',
  CONJUGE = 'conjuge',
  PAI = 'pai',
  MAE = 'mae',
  NETO = 'neto',
  TUTELADO = 'tutelado',
  OUTRO = 'outro',
}
```
Exportar em `src/enums/index.ts`.

### `src/config/kinship-type-label.config.ts` (novo)
```ts
import { KinshipType } from '../enums/kinship-type.enum'

export const KINSHIP_TYPE_LABELS: Record<KinshipType, string> = {
  [KinshipType.FILHO]: 'Filho(a)',
  [KinshipType.CONJUGE]: 'Cônjuge',
  [KinshipType.PAI]: 'Pai',
  [KinshipType.MAE]: 'Mãe',
  [KinshipType.NETO]: 'Neto(a)',
  [KinshipType.TUTELADO]: 'Tutelado(a)',
  [KinshipType.OUTRO]: 'Outro',
}
```
Exportar em `src/config/index.ts`.

---

## DTOs compartilhados

### `dtos/create-patient.dto.ts` — diff
```ts
@ValidateIf(o => !o.responsiblePatientId)
@IsString()
@Matches(/^\d{11}$/, { message: 'documentNumber must be exactly 11 digits' })
documentNumber?: string          // era: @IsString() ... documentNumber!: string

@IsOptional()
@IsUUID()
responsiblePatientId?: string

@ValidateIf(o => !!o.responsiblePatientId)
@IsEnum(KinshipType)
kinshipType?: KinshipType
```
Mesmo padrão de `@ValidateIf` já usado neste arquivo para `fullName`/`email` (condicionados a `!o.userId`).

### `dtos/update-patient.dto.ts` — adições
```ts
@IsOptional()
@IsString()
@Matches(/^\d{11}$/, { message: 'documentNumber must be exactly 11 digits' })
documentNumber?: string

@IsOptional()
@IsUUID()
responsiblePatientId?: string | null   // null explícito = remover o vínculo (promover a independente)

@IsOptional()
@IsEnum(KinshipType)
kinshipType?: KinshipType | null
```
`@IsOptional()` do class-validator deixa passar tanto `undefined` (campo não enviado) quanto `null` (campo enviado explicitamente como nulo) — é assim que o use-case distingue "não mexer no vínculo" de "quero limpar o vínculo".

### `dtos/patient-response.dto.ts` — novo shape
```ts
export class PatientResponsibleRefDto {
  id!: string
  fullName!: string
  documentNumber!: string | null
}

export class PatientDependentRefDto {
  id!: string
  fullName!: string
  kinshipType!: KinshipType
}

export class PatientResponseDto {
  id!: string
  user!: PatientUserDto
  documentNumber!: string | null          // era: string
  phoneNumber!: string
  birthDate!: string
  gender!: PatientGender
  responsiblePatientId!: string | null
  kinshipType!: KinshipType | null
  responsiblePatient!: PatientResponsibleRefDto | null   // populado quando ESTE paciente é dependente
  dependents!: PatientDependentRefDto[]                  // populado quando ESTE paciente é titular (senão [])
  createdAt!: Date
  updatedAt!: Date
}
```

### Null-safety (só tipo, sem mudança de lógica)
- `types/prescription-snapshot.type.ts`, `types/medical-certificate-snapshot.type.ts`, `types/exam-request-snapshot.type.ts` → `patient.documentNumber: string | null`.
- `dtos/appointment-patient.dto.ts` → `documentNumber: string | null`.

Exportar todos os novos arquivos/tipos nos respectivos `index.ts`.

---

## Entidades (backend)

### `Patient` — diff em `apps/backend/src/modules/patients/entities/patient.entity.ts`
```ts
@Column({ name: 'document_number', type: 'char', length: 11, nullable: true })
documentNumber: string | null          // era: @Column({ name: 'document_number' }) documentNumber: string

@ManyToOne(() => Patient, { eager: false, nullable: true, onDelete: 'RESTRICT' })
@JoinColumn({ name: 'responsible_patient_id' })
responsiblePatient: Patient | null

@Column({ name: 'responsible_patient_id', type: 'uuid', nullable: true })
responsiblePatientId: string | null

@Column({ name: 'kinship_type', type: 'varchar', length: 20, nullable: true })
kinshipType: KinshipType | null
```
Por ser a primeira relação auto-referenciada do projeto: usar a mesma sintaxe de forward-reference (`() => Patient`) já usada para relações entre entidades diferentes — o TypeORM suporta nativamente. Por conta da regra de union-type do `ai/context/backend.md` (toda coluna nullable com tipo TS union precisa de `type:` explícito, senão o TypeORM infere `"Object"` e quebra o boot), todos os três campos acima já declaram `type:` (`char`, `uuid`, `varchar`).

`onDelete: 'RESTRICT'` é defesa em profundidade — como `Patient` usa soft-delete (`@DeleteDateColumn`), um `softDelete()` nunca aciona a constraint de FK de verdade. A proteção real contra excluir um titular com dependentes ativos é em `DeletePatientUseCase` (ver abaixo).

---

## Migrations

Uma única migration nova, `apps/backend/src/database/migrations/<ts>-add-kinship-to-patients.ts`, seguindo o estilo de SQL à mão + `SET search_path` + `up`/`down` reversível já usado em `1749300000002-add-clinic-id-to-patients.ts`:

```sql
-- up()
ALTER TABLE "patients" ALTER COLUMN "document_number" DROP NOT NULL;

ALTER TABLE "patients"
  ADD COLUMN "responsible_patient_id" UUID NULL
  REFERENCES "patients"("id") ON DELETE RESTRICT;

ALTER TABLE "patients" ADD COLUMN "kinship_type" VARCHAR(20) NULL;

CREATE INDEX "patients_responsible_patient_id_active_idx"
  ON "patients" ("responsible_patient_id")
  WHERE "deleted_at" IS NULL;

ALTER TABLE "patients" ADD CONSTRAINT "patients_kinship_requires_responsible_chk"
  CHECK (
    ("responsible_patient_id" IS NULL AND "kinship_type" IS NULL)
    OR
    ("responsible_patient_id" IS NOT NULL AND "kinship_type" IS NOT NULL)
  );
```
```sql
-- down()
ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "patients_kinship_requires_responsible_chk";
DROP INDEX IF EXISTS "patients_responsible_patient_id_active_idx";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "kinship_type";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "responsible_patient_id";
-- Não restaurar NOT NULL em document_number aqui: uma vez que existam dependentes sem CPF em
-- produção, restaurar NOT NULL sem uma estratégia de backfill quebraria dados reais. Deixar
-- comentado no down() explicando essa decisão em vez de tentar reverter automaticamente.
```

Sem mudança no índice único parcial existente (`patients_document_number_clinic_active_unique`) e sem mudança em `DB_UNIQUE_CONSTRAINTS` (`apps/backend/src/common/utils/db-constraint.utils.ts`) — nenhuma unique constraint nova é criada.

Testar localmente com `yarn workspace @app/backend migration:run` seguido de `yarn workspace @app/backend migration:revert` antes do merge.

---

## Módulo, repository e use-cases

### Repository — `patients.repository.interface.ts` + `patients.repository.ts`
```ts
export interface CreatePatientData {
  // ...campos existentes...
  documentNumber: string | null          // era: string
  responsiblePatientId?: string | null
  kinshipType?: KinshipType | null
}

export interface UpdatePatientData {
  // ...campos existentes...
  documentNumber?: string | null
  responsiblePatientId?: string | null
  kinshipType?: KinshipType | null
}

export abstract class IPatientsRepository {
  // ...métodos existentes...
  abstract findActiveDependents(responsiblePatientId: string, clinicId: string): Promise<Patient[]>
}
```
- `findActiveDependents(responsiblePatientId, clinicId)`: `createQueryBuilder('patient').innerJoinAndSelect('patient.user', 'user').where('patient.responsible_patient_id = :responsiblePatientId', { responsiblePatientId }).andWhere('patient.clinic_id = :clinicId', { clinicId }).getMany()` — usado por `DeletePatientUseCase` (bloquear exclusão) e `UpdatePatientUseCase` (bloquear "virar dependente" quando já tem dependentes próprios).
- `findAll`/`findById`: mantêm a query principal igual (`innerJoinAndSelect('patient.user', 'user')`); depois de buscar a página, fazer batch-load das referências cruzadas:
  - refs de titular: `SELECT p.id, p.document_number, u.full_name FROM patients p INNER JOIN users u ON u.id = p.user_id WHERE p.id IN (:...responsibleIds) AND p.deleted_at IS NULL`, a partir dos `responsiblePatientId` distintos não-nulos da página atual.
  - refs de dependentes: `SELECT p.id, p.responsible_patient_id, p.kinship_type, u.full_name FROM patients p INNER JOIN users u ON u.id = p.user_id WHERE p.responsible_patient_id IN (:...pageIds) AND p.deleted_at IS NULL`, agrupado em memória por `responsible_patient_id`.
  - Sem N+1: uma query extra por direção, não uma por linha.
- `findByDocumentNumber`: assinatura inalterada — quem chama precisa garantir que só é chamado quando `documentNumber` está presente (ver use-cases).
- `list-patients-query.dto.ts`: novo parâmetro opcional `excludeDependents?: boolean` (mesmo padrão de `@IsOptional()` já usado nos demais filtros de paginação) — repassado ao repository como `.andWhere('patient.responsible_patient_id IS NULL')` quando `true`. É o parâmetro que o frontend usa para restringir a busca de titular a pacientes que ainda não são dependentes de ninguém.

### `create-patient.use-case.ts`
```ts
const existingDocument = dto.documentNumber
  ? await this.patientsRepository.findByDocumentNumber(dto.documentNumber, clinicId)
  : null
if (existingDocument) throw new ConflictException('Patient with this document number already exists')

let responsiblePatient: Patient | null = null
if (dto.responsiblePatientId) {
  responsiblePatient = await this.patientsRepository.findById(dto.responsiblePatientId, clinicId)
  if (!responsiblePatient) throw new NotFoundException('Responsible patient not found')
  if (responsiblePatient.responsiblePatientId) {
    throw new UnprocessableEntityException('The responsible patient cannot itself be a dependent')
  }
}
```
- Dados passados ao repository ganham `documentNumber: dto.documentNumber ?? null`, `responsiblePatientId: dto.responsiblePatientId ?? null`, `kinshipType: dto.kinshipType ?? null`.
- `toResponse`: adiciona `responsiblePatientId`, `kinshipType`, `responsiblePatient` (montado a partir do `responsiblePatient` já buscado: `{ id, fullName: responsiblePatient.user.fullName, documentNumber: responsiblePatient.documentNumber }`, ou `null`), `dependents: []` (paciente recém-criado nunca tem dependentes ainda).
- Exceções conforme a tabela de `ai/context/backend.md`: titular não encontrado → `NotFoundException`; titular que já é dependente → `UnprocessableEntityException` (regra de negócio).

### `update-patient.use-case.ts`
Após carregar `patient`, adicionar:
```ts
const settingDocumentNumber = dto.documentNumber !== undefined
const changingResponsible = dto.responsiblePatientId !== undefined   // inclui null explícito

if (changingResponsible) {
  if (dto.responsiblePatientId === null) {
    const resultingDoc = dto.documentNumber ?? patient.documentNumber
    if (!resultingDoc) {
      throw new UnprocessableEntityException('documentNumber is required to remove the responsible patient link')
    }
  } else {
    if (dto.responsiblePatientId === id) {
      throw new UnprocessableEntityException('A patient cannot be their own responsible patient')
    }
    const responsible = await this.patientsRepository.findById(dto.responsiblePatientId, clinicId)
    if (!responsible) throw new NotFoundException('Responsible patient not found')
    if (responsible.responsiblePatientId) {
      throw new UnprocessableEntityException('The responsible patient cannot itself be a dependent')
    }
    if (!dto.kinshipType) {
      throw new UnprocessableEntityException('kinshipType is required when setting responsiblePatientId')
    }
    const ownDependents = await this.patientsRepository.findActiveDependents(id, clinicId)
    if (ownDependents.length > 0) {
      throw new ConflictException('Cannot link a patient that already has its own dependents as someone else\'s dependent')
    }
  }
}
```
- Se `settingDocumentNumber`: mesma checagem de duplicidade de CPF do create (`findByDocumentNumber` + `ConflictException`).
- Dados passados ao repository: `documentNumber` (quando informado), `responsiblePatientId` (`null` explícito ao limpar, ou o novo valor), `kinshipType` (forçar `null` junto quando `responsiblePatientId` for `null`).
- Invalidação de cache: além do já existente (`patient:${clinicId}:${id}` + listas), invalidar também `patient:${clinicId}:${patient.responsiblePatientId}` (titular antigo, se havia) e `patient:${clinicId}:${dto.responsiblePatientId}` (titular novo, se mudou) — os `dependents[]` cacheados deles ficam desatualizados. Mesmo bloco `try/catch` best-effort já usado no projeto.
- `toResponse`: mesmos campos novos do create.

### `delete-patient.use-case.ts`
```ts
const activeDependents = await this.patientsRepository.findActiveDependents(id, clinicId)
if (activeDependents.length > 0) {
  throw new ConflictException('Cannot delete a patient that is the responsible party for active dependents')
}
```
Inserido logo após as checagens existentes (`NotFoundException`/`ForbiddenException`), antes da transação.

### `find-patient-by-id.use-case.ts` / `list-patients.use-case.ts`
`toResponse` em ambos ganha os mesmos campos novos (`documentNumber` agora nullable, `responsiblePatientId`, `kinshipType`, `responsiblePatient`, `dependents`), usando as refs batch-loaded pelo repository.

---

## Correção de null-safety (evitar `TypeError` em produção)

### `prescriptions/services/prescription-mask.util.ts`
```ts
export function maskCpf(cpf: string | null): string {
  if (!cpf) return 'Não informado'
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return '***'
  return `***.***.${digits.slice(6, 9)}-**`
}
```

### 3 PDF builders (mesmo guard, cada um no seu método `formatCpf` privado)
- `prescriptions/services/prescription-pdf-builder.service.ts`
- `exams/services/exam-request-pdf-builder.service.ts`
- `medical-certificates/services/medical-certificate-pdf-builder.service.ts`
```ts
private formatCpf(cpf: string | null): string {
  if (!cpf) return 'Não informado'
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}
```
(Duplicação mantida de propósito — já é o padrão existente entre os três builders; extrair para um util compartilhado fica como follow-up opcional, fora do escopo desta task.)

### `appointments/use-cases/find-appointment-by-id.use-case.ts`
Atualizar o tipo local da linha retornada pela query raw (`fetchPatientDetails`) para `documentNumber: string | null` — sem mudança funcional, a query já retorna `null` naturalmente do Postgres.

### `create-prescription.use-case.ts` / `create-exam-request.use-case.ts` / `create-medical-certificate.use-case.ts`
Nenhuma mudança de código — já fazem `documentNumber: patient.documentNumber`, que passa a ser `string | null` automaticamente com a entidade e os tipos de snapshot atualizados.

---

## Regras de negócio

- CPF obrigatório por padrão; opcional apenas quando o paciente tem `responsiblePatientId` setado.
- Titular precisa existir, pertencer à mesma clínica, e **não pode ele mesmo ser um dependente** (`UnprocessableEntityException`).
- Um paciente não pode ser titular de si mesmo (`UnprocessableEntityException`).
- Um paciente que já tem dependentes ativos não pode ser vinculado como dependente de outro (`ConflictException`) — mantém a regra de um único nível.
- Remover o vínculo (`responsiblePatientId: null`) exige que o paciente já tenha ou esteja recebendo um `documentNumber` no mesmo request (`UnprocessableEntityException` caso contrário).
- Excluir um titular com dependentes ativos é bloqueado (`ConflictException`).
- Vínculo (criar/editar/remover) é ação exclusiva de ADMIN — nenhuma mudança de RBAC, apenas reafirma a regra já existente em `/patients`.

---

## Estrutura de arquivos

```
packages/shared/src/enums/
  kinship-type.enum.ts                    ← NOVO
  index.ts                                ← + KinshipType
packages/shared/src/config/
  kinship-type-label.config.ts            ← NOVO
  index.ts                                ← + KINSHIP_TYPE_LABELS
packages/shared/src/dtos/
  create-patient.dto.ts                   ← documentNumber opcional + responsiblePatientId + kinshipType
  update-patient.dto.ts                   ← + documentNumber, responsiblePatientId, kinshipType
  patient-response.dto.ts                 ← + PatientResponsibleRefDto, PatientDependentRefDto, novos campos
  appointment-patient.dto.ts              ← documentNumber: string | null
packages/shared/src/types/
  prescription-snapshot.type.ts           ← patient.documentNumber: string | null
  medical-certificate-snapshot.type.ts    ← idem
  exam-request-snapshot.type.ts           ← idem

apps/backend/src/modules/patients/
  entities/patient.entity.ts              ← documentNumber nullable + responsiblePatient(Id) + kinshipType
  repositories/patients.repository.interface.ts  ← + findActiveDependents, campos opcionais
  repositories/patients.repository.ts     ← + findActiveDependents, batch-load de refs, excludeDependents
  dto/list-patients-query.dto.ts          ← + excludeDependents
  use-cases/create-patient.use-case.ts    ← validação de titular + toResponse
  use-cases/update-patient.use-case.ts    ← validação de vínculo + toResponse
  use-cases/delete-patient.use-case.ts    ← bloqueio de exclusão com dependentes
  use-cases/find-patient-by-id.use-case.ts ← toResponse
  use-cases/list-patients.use-case.ts     ← toResponse
  tests/*.spec.ts                         ← cobertura dos cenários abaixo

apps/backend/src/modules/prescriptions/services/prescription-mask.util.ts       ← guard null
apps/backend/src/modules/prescriptions/services/prescription-pdf-builder.service.ts ← guard null
apps/backend/src/modules/exams/services/exam-request-pdf-builder.service.ts     ← guard null
apps/backend/src/modules/medical-certificates/services/medical-certificate-pdf-builder.service.ts ← guard null
apps/backend/src/modules/appointments/use-cases/find-appointment-by-id.use-case.ts ← tipo nullable

apps/backend/src/database/migrations/
  <ts>-add-kinship-to-patients.ts         ← NOVO
```

---

## Cenários de teste

- Criar paciente dependente sem CPF (com `responsiblePatientId` + `kinshipType` válidos) → sucesso, `documentNumber: null`.
- Criar paciente independente sem CPF (sem `responsiblePatientId`) → falha de validação (422), comportamento atual preservado.
- Criar dependente com `responsiblePatientId` inexistente → `NotFoundException`.
- Criar dependente vinculado a um titular que já é dependente de outro → `UnprocessableEntityException`.
- Editar paciente definindo `documentNumber` e `responsiblePatientId: null` → promove a independente com sucesso.
- Editar paciente definindo `responsiblePatientId: null` sem CPF (nem no request, nem já existente) → `UnprocessableEntityException`.
- Editar paciente tentando se vincular a si mesmo → `UnprocessableEntityException`.
- Editar paciente vinculando-o como dependente de alguém, mas ele já tem dependentes próprios ativos → `ConflictException`.
- Excluir um titular com dependentes ativos → `ConflictException`; excluir um titular sem dependentes → sucesso normal.
- `findActiveDependents`: retorna só dependentes ativos (soft-deletados não entram) da mesma clínica.
- `findAll`/`findById`: `toResponse` traz `responsiblePatient`/`dependents` corretamente populados, sem N+1 (uma query extra por direção, não por linha).
- `maskCpf`/`formatCpf` (nos 3 builders): `null` → `'Não informado'`/`'***'`; CPF válido → comportamento inalterado.
- Teste de integração ponta a ponta: paciente dependente sem CPF passa por consulta → emissão de receita/atestado/pedido de exame → PDF gerado sem erro, mostrando "Não informado"; `GET /prescriptions/verify/:token` retorna sem 500, mostrando o CPF mascarado como indisponível.
- Migration: `migration:run` aplica sem erro (constraint `CHECK`, índice, coluna nullable); `migration:revert` reverte sem perda de dados pré-existentes.

---

## Definition of Done

- [ ] `KinshipType` + `KINSHIP_TYPE_LABELS` criados e exportados em `@app/shared`
- [ ] `CreatePatientDto`/`UpdatePatientDto`/`PatientResponseDto` atualizados conforme especificado
- [ ] Tipos de snapshot (prescrição/atestado/exame) e `AppointmentPatientDto` com `documentNumber: string | null`
- [ ] Entidade `Patient` com `responsiblePatient`/`responsiblePatientId`/`kinshipType`, `documentNumber` nullable
- [ ] Migration criada, testada com `migration:run` + `migration:revert` locais
- [ ] Repository com `findActiveDependents`, batch-load de refs, filtro `excludeDependents`
- [ ] 5 use-cases de paciente atualizados com as regras de negócio e exceções especificadas
- [ ] Null-safety corrigida em `prescription-mask.util.ts` + 3 PDF builders + `find-appointment-by-id.use-case.ts`
- [ ] Testes unitários 100% + integração cobrindo todos os cenários acima
- [ ] Build e lint sem erros
- [ ] `ai/context/permissions.md` com nota de que o vínculo segue a regra ADMIN-only já existente em `/patients`
- [ ] `apps/backend/CHANGELOG.md` atualizado
