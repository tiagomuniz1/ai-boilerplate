# Task — CRUD de Users (Frontend)

## Descrição
Implementar as telas de CRUD completo de usuários (listagem, criação, edição, visualização e exclusão) integradas com as APIs do backend já existentes em `/users`. O resultado esperado é um módulo `features/users` funcional com navegação entre as telas, formulários validados e feedback adequado ao usuário.

---

## Contexto
- O backend já expõe os endpoints REST: `GET /users`, `GET /users/:id`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id`.
- DTOs de request/response devem ser importados de `@app/shared` (ex: `IUserDto`, `ICreateUserDto`, `IUpdateUserDto`).
- Backend retorna campos em `snake_case` (`full_name`, `created_at`) — mappers convertem para `camelCase` no frontend.
- Erros `422` do backend devem ser mapeados para os campos do formulário via `setError()`.
- Rotas devem estar protegidas pelo `middleware.ts` (não estão na lista de rotas públicas).

---

## Contratos

### Input

ICreateUserInput:
- fullName: string
- email: string
- password: string
- role: UserRole

IUpdateUserInput:
- fullName?: string
- email?: string
- role?: UserRole

### Output

IUserModel:
- id: string
- fullName: string
- email: string
- role: UserRole
- createdAt: Date
- updatedAt: Date

---

## Assinaturas esperadas

<!-- Hooks -->
useUsers(): { data: IUserModel[], isPending, error }
useUser(id: string): { data: IUserModel, isPending, error }
useCreateUser(): UseMutationResult<IUserModel, IApiError, ICreateUserInput>
useUpdateUser(): UseMutationResult<IUserModel, IApiError, { id: string; input: IUpdateUserInput }>
useDeleteUser(): UseMutationResult<void, IApiError, string>

<!-- Use-cases -->
listUsersUseCase(): Promise<IUserModel[]>
getUserUseCase(id: string): Promise<IUserModel>
createUserUseCase(input: ICreateUserInput): Promise<IUserModel>
updateUserUseCase(id: string, input: IUpdateUserInput): Promise<IUserModel>
deleteUserUseCase(id: string): Promise<void>

<!-- Service -->
userService.getAll(): Promise<IUserDto[]>
userService.getById(id: string): Promise<IUserDto>
userService.create(data: ICreateUserDto): Promise<IUserDto>
userService.update(id: string, data: IUpdateUserDto): Promise<IUserDto>
userService.remove(id: string): Promise<void>

<!-- Mappers -->
toUserModel(dto: IUserDto): IUserModel
toCreateUserDto(input: ICreateUserInput): ICreateUserDto
toUpdateUserDto(input: IUpdateUserInput): IUpdateUserDto

---

## Fluxo principal

### Listagem (`/users`)
1. Página monta e dispara `useUsers()`.
2. Renderiza skeleton durante `isPending`.
3. Renderiza tabela com colunas: nome, email, role, data de criação, ações (editar / excluir).
4. Botão "Novo usuário" navega para `/users/new`.

### Criação (`/users/new`)
1. Renderiza formulário com `react-hook-form`.
2. Submete via `useCreateUser()`.
3. Em sucesso → invalida `['users']`, exibe toast e redireciona para `/users`.
4. Em erro `422` → `setError()` nos campos. Em outros erros → mensagem amigável.

### Edição (`/users/:id/edit`)
1. Carrega dados via `useUser(id)`.
2. Preenche o formulário com os valores atuais (`reset()`).
3. Submete via `useUpdateUser()`.
4. Em sucesso → invalida `['users']` e `['users', id]`, redireciona para `/users`.

### Exclusão
1. Botão "Excluir" abre modal de confirmação.
2. Confirmação dispara `useDeleteUser()`.
3. Em sucesso → invalida `['users']`, exibe toast.

---

## Estados e feedbacks

- Loading (lista) → skeleton de tabela
- Loading (detalhe/edição) → skeleton de formulário
- Loading (mutations) → botão desabilitado com spinner
- Erro → componente `ErrorMessage` com mensagem amigável (nunca expor `detail` técnico)
- Sucesso → toast + redirecionamento + invalidação de cache

---

## Regras de negócio

- Email deve ter formato válido (validação client-side)
- Senha mínima de 8 caracteres na criação
- Campo `password` apenas na criação — nunca exibido nem editado depois
- Não permitir excluir o próprio usuário logado (verificar via `auth.store`)
- Role deve ser um valor válido do enum `UserRole` (importado de `@app/shared`)

---

## Dependências

- `userService` (`features/users/services/users.service.ts`)
- `auth.store` (apenas para verificar id do usuário logado na exclusão)
- `@app/shared` (DTOs e enums)

---

## Decisões técnicas da task

- Usar React Query: **sim** — `useQuery` para list/detail, `useMutation` para create/update/delete
- Usar Zustand: **não** — dados de usuários são estado de servidor e ficam exclusivamente no React Query
- Optimistic update: **não** — operações simples, invalidação de cache é suficiente
- Formulário com react-hook-form: **sim** — obrigatório, com validação via schema (zod)

---

## Restrições

- NÃO usar `axios` diretamente — somente via `apiClient`
- NÃO armazenar a lista de usuários em Zustand
- NÃO mapear dados dentro de componentes ou hooks — apenas em mappers
- NÃO reutilizar DTOs do backend como tipos de formulário — usar interfaces locais (`ICreateUserInput`, `IUpdateUserInput`)
- NÃO exibir mensagens de erro técnicas (`error.detail`) ao usuário
- NÃO usar `useState` para campos de formulário

---

## Estrutura esperada

```
apps/frontend/
  app/
    users/
      page.tsx                  → Listagem
      new/page.tsx              → Criação
      [id]/edit/page.tsx        → Edição
  components/features/users/
    components/
      user-list.tsx
      user-form.tsx
      user-table-row.tsx
      delete-user-dialog.tsx
    hooks/
      use-users.hook.ts
      use-user.hook.ts
      use-create-user.hook.ts
      use-update-user.hook.ts
      use-delete-user.hook.ts
    services/
      users.service.ts
    use-cases/
      list-users.use-case.ts
      get-user.use-case.ts
      create-user.use-case.ts
      update-user.use-case.ts
      delete-user.use-case.ts
    mappers/
      to-user-model.mapper.ts
      to-create-user-dto.mapper.ts
      to-update-user-dto.mapper.ts
    types/
      user-model.types.ts
      user-input.types.ts
```

---

## Cenários de teste adicionais

- Listagem vazia → exibir estado "Nenhum usuário encontrado"
- Erro 401 na listagem → interceptor faz refresh ou redireciona para `/login`
- Erro 422 ao criar → erros aparecem nos campos corretos do formulário
- Erro 404 ao acessar `/users/:id/edit` com id inválido → mensagem amigável
- Tentativa de excluir o próprio usuário → botão desabilitado ou mensagem de bloqueio
- Submit duplicado → botão desabilitado durante `isPending`
- Mapper converte `created_at` (string) para `Date` corretamente
- Mapper converte `full_name` (snake_case) para `fullName` (camelCase)

---

## Definition of Done

- [ ] Listagem, criação, edição e exclusão implementadas
- [ ] Integração funcional com endpoints `/users` do backend
- [ ] Estados de loading, error e success tratados em todas as telas
- [ ] Mappers puros entre DTOs e modelos
- [ ] Formulários com `react-hook-form` e mapeamento de erros 422
- [ ] Invalidação correta de cache após mutations
- [ ] Testes unitários com 100% de cobertura (mappers, use-cases, hooks)
- [ ] Testes de integração (loading / error / success) para cada tela
- [ ] `data-testid` nos elementos críticos para futuros testes E2E
- [ ] Nenhum import de `axios` fora de `lib/api-client.ts`
- [ ] Nenhum dado de usuário em Zustand