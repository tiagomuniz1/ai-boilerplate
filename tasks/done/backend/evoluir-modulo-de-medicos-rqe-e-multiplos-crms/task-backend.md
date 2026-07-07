# Task — Evoluir Módulo de Médicos: RQE por especialidade + múltiplos CRMs (Backend)

## Descrição

Duas evoluções no cadastro do médico, feitas juntas por tocarem os mesmos arquivos:

- **A) Múltiplos CRMs** — `Doctor.crmNumber: string` vira uma coleção **`DoctorCrm`** `{ number, state, isPrimary }` (`@OneToMany`). Um médico pode ter vários CRMs; um é o **principal** (usado nos documentos). Snapshot dos documentos continua com um `crmNumber: string` único, derivado do principal.
- **B) RQE por especialidade** — a relação `Doctor` ↔ `Specialty` (hoje `@ManyToMany` puro) vira uma **entidade de junção `DoctorSpecialty`** com coluna `rqe` (opcional, só números, guardado como string). Padrão do precedente `ClinicSpecialty`.

---

## Contexto

- `Doctor.crmNumber` (`modules/doctors/entities/doctor.entity.ts`), formato `NNNNN/UF`, com índice único **parcial** `doctors_crm_number_clinic_active_unique` em `(crm_number, clinic_id) WHERE deleted_at IS NULL` (migration `1749300000001`). Soft-delete do médico libera o CRM.
- `findByCrmNumber(crmNumber, clinicId)` no repository; conflito checado no create/update; constante `DB_UNIQUE_CONSTRAINTS.DOCTORS_CRM` em `common/utils/db-constraint.utils.ts`.
- Documentos: `create-prescription`, `create-medical-certificate`, `create-exam-request` gravam `snapshot.doctor.crmNumber` (string). Os tipos de snapshot (`packages/shared/src/types/*-snapshot.type.ts`) têm `doctor: { name, crmNumber, specialtyName }`. PDF builders e `verify-prescription.use-case` leem `crmNumber` string.
- `Doctor.specialties` `@ManyToMany` com `@JoinTable('doctor_specialties')`; use-cases resolvem `specialtyIds` em `Specialty[]`. Consumidores casam a especialidade da consulta por `doctor.specialties.find((s) => s.id === appointment.specialtyId)` em prescription/certificate/exam e `resolveSpecialty(doctor.specialties, dto.specialtyId)` em `create-appointment`. `SpecialtiesRepository.countLinkedDoctors` faz `innerJoin('doctor.specialties', 'specialty')`.
- Migrations setam `search_path` a partir de `connection.options.schema` (schema-per-tenant); tabelas novas usam `uuid_generate_v4()` e `TIMESTAMPTZ`.

**Decisões de shape:**
- `DoctorSpecialtyDto.id` continua sendo o **id da especialidade** (não da linha de junção) → mantém consumidores internos e frontend compatíveis; só adiciona `rqe`.
- **Snapshot dos documentos NÃO muda** (`crmNumber: string`), apenas passa a ser derivado do CRM principal → PDF builders e verificação pública ficam intactos.

---

## PARTE A — Múltiplos CRMs

### A1. Shared — DTOs

**`create-doctor.dto.ts`** — remover `crmNumber` e adicionar coleção:
```ts
export class DoctorCrmInputDto {
  @Matches(/^\d{1,6}$/, { message: 'Número do CRM deve conter apenas dígitos' })
  number!: string

  @Matches(/^[A-Z]{2}$/, { message: 'UF inválida' })
  state!: string

  @IsBoolean()
  isPrimary!: boolean
}

// em CreateDoctorDto:
@IsArray()
@ArrayMinSize(1)
@ValidateNested({ each: true })
@Type(() => DoctorCrmInputDto)
crms!: DoctorCrmInputDto[]      // antes: crmNumber: string
```

**`update-doctor.dto.ts`** — `@IsOptional() crms?: DoctorCrmInputDto[]` (reutilizar `DoctorCrmInputDto`).

**`doctor-response.dto.ts`** — trocar `crmNumber` por:
```ts
export class DoctorCrmDto { id!: string; number!: string; state!: string; isPrimary!: boolean }
// DoctorResponseDto.crms!: DoctorCrmDto[]   (remover crmNumber)
```

> Snapshot types (`*-snapshot.type.ts`) permanecem com `doctor.crmNumber: string` — **não alterar**.

### A2. Entidade `DoctorCrm`

`modules/doctors/entities/doctor-crm.entity.ts`:
```ts
@Entity('doctor_crms')
export class DoctorCrm {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ name: 'doctor_id', type: 'uuid' }) doctorId: string
  @ManyToOne(() => Doctor, (d) => d.crms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' }) doctor: Doctor
  @Column({ name: 'clinic_id', type: 'uuid' }) clinicId: string   // denormalizado p/ o índice único
  @Column({ name: 'number', type: 'varchar', length: 6 }) number: string
  @Column({ name: 'state', type: 'varchar', length: 2 }) state: string
  @Column({ name: 'is_primary', type: 'boolean', default: false }) isPrimary: boolean
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null
}
```
> `deleted_at` existe para o índice único parcial refletir a liberação do CRM quando o médico é soft-deleted (paridade com hoje).

### A3. `Doctor` entity

`modules/doctors/entities/doctor.entity.ts` — remover `@Column crm_number / crmNumber`; adicionar:
```ts
@OneToMany(() => DoctorCrm, (crm) => crm.doctor, { cascade: true })
crms: DoctorCrm[]
```

### A4. Migration `<ts>-create-doctor-crms-and-migrate-crm.ts`

`up()` (com `search_path`):
1. `CREATE TABLE doctor_crms (id uuid PK default uuid_generate_v4(), doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE, clinic_id uuid NOT NULL REFERENCES clinics(id), number varchar(6) NOT NULL, state varchar(2) NOT NULL, is_primary boolean NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ NULL)`.
2. **Migrar dados** — 1 CRM principal por médico, copiando `deleted_at` do médico (para soft-deletados não reservarem o CRM):
   ```sql
   INSERT INTO doctor_crms (doctor_id, clinic_id, number, state, is_primary, deleted_at)
   SELECT id, clinic_id, split_part(crm_number, '/', 1), split_part(crm_number, '/', 2), true, deleted_at
   FROM doctors;
   ```
3. `CREATE UNIQUE INDEX doctor_crms_number_state_clinic_active_unique ON doctor_crms (number, state, clinic_id) WHERE deleted_at IS NULL`.
4. `DROP INDEX doctors_crm_number_clinic_active_unique`; `ALTER TABLE doctors DROP COLUMN crm_number`.

`down()`: recriar `doctors.crm_number`, backfill a partir do CRM principal (`number || '/' || state`), recriar o índice antigo, `DROP TABLE doctor_crms`.

### A5. `db-constraint.utils.ts`

Adicionar `DOCTOR_CRMS: 'doctor_crms_number_state_clinic_active_unique'` (manter ou remover `DOCTORS_CRM` conforme uso restante).

### A6. Repository

- **Substituir `findByCrmNumber`** por `findByCrm(number: string, state: string, clinicId: string): Promise<Doctor | null>` — consulta `doctor_crms` juntando o médico **não deletado** do clinic (`crm.deleted_at IS NULL AND doctor.deleted_at IS NULL AND crm.clinic_id = :clinicId`). Usado para conflito.
- **`create`/`update`**: receber `crms` (lista `{ number, state, isPrimary }`) e montar linhas `DoctorCrm` (com `clinicId`). Update = **replace total**: `doctor.crms = novasLinhas` com `orphanedRowAction: 'delete'` na relação (hard-delete das removidas) + `save`. Reload com `relations` incluindo `crms`.
- **Reads** (`findAll`/`findById`/`findByUserId`): adicionar `leftJoinAndSelect('doctor.crms', 'crm', 'crm.deleted_at IS NULL')`.
- **`delete`**: ao soft-deletar o médico, **soft-deletar também suas linhas de `doctor_crms`** (para liberar o CRM no índice parcial) — dentro do mesmo `queryRunner`.

### A7. Use-cases (create/update doctor)

- Validar **exatamente um** `isPrimary === true` em `crms` (senão `UnprocessableEntityException('Exactly one primary CRM is required')`). `ArrayMinSize(1)` no DTO garante o mínimo.
- Conflito: para cada CRM, `findByCrm(number, state, clinicId)`; se existir e for outro médico → `ConflictException('CRM number already in use')`. Manter o catch de violação de unique (`DB_UNIQUE_CONSTRAINTS.DOCTOR_CRMS`) → `ConflictException`.
- **`toResponse`**: `crms: doctor.crms.map((c) => ({ id: c.id, number: c.number, state: c.state, isPrimary: c.isPrimary }))` (remover `crmNumber`).
- `find-all-doctors` / `find-doctor-by-id`: idem no map de `crms`.

### A8. Documentos — derivar CRM principal

Em `create-prescription`, `create-medical-certificate`, `create-exam-request`, ao montar o snapshot:
```ts
const primaryCrm = doctor.crms.find((c) => c.isPrimary)
// snapshot.doctor.crmNumber = primaryCrm ? `${primaryCrm.number}/${primaryCrm.state}` : ''
```
> Snapshot type inalterado; PDF builders e `verify-prescription.use-case` **não mudam**.

---

## PARTE B — RQE por especialidade

### B1. Shared — DTOs

**`create-doctor.dto.ts`** — trocar `specialtyIds: string[]` por:
```ts
export class DoctorSpecialtyInputDto {
  @IsUUID('4') specialtyId!: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}$/, { message: 'RQE deve conter apenas dígitos' })
  @MaxLength(10)
  rqe?: string
}
// CreateDoctorDto:
@IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => DoctorSpecialtyInputDto)
specialties!: DoctorSpecialtyInputDto[]
```
**`update-doctor.dto.ts`** — `@IsOptional() specialties?: DoctorSpecialtyInputDto[]`.
**`doctor-response.dto.ts`** — `DoctorSpecialtyDto { id; name; rqe: string | null }` (`id` = id da especialidade).

### B2. Entidade `DoctorSpecialty`

`modules/doctors/entities/doctor-specialty.entity.ts` (espelha `ClinicSpecialty`): `id`, `doctorId`/`doctor` (`@ManyToOne ... onDelete: 'CASCADE'`), `specialtyId`/`specialty` (`@ManyToOne ... onDelete: 'RESTRICT'`), `rqe` (`@Column type: 'varchar', length: 10, nullable: true, default: null` — `type` explícito por ser union), `createdAt`. Sem `@DeleteDateColumn` (vínculo é substituído no update).

### B3. `Doctor` entity

Substituir o `@ManyToMany specialties` por `@OneToMany(() => DoctorSpecialty, (ds) => ds.doctor, { cascade: true }) doctorSpecialties: DoctorSpecialty[]`.

### B4. Migration `<ts>-add-rqe-to-doctor-specialties.ts`

`up()`: `ALTER TABLE doctor_specialties ADD COLUMN id uuid NOT NULL DEFAULT uuid_generate_v4()`, `ADD COLUMN rqe varchar(10) NULL`, `ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, trocar PK composta por PK em `id`, `ADD CONSTRAINT UQ_doctor_specialties_doctor_specialty UNIQUE (doctor_id, specialty_id)`. Vínculos existentes preservados com `rqe = NULL`. `down()` reverte.

### B5. Repository / use-cases / consumidores

- Repository `create`/`update`: receber pares `{ specialty, rqe }`, persistir via `doctorSpecialties`. Reads trocam `leftJoinAndSelect('doctor.specialties', 'specialty')` por `leftJoinAndSelect('doctor.doctorSpecialties', 'doctorSpecialty')` + `leftJoinAndSelect('doctorSpecialty.specialty', 'specialty')` (busca por `specialty.name` continua).
- Use-cases create/update: resolver `dto.specialties` (extrair `specialtyId`s, validar com `findByIds`, casar `rqe ?? null`); `toResponse` → `specialties: doctor.doctorSpecialties.map((ds) => ({ id: ds.specialty.id, name: ds.specialty.name, rqe: ds.rqe }))`. `find-all`/`find-by-id` idem.
- Consumidores que casam por specialty id → navegar por `doctorSpecialties` (`ds.specialtyId` / `ds.specialty.name`): `create-appointment` (`resolveSpecialty`), `create-prescription`, `create-medical-certificate`, `create-exam-request`.
- `SpecialtiesRepository.countLinkedDoctors`: join aninhado `doctor.doctorSpecialties` → `doctorSpecialty.specialty`.

---

## Comum

- **Module** (`doctors.module.ts`): `TypeOrmModule.forFeature([Doctor, DoctorCrm, DoctorSpecialty])`.
- **Seeds** (`dev.seed.ts`, `carga.seed.ts`): criar médicos com `crms` (1 principal) e vínculos de especialidade no novo shape (`rqe` de exemplo ou `null`).

---

## Regras de negócio

- **CRM:** mínimo 1; **exatamente um** principal. Documentos/verificação usam o principal. Unicidade `(number, state, clinic_id)` entre médicos ativos; soft-delete do médico solta o CRM (soft-delete das linhas de `doctor_crms`). Número só dígitos (`\d{1,6}`), UF `[A-Z]{2}`.
- **RQE:** opcional por especialidade, só dígitos (`\d{1,10}`), armazenado como `string`. `DoctorSpecialtyDto.id` = id da especialidade.
- Update de `crms` e de `specialties` é **replace total**. Manter validações atuais (mín. 1 especialidade; "One or more specialty IDs not found").

---

## Estrutura de arquivos

```
packages/shared/src/dtos/
  create-doctor.dto.ts     ← + DoctorCrmInputDto, crms[]; + DoctorSpecialtyInputDto, specialties[]; − crmNumber/specialtyIds
  update-doctor.dto.ts     ← crms?[]; specialties?[]
  doctor-response.dto.ts   ← DoctorCrmDto (crms[]); DoctorSpecialtyDto (+rqe); − crmNumber
  index.ts                 ← exportar novos DTOs

apps/backend/src/modules/doctors/
  entities/
    doctor.entity.ts               ← − crmNumber; + crms (@OneToMany); specialties → doctorSpecialties (@OneToMany)
    doctor-crm.entity.ts           ← NOVO
    doctor-specialty.entity.ts     ← NOVO
  repositories/
    doctors.repository.interface.ts ← findByCrmNumber → findByCrm; assinaturas create/update
    doctors.repository.ts           ← crms + doctorSpecialties (persistência, joins, delete solta CRM)
  use-cases/
    create-doctor.use-case.ts       ← crms (principal único) + specialties (rqe); toResponse
    update-doctor.use-case.ts       ← idem
    find-all-doctors.use-case.ts    ← map crms + specialties
    find-doctor-by-id.use-case.ts   ← idem
    delete-doctor.use-case.ts       ← garantir soft-delete das CRMs (via repository.delete)
  doctors.module.ts                 ← forFeature([Doctor, DoctorCrm, DoctorSpecialty])

apps/backend/src/modules/
  appointments/use-cases/create-appointment.use-case.ts     ← resolveSpecialty via doctorSpecialties
  prescriptions/use-cases/create-prescription.use-case.ts   ← specialty via ds; crmNumber via CRM principal
  medical-certificates/use-cases/create-medical-certificate.use-case.ts ← idem
  exams/use-cases/create-exam-request.use-case.ts           ← idem
  specialties/repositories/specialties.repository.ts        ← countLinkedDoctors join aninhado

apps/backend/src/common/utils/db-constraint.utils.ts        ← DOCTOR_CRMS
apps/backend/src/database/
  migrations/<ts>-create-doctor-crms-and-migrate-crm.ts     ← NOVO
  migrations/<ts>-add-rqe-to-doctor-specialties.ts          ← NOVO
  seeds/dev/dev.seed.ts, seeds/carga/carga.seed.ts          ← novo shape (crms + specialties)
```

---

## Cenários de teste

### CRM
- Migration: cada médico existente ganha 1 CRM principal (número/UF corretos); soft-deletados ficam com CRM soft-deletado; `crm_number` removido.
- Repository `findByCrm`: encontra CRM de médico ativo; ignora médico soft-deletado (CRM "livre").
- `create`/`update` com múltiplos CRMs, um principal → persiste; **zero ou >1 principal** → `UnprocessableEntityException`.
- Conflito: CRM já usado por outro médico ativo → `ConflictException`. CRM de médico soft-deletado pode ser reusado.
- `update` replace remove CRMs ausentes e insere novos.
- Documentos: snapshot `crmNumber` = CRM principal (`${number}/${state}`); PDF/verificação inalterados.
- Response inclui `crms[]` com `isPrimary`; sem `crmNumber`.

### RQE
- `create`/`update` com especialidades e RQEs distintos → response `{ id, name, rqe }`; RQE ausente → `null`.
- Id de especialidade inexistente → `UnprocessableEntityException`.
- `findAll`/`findById` incluem `rqe`.
- Consumidores (appointment/prescription/certificate/exam) resolvem a especialidade da consulta; `countLinkedDoctors` mantém contagem.

### Integração (`doctors.integration.spec.ts`)
- POST/PUT com `crms: [{ number, state, isPrimary }]` e `specialties: [{ specialtyId, rqe }]` → 201/200; body com `crms[]` e `specialties[].rqe`.
- Formato inválido de número/UF/RQE, ou nenhum/dois CRMs principais → 400/422.
- Ajustar `appointments.integration.spec.ts` (`relations: ['specialties']` → `['doctorSpecialties', 'doctorSpecialties.specialty']`; e `crms` onde criar médico).

---

## Definition of Done

- [ ] `DoctorCrm` e `DoctorSpecialty` entities criadas
- [ ] `Doctor` sem `crmNumber`; com `crms` e `doctorSpecialties` (`@OneToMany`)
- [ ] Migration CRM: cria `doctor_crms`, migra 1 principal por médico, índice único parcial, remove `crm_number`
- [ ] Migration RQE: altera `doctor_specialties` in-place preservando vínculos
- [ ] Shared: `crms[]` (DoctorCrmInputDto/DoctorCrmDto) e `specialties[]` (DoctorSpecialtyInputDto + rqe); sem `crmNumber`/`specialtyIds`
- [ ] Repository: `findByCrm`, persistência/joins de `crms` e `doctorSpecialties`, delete solta CRM
- [ ] Use-cases: validação de 1 CRM principal, conflito de CRM, RQE por especialidade; toResponse/find atualizados
- [ ] Documentos derivam `crmNumber` do CRM principal (snapshot/PDF/verificação inalterados no shape)
- [ ] Consumidores internos e `countLinkedDoctors` adaptados
- [ ] Module e seeds atualizados
- [ ] Testes unitários 100% + integração (CRM múltiplo/principal/conflito, RQE presente/nulo/formato)
- [ ] Build e lint sem erros
```
