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
# Task — Catálogo de Campos Canônicos de Prontuário (Backend)

## Descrição
Implementar o módulo `medical-record-canonical-fields`: um catálogo de campos **padronizados pela plataforma** que serve de sugestão ao montar templates de prontuário. É reference data global (sem `clinicId`), gerida pelo `PLATFORM_ADMIN` e lida por ADMIN/DOCTOR. Quanto mais as clínicas adotam o catálogo, maior a aderência e a comparabilidade dos prontuários entre clínicas (base para relatórios cross-clínica).

---

## Contexto
- É a **primeira** entrega da feature de prontuários — não depende de nenhum módulo novo.
- Não tem `clinic_id`: o catálogo é da plataforma, não da clínica.
- Não usa soft delete — usa `is_active` (reference data; desativar em vez de apagar).
- `canonical_key` é a chave estável global (única) que será referenciada por `fields[].canonicalKey` nos templates.
- Sugestões podem ser gerais (`specialty_id = null`) ou específicas de uma especialidade.
- Catálogo muda pouco → cache de leitura agressivo.

---

## Contratos

### Input (DTO)

**CreateCanonicalFieldDto** (PLATFORM_ADMIN):
- canonicalKey: string (obrigatório, slug `^[a-z][a-z0-9_]*$`, min 2, max 60)
- label: string (obrigatório, min 2, max 120)
- type: MedicalRecordFieldType (enum, obrigatório)
- options?: MedicalRecordFieldOptionDto[] (obrigatório quando type ∈ {select, multiselect}; proibido caso contrário)
- unit?: string (opcional, max 20)
- specialtyId?: string (uuid, opcional; null = sugestão geral)
- description?: string (opcional, max 500)

**UpdateCanonicalFieldDto** (PLATFORM_ADMIN): todos os campos acima opcionais + `isActive?: boolean`.

**MedicalRecordFieldOptionDto:**
- value: string (obrigatório, min 1, max 60)
- label: string (obrigatório, min 1, max 120)

**CanonicalFieldListQueryDto:**
- specialtyId?: string (uuid) — retorna gerais (`specialty_id IS NULL`) + os da especialidade informada
- includeInactive?: boolean (default false; só PLATFORM_ADMIN)

### Output

**CanonicalFieldResponseDto:**
- id, canonicalKey, label, type, options (MedicalRecordFieldOptionDto[] | null), unit (string | null), specialtyId (string | null), description (string | null), isActive

> Listagem **não paginada** (catálogo pequeno) — retorna `CanonicalFieldResponseDto[]`.

---

## Enums e DTOs compartilhados (`packages/shared`)

- `src/enums/medical-record-field-type.enum.ts` → `MedicalRecordFieldType { TEXT='text', TEXTAREA='textarea', NUMBER='number', BOOLEAN='boolean', DATE='date', SELECT='select', MULTISELECT='multiselect' }` — exportar em `enums/index.ts`.
- `src/dtos/medical-record-field-option.dto.ts` → `MedicalRecordFieldOptionDto`.
- `src/dtos/create-canonical-field.dto.ts`, `update-canonical-field.dto.ts`, `canonical-field-response.dto.ts`.
- Exportar tudo em `src/dtos/index.ts`.

---

## Assinaturas esperadas

**Use-cases:**
- `FindCanonicalFieldsUseCase.execute(query: CanonicalFieldListQueryDto, currentUser: ICurrentUser): Promise<CanonicalFieldResponseDto[]>`
- `CreateCanonicalFieldUseCase.execute(dto: CreateCanonicalFieldDto): Promise<CanonicalFieldResponseDto>`
- `UpdateCanonicalFieldUseCase.execute(id: string, dto: UpdateCanonicalFieldDto): Promise<CanonicalFieldResponseDto>`

**IMedicalRecordCanonicalFieldsRepository:**
- `findForSuggestion(specialtyId: string | undefined, includeInactive: boolean): Promise<MedicalRecordCanonicalField[]>`
- `findById(id: string): Promise<MedicalRecordCanonicalField | null>`
- `findByCanonicalKey(canonicalKey: string): Promise<MedicalRecordCanonicalField | null>`
- `create(data, queryRunner?): Promise<MedicalRecordCanonicalField>`
- `update(id, data, queryRunner?): Promise<MedicalRecordCanonicalField>`

---

## Fluxo principal

**GET /medical-record-canonical-fields** (ADMIN, DOCTOR, PLATFORM_ADMIN)
1. Recebe `CanonicalFieldListQueryDto`.
2. Tenta cache `canonical_fields:list:${specialtyId ?? 'all'}` — se hit, retorna.
3. Miss → repository `findForSuggestion`: `WHERE is_active = true AND (specialty_id IS NULL OR specialty_id = :specialtyId)` ordenado por `specialty_id NULLS FIRST, label`.
4. `includeInactive=true` só é respeitado para PLATFORM_ADMIN; demais roles sempre `is_active = true`.
5. Salva cache (TTL 600s), retorna `200`.

**POST /medical-record-canonical-fields** (PLATFORM_ADMIN)
1. Valida coerência `type`×`options` (select/multiselect exige options com `value` único; demais tipos proíbem options).
2. Se `specialtyId` informado, valida que a especialidade existe → `UnprocessableEntityException` se não.
3. `canonicalKey` único → `ConflictException` se já existir.
4. Persiste, invalida `canonical_fields:list*`, retorna `201`.

**PATCH /medical-record-canonical-fields/:id** (PLATFORM_ADMIN)
1. Busca por id → `NotFoundException`.
2. Revalida `type`×`options` se algum dos dois mudar.
3. Se `canonicalKey` mudou, revalida unicidade.
4. Atualiza (optimistic lock se aplicável), invalida cache, retorna `200`.

---

## Fluxos alternativos
- `canonicalKey` duplicado → `ConflictException('Canonical key already in use')`
- select/multiselect sem `options` (ou com `value` repetido) → `UnprocessableEntityException`
- `options` enviado para tipo não-select → `UnprocessableEntityException`
- `specialtyId` inexistente → `UnprocessableEntityException('Specialty not found')`
- Campo não encontrado em PATCH → `NotFoundException`
- Falha de invalidação de cache → `warn` + segue (try/catch isolado)

---

## Regras de negócio
- `canonical_key` único e imutável em sentido prático (evitar trocar; se mudar, revalidar unicidade).
- `options` obrigatório ⇔ `type ∈ {select, multiselect}`.
- Catálogo é global: nenhuma operação considera `clinicId`.
- Desativação via `isActive=false` — nunca exclusão física; não há endpoint de DELETE nesta task.

---

## Permissões

| Ação | PLATFORM_ADMIN | ADMIN | DOCTOR | USER |
|---|:---:|:---:|:---:|:---:|
| Listar/sugerir | ✓ | ✓ | ✓ | ✗ |
| Criar | ✓ | ✗ | ✗ | ✗ |
| Editar | ✓ | ✗ | ✗ | ✗ |

Aplicar via `@Roles(...)`. PLATFORM_ADMIN é o único que escreve.

---

## Dependências
- `ISpecialtiesRepository` (existente) — validar `specialtyId`. Importar `SpecialtiesModule`.
- `CacheService` (existente).

---

## Decisões técnicas da task
- **Transação:** Não — entidade única.
- **Cache:** Sim — `canonical_fields:list:${specialtyId|all}` (TTL 600s). Invalidar em create/update.
- **Soft delete:** Não — usar `is_active`.
- **Paginação:** Não — catálogo pequeno, retornar array.
- **options/snapshot:** armazenar `options` como `jsonb`.

---

## Restrições
- NÃO adicionar `clinic_id` — é reference data global.
- NÃO acessar repository direto do controller.
- NÃO retornar entidade crua — mapear para `CanonicalFieldResponseDto`.
- NÃO usar `process.env` fora de `env.config.ts`.
- NÃO permitir DELETE — só desativação.

---

## Estrutura esperada

```
modules/medical-record-canonical-fields/
  controllers/
    medical-record-canonical-fields.controller.ts
    medical-record-canonical-fields.controller.spec.ts
  use-cases/
    find-canonical-fields.use-case.ts
    create-canonical-field.use-case.ts
    update-canonical-field.use-case.ts
  repositories/
    medical-record-canonical-fields.repository.interface.ts
    medical-record-canonical-fields.repository.ts
    medical-record-canonical-fields.repository.spec.ts
  entities/
    medical-record-canonical-field.entity.ts
  dto/
    canonical-field-list-query.dto.ts
  tests/
    find-canonical-fields.use-case.spec.ts
    create-canonical-field.use-case.spec.ts
    update-canonical-field.use-case.spec.ts
    medical-record-canonical-fields.integration.spec.ts
  medical-record-canonical-fields.module.ts

packages/shared/src/enums/
  medical-record-field-type.enum.ts
packages/shared/src/dtos/
  medical-record-field-option.dto.ts
  create-canonical-field.dto.ts
  update-canonical-field.dto.ts
  canonical-field-response.dto.ts
```

---

## Migration

`1750600000000-create-medical-record-canonical-fields-table.ts` (padrão `SET search_path TO "${schema}", public`):

```sql
CREATE TABLE "medical_record_canonical_fields" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "canonical_key" varchar NOT NULL,
  "label"         varchar NOT NULL,
  "type"          varchar NOT NULL,
  "options"       jsonb NULL,
  "unit"          varchar NULL,
  "specialty_id"  uuid NULL REFERENCES "specialties"("id"),
  "description"   varchar NULL,
  "is_active"     boolean NOT NULL DEFAULT true,
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "updated_at"    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "UQ_canonical_field_key" ON "medical_record_canonical_fields" ("canonical_key");
CREATE INDEX "IDX_canonical_fields_specialty" ON "medical_record_canonical_fields" ("specialty_id");
```

`down`: dropar índices e tabela.

---

## Seed (reference data — todos os ambientes)
Seed idempotente populando o catálogo inicial (não sobrescrever se já existir, casar por `canonical_key`):
- Gerais (`specialty_id = null`): `weight` (number, kg), `height` (number, cm), `blood_pressure` (text, mmHg), `heart_rate` (number, bpm), `temperature` (number, °C), `chief_complaint` (textarea), `allergies` (textarea), `smoker` (boolean).
- Por especialidade (quando existir no ambiente): cardiologia → `risk_level` (select: Baixo/Moderado/Alto com value `low|moderate|high`).
- Disponibilizar em dev e test (test com subset mínimo).

---

## Cenários de teste adicionais
- GET sem specialtyId → retorna apenas gerais ativos.
- GET com specialtyId → retorna gerais + os da especialidade, ordenados (gerais primeiro).
- GET com includeInactive=true como DOCTOR/ADMIN → ignora flag, só ativos.
- GET com includeInactive=true como PLATFORM_ADMIN → inclui inativos.
- POST select sem options → `422`.
- POST text com options → `422`.
- POST canonicalKey duplicado → `409`.
- POST specialtyId inexistente → `422`.
- POST como ADMIN → `403`.
- PATCH isActive=false → some das listagens de DOCTOR/ADMIN.
- PATCH inexistente → `404`.
- Sem token → `401`.
- Cache invalidado após create/update.

---

## Definition of Done
- [ ] Enum `MedicalRecordFieldType` + DTOs no `@app/shared` exportados via `index.ts`
- [ ] Endpoints GET/POST/PATCH implementados com permissões corretas
- [ ] Validação `type`×`options` no use-case
- [ ] Migration criada e executada
- [ ] Seed idempotente do catálogo (dev + test)
- [ ] Cache aplicado (TTL 600s) e invalidado após mutations
- [ ] Testes unitários (100%) de use-cases, repository e controller
- [ ] Testes de integração cobrindo cenários acima
- [ ] `MedicalRecordCanonicalFieldsModule` registrado em `app.module.ts` e exportando o repositório/`FindCanonicalFieldsUseCase` para uso pelo módulo de templates
- [ ] Naming convention e estrutura de pastas seguidas
