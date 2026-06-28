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
# Task — Módulo de Medicamentos (Backend / CRUD)

## Descrição
Implementar o módulo `medications`: a base canônica de medicamentos da plataforma, que servirá de fonte para o futuro módulo de receitas médicas. É reference data **global** (sem `clinicId`), com escrita exclusiva do `PLATFORM_ADMIN` e leitura por `ADMIN`/`DOCTOR` (para a futura prescrição). Esta task cobre apenas o CRUD; a importação da base da ANVISA é a task seguinte (`importar-base-de-medicamentos-da-anvisa`).

---

## Contexto
- É a **primeira** entrega da feature de medicamentos — não depende de nenhum módulo novo.
- Não tem `clinic_id`: a base é da plataforma, não da clínica (padrão de `medical-record-canonical-fields` e `specialties`).
- A base tem **dezenas de milhares de itens** → listagem **paginada + busca** (diferente de canonical-fields, que retorna array completo).
- Usa **soft delete** (`deleted_at`) **e** flag `is_active` — PLATFORM_ADMIN pode desativar (sem listar p/ DOCTOR/ADMIN) ou excluir (soft delete).
- Entradas têm `source`: `ANVISA` (vindas do import) ou `MANUAL` (criadas via POST).
- `import_hash` é a chave de dedup usada pelo import (task #2); no CRUD manual fica `null`.
- A base muda pouco em runtime → cache de leitura.

---

## Contratos

### Input (DTO)

**CreateMedicationDto** (PLATFORM_ADMIN — entrada `MANUAL`):
- name: string (obrigatório, min 2, max 250)
- activeIngredient?: string (opcional, max 500)
- regulatoryCategory?: string (opcional, max 120)
- therapeuticClass?: string (opcional, max 250)
- holderCompany?: string (opcional, max 250)
- registrationNumber?: string (opcional, max 40)
- registrationStatus?: string (opcional, max 40)

**UpdateMedicationDto** (PLATFORM_ADMIN): todos os campos acima opcionais + `isActive?: boolean`.

**MedicationListQueryDto** (extends/segue `PaginationDto`):
- page?: number (default 1, min 1)
- limit?: number (default 20, min 1, max 100)
- search?: string — busca `ILIKE` em `name` e `active_ingredient`
- includeInactive?: boolean (default false; só respeitado para PLATFORM_ADMIN)

### Output

**MedicationResponseDto:**
- id, name, activeIngredient (string | null), regulatoryCategory (string | null), therapeuticClass (string | null), holderCompany (string | null), registrationNumber (string | null), registrationStatus (string | null), source (MedicationSource), isActive (boolean), createdAt (Date)

**PaginatedMedicationsResponseDto:**
- data: MedicationResponseDto[]
- total: number
- page: number
- limit: number

> Mesmo shape de `PaginatedPatientsResponseDto` (`{ data, total, page, limit }`).

---

## Enums e DTOs compartilhados (`packages/shared`)
- `src/enums/medication-source.enum.ts` → `MedicationSource { ANVISA='anvisa', MANUAL='manual' }` — exportar em `enums/index.ts`.
- `src/dtos/create-medication.dto.ts`, `update-medication.dto.ts`, `medication-response.dto.ts`, `medication-list-query.dto.ts`, `paginated-medications-response.dto.ts`.
- Exportar tudo em `src/dtos/index.ts` (nunca importar de subpasta direto).

---

## Assinaturas esperadas

**Use-cases:**
- `FindMedicationsUseCase.execute(query: MedicationListQueryDto, currentUser: ICurrentUser): Promise<PaginatedMedicationsResponseDto>`
- `GetMedicationUseCase.execute(id: string): Promise<MedicationResponseDto>`
- `CreateMedicationUseCase.execute(dto: CreateMedicationDto): Promise<MedicationResponseDto>`
- `UpdateMedicationUseCase.execute(id: string, dto: UpdateMedicationDto): Promise<MedicationResponseDto>`
- `DeleteMedicationUseCase.execute(id: string): Promise<void>`

**IMedicationsRepository:**
- `findAll(page: number, limit: number, search: string | undefined, includeInactive: boolean): Promise<[Medication[], number]>`
- `findById(id: string): Promise<Medication | null>`
- `create(data, queryRunner?): Promise<Medication>`
- `update(id, data, queryRunner?): Promise<Medication>`
- `delete(id, queryRunner?): Promise<void>` (softDelete)
- `bulkUpsert(rows: Partial<Medication>[], queryRunner?): Promise<void>` — **assinatura já definida nesta task; usada na task #2 (import)**. Implementar com `INSERT ... ON CONFLICT (import_hash) DO UPDATE` em lote.

---

## Fluxo principal

**GET /medications** (PLATFORM_ADMIN, ADMIN, DOCTOR)
1. Recebe `MedicationListQueryDto`.
2. `includeInactive` só é respeitado para `PLATFORM_ADMIN`; demais roles sempre `is_active = true`.
3. Tenta cache `medications:list:${page}:${limit}:${search ?? 'all'}:${includeInactive}` — se hit, retorna.
4. Miss → repository `findAll`: filtra soft-delete (automático), `is_active` conforme flag, e `search` via `ILIKE` em `name`/`active_ingredient`; ordena por `name ASC`; pagina.
5. Salva cache (TTL 60s), retorna `200` com `{ data, total, page, limit }`.

**GET /medications/:id** (PLATFORM_ADMIN, ADMIN, DOCTOR)
1. Cache `medication:${id}` — se hit, retorna.
2. Miss → `findById` → `NotFoundException` se não existir.
3. Salva cache (TTL 300s), retorna `200`.

**POST /medications** (PLATFORM_ADMIN)
1. Cria entrada com `source = MANUAL`, `import_hash = null`, `is_active = true`.
2. Persiste, invalida `medications:list*`, retorna `201`.

**PATCH /medications/:id** (PLATFORM_ADMIN)
1. `findById` → `NotFoundException`.
2. Atualiza (inclui toggle `isActive`); invalida `medication:${id}` + `medications:list*`; retorna `200`.

**DELETE /medications/:id** (PLATFORM_ADMIN)
1. `findById` → `NotFoundException`.
2. `softDelete`; invalida `medication:${id}` + `medications:list*`; retorna `204`.

---

## Fluxos alternativos
- Recurso não encontrado (GET por id / PATCH / DELETE) → `NotFoundException`.
- `search` vazio/omitido → lista sem filtro de texto.
- `includeInactive=true` como ADMIN/DOCTOR → ignora flag, só ativos.
- Falha de invalidação de cache → `warn` + segue (try/catch isolado).

---

## Regras de negócio
- Base é global: nenhuma operação considera `clinicId`.
- `source` define a origem: `MANUAL` (POST) ou `ANVISA` (import). POST sempre cria `MANUAL`.
- "Remover da listagem" sem apagar → `isActive=false`. Excluir de fato → soft delete (DELETE).
- `import_hash` não é exposto na API nem aceito em DTO de entrada — é interno (dedup do import).

---

## Permissões

| Ação | PLATFORM_ADMIN | ADMIN | DOCTOR | USER |
|---|:---:|:---:|:---:|:---:|
| Listar | ✓ | ✓ (leitura) | ✓ (leitura) | ✗ |
| Ver por ID | ✓ | ✓ (leitura) | ✓ (leitura) | ✗ |
| Criar | ✓ | ✗ | ✗ | ✗ |
| Editar / Ativar-Desativar | ✓ | ✗ | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ |

Aplicar via `@Roles(...)`. PLATFORM_ADMIN é o único que escreve. ADMIN/DOCTOR leem para a futura prescrição.

---

## Dependências
- `CacheService` (existente).
- `PaginationDto` de `common/dto/` (base p/ `MedicationListQueryDto`).

---

## Decisões técnicas da task
- **Transação:** Não nos CRUDs simples (entidade única). `bulkUpsert` aceita `QueryRunner` opcional (usado pelo import na task #2).
- **Cache:** Sim — `medication:${id}` (TTL 300s) e `medications:list:...` (TTL 60s). Invalidar em create/update/delete.
- **Soft delete:** Sim — `@DeleteDateColumn deleted_at`.
- **Paginação:** Sim — `{ data, total, page, limit }`.
- **Colunas union (`string | null`):** declarar `type` explícito (regra do `backend.md` — senão TypeORM infere `"Object"` e derruba o boot).

---

## Restrições
- NÃO adicionar `clinic_id` — é reference data global.
- NÃO acessar repository direto do controller.
- NÃO retornar entidade crua — mapear para `MedicationResponseDto`.
- NÃO expor `import_hash` na API.
- NÃO usar `process.env` fora de `env.config.ts`.

---

## Estrutura esperada

```
modules/medications/
  controllers/
    medications.controller.ts
    medications.controller.spec.ts
  use-cases/
    find-medications.use-case.ts
    get-medication.use-case.ts
    create-medication.use-case.ts
    update-medication.use-case.ts
    delete-medication.use-case.ts
  repositories/
    medications.repository.interface.ts
    medications.repository.ts
    medications.repository.spec.ts
  entities/
    medication.entity.ts
  dto/
    medication-list-query.dto.ts
  tests/
    find-medications.use-case.spec.ts
    get-medication.use-case.spec.ts
    create-medication.use-case.spec.ts
    update-medication.use-case.spec.ts
    delete-medication.use-case.spec.ts
    medications.integration.spec.ts
  medications.module.ts

packages/shared/src/enums/
  medication-source.enum.ts
packages/shared/src/dtos/
  create-medication.dto.ts
  update-medication.dto.ts
  medication-response.dto.ts
  medication-list-query.dto.ts
  paginated-medications-response.dto.ts
```

> `MedicationListQueryDto` pode morar tanto em `packages/shared` quanto em `modules/medications/dto/` — seguir o padrão do projeto (query DTOs de listagem ficam no módulo, ex.: `ListPatientsQueryDto`). Manter um único local; não duplicar.

---

## Migration

`1751000000000-create-medications-table.ts` (padrão `SET search_path TO "${schema}", public`):

```sql
CREATE TABLE "medications" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"                varchar(250) NOT NULL,
  "active_ingredient"   varchar(500) NULL,
  "regulatory_category" varchar(120) NULL,
  "therapeutic_class"   varchar(250) NULL,
  "holder_company"      varchar(250) NULL,
  "registration_number" varchar(40)  NULL,
  "registration_status" varchar(40)  NULL,
  "source"              varchar(20)  NOT NULL DEFAULT 'manual',
  "import_hash"         varchar(64)  NULL,
  "is_active"           boolean      NOT NULL DEFAULT true,
  "created_at"          timestamptz  NOT NULL DEFAULT now(),
  "updated_at"          timestamptz  NOT NULL DEFAULT now(),
  "deleted_at"          timestamptz  NULL
);
-- Dedup do import: único quando preenchido; entradas MANUAL têm import_hash NULL (não colidem)
CREATE UNIQUE INDEX "UQ_medications_import_hash" ON "medications" ("import_hash") WHERE "import_hash" IS NOT NULL;
-- Busca por nome / princípio ativo (ILIKE)
CREATE INDEX "IDX_medications_name" ON "medications" ("name");
CREATE INDEX "IDX_medications_active_ingredient" ON "medications" ("active_ingredient");
```

`down`: dropar índices e tabela.

> Considerar `pg_trgm` + índice GIN para acelerar `ILIKE '%termo%'` numa fase de otimização; nesta task o índice btree em `name` é suficiente.

---

## Cenários de teste adicionais
- GET sem search → lista paginada por `name`.
- GET com search → filtra por `name`/`active_ingredient` (case-insensitive).
- GET com includeInactive=true como PLATFORM_ADMIN → inclui inativos; como ADMIN/DOCTOR → ignora (só ativos).
- GET como USER → `403`.
- GET por id inexistente → `404`.
- POST como PLATFORM_ADMIN → `201`, `source=manual`, `import_hash=null`.
- POST como ADMIN/DOCTOR → `403`.
- POST com campo extra (whitelist) → `400`.
- PATCH isActive=false → some das listagens de ADMIN/DOCTOR (que só veem ativos).
- PATCH/DELETE inexistente → `404`.
- DELETE como PLATFORM_ADMIN → `204` (soft delete; registro some das queries).
- Sem token → `401`.
- Cache invalidado após create/update/delete.

---

## Definition of Done
- [ ] Enum `MedicationSource` + DTOs no `@app/shared` exportados via `index.ts`
- [ ] Endpoints GET (lista + por id), POST, PATCH, DELETE com permissões corretas
- [ ] Listagem paginada + busca por `name`/`active_ingredient`
- [ ] `bulkUpsert` implementado no repository (assinatura pronta p/ a task de import)
- [ ] Migration criada e executada (incl. índice único parcial em `import_hash`)
- [ ] Cache aplicado (`medication:${id}` 300s, `medications:list*` 60s) e invalidado após mutations
- [ ] Soft delete + flag `is_active`
- [ ] Testes unitários (100%) de use-cases, repository e controller
- [ ] Testes de integração cobrindo os cenários acima
- [ ] `MedicationsModule` registrado em `app.module.ts` e exportando `IMedicationsRepository` (consumido pela task de import e, futuramente, pelo módulo de receitas)
- [ ] Naming convention e estrutura de pastas seguidas
