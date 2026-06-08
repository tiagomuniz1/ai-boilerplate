# Task — Adicionar clinic_id ao Schema (Backend)

## Descrição
Adicionar a coluna `clinic_id` (FK para `clinics`) nas tabelas `users`, `doctors`, `patients`, `schedules` e `specialties`, tornando cada registro explicitamente vinculado a uma clínica. Inclui as migrations, a atualização das entidades e a recriação dos índices únicos parciais como compostos por `clinic_id`.

**Pré-requisito:** task **criar-modulo-de-clinicas** concluída.

---

## Contexto
- `specialties` são globais (compartilhadas entre clínicas) — **não recebem `clinic_id`**. A associação `doctor_specialties` é indiretamente clínica-específica via o `doctor` que já terá `clinic_id`.
- `users`, `doctors`, `patients` e `schedules` são recursos de uma clínica — **recebem `clinic_id` NOT NULL**.
- Os índices únicos parciais existentes (`email`, `crm_number`, `user_id`, `document_number`) passam a ser **compostos com `clinic_id`**, exceto `users.email` que permanece **globalmente único** (um email de login pertence a um único usuário no sistema, independente de clínica).
- Esta task **não altera repositórios nem use-cases** — apenas schema, entidades e a FK. O isolamento de queries por `clinic_id` é feito na task **isolar-dados-por-clinica**.
- Dados existentes devem receber um `clinic_id` padrão via migration (buscar o `id` da primeira clínica ou criar uma clínica seed se não existir).

---

## Migrations a criar

### 1. Adicionar `clinic_id` em `users`
```sql
ALTER TABLE users
  ADD COLUMN clinic_id UUID REFERENCES clinics(id);

-- Popular dados existentes com a primeira clínica
UPDATE users SET clinic_id = (SELECT id FROM clinics LIMIT 1)
  WHERE clinic_id IS NULL;

ALTER TABLE users
  ALTER COLUMN clinic_id SET NOT NULL;
```

### 2. Adicionar `clinic_id` em `doctors`
```sql
ALTER TABLE doctors
  ADD COLUMN clinic_id UUID REFERENCES clinics(id);

UPDATE doctors SET clinic_id = (
  SELECT u.clinic_id FROM users u WHERE u.id = doctors.user_id
) WHERE clinic_id IS NULL;

ALTER TABLE doctors
  ALTER COLUMN clinic_id SET NOT NULL;

-- Recriar índices únicos como compostos
DROP INDEX IF EXISTS "doctors_crm_number_active_unique";
DROP INDEX IF EXISTS "doctors_user_id_active_unique";

CREATE UNIQUE INDEX "doctors_crm_number_clinic_active_unique"
  ON doctors (crm_number, clinic_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX "doctors_user_id_clinic_active_unique"
  ON doctors (user_id, clinic_id)
  WHERE deleted_at IS NULL;
```

### 3. Adicionar `clinic_id` em `patients`
```sql
ALTER TABLE patients
  ADD COLUMN clinic_id UUID REFERENCES clinics(id);

UPDATE patients SET clinic_id = (
  SELECT u.clinic_id FROM users u WHERE u.id = patients.user_id
) WHERE clinic_id IS NULL;

ALTER TABLE patients
  ALTER COLUMN clinic_id SET NOT NULL;

-- Recriar índice único como composto
DROP INDEX IF EXISTS "patients_document_number_active_unique";

CREATE UNIQUE INDEX "patients_document_number_clinic_active_unique"
  ON patients (document_number, clinic_id)
  WHERE deleted_at IS NULL;
```

### 4. Adicionar `clinic_id` em `schedules`
```sql
ALTER TABLE schedules
  ADD COLUMN clinic_id UUID REFERENCES clinics(id);

UPDATE schedules SET clinic_id = (
  SELECT d.clinic_id FROM doctors d WHERE d.id = schedules.doctor_id
) WHERE clinic_id IS NULL;

ALTER TABLE schedules
  ALTER COLUMN clinic_id SET NOT NULL;
```

---

## Entidades a atualizar

Adicionar em cada entidade (`User`, `Doctor`, `Patient`, `Schedule`):

```ts
@ManyToOne(() => Clinic, { eager: false })
@JoinColumn({ name: 'clinic_id' })
clinic: Clinic

@Column({ name: 'clinic_id' })
clinicId: string
```

---

## Atualização dos DB_UNIQUE_CONSTRAINTS

Atualizar `apps/backend/src/common/utils/db-constraint.utils.ts`:

```ts
export const DB_UNIQUE_CONSTRAINTS = {
  USERS_EMAIL:             'UQ_users_email_active',
  DOCTORS_CRM:             'doctors_crm_number_clinic_active_unique',
  DOCTORS_USER_ID:         'doctors_user_id_clinic_active_unique',
  PATIENTS_DOCUMENT:       'patients_document_number_clinic_active_unique',
} as const
```

---

## Seeds a atualizar

- `src/database/seeds/test/test.seed.ts` — todos os registros criados no seed devem receber `clinicId` da clínica seed.
- Criar uma clínica seed (`id` fixo e conhecido) no início do seed de teste.

---

## Restrições

- NÃO alterar repositórios ou use-cases nesta task — apenas entidades e schema.
- NÃO remover os índices únicos antigos sem recriar os compostos na mesma migration.
- NÃO deixar `clinic_id` nullable após a migração de dados.
- NÃO quebrar os testes de integração existentes — o seed de teste deve ser atualizado para incluir a clínica.

---

## Impacto nos testes de integração

Os testes de integração existentes criam dados diretamente no banco via `repository.save()`. Todos esses dados precisam de `clinicId`. A estratégia é:

1. Criar uma clínica fixa no `beforeAll` de cada spec de integração.
2. Passar `clinicId` em todos os `repository.create()` e `repository.save()` dos testes.
3. O `afterEach` já faz `DELETE FROM test.clinics` — adicionar ao cleanup.

---

## Definition of Done

- [ ] 4 migrations criadas (uma por tabela) e aplicadas com sucesso no schema `test` e `dev`
- [ ] Entidades `User`, `Doctor`, `Patient`, `Schedule` atualizadas com `clinicId` e relação `clinic`
- [ ] Índices únicos antigos removidos e recriados como compostos com `clinic_id`
- [ ] `DB_UNIQUE_CONSTRAINTS` atualizado com os novos nomes de índice
- [ ] Seeds de teste atualizados para incluir clínica e `clinic_id` em todos os registros
- [ ] Testes de integração existentes passando após atualização dos seeds
- [ ] Testes unitários existentes passando (entidades atualizadas, mocks ajustados)
- [ ] Nenhum campo `clinic_id` nullable nos schemas finais
