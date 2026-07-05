# Task — Prescrição por Princípio Ativo (Backend)

## Descrição

Permitir que médicos prescrevam pelo princípio ativo em vez da marca comercial. A preferência padrão fica no cadastro do médico (`prescribeByActiveIngredient`) e pode ser sobrescrita por item na criação da receita. O PDF reflete a escolha item a item.

Para suportar o autocomplete de princípio ativo de forma eficiente, criar uma tabela `active_ingredients` normalizada pela string completa do campo ANVISA (ex.: `"PARACETAMOL 500 MG"`), populada durante a importação. Cada medicamento referencia seu princípio ativo via FK. A dosagem já está embutida na string — isso resolve também o próximo requisito de exibir a dosagem na prescrição.

---

## Contexto

- `Medication.activeIngredient` é hoje uma string livre copiada do CSV da ANVISA (ex.: `"PARACETAMOL 500 MG"`, `"AMOXICILINA TRIIDRATADA 875 MG + CLAVULANATO DE POTÁSSIO 125 MG"`).
- A busca atual (`GET /medications`) faz ILIKE nos dois campos e retorna todas as marcas — ruído para quem quer o genérico.
- `PrescriptionSnapshot.items` já armazena `name` e `activeIngredient` como strings imutáveis — o snapshot não muda.
- `CreatePrescriptionItemDto` tem apenas `medicationId` e `instructions`.

---

## Alterações

### 1. Nova tabela `active_ingredients`

```sql
CREATE TABLE active_ingredients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(500) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_active_ingredients_name UNIQUE (name)
);

CREATE INDEX idx_active_ingredients_name ON active_ingredients (name);
-- índice trigram para ILIKE eficiente (mesma estratégia das medications):
CREATE INDEX idx_active_ingredients_name_trgm ON active_ingredients USING GIN (name gin_trgm_ops);
```

### 2. FK em `medications`

```sql
ALTER TABLE medications
  ADD COLUMN active_ingredient_id uuid REFERENCES active_ingredients(id) ON DELETE SET NULL;

CREATE INDEX idx_medications_active_ingredient_id ON medications (active_ingredient_id);
```

> A coluna `active_ingredient` (string) é mantida por backwards-compat. Os dois coexistem — o FK é a fonte para autocomplete; a string continua sendo copiada para o snapshot da receita.

### 3. Entidade e módulo

**`ActiveIngredient` entity:**
```ts
@Entity('active_ingredients')
export class ActiveIngredient {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ length: 500, unique: true }) name: string
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}
```

**`Medication` entity** — adicionar relação:
```ts
@ManyToOne(() => ActiveIngredient, { nullable: true, eager: false })
@JoinColumn({ name: 'active_ingredient_id' })
activeIngredientEntity: ActiveIngredient | null

@Column({ name: 'active_ingredient_id', type: 'uuid', nullable: true })
activeIngredientId: string | null
```

Criar `ActiveIngredientsModule` com:
- `ActiveIngredient` entity
- `IActiveIngredientsRepository` + `ActiveIngredientsRepository`
- `FindActiveIngredientsUseCase` (busca paginada com search)
- `ActiveIngredientsController` → `GET /active-ingredients`

### 4. Importação ANVISA — atualização do bulk upsert

Durante `bulkUpsert` no `MedicationsRepository`, para cada linha com `active_ingredient` não nulo:

1. Upsert na tabela `active_ingredients` pelo `name` (ON CONFLICT DO NOTHING / retorna o id existente).
2. Setar `active_ingredient_id` na linha do medicamento.

O upsert deve ser eficiente em batch — não um INSERT por linha:

```sql
INSERT INTO active_ingredients (name)
SELECT DISTINCT active_ingredient FROM medications_staging
WHERE active_ingredient IS NOT NULL
ON CONFLICT (name) DO NOTHING;

UPDATE medications m
SET active_ingredient_id = ai.id
FROM active_ingredients ai
WHERE m.active_ingredient = ai.name
  AND m.active_ingredient_id IS NULL;
```

Ou via TypeORM dentro do mesmo `QueryRunner` do bulk upsert.

### 5. Endpoint `GET /active-ingredients`

```
GET /active-ingredients?search=paracetamol&limit=10
```

Resposta: lista de entradas únicas de princípio ativo com um representante de medicamento para uso na receita.

```ts
// ActiveIngredientResponseDto (shared)
export class ActiveIngredientResponseDto {
  id: string                       // id do active_ingredient
  name: string                     // ex.: "PARACETAMOL 500 MG"
  representativeMedicationId: string  // id de qualquer medication com esse active_ingredient_id
}
```

O `representativeMedicationId` permite ao frontend criar a receita com `medicationId` válido sem expor a escolha de marca ao médico.

**Permissões:** ADMIN e DOCTOR (leitura) — mesmo padrão de `/medications`.

### 6. Doctor entity — preferência padrão

```sql
ALTER TABLE doctors
  ADD COLUMN prescribe_by_active_ingredient boolean NOT NULL DEFAULT false;
```

```ts
// doctor.entity.ts
@Column({ name: 'prescribe_by_active_ingredient', default: false })
prescribeByActiveIngredient: boolean
```

Atualizar `DoctorResponseDto`, `CreateDoctorDto` e `UpdateDoctorDto` no shared.

### 7. Shared — DTOs e tipos da receita

**`CreatePrescriptionItemDto`** — adicionar:
```ts
@IsBoolean()
useActiveIngredient: boolean
```

**`PrescriptionSnapshot`** — adicionar por item:
```ts
useActiveIngredient: boolean
```

**`PrescriptionResponseDto`** — adicionar por item:
```ts
useActiveIngredient: boolean
```

### 8. `CreatePrescriptionUseCase`

Propagar `useActiveIngredient` do DTO para o snapshot:
```ts
items.push({
  medicationId: medication.id,
  name: medication.name,
  activeIngredient: medication.activeIngredient,  // string — snapshot imutável
  instructions: item.instructions,
  useActiveIngredient: item.useActiveIngredient,
})
```

### 9. PDF builder — `buildItems()`

```ts
const displayName = item.useActiveIngredient && item.activeIngredient
  ? item.activeIngredient          // "PARACETAMOL 500 MG" — princípio ativo + dosagem
  : item.activeIngredient
    ? `${item.name} — ${item.activeIngredient}`
    : item.name

// fallback: se useActiveIngredient=true mas activeIngredient=null, usa name
```

---

## Regras de negócio

- `prescribeByActiveIngredient` no médico define o default do toggle por item — não força o comportamento.
- `useActiveIngredient = true` com `activeIngredient = null` → fallback para `name` no PDF.
- `GET /active-ingredients` exclui entradas sem medicamento ativo vinculado (soft-deleted não contam).
- `representativeMedicationId` é determinístico dentro de uma requisição (ex.: `ORDER BY created_at ASC LIMIT 1`) — não precisa ser estável entre deploys.
- Receitas existentes sem `useActiveIngredient` no snapshot → tratar como `false` no PDF (backwards-compat).
- A string `activeIngredient` no snapshot é imutável — copiada no momento da criação, independente de mudanças futuras na tabela.

---

## Estrutura de arquivos

```
packages/shared/src/
  dtos/
    active-ingredient-response.dto.ts     → novo
    doctor-response.dto.ts                → + prescribeByActiveIngredient
    create-doctor.dto.ts / update-...     → + prescribeByActiveIngredient?
    create-prescription.dto.ts            → CreatePrescriptionItemDto + useActiveIngredient
    prescription-response.dto.ts          → items[].useActiveIngredient
  types/
    prescription-snapshot.type.ts         → items[].useActiveIngredient

apps/backend/src/modules/
  active-ingredients/                     → módulo novo
    entities/active-ingredient.entity.ts
    repositories/active-ingredients.repository.interface.ts
    repositories/active-ingredients.repository.ts
    use-cases/find-active-ingredients.use-case.ts
    controllers/active-ingredients.controller.ts
    active-ingredients.module.ts

  medications/
    entities/medication.entity.ts         → + activeIngredientId, activeIngredientEntity
    repositories/medications.repository.ts → bulk upsert popula active_ingredient_id

  doctors/
    entities/doctor.entity.ts             → + prescribeByActiveIngredient
    use-cases/ (create, update, find)     → mapear campo novo

  prescriptions/
    use-cases/create-prescription.use-case.ts   → + useActiveIngredient no snapshot
    services/prescription-pdf-builder.service.ts → condicional por useActiveIngredient

  database/migrations/
    <ts>_create-active-ingredients.ts
    <ts>_add-active-ingredient-id-to-medications.ts
    <ts>_add-prescribe-by-active-ingredient-to-doctors.ts
```

---

## Cenários de teste

### `ActiveIngredientsRepository`
- Busca por termo retorna apenas entradas com medicamentos ativos vinculados
- Duas medications com mesmo `active_ingredient` → uma entrada na tabela
- `representativeMedicationId` retorna um id válido

### `MedicationsRepository.bulkUpsert`
- Popula `active_ingredients` com strings únicas
- Seta `active_ingredient_id` corretamente em cada medication
- Medicamento com `active_ingredient = null` → `active_ingredient_id = null`

### `FindActiveIngredientsUseCase`
- Busca por termo filtra por `name ILIKE`
- Paginação funciona corretamente

### `CreatePrescriptionUseCase`
- `useActiveIngredient: true` → snapshot salva `true`
- `useActiveIngredient: false` → snapshot salva `false`

### `PrescriptionPdfBuilderService`
- `useActiveIngredient: true` + `activeIngredient` presente → exibe só o princípio ativo (com dosagem)
- `useActiveIngredient: true` + `activeIngredient: null` → fallback para `name`
- `useActiveIngredient: false` → comportamento atual
- Snapshot sem `useActiveIngredient` (receitas antigas) → trata como `false`

### Doctor use-cases
- `prescribeByActiveIngredient: true` persistido e retornado

---

## Definition of Done

- [ ] Migration: tabela `active_ingredients` criada com índice trigram
- [ ] Migration: `medications.active_ingredient_id` FK adicionada
- [ ] Migration: `doctors.prescribe_by_active_ingredient` adicionada
- [ ] `bulkUpsert` popula `active_ingredients` e seta FK nas medications
- [ ] `GET /active-ingredients?search=` retorna princípios ativos únicos com `representativeMedicationId`
- [ ] `DoctorResponseDto` expõe `prescribeByActiveIngredient`
- [ ] `CreatePrescriptionItemDto` aceita e valida `useActiveIngredient`
- [ ] `PrescriptionSnapshot` e `PrescriptionResponseDto` incluem `useActiveIngredient` por item
- [ ] PDF exibe princípio ativo + dosagem quando `useActiveIngredient = true` (com fallback)
- [ ] Testes unitários com 100% de cobertura em todos os arquivos alterados
- [ ] Build e lint sem erros
