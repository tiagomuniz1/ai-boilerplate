# Task — Módulo de Clínicas (Backend)

## Descrição
Implementar o CRUD completo da entidade `Clinic`, que representa uma clínica cadastrada na plataforma. É o ponto de partida do modelo multi-tenant — cada clínica é um tenant independente. Esta task não altera os módulos existentes; apenas cria a nova entidade e seus endpoints.

---

## Contexto
- `Clinic` é a entidade raiz do modelo multi-tenant. Todos os outros recursos (usuários, médicos, pacientes, agendas) serão vinculados a uma clínica nas tasks seguintes.
- O `slug` identifica a clínica de forma legível e única (ex: `clinica-do-coracao`). É gerado automaticamente a partir do `name` no momento da criação, mas pode ser informado manualmente.
- Apenas usuários com role `ADMIN` podem criar, editar e desativar clínicas. Clínicas não são excluídas — apenas desativadas via `isActive`.
- Esta task não adiciona `clinic_id` aos módulos existentes — isso ocorre na task **adicionar-clinic-id-ao-schema**.

---

## Contratos

### Input (DTO)

**CreateClinicDto:**
- name: string (obrigatório, min 3, max 120)
- slug?: string (opcional, min 3, max 80, formato kebab-case: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`)

**UpdateClinicDto:**
- name?: string (min 3, max 120)
- slug?: string (min 3, max 80, formato kebab-case)
- isActive?: boolean

**ListClinicsQueryDto (extends PaginationDto):**
- search?: string (busca por name ou slug)

### Output

**ClinicResponseDto:**
- id: string (uuid)
- name: string
- slug: string
- isActive: boolean
- createdAt: Date
- updatedAt: Date

**PaginatedClinicsResponseDto:**
- data: ClinicResponseDto[]
- total: number
- page: number
- limit: number

---

## Assinaturas esperadas

**Use-cases:**
- `CreateClinicUseCase.execute(dto: CreateClinicDto): Promise<ClinicResponseDto>`
- `FindAllClinicsUseCase.execute(query: ListClinicsQueryDto): Promise<PaginatedClinicsResponseDto>`
- `FindClinicByIdUseCase.execute(id: string): Promise<ClinicResponseDto>`
- `UpdateClinicUseCase.execute(id: string, dto: UpdateClinicDto): Promise<ClinicResponseDto>`

**IClinicsRepository:**
- `findAll(page: number, limit: number, search?: string): Promise<[Clinic[], number]>`
- `findById(id: string): Promise<Clinic | null>`
- `findBySlug(slug: string): Promise<Clinic | null>`
- `create(data: { name: string; slug: string }): Promise<Clinic>`
- `update(id: string, data: UpdateClinicDto): Promise<Clinic>`

---

## Fluxo principal

**POST /clinics**
1. Controller recebe `CreateClinicDto` validado.
2. Use-case gera o slug: se não fornecido, deriva do `name` (lowercase, espaços → hífens, remove caracteres especiais).
3. Verifica unicidade do slug — `ConflictException` se já existir.
4. Persiste a clínica com `isActive: true`.
5. Invalida cache `clinics:list*`.
6. Retorna `ClinicResponseDto` com status `201`.

**GET /clinics**
1. Controller recebe `ListClinicsQueryDto`.
2. Use-case tenta cache `clinics:list:${page}:${limit}:${search ?? 'all'}` — se hit, retorna.
3. Se miss, busca no repository (busca por `name` ILIKE ou `slug` ILIKE), salva no cache (TTL 60s) e retorna `200`.

**GET /clinics/:id**
1. Use-case tenta cache `clinic:${id}` — se hit, retorna.
2. Se miss, busca no repository, salva (TTL 300s).
3. Se não existir, lança `NotFoundException`.

**PATCH /clinics/:id**
1. Use-case busca a clínica — `NotFoundException` se não existir.
2. Se `slug` mudou, verifica unicidade.
3. Atualiza via repository.
4. Invalida `clinic:${id}` e `clinics:list*`.
5. Retorna `ClinicResponseDto` com status `200`.

---

## Fluxos alternativos

- Slug já em uso na criação ou atualização → `ConflictException('Slug already in use')`
- Clínica não encontrada em GET/PATCH → `NotFoundException('Clinic not found')`
- Slug com formato inválido → `400 Bad Request` (validação DTO)
- Falha na invalidação do cache → logar `warn` e seguir o fluxo

---

## Regras de negócio

- Slug único entre todas as clínicas (incluindo inativas — o slug identifica permanentemente a clínica).
- Slug gerado automaticamente: `name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')`.
- Clínicas não são excluídas — apenas desativadas via `isActive: false`.
- Soft delete (`deletedAt`) reservado para remoção administrativa extrema — não expor no CRUD normal.

---

## Dependências

- `IClinicsRepository` (novo)
- `CacheService` (existente)

---

## Decisões técnicas da task

- **Transação:** Não — operações envolvem uma única tabela.
- **Cache:** Sim — `clinic:${id}` (TTL 300s) e `clinics:list:*` (TTL 60s).
- **Optimistic lock:** Sim — `@VersionColumn` na entidade `Clinic`.
- **Soft delete:** Sim — `@DeleteDateColumn` na entidade.
- **Slug generation:** No use-case de criação, não no DTO — regra de negócio, não validação de entrada.

---

## Restrições

- NÃO acessar repository diretamente do controller.
- NÃO retornar a entidade `Clinic` crua — sempre mapear para `ClinicResponseDto`.
- NÃO implementar hard delete.
- NÃO adicionar `clinic_id` nos outros módulos nesta task.
- NÃO criar endpoint público de registro de clínica aqui — isso é responsabilidade da task **criar-fluxo-de-onboarding-de-clinica**.

---

## Migration

```sql
CREATE TABLE clinics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(80)  NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  version     INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX "clinics_slug_unique"
  ON clinics (slug)
  WHERE deleted_at IS NULL;
```

---

## Estrutura esperada

```
modules/clinics/
  controllers/
    clinics.controller.ts
  use-cases/
    create-clinic.use-case.ts
    find-all-clinics.use-case.ts
    find-clinic-by-id.use-case.ts
    update-clinic.use-case.ts
  repositories/
    clinics.repository.interface.ts
    clinics.repository.ts
  dto/
    list-clinics-query.dto.ts
  entities/
    clinic.entity.ts
  tests/
    clinics.integration.spec.ts
  clinics.module.ts

packages/shared/src/dtos/
  create-clinic.dto.ts
  update-clinic.dto.ts
  clinic-response.dto.ts
  paginated-clinics-response.dto.ts
```

---

## Cenários de teste adicionais

- Criar clínica com nome válido e sem slug → slug gerado corretamente
- Criar clínica com slug informado manualmente → slug persistido como enviado
- Criar clínica com slug já em uso → `409 Conflict`
- Criar clínica com slug em formato inválido (com maiúsculas, espaços, caracteres especiais) → `400 Bad Request`
- Listar clínicas retorna `total`, `page`, `limit` corretos
- Busca por name parcial retorna resultados corretos
- Busca por slug retorna resultados corretos
- Cache hit não chama repository
- Buscar clínica inexistente → `404 Not Found`
- Atualizar slug para slug já em uso por outra clínica → `409 Conflict`
- Desativar clínica via `isActive: false` → retorna `200` com `isActive: false`
- Resposta nunca contém `version` ou `deletedAt`

---

## Definition of Done

- [ ] Entidade `Clinic` com soft delete e optimistic lock
- [ ] Migration criada e aplicada no schema `test`
- [ ] CRUD de 4 endpoints implementado (sem DELETE exposto)
- [ ] Slug gerado automaticamente quando não informado
- [ ] Unicidade de slug garantida com `ConflictException` na aplicação e índice parcial no banco
- [ ] Cache aplicado e invalidado conforme especificação
- [ ] DTOs em `packages/shared`
- [ ] Testes unitários com 100% de cobertura para todos os use-cases
- [ ] Testes de integração cobrindo todos os endpoints
- [ ] Naming convention e estrutura de pastas seguidas
