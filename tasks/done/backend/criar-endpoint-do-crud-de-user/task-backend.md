# Task — CRUD de User (Backend)

## Descrição
Implementar o CRUD completo da entidade `User`, expondo endpoints REST para criação, listagem paginada, busca por ID, atualização e remoção (soft delete). O resultado final é um módulo `UsersModule` funcional, testado e aderente à arquitetura definida.

---

## Contexto
- Entidade `User` é o agregado central do sistema e será referenciada por outros módulos.
- Email deve ser único — não pode existir mais de um usuário ativo com o mesmo email.
- Soft delete é o padrão — `deleted_at` controla a exclusão lógica.
- Optimistic locking via `@VersionColumn` para evitar conflitos em atualizações concorrentes.
- DTOs compartilhados (`CreateUserDto`, `UpdateUserDto`, `UserResponseDto`) devem residir em `packages/shared` para serem reutilizados pelo frontend.
- Senha nunca deve retornar nas respostas — apenas hash persistido (bcrypt).

---

## Contratos

### Input (DTO)

**CreateUserDto:**
- fullName: string (obrigatório, min 3, max 120)
- email: string (obrigatório, formato email)
- password: string (obrigatório, min 8, max 64)
- role: UserRole (enum: ADMIN | USER, default USER)

**UpdateUserDto:**
- fullName?: string (min 3, max 120)
- email?: string (formato email)
- role?: UserRole

**PaginationDto (já existente):**
- page?: number (default 1)
- limit?: number (default 20, max 100)

### Output

**UserResponseDto:**
- id: string (uuid)
- fullName: string
- email: string
- role: UserRole
- createdAt: Date
- updatedAt: Date

**PaginatedUsersResponseDto:**
- data: UserResponseDto[]
- total: number
- page: number
- limit: number

---

## Assinaturas esperadas

**Use-cases:**
- `CreateUserUseCase.execute(dto: CreateUserDto): Promise<UserResponseDto>`
- `FindAllUsersUseCase.execute(pagination: PaginationDto): Promise<PaginatedUsersResponseDto>`
- `FindUserByIdUseCase.execute(id: string): Promise<UserResponseDto>`
- `UpdateUserUseCase.execute(id: string, dto: UpdateUserDto): Promise<UserResponseDto>`
- `DeleteUserUseCase.execute(id: string): Promise<void>`

**IUsersRepository:**
- `findAll(page: number, limit: number): Promise<[User[], number]>`
- `findById(id: string): Promise<User | null>`
- `findByEmail(email: string): Promise<User | null>`
- `create(data: CreateUserDto, queryRunner?: QueryRunner): Promise<User>`
- `update(id: string, data: UpdateUserDto, queryRunner?: QueryRunner): Promise<User>`
- `delete(id: string, queryRunner?: QueryRunner): Promise<void>`

---

## Fluxo principal

**POST /users**
1. Controller recebe `CreateUserDto` validado.
2. Use-case verifica se já existe usuário com o mesmo email.
3. Gera hash da senha com bcrypt.
4. Persiste o usuário via repository.
5. Invalida cache `users:list*`.
6. Retorna `UserResponseDto` com status `201`.

**GET /users**
1. Controller recebe `PaginationDto`.
2. Use-case tenta cache `users:list:${page}:${limit}` — se hit, retorna.
3. Se miss, busca no repository, salva no cache (TTL 60s) e retorna `200`.

**GET /users/:id**
1. Controller recebe `id` (uuid).
2. Use-case tenta cache `user:${id}` — se hit, retorna.
3. Se miss, busca no repository, salva no cache (TTL 300s) e retorna `200`.
4. Se não existir, lança `NotFoundException`.

**PATCH /users/:id**
1. Controller recebe `id` e `UpdateUserDto`.
2. Use-case busca o usuário — se não existir, `NotFoundException`.
3. Se email mudou, valida unicidade.
4. Atualiza via repository (optimistic lock).
5. Invalida `user:${id}` e `users:list*`.
6. Retorna `UserResponseDto` com status `200`.

**DELETE /users/:id**
1. Controller recebe `id`.
2. Use-case busca o usuário — se não existir, `NotFoundException`.
3. Executa soft delete via repository.
4. Invalida `user:${id}` e `users:list*`.
5. Retorna `204 No Content`.

---

## Fluxos alternativos

- Email já cadastrado em criação ou atualização → `ConflictException('Email already in use')`
- Usuário não encontrado em GET/PATCH/DELETE → `NotFoundException('User not found')`
- Conflito de versão em update (optimistic lock) → capturar `OptimisticLockVersionMismatchError` e lançar `ConflictException('Record was modified by another process. Please try again.')`
- Falha na invalidação do cache → logar `warn` e seguir o fluxo (try/catch isolado)

---

## Regras de negócio

- Email é único entre usuários ativos (não considerar soft-deletados na validação? ✅ considerar — soft delete não libera o email).
- Senha mínima de 8 caracteres, persistida apenas como hash bcrypt (cost 10).
- `role` default é `USER` quando não informado.
- Soft delete sempre — nunca hard delete.
- Resposta nunca expõe `password` ou `version`.

---

## Dependências

- `IUsersRepository`
- `CacheService`
- `bcrypt`

---

## Decisões técnicas da task

- **Transação:** Não — todas as operações envolvem uma única tabela/registro.
- **Distributed lock:** Não — não há concorrência de alto custo.
- **Cache:** Sim — `user:${id}` (TTL 300s) e `users:list:${page}:${limit}` (TTL 60s). Invalidação explícita após mutations.
- **Estratégia de concorrência:** Optimistic Lock via `@VersionColumn` na entidade `User` para o update.

---

## Restrições

- NÃO acessar repository diretamente do controller.
- NÃO retornar a entidade `User` crua — sempre mapear para `UserResponseDto`.
- NÃO logar `password` em nenhuma circunstância.
- NÃO usar `process.env` fora de `env.config.ts`.
- NÃO realizar hard delete.
- NÃO validar manualmente em controller/use-case — usar `class-validator` no DTO.

---

## Estrutura esperada

```
modules/users/
  controllers/
    users.controller.ts
  use-cases/
    create-user.use-case.ts
    find-all-users.use-case.ts
    find-user-by-id.use-case.ts
    update-user.use-case.ts
    delete-user.use-case.ts
  repositories/
    users.repository.interface.ts
    users.repository.ts
  dto/
    create-user.dto.ts
    update-user.dto.ts
    user-response.dto.ts
  entities/
    user.entity.ts
  tests/
    users.integration.spec.ts
  users.module.ts
```

---

## Cenários de teste adicionais

- Criar usuário com email duplicado → `409 Conflict`
- Criar usuário sem `role` → persiste como `USER`
- Criar usuário com senha curta → `400 Bad Request`
- Listagem paginada retorna `total`, `page`, `limit` corretos
- Listagem com cache hit não chama repository
- Buscar usuário inexistente → `404 Not Found`
- Atualizar email para email já existente em outro usuário → `409 Conflict`
- Atualizar usuário com versão desatualizada (optimistic) → `409 Conflict`
- Deletar usuário existente → `204` e registro com `deleted_at` preenchido
- Deletar usuário já deletado → `404 Not Found`
- Resposta nunca contém `password` ou `version`
- Cache é invalidado após create/update/delete

---

## Definition of Done

- [ ] Fluxo principal implementado para os 5 endpoints
- [ ] Fluxos alternativos tratados com exceções corretas
- [ ] Testes unitários (100%) para todos os use-cases
- [ ] Testes de integração cobrindo todos os endpoints
- [ ] DTOs compartilhados em `packages/shared`
- [ ] Cache aplicado e invalidado conforme especificação
- [ ] Soft delete configurado na entidade
- [ ] Optimistic locking funcionando no update
- [ ] Senha nunca exposta nas respostas
- [ ] Naming convention e estrutura de pastas seguidas