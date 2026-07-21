# Task — Generalizar módulo de médicos para profissionais de saúde: modelo de domínio (Backend)

## Descrição

Renomear o módulo `doctors` para `professionals` e generalizar o registro profissional (hoje CRM fixo) para suportar múltiplos conselhos de classe (CRM, CRN, CREFITO, CRP, CRO, COREN, CREF, CRFA) via um novo campo `councilType`. É a task fundacional da migração "médico → profissional de saúde" — todo o restante (RBAC, PDFs, seeds, frontend) depende do shape definido aqui.

Rename **completo e coordenado**, sem camada de compatibilidade: tabelas, entidades, DTOs, módulo, repository, use-cases mudam de nome nesta task. Nenhum vestígio de "doctor"/"crm" deve sobrar no módulo renomeado (exceto o valor de enum `CouncilType.CRM`, que é o próprio nome do conselho médico).

---

## Contexto

- `Doctor` (`apps/backend/src/modules/doctors/entities/doctor.entity.ts`): `id, userId (FK User), clinicId (FK Clinic), crms: DoctorCrm[] (OneToMany cascade), doctorSpecialties: DoctorSpecialty[] (OneToMany cascade), bio, version, timestamps, deletedAt`.
- `DoctorCrm` (`doctor-crm.entity.ts`, tabela `doctor_crms`): `id, doctorId (FK CASCADE), clinicId, number varchar(6), state varchar(2), isPrimary boolean, createdAt, deletedAt`. Índice único parcial `doctor_crms_number_state_clinic_active_unique` em `(number, state, clinic_id) WHERE deleted_at IS NULL`.
- `DoctorSpecialty` (`doctor-specialty.entity.ts`, tabela `doctor_specialties`): `id, doctorId (FK CASCADE), specialtyId (FK Specialty RESTRICT), rqe varchar(10) nullable, createdAt`.
- `IDoctorsRepository.findByCrm(number, state, clinicId)` — busca por CRM específico, usada para checar conflito.
- DTOs (`packages/shared/src/dtos/create-doctor.dto.ts`, `update-doctor.dto.ts`, `doctor-response.dto.ts`, `paginated-doctors-response.dto.ts`): `DoctorCrmInputDto { number: @Matches(/^\d{1,6}$/), state: @Matches(/^[A-Z]{2}$/), isPrimary }`, `DoctorSpecialtyInputDto { specialtyId, rqe?: @Matches(/^\d{1,10}$/) }`.
- `Specialty` (`apps/backend/src/modules/specialties/entities/specialty.entity.ts`) já é genérica (`id, name, description, titleName`) — **não muda nesta task**.
- Migration de referência para o padrão do projeto (SQL à mão, `search_path`, índice parcial): `apps/backend/src/database/migrations/1752700000000-create-doctor-crms-and-migrate-crm.ts`.
- `migration:generate` não detecta rename (gera DROP+CREATE) — todas as migrations desta task são escritas à mão e validadas com `migration:revert` local antes do merge.

**Decisão de shape (confirmada com o usuário):**
- Catálogo de conselhos inicial: **CRM, CRN, CREFITO, CRP, CRO, COREN, CREF, CRFA** (Medicina, Nutrição, Fisioterapia, Psicologia, Odontologia, Enfermagem, Educação Física, Fonoaudiologia).
- `registryNumber` (renomeado de `rqe`) continua **exclusivo de `councilType = CRM`** — não generalizar a validação/uso para outros conselhos nesta task (a UI esconde o campo para os demais, ver task de frontend).
- Largura da coluna `number` vira genérica (`varchar(20)`) — a validação real de formato por conselho fica na camada de DTO, não na largura da coluna, para não exigir nova migration destrutiva a cada conselho novo.

---

## Novo enum e config compartilhados (`packages/shared`)

### `src/enums/council-type.enum.ts` (novo)
```ts
export enum CouncilType {
  CRM = 'crm',
  CRN = 'crn',
  CREFITO = 'crefito',
  CRP = 'crp',
  CRO = 'cro',
  COREN = 'coren',
  CREF = 'cref',
  CRFA = 'crfa',
}
```
Exportar em `src/enums/index.ts`.

### `src/config/council-registration-format.config.ts` (novo — pasta `config/` nova no shared)
```ts
export interface CouncilRegistrationFormat {
  numberPattern: RegExp
  numberMaxLength: number
  numberPlaceholder: string
  label: string
}

export const COUNCIL_REGISTRATION_FORMATS: Record<CouncilType, CouncilRegistrationFormat> = {
  [CouncilType.CRM]:     { numberPattern: /^\d{1,6}$/,        numberMaxLength: 6,  numberPlaceholder: '12345',     label: 'CRM' },
  [CouncilType.CRN]:     { numberPattern: /^\d{1,8}$/,        numberMaxLength: 8,  numberPlaceholder: '12345678',  label: 'CRN' },
  [CouncilType.CREFITO]: { numberPattern: /^\d{1,6}-?[FT]?$/, numberMaxLength: 8,  numberPlaceholder: '123456-F',  label: 'CREFITO' },
  [CouncilType.CRP]:     { numberPattern: /^\d{2}\/\d{1,6}$/, numberMaxLength: 9,  numberPlaceholder: '06/12345',  label: 'CRP' },
  [CouncilType.CRO]:     { numberPattern: /^\d{1,6}$/,        numberMaxLength: 6,  numberPlaceholder: '12345',     label: 'CRO' },
  [CouncilType.COREN]:   { numberPattern: /^\d{1,7}$/,        numberMaxLength: 7,  numberPlaceholder: '1234567',   label: 'COREN' },
  [CouncilType.CREF]:    { numberPattern: /^\d{1,6}-?G\/?[A-Z]{0,2}$/, numberMaxLength: 10, numberPlaceholder: '123456-G/SP', label: 'CREF' },
  [CouncilType.CRFA]:    { numberPattern: /^\d{1,2}-\d{1,5}$/, numberMaxLength: 8, numberPlaceholder: '2-12345',   label: 'CRFA' },
}
```
> Os regex são ponto de partida — se algum formato real divergir durante QA, ajustar a config sem tocar em schema/migration (é só validação de aplicação).

### `src/config/council-type-label.config.ts` (novo — separado da config de validação, para uso leve em PDFs)
```ts
export const COUNCIL_TYPE_LABELS: Record<CouncilType, string> = {
  [CouncilType.CRM]: 'CRM',
  [CouncilType.CRN]: 'CRN',
  [CouncilType.CREFITO]: 'CREFITO',
  [CouncilType.CRP]: 'CRP',
  [CouncilType.CRO]: 'CRO',
  [CouncilType.COREN]: 'COREN',
  [CouncilType.CREF]: 'CREF',
  [CouncilType.CRFA]: 'CRFA',
}
```

Atualizar o diagrama de `packages/shared/src/` em `CLAUDE.md` e `ai/context/architecture.md` para incluir `config/` ao lado de `dtos/types/enums/utils`.

---

## DTOs compartilhados (renomeados)

`packages/shared/src/dtos/`:
- `create-doctor.dto.ts` → **`create-professional.dto.ts`**:
  ```ts
  export class ProfessionalRegistrationInputDto {
    @IsEnum(CouncilType) councilType!: CouncilType
    @IsString() @MaxLength(20) number!: string   // validação de formato real via class-validator custom (ver abaixo)
    @Matches(/^[A-Z]{2}$/) state!: string
    @IsBoolean() isPrimary!: boolean
  }

  export class ProfessionalSpecialtyInputDto {
    @IsUUID('4') specialtyId!: string
    @IsOptional() @IsString() @Matches(/^\d{1,10}$/) @MaxLength(10) registryNumber?: string
  }

  export class CreateProfessionalDto {
    // userId, clinicId conforme já existe hoje em CreateDoctorDto
    @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ProfessionalRegistrationInputDto)
    registrations!: ProfessionalRegistrationInputDto[]   // antes: crms

    @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ProfessionalSpecialtyInputDto)
    specialties!: ProfessionalSpecialtyInputDto[]

    @IsOptional() @IsString() bio?: string
  }
  ```
  Validação de `number` por `councilType`: implementar um custom validator (`@ValidateIf`/decorator dedicado, ex. `@IsValidRegistrationNumber('councilType')`) que resolve `COUNCIL_REGISTRATION_FORMATS[dto.councilType].numberPattern` em runtime — não hardcodar um regex único no DTO como hoje.
- `update-doctor.dto.ts` → **`update-professional.dto.ts`**: `registrations?`, `specialties?` opcionais (mesmo padrão do `CreateProfessionalDto`).
- `doctor-response.dto.ts` → **`professional-response.dto.ts`**:
  ```ts
  export class ProfessionalRegistrationDto { id!: string; councilType!: CouncilType; number!: string; state!: string; isPrimary!: boolean }
  export class ProfessionalSpecialtyDto { id!: string; name!: string; registryNumber!: string | null }
  export class ProfessionalResponseDto {
    id!: string; user!: ...; registrations!: ProfessionalRegistrationDto[]; specialties!: ProfessionalSpecialtyDto[]; bio!: string | null; createdAt!: Date; updatedAt!: Date
  }
  ```
- `paginated-doctors-response.dto.ts` → **`paginated-professionals-response.dto.ts`** (`PaginatedProfessionalsResponseDto`).

Exportar tudo em `packages/shared/src/dtos/index.ts` com os novos nomes — remover as exportações antigas (`CreateDoctorDto`, `DoctorCrmInputDto`, etc.), sem alias de compatibilidade.

---

## Entidades (backend)

### `Professional` (renomeado de `Doctor`)
`apps/backend/src/modules/professionals/entities/professional.entity.ts`, tabela `professionals` — mesmo shape de hoje, só renomeado:
```ts
@Entity('professionals')
export class Professional {
  id: string
  user: User; userId: string
  clinic: Clinic; clinicId: string
  registrations: ProfessionalRegistration[]      // OneToMany cascade, antes `crms`
  professionalSpecialties: ProfessionalSpecialty[]  // OneToMany cascade, antes `doctorSpecialties`
  bio: string | null
  version: number
  createdAt: Date; updatedAt: Date; deletedAt: Date | null
}
```

### `ProfessionalRegistration` (renomeado de `DoctorCrm`)
`entities/professional-registration.entity.ts`, tabela `professional_registrations`:
```ts
@Entity('professional_registrations')
export class ProfessionalRegistration {
  id: string
  professionalId: string
  professional: Professional   // @ManyToOne CASCADE, JoinColumn professional_id
  clinicId: string
  councilType: CouncilType     // @Column varchar(20)
  number: string                // @Column varchar(20)
  state: string                 // @Column varchar(2)
  isPrimary: boolean
  createdAt: Date
  deletedAt: Date | null
}
```

### `ProfessionalSpecialty` (renomeado de `DoctorSpecialty`)
`entities/professional-specialty.entity.ts`, tabela `professional_specialties`:
```ts
@Entity('professional_specialties')
export class ProfessionalSpecialty {
  id: string
  professionalId: string
  professional: Professional   // @ManyToOne CASCADE
  specialtyId: string
  specialty: Specialty          // @ManyToOne RESTRICT
  registryNumber: string | null // @Column varchar(10) nullable — renomeado de `rqe`
  createdAt: Date
}
```

---

## Migrations

Escritas à mão (padrão `1752700000000-create-doctor-crms-and-migrate-crm.ts`: SQL explícito, `SET search_path`, `up`/`down` reversíveis, testar `migration:revert` local). Ordem:

1. **`<ts>-add-council-type-to-doctor-crms.ts`**
   - `ALTER TABLE doctor_crms ADD COLUMN council_type varchar(20) NOT NULL DEFAULT 'crm'`; backfill explícito (`UPDATE doctor_crms SET council_type = 'crm'`); `ALTER TABLE doctor_crms ALTER COLUMN council_type DROP DEFAULT`.
   - `ALTER TABLE doctor_crms ALTER COLUMN number TYPE varchar(20)` (alargamento, metadata-only, sem risco).
   - Recriar o índice único parcial incluindo `council_type`: `DROP INDEX doctor_crms_number_state_clinic_active_unique; CREATE UNIQUE INDEX doctor_crms_council_number_state_clinic_active_unique ON doctor_crms (council_type, number, state, clinic_id) WHERE deleted_at IS NULL`.
   - `down()`: reverter índice, remover coluna, reduzir largura de `number` (checar se algum valor excede 6 chars antes de reduzir — se sim, abortar o down com erro claro).

2. **`<ts>-rename-doctor-specialty-rqe-to-registry-number.ts`**
   - `ALTER TABLE doctor_specialties RENAME COLUMN rqe TO registry_number`. `down()` reverte.

3. **`<ts>-rename-doctors-to-professionals.ts`**
   - `ALTER TABLE doctors RENAME TO professionals`. `down()` reverte.

4. **`<ts>-rename-doctor-crms-to-professional-registrations.ts`**
   - `ALTER TABLE doctor_crms RENAME TO professional_registrations`; `ALTER TABLE professional_registrations RENAME COLUMN doctor_id TO professional_id`; renomear constraint/índice para manter `\d professional_registrations` legível (verificar nomes reais via `\d doctor_crms` antes de escrever o SQL — não assumir).

5. **`<ts>-rename-doctor-specialties-to-professional-specialties.ts`**
   - `ALTER TABLE doctor_specialties RENAME TO professional_specialties`; `ALTER TABLE professional_specialties RENAME COLUMN doctor_id TO professional_id`.

Todas as migrations são **rename/metadata puro** exceto a #1 (que faz backfill de dado) — baixo risco de downtime, mas a aplicação e o banco precisam mudar no mesmo deploy (código antigo não pode rodar contra colunas já renomeadas). Esta task não inclui o rename das FKs `doctor_id` nas tabelas dependentes (appointments, schedules, etc.) — isso é da task `renomear-role-doctor-para-professional-e-atualizar-rbac-e-fks`.

---

## Módulo, repository e use-cases (rename)

| Antigo | Novo |
|---|---|
| `modules/doctors/` | `modules/professionals/` |
| `DoctorsModule` | `ProfessionalsModule` |
| `DoctorsController` (`controllers/doctors.controller.ts`) | `ProfessionalsController` (`controllers/professionals.controller.ts`) |
| `ListDoctorsQueryDto` | `ListProfessionalsQueryDto` |
| `IDoctorsRepository` / `DoctorsRepository` — `findByCrm(number, state, clinicId)` | `IProfessionalsRepository` / `ProfessionalsRepository` — `findByRegistration(councilType, number, state, clinicId)` |
| `CreateDoctorUseCase`, `UpdateDoctorUseCase`, `DeleteDoctorUseCase`, `FindAllDoctorsUseCase`, `FindDoctorByIdUseCase` | `CreateProfessionalUseCase`, `UpdateProfessionalUseCase`, `DeleteProfessionalUseCase`, `FindAllProfessionalsUseCase`, `FindProfessionalByIdUseCase` |
| `utils/resolve-doctor-signing-identity.ts` | mantém — renomeado e ajustado na task `generalizar-assinatura-de-documentos-e-pdfs` |

- Repository `create`/`update`: recebem `registrations: {councilType, number, state, isPrimary}[]` e `specialties: {specialtyId, registryNumber}[]`; update é **replace total** (mesma semântica de hoje para `crms`/`specialties`, com `orphanedRowAction: 'delete'`).
- Reads (`findAll`/`findById`/`findByUserId`): `leftJoinAndSelect('professional.registrations', 'registration', 'registration.deleted_at IS NULL')` + join de `professionalSpecialties`/`specialty`. Alias de query builder também renomeado (`createQueryBuilder('professional')`, não `'doctor'`).
- `delete` (soft-delete do profissional): soft-deletar também as linhas de `professional_registrations` no mesmo `queryRunner` (paridade com o comportamento atual de CRM).
- Use-cases: validar **exatamente um** `isPrimary === true` em `registrations` (`UnprocessableEntityException` caso contrário); conflito de registro via `findByRegistration` → `ConflictException('Registration number already in use')`; `toResponse` monta `registrations`/`specialties` no novo shape.
- `app.module.ts`: troca `DoctorsModule` → `ProfessionalsModule`. `users.module.ts`: `forwardRef(() => DoctorsModule)` → `forwardRef(() => ProfessionalsModule)`; `professionals.module.ts` mantém `forwardRef(() => UsersModule)`.

---

## Regras de negócio

- Registro (`registrations`): mínimo 1, **exatamente um principal**; unicidade `(council_type, number, state, clinic_id)` entre profissionais ativos; soft-delete do profissional libera o registro (soft-delete em cascata). Formato do `number` validado dinamicamente por `councilType` via `COUNCIL_REGISTRATION_FORMATS`.
- `registryNumber` (RQE): opcional por especialidade, só dígitos (`\d{1,10}`) — **sem mudança de comportamento**, só renomeado. Continua sem relação direta com `councilType` no backend (a restrição de só aparecer para CRM é responsabilidade do frontend, mas o backend aceita o campo para qualquer `councilType` — não adicionar validação cruzada nesta task, para não acoplar a regra de UI ao domínio).
- Update de `registrations` e `specialties` continua **replace total**.

---

## Estrutura de arquivos

```
packages/shared/src/enums/
  council-type.enum.ts                    ← NOVO
  index.ts                                ← + CouncilType
packages/shared/src/config/                ← NOVA pasta
  council-registration-format.config.ts   ← NOVO
  council-type-label.config.ts            ← NOVO
packages/shared/src/dtos/
  create-professional.dto.ts              ← renomeado de create-doctor.dto.ts
  update-professional.dto.ts              ← renomeado de update-doctor.dto.ts
  professional-response.dto.ts            ← renomeado de doctor-response.dto.ts
  paginated-professionals-response.dto.ts ← renomeado de paginated-doctors-response.dto.ts
  index.ts                                ← exportar novos nomes, remover antigos

apps/backend/src/modules/professionals/    ← renomeado de modules/doctors/
  entities/
    professional.entity.ts                ← Professional
    professional-registration.entity.ts   ← ProfessionalRegistration
    professional-specialty.entity.ts      ← ProfessionalSpecialty
  repositories/
    professionals.repository.interface.ts ← IProfessionalsRepository (findByRegistration)
    professionals.repository.ts
    professionals.repository.spec.ts
  use-cases/
    create-professional.use-case.ts
    update-professional.use-case.ts
    delete-professional.use-case.ts
    find-all-professionals.use-case.ts
    find-professional-by-id.use-case.ts
  controllers/
    professionals.controller.ts
    professionals.controller.spec.ts
  dto/
    list-professionals-query.dto.ts
  tests/
    *.spec.ts (mirrors dos use-cases + integration)
  professionals.module.ts

apps/backend/src/database/migrations/
  <ts>-add-council-type-to-doctor-crms.ts
  <ts>-rename-doctor-specialty-rqe-to-registry-number.ts
  <ts>-rename-doctors-to-professionals.ts
  <ts>-rename-doctor-crms-to-professional-registrations.ts
  <ts>-rename-doctor-specialties-to-professional-specialties.ts

apps/backend/src/app.module.ts             ← ProfessionalsModule
apps/backend/src/modules/users/users.module.ts ← forwardRef(() => ProfessionalsModule)

CLAUDE.md, ai/context/architecture.md      ← diagrama shared/src/ + config/
```

> Este módulo ainda referencia `UserRole.DOCTOR` em `@Roles(...)` no controller — **não renomear o enum nesta task**, isso é feito na task `renomear-role-doctor-para-professional-e-atualizar-rbac-e-fks` para manter o diff desta task focado no modelo de dados. Usar temporariamente `@Roles(UserRole.ADMIN, UserRole.DOCTOR)` no `ProfessionalsController` (o enum ainda se chama `DOCTOR` até a próxima task rodar).

---

## Cenários de teste

- Migration: `doctor_crms` ganha `council_type='crm'` para todos os registros existentes; índice único passa a incluir `council_type`; rename de tabelas/colunas preserva dados e FKs; `migration:revert` de cada uma volta ao estado anterior sem perda.
- Repository `findByRegistration`: encontra registro ativo por `(councilType, number, state, clinicId)`; ignora profissional soft-deletado.
- `create`/`update` com múltiplos `registrations` de `councilType` distintos, um principal → persiste; zero ou mais de um principal → `UnprocessableEntityException`.
- Conflito: mesmo `(councilType, number, state)` já usado por outro profissional ativo na clínica → `ConflictException`; liberado quando o profissional dono é soft-deletado.
- `registryNumber` presente/ausente/formato inválido → comportamento idêntico ao `rqe` de hoje, só com o novo nome de campo.
- Integração (`professionals.integration.spec.ts`): POST/PUT com `registrations: [{ councilType, number, state, isPrimary }]` e `specialties: [{ specialtyId, registryNumber }]` → 201/200; formatos inválidos por `councilType` → 400/422; ajustar specs de módulos que hoje fazem `relations: ['specialties']`/`['crms']` para os novos nomes de relação.

---

## Definition of Done

- [ ] `Professional`, `ProfessionalRegistration`, `ProfessionalSpecialty` criadas (renomeadas de `Doctor`/`DoctorCrm`/`DoctorSpecialty`)
- [ ] `CouncilType` + `COUNCIL_REGISTRATION_FORMATS` + `COUNCIL_TYPE_LABELS` no `@app/shared`, exportados
- [ ] 5 migrations criadas, testadas com `migration:run` + `migration:revert` locais
- [ ] DTOs renomeados (`CreateProfessionalDto`, `UpdateProfessionalDto`, `ProfessionalResponseDto`, `PaginatedProfessionalsResponseDto`) com validação de `number` dinâmica por `councilType`
- [ ] Módulo `professionals` completo (controller, repository, use-cases, module) renomeado e funcional
- [ ] `app.module.ts` e `users.module.ts` atualizados (`ProfessionalsModule`)
- [ ] `CLAUDE.md`/`ai/context/architecture.md` com `config/` no diagrama do shared
- [ ] Testes unitários 100% + integração cobrindo os cenários acima
- [ ] Build e lint sem erros
- [ ] Nenhuma referência residual a `Doctor`/`DoctorCrm`/`DoctorSpecialty`/`crms`/`rqe` dentro do módulo renomeado (exceto o valor de enum `CouncilType.CRM`)
