# Task — Módulo de Especialidades (Frontend)

## Descrição
Implementar as telas do módulo de especialidades médicas contemplando listagem, visualização de detalhes, criação, edição e remoção. O resultado final deve ser um CRUD completo integrado à API do backend, seguindo a arquitetura em camadas (UI → Hooks → Use Cases → Services → API Client). Ações de escrita (criar, editar, remover) são restritas ao ADMIN; leitura está disponível para ADMIN, DOCTOR e USER.

---

## Contexto
- `Specialty` é uma entidade independente — não possui FK para outras entidades.
- A API expõe os endpoints REST sob `/specialties`.
- DTOs vêm do `@app/shared` (`SpecialtyResponseDto`, `CreateSpecialtyDto`, `UpdateSpecialtyDto`, `PaginatedSpecialtiesResponseDto`).
- A listagem suporta busca parcial por `name` (campo `search`) e paginação.
- `description` é opcional e pode ser removida via PATCH enviando `null`.
- Apenas usuários autenticados acessam o módulo — proteção via `middleware.ts`.

---

## Contratos

### `ISpecialtyModel` — modelo de domínio (exibição)

```ts
export interface ISpecialtyModel {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}
```

### `ICreateSpecialtyInput` — dados do formulário de criação

```ts
export interface ICreateSpecialtyInput {
  name: string
  description?: string
}
```

### `IUpdateSpecialtyInput` — dados do formulário de edição

```ts
export interface IUpdateSpecialtyInput {
  name?: string
  description?: string | null  // null limpa o campo
}
```

### `ISpecialtyListParams` — parâmetros de listagem

```ts
export interface ISpecialtyListParams {
  search?: string
  page?: number
  limit?: number
}
```

### `IPaginatedSpecialtiesModel`

```ts
export interface IPaginatedSpecialtiesModel {
  data: ISpecialtyModel[]
  total: number
  page: number
  limit: number
}
```

---

## Assinaturas esperadas

```ts
// Hooks
useSpecialties(params?: ISpecialtyListParams): UseQueryResult<IPaginatedSpecialtiesModel>
useSpecialty(id: string): UseQueryResult<ISpecialtyModel>
useCreateSpecialty(): UseMutationResult<ISpecialtyModel, IApiError, ICreateSpecialtyInput>
useUpdateSpecialty(): UseMutationResult<ISpecialtyModel, IApiError, { id: string; data: IUpdateSpecialtyInput }>
useDeleteSpecialty(): UseMutationResult<void, IApiError, string>

// Use-cases
listSpecialtiesUseCase(params?: ISpecialtyListParams): Promise<IPaginatedSpecialtiesModel>
getSpecialtyUseCase(id: string): Promise<ISpecialtyModel>
createSpecialtyUseCase(input: ICreateSpecialtyInput): Promise<ISpecialtyModel>
updateSpecialtyUseCase(id: string, input: IUpdateSpecialtyInput): Promise<ISpecialtyModel>
deleteSpecialtyUseCase(id: string): Promise<void>

// Service
specialtiesService.getAll(params?: ISpecialtyListParams): Promise<PaginatedSpecialtiesResponseDto>
specialtiesService.getById(id: string): Promise<SpecialtyResponseDto>
specialtiesService.create(data: CreateSpecialtyDto): Promise<SpecialtyResponseDto>
specialtiesService.update(id: string, data: UpdateSpecialtyDto): Promise<SpecialtyResponseDto>
specialtiesService.remove(id: string): Promise<void>
```

---

## Fluxo principal por tela

### Listagem (`/specialties`)

1. Página renderiza `SpecialtyList`.
2. Hook `useSpecialties(params)` busca dados via `listSpecialtiesUseCase`.
3. Service chama `GET /specialties?...` → DTO paginado convertido via `toSpecialtyModel` para cada item.
4. Renderiza tabela com colunas: nome, descrição (truncada), data de criação, ações (visualizar, editar, remover).
5. Campo de busca por nome com debounce de 300ms envia `search` como query param.
6. Botão "Nova Especialidade" visível apenas para ADMIN — leva a `/specialties/new`.
7. Ações de editar e remover visíveis apenas para ADMIN.

### Criação (`/specialties/new`)

1. Página renderiza `SpecialtyForm` (modo `create`).
2. Submit dispara `useCreateSpecialty`.
3. Sucesso → invalida `['specialties']`, exibe toast e redireciona para `/specialties`.
4. Erro `409` (nome já em uso) → alerta global no topo do formulário com mensagem amigável.
5. Erro `400` de validação backend → mapeado para campos via `setError()`.

### Detalhes (`/specialties/[id]`)

1. `useSpecialty(id)` carrega dados.
2. Renderiza `SpecialtyDetails` com nome, descrição (apenas se preenchida), datas de criação e atualização.
3. Botões "Editar" e "Excluir" visíveis apenas para ADMIN.

### Edição (`/specialties/[id]/edit`)

1. `useSpecialty(id)` carrega dados atuais.
2. `SpecialtyForm` (modo `edit`) populado com `defaultValues`.
3. Campo `description` exibe checkbox ou botão "Remover descrição" que, ao acionado, envia `null` no PATCH.
4. Submit dispara `useUpdateSpecialty`.
5. Sucesso → invalida `['specialties']` e `['specialties', id]`, redireciona para detalhes.
6. Erro `409` (nome em conflito) → alerta global no formulário.

### Remoção

1. Botão "Excluir" abre `SpecialtyDeleteDialog` com modal de confirmação e nome da especialidade.
2. Confirmar → dispara `useDeleteSpecialty`.
3. Sucesso → invalida `['specialties']`, redireciona para `/specialties` (se em detalhes).

---

## Validação do formulário (Zod)

```ts
const specialtySchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional().nullable(),
})
```

---

## Mapper

```ts
// to-specialty-model.mapper.ts
export function toSpecialtyModel(dto: SpecialtyResponseDto): ISpecialtyModel {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}

// to-create-specialty-dto.mapper.ts
export function toCreateSpecialtyDto(input: ICreateSpecialtyInput): CreateSpecialtyDto {
  return {
    name: input.name,
    description: input.description,
  }
}

// to-update-specialty-dto.mapper.ts
export function toUpdateSpecialtyDto(input: IUpdateSpecialtyInput): UpdateSpecialtyDto {
  return {
    name: input.name,
    description: input.description,  // null remove o campo no backend
  }
}
```

---

## Service

```ts
// specialties.service.ts
export const specialtiesService = {
  getAll: (params?: ISpecialtyListParams): Promise<PaginatedSpecialtiesResponseDto> => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    return apiClient.get<PaginatedSpecialtiesResponseDto>(`/specialties${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => apiClient.get<SpecialtyResponseDto>(`/specialties/${id}`),
  create: (data: CreateSpecialtyDto) => apiClient.post<SpecialtyResponseDto>('/specialties', data),
  update: (id: string, data: UpdateSpecialtyDto) =>
    apiClient.patch<SpecialtyResponseDto>(`/specialties/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/specialties/${id}`),
}
```

---

## Query Keys

```ts
['specialties']              // invalidação geral após create/delete
['specialties', params]      // listagem filtrada
['specialties', id]          // item individual
```

---

## Navegação

Adicionar item "Especialidades" em `lib/constants.tsx` dentro de `NAVIGATION_ITEMS`:

```tsx
{
  id: 'specialties',
  label: 'Especialidades',
  href: '/specialties',
  requiredRoles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER],
  icon: <svg ...ícone de estrela médica ou tag... />,
}
```

---

## Estados e feedbacks

- **Loading**: `SpecialtyListSkeleton` na tabela; `SpecialtyDetailsSkeleton` nos detalhes; botão de submit com estado de loading
- **Erro de rede/servidor**: componente `ErrorMessage` com mensagem amigável (nunca exibir `detail` técnico)
- **Erro 404**: mensagem "Especialidade não encontrada"
- **Erro 409 (nome em uso)**: alerta global no formulário "Já existe uma especialidade com este nome"
- **Sucesso create**: redireciona para `/specialties` com toast de confirmação
- **Sucesso update**: redireciona para `/specialties/:id` com toast de confirmação
- **Sucesso delete**: redireciona para `/specialties` com toast de confirmação
- Botão de submit desabilitado enquanto `isPending`
- Modal de confirmação obrigatório antes de remover

---

## Regras de negócio

- `name` obrigatório — mínimo 3, máximo 100 caracteres.
- `description` opcional — máximo 500 caracteres; `null` remove o campo no backend.
- Busca aplica debounce de 300ms.
- Botão "Nova Especialidade" e ações editar/remover renderizados condicionalmente para ADMIN via `useAuthStore`.
- `description` não exibida na tela de detalhes quando `null`.
- Apenas usuários autenticados — rota privada.

---

## Dependências

- `specialtiesService` (novo)
- `apiClient` (existente em `lib/api-client.ts`)
- `useAuthStore` (existente em `stores/auth.store.ts`) — para ler `role` e controlar ações de escrita
- `@app/shared` — `SpecialtyResponseDto`, `CreateSpecialtyDto`, `UpdateSpecialtyDto`, `PaginatedSpecialtiesResponseDto`, `UserRole`
- React Query — `useQuery`, `useMutation`, `useQueryClient`
- React Hook Form + Zod resolver

---

## Decisões técnicas

| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Formulário | react-hook-form + zod resolver |
| Controle de role (botões de escrita) | `useAuthStore().user.role` — ler no componente |
| Optimistic update | Não — apenas invalidação após sucesso |
| Limpeza de description | Enviar `null` explicitamente no update — não omitir |

---

## Restrições

- NÃO importar `axios` fora de `lib/api-client.ts`
- NÃO armazenar dados de especialidades em Zustand
- NÃO mapear DTOs dentro de componentes ou hooks — usar mappers dedicados
- NÃO usar `useState` para campos de formulário
- NÃO exibir `detail` técnico de erro ao usuário
- NÃO importar tipos do backend diretamente — apenas via `@app/shared`
- NÃO reutilizar DTOs do shared como tipo do formulário — criar interface local (`ICreateSpecialtyInput`, `IUpdateSpecialtyInput`)
- NÃO renderizar botões de escrita (New/Edit/Delete) para roles não-ADMIN

---

## Estrutura esperada

```
apps/frontend/
  app/(authenticated)/
    specialties/
      page.tsx                        → listagem
      new/page.tsx                    → criação (ADMIN)
      [id]/page.tsx                   → detalhes
      [id]/edit/page.tsx              → edição (ADMIN)

components/features/specialties/
  types/
    specialty-model.types.ts          → ISpecialtyModel, IPaginatedSpecialtiesModel, ISpecialtyListParams
    specialty-input.types.ts          → ICreateSpecialtyInput, IUpdateSpecialtyInput
  services/
    specialties.service.ts
    specialties.service.spec.ts
  mappers/
    to-specialty-model.mapper.ts
    to-specialty-model.mapper.spec.ts
    to-create-specialty-dto.mapper.ts
    to-create-specialty-dto.mapper.spec.ts
    to-update-specialty-dto.mapper.ts
    to-update-specialty-dto.mapper.spec.ts
  use-cases/
    list-specialties.use-case.ts
    list-specialties.use-case.spec.ts
    get-specialty.use-case.ts
    get-specialty.use-case.spec.ts
    create-specialty.use-case.ts
    create-specialty.use-case.spec.ts
    update-specialty.use-case.ts
    update-specialty.use-case.spec.ts
    delete-specialty.use-case.ts
    delete-specialty.use-case.spec.ts
  hooks/
    use-specialties.hook.ts
    use-specialties.hook.spec.ts
    use-specialty.hook.ts
    use-specialty.hook.spec.ts
    use-create-specialty.hook.ts
    use-create-specialty.hook.spec.ts
    use-update-specialty.hook.ts
    use-update-specialty.hook.spec.ts
    use-delete-specialty.hook.ts
    use-delete-specialty.hook.spec.ts
  components/
    specialty-list.tsx
    specialty-list.integration.spec.tsx
    specialty-list-skeleton.tsx
    specialty-form.tsx
    specialty-form.integration.spec.tsx
    specialty-details.tsx
    specialty-details.integration.spec.tsx
    specialty-delete-dialog.tsx

cypress/
  e2e/specialties/
    specialties-list.cy.ts
    specialties-create.cy.ts
    specialties-detail.cy.ts
    specialties-update.cy.ts
    specialties-delete.cy.ts
  fixtures/
    specialties.json
```

---

## Cenários de teste adicionais

### Unitários (mappers, use-cases, hooks)
- `toSpecialtyModel`: converte `createdAt`/`updatedAt` para `Date`; mantém `description` como `string | null`
- `toCreateSpecialtyDto`: não inclui `description` se `undefined`
- `toUpdateSpecialtyDto`: passa `null` para `description` quando explicitamente removida
- `listSpecialtiesUseCase`: chama `specialtiesService.getAll(params)` e converte cada item com `toSpecialtyModel`
- `createSpecialtyUseCase`: chama mapper + service + retorna modelo convertido
- `useSpecialties`: `queryKey` inclui params; chama `listSpecialtiesUseCase`
- `useCreateSpecialty`: invalida `['specialties']` após sucesso; passa erro adiante
- `useUpdateSpecialty`: invalida `['specialties']` e `['specialties', id]` após sucesso
- `useDeleteSpecialty`: invalida `['specialties']` após sucesso

### Integração (componentes)
- `SpecialtyList` (ADMIN): exibe botão "Nova Especialidade" e ações editar/remover
- `SpecialtyList` (DOCTOR/USER): oculta botão "Nova Especialidade" e ações editar/remover
- `SpecialtyList`: loading → skeleton; error → alerta; vazio → mensagem "Nenhuma especialidade encontrada"
- `SpecialtyList`: lista com itens → tabela com linhas corretas
- `SpecialtyForm`: erro 409 exibe alerta global; erro 400 marca campo correto
- `SpecialtyForm`: campo `description` aceita string vazia e permite limpar com `null`
- `SpecialtyDetails`: exibe nome e datas; `description` visível apenas quando não nula
- `SpecialtyDetails` (ADMIN): botões editar e remover visíveis
- `SpecialtyDetails` (DOCTOR/USER): botões editar e remover ocultos

### E2E (Cypress)
- ADMIN: login → listar especialidades → criar nova → aparece na listagem
- ADMIN: editar especialidade → nome atualizado na listagem e detalhes
- ADMIN: limpar `description` via edição → campo ausente nos detalhes
- ADMIN: remover especialidade com confirmação → desaparece da listagem
- ADMIN: cancelar modal de remoção → especialidade permanece
- ADMIN: criar especialidade com nome duplicado → erro 409 visível no formulário
- DOCTOR/USER: acessa listagem e detalhes → botões de escrita não visíveis
- Busca por nome com debounce → filtra resultados corretamente

---

## Definition of Done

- [ ] Item "Especialidades" adicionado ao `NAVIGATION_ITEMS` em `lib/constants.tsx` com `requiredRoles: [ADMIN, DOCTOR, USER]`
- [ ] Listagem, detalhes, criação, edição e remoção implementados
- [ ] Botões de escrita (New/Edit/Delete) renderizados condicionalmente apenas para ADMIN
- [ ] Estados de loading, error e success tratados em todas as telas
- [ ] Skeletons específicos para listagem e detalhes
- [ ] Formulário com react-hook-form + validação zod + mapeamento de erro backend
- [ ] `description: null` enviado explicitamente no update quando campo removido
- [ ] Modal de confirmação na remoção
- [ ] Mappers convertendo DTO → Model (`createdAt`/`updatedAt` como `Date`)
- [ ] `toUpdateSpecialtyDto` envia `null` para `description` quando explicitamente removida
- [ ] Service consome apenas `apiClient` (sem axios direto)
- [ ] Hooks invalidando queries corretas após mutations
- [ ] Testes unitários com 100% de cobertura (mappers, use-cases, hooks)
- [ ] Testes de integração (loading / error / success) para cada componente
- [ ] Testes E2E cobrindo os fluxos críticos de CRUD com `data-testid`
- [ ] Sem warnings de lint, `console.log` ou código comentado
- [ ] Naming convention respeitada (kebab-case nos arquivos, sufixos obrigatórios)
- [ ] Nenhum tipo de axios fora do API Client
- [ ] Nenhum dado de especialidade em Zustand
