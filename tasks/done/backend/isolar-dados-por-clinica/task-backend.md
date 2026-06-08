# Task — Isolar Dados por Clínica nos Repositórios e Use-cases (Backend)

## Descrição
Atualizar todos os repositórios para filtrar dados pelo `clinicId` e todos os use-cases para passar o `clinicId` (vindo de `ICurrentUser`) nas chamadas ao banco. Após esta task, um usuário de uma clínica não consegue acessar, criar nem modificar dados de outra clínica.

**Pré-requisito:** tasks **adicionar-clinic-id-ao-schema** e **integrar-clinicid-na-autenticacao** concluídas.

---

## Contexto
- O `clinicId` já está disponível em `currentUser.clinicId` (vem do JWT) — nenhuma query adicional é necessária para resolvê-lo.
- Todos os módulos afetados: `users`, `doctors`, `patients`, `schedules`. O módulo `specialties` permanece global (sem `clinic_id`).
- **Regra central:** nenhuma query que retorne dados de negócio pode executar sem o filtro `WHERE clinic_id = :clinicId`.
- O `clinicId` passa pelo controller → use-case → repository. Controllers já recebem `currentUser` via `@CurrentUser()` — apenas repassam ao use-case.
- Use-cases de leitura (`findAll`, `findById`) e escrita (`create`, `update`, `delete`) precisam do `clinicId`.
- Use-cases que operam em cascade entre módulos (ex: `DeleteUserUseCase` chama `deleteDoctorUseCase.deleteByUserId`) também recebem e repassam `clinicId`.

---

## Padrão de alteração nos repositórios

Todos os métodos de consulta recebem `clinicId` como parâmetro obrigatório:

```ts
// IUsersRepository (interface)
abstract findAll(page: number, limit: number, clinicId: string, search?: string): Promise<[User[], number]>
abstract findById(id: string, clinicId: string): Promise<User | null>
abstract findByEmail(email: string, clinicId: string): Promise<User | null>
abstract create(data: CreateUserData, clinicId: string, queryRunner?: QueryRunner): Promise<User>
```

```ts
// UsersRepository (implementação)
async findAll(page: number, limit: number, clinicId: string, search?: string) {
  const query = this.repository
    .createQueryBuilder('user')
    .where('user.clinic_id = :clinicId', { clinicId })
    ...
}

async findById(id: string, clinicId: string) {
  return this.repository.findOneBy({ id, clinicId })
}
```

O mesmo padrão se aplica a `IDoctorsRepository`, `IPatientsRepository` e `ISchedulesRepository`.

---

## Padrão de alteração nos use-cases

Use-cases que recebem `currentUser` já têm `clinicId` disponível:

```ts
async execute(query: ListUsersQueryDto, currentUser: ICurrentUser): Promise<PaginatedUsersResponseDto> {
  const { clinicId } = currentUser
  const [users, total] = await this.usersRepository.findAll(page, limit, clinicId, search)
  ...
}
```

Use-cases de criação incluem `clinicId` no registro:

```ts
async execute(dto: CreateDoctorDto, currentUser: ICurrentUser): Promise<DoctorResponseDto> {
  const { clinicId } = currentUser
  await this.doctorsRepository.findByUserId(dto.userId, clinicId) // verifica se já existe na CLÍNICA
  const doctor = await this.doctorsRepository.create(dto, clinicId)
  ...
}
```

---

## Arquivos a atualizar

### Módulo `users`
- `users.repository.interface.ts` — todos os métodos recebem `clinicId`
- `users.repository.ts` — todos os métodos filtram por `clinic_id`
- `create-user.use-case.ts` — recebe `currentUser`, passa `clinicId` ao criar
- `find-all-users.use-case.ts` — recebe `currentUser`, filtra por `clinicId`
- `find-user-by-id.use-case.ts` — recebe `currentUser`, filtra por `clinicId`
- `update-user.use-case.ts` — recebe `currentUser`, filtra por `clinicId`
- `delete-user.use-case.ts` — recebe `currentUser`, passa `clinicId` para cascades
- `activate-user.use-case.ts` — recebe `currentUser`, filtra por `clinicId`
- `users.controller.ts` — injeta `@CurrentUser()` e passa aos use-cases

### Módulo `doctors`
- Mesmas categorias de arquivos
- `findByCrmNumber(crmNumber, clinicId)` — verifica unicidade dentro da clínica
- `deleteByUserId(userId, clinicId, queryRunner?)` — filtra pelo `clinicId` ao buscar o doctor para deletar

### Módulo `patients`
- Mesmas categorias de arquivos
- `findByDocumentNumber(documentNumber, clinicId)`

### Módulo `schedules`
- Mesmas categorias de arquivos
- `findOverlapping(doctorId, ..., clinicId)`
- `deleteAllByDoctorId(doctorId, clinicId, queryRunner?)`

### Módulo `auth`
- `me.use-case.ts` — busca o usuário pelo id `AND clinic_id`
- `login.use-case.ts` — `findByEmail` não precisa de `clinicId` (email é globalmente único)

---

## Cache — atualização das chaves

O `clinicId` deve fazer parte das chaves de cache para evitar colisão entre clínicas:

```ts
// antes
`users:list:${page}:${limit}:${search}`
`user:${id}`

// depois
`users:list:${clinicId}:${page}:${limit}:${search}`
`user:${clinicId}:${id}`
```

O mesmo padrão se aplica a `doctors:`, `patients:`, `schedules:`.

---

## Impacto nas assinaturas dos controllers

Controllers que antes chamavam use-cases sem `currentUser` agora precisam injetá-lo:

```ts
@Get()
findAll(@Query() query: ListUsersQueryDto, @CurrentUser() currentUser: ICurrentUser) {
  return this.findAllUsersUseCase.execute(query, currentUser)
}

@Post()
create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: ICurrentUser) {
  return this.createUserUseCase.execute(dto, currentUser)
}
```

---

## Fluxos alternativos

- `GET /users/:id` com id de outra clínica → `NotFoundException` (o filtro `clinic_id` não retorna o registro, o use-case lança `NotFoundException` — nunca `403`).
- `DELETE /doctors/:id` de outra clínica → mesmo comportamento.
- Qualquer tentativa de cross-clinic é silenciada como "não encontrado" — não revela a existência de dados de outras clínicas.

---

## Restrições

- NÃO retornar `403 Forbidden` para tentativa de acesso cross-clinic — sempre `404 Not Found`.
- NÃO passar `clinicId` como query param — vem sempre do JWT via `currentUser`.
- NÃO omitir o filtro `clinic_id` em nenhuma query que retorne dados de negócio.
- NÃO alterar o módulo `specialties` — permanece global.

---

## Testes a atualizar

### Unitários
- Todos os use-case specs precisam passar `currentUser` com `clinicId: faker.string.uuid()` nas chamadas a `execute()`
- Todos os repository mocks precisam receber `clinicId` como argumento nas verificações `toHaveBeenCalledWith`
- Verificar que o `clinicId` é passado corretamente ao repository em cada cenário

### Integração
- Todos os testes de integração criam dados com `clinicId` (já atualizado na task anterior via seed)
- Adicionar teste específico de isolamento: criar dados na clínica A, autenticar como usuário da clínica B e verificar `404` ao tentar acessar

---

## Definition of Done

- [ ] Todos os repositórios (`users`, `doctors`, `patients`, `schedules`) filtram por `clinic_id` em todos os métodos
- [ ] Todas as assinaturas de repositório atualizadas com `clinicId` obrigatório
- [ ] Todos os use-cases recebem e repassam `clinicId` de `currentUser`
- [ ] Todos os controllers injetam `@CurrentUser()` e passam aos use-cases
- [ ] Chaves de cache incluem `clinicId`
- [ ] Tentativa de acesso cross-clinic retorna `404`, não `403`
- [ ] Teste de isolamento entre clínicas nos specs de integração
- [ ] Testes unitários com 100% de cobertura — mocks atualizados com `clinicId`
- [ ] Testes de integração passando
