# Task — Templates de Prontuário (Backend)

## Descrição
Implementar o módulo `medical-record-templates`: a clínica (ADMIN) define, por **especialidade**, a estrutura flexível de campos (`fields`) que compõe o prontuário daquela especialidade. O template é a unidade configurável por `clinic + specialty` (sem customização por médico). A estrutura dos campos é armazenada como JSONB.

---

## Contexto
- Granularidade: **um template por `clinic + specialty`** (índice único parcial). Sem `doctor_id`.
- `fields` é JSONB — flexibilidade sem migration por mudança de estrutura.
- A `key` de cada field é **gerada pelo backend** a partir do `label` (slug + sufixo curto) e é **imutável**. O cliente nunca define `key`.
- Campos `select`/`multiselect` usam `options: { value, label }[]`.
- Campos podem vir do catálogo canônico (`canonical: true` + `canonicalKey`) ou ser livres (`canonical: false`).
- Depende do módulo `medical-record-canonical-fields` (task anterior) para validar `canonicalKey`.
- Tudo escopado por `clinicId` do `currentUser`. PLATFORM_ADMIN não acessa templates de clínica.

---

## Contratos

### Estrutura de um field (JSONB, contrato validado por DTO)
```jsonc
{
  "key": "blood_pressure_a1b2",   // gerada pelo backend, imutável
  "label": "Pressão arterial",
  "type": "text",                  // MedicalRecordFieldType
  "required": true,
  "order": 1,
  "options": null,                 // [{value,label}] p/ select/multiselect
  "placeholder": null,
  "helpText": null,
  "canonical": true,
  "canonicalKey": "blood_pressure" // null se livre
}
```

### Input (DTO)

**MedicalRecordTemplateFieldDto:** label, type, required (boolean), order (int ≥ 0), options?: MedicalRecordFieldOptionDto[], placeholder?, helpText?, canonical (boolean), canonicalKey?: string. **`key` é ignorada na entrada** (gerada no backend).

**CreateMedicalRecordTemplateDto:** specialtyId (uuid), name (string min 2 max 120), fields: MedicalRecordTemplateFieldDto[] (`@ValidateNested({each:true})` + `@Type`, `@ArrayMinSize(1)`).

**UpdateMedicalRecordTemplateDto:** name?, fields?, isActive?: boolean.

**MedicalRecordTemplateListQueryDto (extends PaginationDto):** specialtyId?.

### Output

**MedicalRecordTemplateResponseDto:** id, specialtyId, specialtyName, name, fields (com `key` resolvida), isActive, createdAt, updatedAt.

**PaginatedMedicalRecordTemplatesResponseDto:** data, total, page, limit.

---

## Assinaturas esperadas

**Use-cases:**
- `CreateMedicalRecordTemplateUseCase.execute(dto, currentUser): Promise<MedicalRecordTemplateResponseDto>`
- `UpdateMedicalRecordTemplateUseCase.execute(id, dto, currentUser): Promise<MedicalRecordTemplateResponseDto>`
- `FindAllMedicalRecordTemplatesUseCase.execute(query, currentUser): Promise<PaginatedMedicalRecordTemplatesResponseDto>`
- `FindMedicalRecordTemplateByIdUseCase.execute(id, currentUser): Promise<MedicalRecordTemplateResponseDto>`
- `FindTemplateByClinicAndSpecialtyUseCase.execute(clinicId, specialtyId): Promise<MedicalRecordTemplate | null>` **(exportado para o módulo de prontuários)**
- `DeleteMedicalRecordTemplateUseCase.execute(id, currentUser): Promise<void>`

**IMedicalRecordTemplatesRepository:**
- `findAll(clinicId, page, limit, specialtyId?): Promise<[MedicalRecordTemplate[], number]>`
- `findById(id, clinicId): Promise<MedicalRecordTemplate | null>`
- `findByClinicAndSpecialty(clinicId, specialtyId): Promise<MedicalRecordTemplate | null>`
- `create(data, clinicId, queryRunner?): Promise<MedicalRecordTemplate>`
- `update(id, data, clinicId, queryRunner?): Promise<MedicalRecordTemplate>`
- `delete(id, clinicId, queryRunner?): Promise<void>`

---

## Fluxo principal

**POST /medical-record-templates** (ADMIN)
1. Valida que `specialtyId` está vinculada à clínica (`clinic_specialties`) → `UnprocessableEntityException` se não.
2. Garante que não existe template ativo para `clinic+specialty` → `ConflictException`.
3. **Gera `key`** de cada field (slug do label + sufixo curto), garantindo unicidade dentro do template.
4. Valida fields: `options` obrigatório ⇔ select/multiselect (com `value` único); se `canonical: true`, `canonicalKey` deve existir no catálogo e `type` bater.
5. Persiste, invalida cache, retorna `201`.

**GET /medical-record-templates** (ADMIN, DOCTOR) — escopado por `clinicId`; DOCTOR pode listar (leitura) para preencher prontuários. Cache + paginação.

**GET /medical-record-templates/:id** (ADMIN, DOCTOR) — cache `medical_record_template:${id}`; `NotFoundException` se de outra clínica.

**PATCH /medical-record-templates/:id** (ADMIN)
1. Busca por id+clinicId → `NotFoundException`.
2. Se `fields` enviado: preservar `key` de fields existentes (casar por `key` recebida quando presente) e gerar `key` para novos; revalidar canonical/options.
3. Optimistic lock → `ConflictException` em mismatch.
4. Invalida `medical_record_template:${id}` + lista.

**DELETE /medical-record-templates/:id** (ADMIN) — soft delete; invalida cache; `204`.

---

## Fluxos alternativos
- specialtyId fora de `clinic_specialties` → `422`
- Template já existe para clinic+specialty → `409`
- select/multiselect sem options ou com value repetido → `422`
- canonical=true com canonicalKey inexistente no catálogo ou type divergente → `422`
- Template de outra clínica em GET/PATCH/DELETE → `404`
- Optimistic lock → `409`
- Falha de cache → `warn` + segue

---

## Regras de negócio
- Um template ativo por `clinic + specialty`.
- `key` gerada e imutável; editar `label` não altera `key`.
- `options` obrigatório ⇔ select/multiselect; `value` único.
- `canonicalKey` (quando `canonical:true`) deve existir no catálogo e ter `type` compatível.
- Soft delete sempre.
- Constraint extra de banco: `UNIQUE (id, specialty_id)` no template (alvo de FK composta usada pelo módulo de prontuários — ver task de prontuários).

---

## Permissões

| Ação | ADMIN | DOCTOR | USER | PLATFORM_ADMIN |
|---|:---:|:---:|:---:|:---:|
| Criar/Editar/Excluir | ✓ | ✗ | ✗ | ✗ |
| Listar/Ver | ✓ | ✓ | ✗ | ✗ |

---

## Dependências
- `IClinicSpecialtiesRepository` / `ClinicSpecialtiesModule` — validar specialty ∈ clínica.
- `FindCanonicalFieldsUseCase` ou repositório do catálogo / `MedicalRecordCanonicalFieldsModule` — validar `canonicalKey`.
- `ISpecialtiesRepository` — nome da especialidade para o response.
- `CacheService`.

---

## Decisões técnicas da task
- **Transação:** Não — entidade única.
- **Cache:** `medical_record_template:${id}` (300s), `medical_record_templates:list:${clinicId}:${page}:${limit}:${specialtyId|all}` (60s).
- **Concorrência:** Optimistic Lock (`@VersionColumn`).
- **fields:** coluna `jsonb`.
- **Geração de key:** util puro (ex: `slugify(label) + '_' + short()`), testável isoladamente.

---

## Restrições
- NÃO aceitar `key` do cliente — sempre gerar.
- NÃO permitir `doctor_id` no template.
- NÃO acessar repository de outro módulo direto — usar use-cases/repos expostos.
- NÃO retornar entidade crua.
- NÃO `process.env` fora de `env.config.ts`.

---

## Estrutura esperada
```
modules/medical-record-templates/
  controllers/medical-record-templates.controller.ts (+ .spec)
  use-cases/
    create-medical-record-template.use-case.ts
    update-medical-record-template.use-case.ts
    find-all-medical-record-templates.use-case.ts
    find-medical-record-template-by-id.use-case.ts
    find-template-by-clinic-and-specialty.use-case.ts
    delete-medical-record-template.use-case.ts
  repositories/
    medical-record-templates.repository.interface.ts
    medical-record-templates.repository.ts (+ .spec)
  entities/medical-record-template.entity.ts
  dto/medical-record-template-list-query.dto.ts
  utils/generate-field-key.util.ts (+ .spec)
  tests/ (use-cases .spec + integration.spec)
  medical-record-templates.module.ts

packages/shared/src/dtos/
  medical-record-template-field.dto.ts
  create-medical-record-template.dto.ts
  update-medical-record-template.dto.ts
  medical-record-template-response.dto.ts
  paginated-medical-record-templates-response.dto.ts
```

---

## Migration
`1750700000000-create-medical-record-templates-table.ts`:
```sql
CREATE TABLE "medical_record_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
  "specialty_id" uuid NOT NULL REFERENCES "specialties"("id") ON DELETE RESTRICT,
  "name" varchar NOT NULL,
  "fields" jsonb NOT NULL DEFAULT '[]',
  "is_active" boolean NOT NULL DEFAULT true,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz NULL
);
CREATE UNIQUE INDEX "UQ_template_clinic_specialty"
  ON "medical_record_templates" ("clinic_id","specialty_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "IDX_templates_clinic" ON "medical_record_templates" ("clinic_id");
ALTER TABLE "medical_record_templates"
  ADD CONSTRAINT "UQ_template_id_specialty" UNIQUE ("id","specialty_id");
```

---

## Seed (dev)
1 template por especialidade da clínica seed, usando 2–3 campos canônicos + 1 livre.

---

## Cenários de teste adicionais
- POST com specialty fora da clínica → `422`
- POST duplicado para clinic+specialty → `409`
- POST gera `key` a partir do label e ignora `key` enviada
- POST select sem options / value repetido → `422`
- POST canonical=true com canonicalKey inexistente → `422`
- PATCH preserva `key` dos fields existentes e gera para os novos
- GET escopado: template de outra clínica → `404`
- DOCTOR lista/vê → `200`; DOCTOR cria → `403`
- DELETE → `204` + soft delete
- `generate-field-key.util` testado isoladamente (slug, unicidade, caracteres especiais/acentos)
- Cache invalidado após mutations

---

## Definition of Done
- [ ] DTOs/field DTO no `@app/shared` exportados
- [ ] CRUD + `FindTemplateByClinicAndSpecialtyUseCase` exportado pelo módulo
- [ ] Geração de `key` imutável + util testado
- [ ] Validação specialty∈clínica, unicidade clinic+specialty, options, canonicalKey
- [ ] Migration (incl. `UQ_template_id_specialty`) criada e executada
- [ ] Cache aplicado e invalidado
- [ ] Optimistic lock no update
- [ ] Soft delete
- [ ] Testes unitários (100%) + integração cobrindo cenários
- [ ] `MedicalRecordTemplatesModule` registrado em `app.module.ts`; importa canonical-fields + clinic-specialties
- [ ] Naming convention e estrutura seguidas
