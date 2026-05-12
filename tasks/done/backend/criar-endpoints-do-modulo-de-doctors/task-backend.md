# Task — Módulo de Doctors (Backend)

## Descrição
Implementar o CRUD completo da entidade `Doctor`, representando médicos que possuem acesso ao sistema para gerenciar suas agendas de pacientes. Cada doctor é vinculado a uma conta de usuário existente e carrega dados profissionais como CRM e especialidade.

---

## Contexto
- `Doctor` é um perfil profissional associado a um `User` existente — a autenticação reutiliza o fluxo de login já implementado.
- Um usuário pode ter no máximo um perfil de doctor (constraint `UNIQUE` em `user_id`).
- O CRM é único entre doctors ativos — soft-deletados não bloqueiam reutilização.
- A listagem deve permitir busca por nome do usuário vinculado ou por especialidade.
- Soft delete é o padrão — nunca hard delete.
- A resposta sempre inclui os dados básicos do usuário vinculado (`id`, `fullName`, `email`).

---

## Contratos

### Input (DTO)

**CreateDoctorDto:**
- userId: string (obrigatório, uuid — deve referenciar um User existente)
- crmNumber: string (obrigatório, formato `NNNNN/UF`, ex: `12345/SP`)
- specialty: string (obrigatório, min 3, max 100)
- bio?: string (opcional, max 500)

**UpdateDoctorDto:**
- crmNumber?: string (formato `NNNNN/UF`)
- specialty?: string (min 3, max 100)
- bio?: string (max 500)

**DoctorListQueryDto (extends PaginationDto):**
- search?: string (busca por nome do usuário ou especialidade)

### Output

**DoctorResponseDto:**
- id: string (uuid)
- user: { id: string, fullName: string, email: string }
- crmNumber: string
- specialty: string
- bio: string | null
- createdAt: Date
- updatedAt: Date

**PaginatedDoctorsResponseDto:**
- data: DoctorResponseDto[]
- total: number
- page: number
- limit: number

---

## Assinaturas esperadas

**Use-cases:**
- `CreateDoctorUseCase.execute(dto: CreateDoctorDto): Promise<DoctorResponseDto>`
- `FindAllDoctorsUseCase.execute(query: DoctorListQueryDto): Promise<PaginatedDoctorsResponseDto>`
- `FindDoctorByIdUseCase.execute(id: string): Promise<DoctorResponseDto>`
- `UpdateDoctorUseCase.execute(id: string, dto: UpdateDoctorDto): Promise<DoctorResponseDto>`
- `DeleteDoctorUseCase.execute(id: string): Promise<void>`

**IDoctorsRepository:**
- `findAll(page: number, limit: number, search?: string): Promise<[Doctor[], number]>`
- `findById(id: string): Promise<Doctor | null>`
- `findByUserId(userId: string): Promise<Doctor | null>`
- `findByCrmNumber(crmNumber: string): Promise<Doctor | null>`
- `create(data: CreateDoctorDto, queryRunner?: QueryRunner): Promise<Doctor>`
- `update(id: string, data: UpdateDoctorDto, queryRunner?: QueryRunner): Promise<Doctor>`
- `delete(id: string, queryRunner?: QueryRunner): Promise<void>`

---

## Fluxo principal

**POST /doctors**
1. Controller recebe `CreateDoctorDto` validado.
2. Use-case verifica se o `userId` referencia um usuário existente — `NotFoundException` se não encontrar.
3. Verifica se o usuário já possui um perfil de doctor — `ConflictException` se sim.
4. Verifica se o `crmNumber` já está em uso por outro doctor ativo — `ConflictException` se sim.
5. Persiste o doctor via repository.
6. Invalida cache `doctors:list*`.
7. Retorna `DoctorResponseDto` com status `201`.

**GET /doctors**
1. Controller recebe `DoctorListQueryDto`.
2. Use-case tenta cache `doctors:list:${page}:${limit}:${search}` — se hit, retorna.
3. Se miss, busca no repository (JOIN com `users` para filtro e retorno), salva no cache (TTL 60s) e retorna `200`.

**GET /doctors/:id**
1. Controller recebe `id`.
2. Use-case tenta cache `doctor:${id}` — se hit, retorna.
3. Se miss, busca no repository com relação `user` carregada, salva no cache (TTL 300s).
4. Se não existir, lança `NotFoundException`.

**PATCH /doctors/:id**
1. Controller recebe `id` e `UpdateDoctorDto`.
2. Use-case busca o doctor — `NotFoundException` se não existir.
3. Se `crmNumber` mudou, valida unicidade.
4. Atualiza via repository (optimistic lock).
5. Invalida `doctor:${id}` e `doctors:list*`.
6. Retorna `DoctorResponseDto` com status `200`.

**DELETE /doctors/:id**
1. Controller recebe `id`.
2. Use-case busca o doctor — `NotFoundException` se não existir.
3. Executa soft delete via repository.
4. Invalida `doctor:${id}` e `doctors:list*`.
5. Retorna `204 No Content`.

---

## Fluxos alternativos

- `userId` não encontrado → `NotFoundException('User not found')`
- Usuário já possui perfil de doctor → `ConflictException('User already has a doctor profile')`
- CRM já em uso por outro doctor ativo → `ConflictException('CRM number already in use')`
- Doctor não encontrado em GET/PATCH/DELETE → `NotFoundException('Doctor not found')`
- Conflito de versão no update (optimistic lock) → capturar `OptimisticLockVersionMismatchError` e lançar `ConflictException('Record was modified by another process. Please try again.')`
- Falha na invalidação do cache → logar `warn` e seguir o fluxo (try/catch isolado)

---

## Regras de negócio

- Um `User` pode ter no máximo um perfil de doctor ativo.
- CRM único entre doctors ativos — soft-deletado não bloqueia reutilização.
- Soft delete sempre — nunca hard delete.
- Busca na listagem é case-insensitive e abrange `users.full_name` e `doctors.specialty`.
- A resposta sempre carrega os dados do usuário vinculado — nunca retornar apenas `userId`.

---

## Dependências

- `IDoctorsRepository` (novo)
- `IUsersRepository` (existente — para validar `userId`)
- `CacheService` (existente)

---

## Decisões técnicas da task

- **Transação:** Não — todas as operações envolvem uma única entidade. Não há escrita em múltiplas tabelas.
- **Distributed lock:** Não — sem operações de alto custo de conflito.
- **Cache:** Sim — `doctor:${id}` (TTL 300s) e `doctors:list:${page}:${limit}:${search}` (TTL 60s). Invalidação explícita após mutations.
- **Estratégia de concorrência:** Optimistic Lock via `@VersionColumn` na entidade `Doctor` para o update.
- **Listagem com JOIN:** Usar `findAndCount` com `relations: ['user']` e `ILike` — evitar `createQueryBuilder` com `innerJoinAndSelect` que falha com resolução de metadata cross-entity neste setup.

---

## Restrições

- NÃO acessar repository diretamente do controller.
- NÃO retornar a entidade crua — sempre mapear para `DoctorResponseDto`.
- NÃO usar `process.env` fora de `env.config.ts`.
- NÃO realizar hard delete.
- NÃO validar manualmente no controller/use-case — usar `class-validator` nos DTOs.
- NÃO incluir dados sensíveis do usuário na resposta (senha, versão).

---

## Estrutura esperada

```
modules/doctors/
  controllers/
    doctors.controller.ts
  use-cases/
    create-doctor.use-case.ts
    find-all-doctors.use-case.ts
    find-doctor-by-id.use-case.ts
    update-doctor.use-case.ts
    delete-doctor.use-case.ts
  repositories/
    doctors.repository.interface.ts
    doctors.repository.ts
  dto/
    create-doctor.dto.ts
    update-doctor.dto.ts
    doctor-list-query.dto.ts
    doctor-response.dto.ts
  entities/
    doctor.entity.ts
  tests/
    doctors.integration.spec.ts
  doctors.module.ts

packages/shared/src/dtos/
  create-doctor.dto.ts
  update-doctor.dto.ts
  doctor-response.dto.ts
  paginated-doctors-response.dto.ts
```

---

## Cenários de teste adicionais

- Criar doctor com `userId` inexistente → `404 Not Found`
- Criar doctor para usuário que já tem perfil → `409 Conflict`
- Criar doctor com CRM já em uso → `409 Conflict`
- Criar doctor com CRM em formato inválido → `400 Bad Request`
- Listagem paginada retorna `total`, `page`, `limit` corretos
- Busca por nome parcial do usuário retorna resultados corretos
- Busca por especialidade parcial retorna resultados corretos
- Listagem com cache hit não chama repository
- Buscar doctor inexistente → `404 Not Found`
- Atualizar CRM para CRM já em uso por outro doctor → `409 Conflict`
- Atualizar doctor com versão desatualizada → `409 Conflict`
- Deletar doctor existente → `204` e registro com `deleted_at` preenchido
- Deletar doctor já deletado → `404 Not Found`
- Cache invalidado após create/update/delete

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
- [ ] Naming convention e estrutura de pastas seguidas
