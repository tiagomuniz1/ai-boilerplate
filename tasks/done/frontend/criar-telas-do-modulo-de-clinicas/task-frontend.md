# Task — Telas do Módulo de Clínicas (Frontend)

## Descrição
Implementar as telas de gerenciamento de clínicas: listagem, detalhes, criação e edição. Acessível apenas para usuários com role `ADMIN`. Clínicas não são excluídas — apenas desativadas via edição.

**Pré-requisito:** task backend **criar-modulo-de-clinicas** concluída (endpoints `/clinics` disponíveis).

---

## Contexto
- Clínicas são a entidade raiz do modelo multi-tenant. A tela de gerenciamento é uma view administrativa para o admin da plataforma visualizar e configurar as clínicas cadastradas.
- A listagem suporta busca por nome ou slug.
- Clínicas inativas (`isActive: false`) são exibidas na listagem com badge de status "Inativa" — não são ocultadas.
- Não há botão de exclusão — para desativar uma clínica, o admin edita e altera `isActive` para `false`.
- Rota protegida — apenas `ADMIN` tem acesso. Outros roles são redirecionados ao dashboard.

---

## Contratos

### Tipos locais

```ts
// types/clinic.types.ts
export interface IClinicModel {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ICreateClinicInput {
  name: string
  slug?: string
}

export interface IUpdateClinicInput {
  name?: string
  slug?: string
  isActive?: boolean
}

export interface IClinicListParams {
  page?: number
  limit?: number
  search?: string
}
```

---

## Assinaturas esperadas

```ts
// hooks
useClinics(params?: IClinicListParams): UseQueryResult<IPaginatedClinics>
useClinic(id: string): UseQueryResult<IClinicModel>
useCreateClinic(): UseMutationResult<IClinicModel, IApiError, ICreateClinicInput>
useUpdateClinic(): UseMutationResult<IClinicModel, IApiError, { id: string; data: IUpdateClinicInput }>

// use-cases
listClinicsUseCase(params?: IClinicListParams): Promise<IPaginatedClinics>
getClinicUseCase(id: string): Promise<IClinicModel>
createClinicUseCase(input: ICreateClinicInput): Promise<IClinicModel>
updateClinicUseCase(id: string, input: IUpdateClinicInput): Promise<IClinicModel>

// service
clinicsService.getAll(params?): Promise<ClinicResponseDto[]>
clinicsService.getById(id: string): Promise<ClinicResponseDto>
clinicsService.create(data: CreateClinicDto): Promise<ClinicResponseDto>
clinicsService.update(id: string, data: UpdateClinicDto): Promise<ClinicResponseDto>
```

---

## Fluxo principal

### Listagem (`/clinics`)
1. Página renderiza `ClinicList`.
2. `useClinics` busca dados via `listClinicsUseCase`.
3. Service chama `GET /clinics` → DTOs convertidos via `toClinicModel`.
4. Renderiza tabela com nome, slug, status (ativa/inativa) e ações (visualizar, editar).
5. Botão "Nova Clínica" leva a `/clinics/new`.
6. Campo de busca com debounce de 300ms envia `search` como query param.
7. Clínicas inativas exibem badge "Inativa" na coluna de status.

### Criação (`/clinics/new`)
1. Renderiza `ClinicForm` em modo create.
2. Campo `name` obrigatório. Campo `slug` opcional — exibe preview do slug gerado a partir do nome em tempo real.
3. Submit dispara `useCreateClinic`.
4. Sucesso → invalida `['clinics']`, exibe toast e redireciona para `/clinics`.
5. Erro `409` (slug duplicado) → mensagem amigável no topo do formulário.

### Detalhes (`/clinics/[id]`)
1. `useClinic(id)` carrega dados.
2. Renderiza `ClinicDetails` com nome, slug, status e data de criação.
3. Botão de editar visível.

### Edição (`/clinics/[id]/edit`)
1. `useClinic(id)` carrega dados.
2. `ClinicForm` populado com `defaultValues`.
3. Campo `isActive` aparece como toggle (ativar/desativar clínica).
4. Submit dispara `useUpdateClinic`.
5. Sucesso → invalida `['clinics']` e `['clinics', id]`, redireciona para detalhes.

---

## Estados e feedbacks

- Loading → `ClinicListSkeleton` / `ClinicDetailsSkeleton`
- Erro → componente `ErrorMessage` com mensagem amigável
- Sucesso → toast + invalidação de cache + redirecionamento
- Botão de submit desabilitado enquanto `isPending`
- Preview do slug gerado em tempo real no formulário de criação

---

## Regras de negócio

- Campo `slug` exibe preview gerado a partir do `name` antes do envio (transformação local: lowercase, espaços → hífens, remove especiais).
- Se o usuário preencher `slug` manualmente, o preview é substituído pelo valor informado.
- `isActive` só aparece no formulário de **edição** — não na criação (sempre começa ativa).
- Rota acessível apenas por `ADMIN` — redirecionar para `/dashboard` se role diferente.

---

## Dependências

- `clinicsService` (novo)
- `apiClient` (existente)
- `@app/shared` — DTOs (`ClinicResponseDto`, `CreateClinicDto`, `UpdateClinicDto`)
- React Query
- React Hook Form + zod
- Componente de toast existente

---

## Decisões técnicas da task

- React Query: **sim** — `useQuery` para listagem/detalhes, `useMutation` para create/update
- Zustand: **não** — dados gerenciados pelo React Query
- Formulário: react-hook-form + zod
- Preview de slug: `watch('name')` do react-hook-form transformado localmente

---

## Restrições

- NÃO importar `axios` fora de `lib/api-client.ts`
- NÃO armazenar dados de clínicas em Zustand
- NÃO exibir botão de exclusão — clínicas só são desativadas
- NÃO mapear DTOs dentro de componentes ou hooks — usar `toClinicModel`
- NÃO reutilizar DTOs como tipo de formulário — criar interface local `ICreateClinicInput`

---

## Estrutura esperada

```
apps/frontend/
  app/
    (authenticated)/
      clinics/
        page.tsx                  → listagem
        new/page.tsx              → criação
        [id]/page.tsx             → detalhes
        [id]/edit/page.tsx        → edição
  components/features/clinics/
    components/
      clinic-list.tsx
      clinic-list-skeleton.tsx
      clinic-form.tsx
      clinic-details.tsx
      clinic-details-skeleton.tsx
    hooks/
      use-clinics.hook.ts
      use-clinic.hook.ts
      use-create-clinic.hook.ts
      use-update-clinic.hook.ts
    services/
      clinics.service.ts
    use-cases/
      list-clinics.use-case.ts
      get-clinic.use-case.ts
      create-clinic.use-case.ts
      update-clinic.use-case.ts
    mappers/
      to-clinic-model.ts
    types/
      clinic.types.ts
```

---

## Cenários de teste adicionais

- Listagem exibe clínicas ativas e inativas com badge correto
- Listagem vazia → mensagem "Nenhuma clínica encontrada"
- Busca sem resultados → mensagem amigável
- Preview de slug atualiza em tempo real ao digitar o nome
- Erro `409` (slug duplicado) na criação → mensagem de erro visível
- Campo `isActive` não aparece no formulário de criação
- Campo `isActive` aparece como toggle no formulário de edição
- Clínica desativada exibe status "Inativa" na listagem e detalhes
- Usuário com role diferente de `ADMIN` é redirecionado ao acessar `/clinics`

---

## Definition of Done

- [ ] Listagem, detalhes, criação e edição implementados
- [ ] Estados de loading, error e success tratados em todas as telas
- [ ] Skeletons para listagem e detalhes
- [ ] Preview de slug em tempo real no formulário de criação
- [ ] Toggle de `isActive` apenas no formulário de edição
- [ ] Badge de status na listagem (ativa/inativa)
- [ ] Proteção de rota por role (`ADMIN` apenas)
- [ ] Mapper `toClinicModel` convertendo DTO → Model
- [ ] Service consome apenas `apiClient`
- [ ] Hooks invalidando queries após mutations
- [ ] Testes unitários com 100% de cobertura (mappers, use-cases, hooks)
- [ ] Testes de integração (loading / error / success) para cada componente
- [ ] Naming convention respeitada
