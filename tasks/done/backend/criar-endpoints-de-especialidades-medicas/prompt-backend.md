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
# Task — Módulo de Especialidades Médicas (Backend)

## Descrição
Implementar o CRUD completo da entidade `Specialty`, representando as especialidades médicas disponíveis na clínica. As especialidades são cadastradas pelo administrador e referenciadas futuramente pelo módulo de doctors e agendas.

---

## Contexto
- `Specialty` é uma entidade independente — não possui FK para outras entidades neste módulo.
- O `name` deve ser único entre especialidades ativas (case-insensitive); soft-deletadas não bloqueiam reutilização.
- A listagem deve permitir busca parcial por `name`.
- Soft delete é o padrão — nunca hard delete.
- Os campos `version` e `deletedAt` nunca são expostos na resposta.

---

## Contratos

### Input (DTO)

**CreateSpecialtyDto:**
- name: string (obrigatório, min 3, max 100)
- description?: string (opcional, max 500)

**UpdateSpecialtyDto:**
- name?: string (min 3, max 100)
- description?: string | null (null limpa o campo)

**SpecialtyListQueryDto (extends PaginationDto):**
- search?: string (busca parcial case-insensitive em `name`)

### Output

**SpecialtyResponseDto:**
- id: string (uuid)
- name: string
- description: string | null
- createdAt: Date
- updatedAt: Date

**PaginatedSpecialtiesResponseDto:**
- data: SpecialtyResponseDto[]
- total: number
- page: number
- limit: number

---

## Assinaturas esperadas

**Use-cases:**
- `CreateSpecialtyUseCase.execute(dto: CreateSpecialtyDto): Promise<SpecialtyResponseDto>`
- `FindAllSpecialtiesUseCase.execute(query: SpecialtyListQueryDto): Promise<PaginatedSpecialtiesResponseDto>`
- `FindSpecialtyByIdUseCase.execute(id: string): Promise<SpecialtyResponseDto>`
- `UpdateSpecialtyUseCase.execute(id: string, dto: UpdateSpecialtyDto): Promise<SpecialtyResponseDto>`
- `DeleteSpecialtyUseCase.execute(id: string): Promise<void>`

**ISpecialtiesRepository:**
- `findAll(page: number, limit: number, search?: string): Promise<[Specialty[], number]>`
- `findById(id: string): Promise<Specialty | null>`
- `findByName(name: string): Promise<Specialty | null>`
- `create(data: CreateSpecialtyDto, queryRunner?: QueryRunner): Promise<Specialty>`
- `update(id: string, data: UpdateSpecialtyDto, queryRunner?: QueryRunner): Promise<Specialty>`
- `delete(id: string, queryRunner?: QueryRunner): Promise<void>`

---

## Fluxo principal

**POST /specialties**
1. Controller recebe `CreateSpecialtyDto` validado.
2. Use-case verifica se já existe especialidade ativa com o mesmo `name` (case-insensitive) — `ConflictException` se sim.
3. Persiste via repository.
4. Invalida cache `specialties:list*`.
5. Retorna `SpecialtyResponseDto` com status `201`.

**GET /specialties**
1. Controller recebe `SpecialtyListQueryDto`.
2. Use-case tenta cache `specialties:list:${page}:${limit}:${search ?? ''}` — se hit, retorna.
3. Se miss, busca no repository com `ILike` em `name` quando `search` fornecido, salva no cache (TTL 60s) e retorna `200`.

**GET /specialties/:id**
1. Controller recebe `id`.
2. Use-case tenta cache `specialty:${id}` — se hit, retorna.
3. Se miss, busca no repository, salva no cache (TTL 300s).
4. Se não existir, lança `NotFoundException`.

**PATCH /specialties/:id**
1. Controller recebe `id` e `UpdateSpecialtyDto`.
2. Use-case busca a especialidade — `NotFoundException` se não existir.
3. Se `name` foi alterado, valida unicidade (ignorando a própria entidade).
4. Atualiza via repository (optimistic lock).
5. Invalida `specialty:${id}` e `specialties:list*`.
6. Retorna `SpecialtyResponseDto` com status `200`.

**DELETE /specialties/:id**
1. Controller recebe `id`.
2. Use-case busca a especialidade — `NotFoundException` se não existir.
3. Executa soft delete via repository.
4. Invalida `specialty:${id}` e `specialties:list*`.
5. Retorna `204 No Content`.

---

## Fluxos alternativos

- `name` já em uso por especialidade ativa → `ConflictException('Specialty name already in use')`
- Especialidade não encontrada em GET/PATCH/DELETE → `NotFoundException('Specialty not found')`
- Conflito de versão no update (optimistic lock) → capturar `OptimisticLockVersionMismatchError` e lançar `ConflictException('Record was modified by another process. Please try again.')`
- Falha na invalidação do cache → logar `warn` e seguir o fluxo (try/catch isolado)

---

## Regras de negócio

- `name` único entre especialidades ativas (case-insensitive) — soft-deletadas não bloqueiam reutilização.
- `description` é opcional; pode ser removida via PATCH enviando `null`.
- Soft delete sempre — nunca hard delete.
- Busca na listagem é case-insensitive e parcial (`ILike('%termo%')`).

---

## Permissões

| Ação | ADMIN | DOCTOR | USER |
|---|:---:|:---:|:---:|
| Criar | ✓ | ✗ | ✗ |
| Listar | ✓ | ✓ | ✓ |
| Ver por ID | ✓ | ✓ | ✓ |
| Editar | ✓ | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ |

---

## Dependências

- `ISpecialtiesRepository` (novo)
- `CacheService` (existente)

---

## Decisões técnicas da task

- **Transação:** Não — todas as operações envolvem uma única entidade.
- **Distributed lock:** Não — sem operações de alto custo de conflito.
- **Cache:** Sim — `specialty:${id}` (TTL 300s) e `specialties:list:${page}:${limit}:${search}` (TTL 60s). Invalidação explícita após mutations.
- **Estratégia de concorrência:** Optimistic Lock via `@VersionColumn` na entidade `Specialty` para o update.
- **Unicidade:** Verificar `findByName` com `ILike` no use-case antes de persistir — não depender apenas de constraint de banco para gerar o erro adequado.

---

## Restrições

- NÃO acessar repository diretamente do controller.
- NÃO retornar a entidade crua — sempre mapear para `SpecialtyResponseDto`.
- NÃO usar `process.env` fora de `env.config.ts`.
- NÃO realizar hard delete.
- NÃO validar manualmente no controller/use-case — usar `class-validator` nos DTOs.
- NÃO expor `version` ou `deletedAt` na resposta.

---

## Estrutura esperada

```
modules/specialties/
  controllers/
    specialties.controller.ts
    specialties.controller.spec.ts
  use-cases/
    create-specialty.use-case.ts
    find-all-specialties.use-case.ts
    find-specialty-by-id.use-case.ts
    update-specialty.use-case.ts
    delete-specialty.use-case.ts
  repositories/
    specialties.repository.interface.ts
    specialties.repository.ts
    specialties.repository.spec.ts
  entities/
    specialty.entity.ts
  dto/
    specialty-list-query.dto.ts
  tests/
    create-specialty.use-case.spec.ts
    find-all-specialties.use-case.spec.ts
    find-specialty-by-id.use-case.spec.ts
    update-specialty.use-case.spec.ts
    delete-specialty.use-case.spec.ts
    specialties.integration.spec.ts
  specialties.module.ts

packages/shared/src/dtos/
  create-specialty.dto.ts
  update-specialty.dto.ts
  specialty-response.dto.ts
  paginated-specialties-response.dto.ts
```

---

## Migration

Criar migration com timestamp em `src/database/migrations/`:

```sql
CREATE TABLE specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description VARCHAR,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Índice único parcial: name único apenas entre registros não deletados
CREATE UNIQUE INDEX specialties_name_unique_active
  ON specialties (LOWER(name))
  WHERE deleted_at IS NULL;
```

---

## Cenários de teste adicionais

- Criar especialidade com nome válido → `201` com `SpecialtyResponseDto`
- Criar especialidade com nome já existente (ativo) → `409 Conflict`
- Criar especialidade com nome de especialidade soft-deletada → `201` (reutilização permitida)
- Criar especialidade com nome muito curto (< 3) → `400 Bad Request`
- Criar especialidade com campo desconhecido → `400 Bad Request`
- Listagem sem filtros retorna paginação correta (`total`, `page`, `limit`)
- Listagem com `search` retorna apenas registros com `name` contendo o termo
- Listagem com `limit=101` → `400 Bad Request`
- Busca por ID existente → `200` sem `version` nem `deletedAt`
- Busca por ID inexistente → `404 Not Found`
- Atualizar nome para nome já em uso por outra especialidade ativa → `409 Conflict`
- Atualizar nome para o próprio nome atual → `200` (não é conflito)
- Atualizar `description` para `null` → `200` com `description: null`
- Deletar especialidade existente → `204` e `deleted_at` preenchido
- Deletar especialidade já deletada → `404 Not Found`
- Busca por ID após deleção → `404 Not Found`
- Sem token → `401 Unauthorized`
- DOCTOR tenta criar → `403 Forbidden`
- Cache invalidado após create/update/delete

---

## Definition of Done

- [ ] Fluxo principal implementado para os 5 endpoints
- [ ] Fluxos alternativos tratados com exceções corretas
- [ ] Testes unitários (100% cobertura) para todos os use-cases
- [ ] Testes unitários para o repository (`specialties.repository.spec.ts`)
- [ ] Testes unitários para o controller (`specialties.controller.spec.ts`)
- [ ] Testes de integração cobrindo todos os endpoints e cenários de erro
- [ ] DTOs compartilhados em `packages/shared` e exportados via `index.ts`
- [ ] Migration criada e executada
- [ ] `SpecialtiesModule` registrado em `app.module.ts`
- [ ] Cache aplicado e invalidado conforme especificação
- [ ] Soft delete configurado na entidade
- [ ] Optimistic locking funcionando no update
- [ ] Naming convention e estrutura de pastas seguidas
