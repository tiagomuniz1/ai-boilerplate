# Task — Módulo de Doctors (Frontend)

## Descrição
Implementar as telas do módulo de doctors contemplando listagem, visualização de detalhes, criação, edição e remoção. Doctors são médicos vinculados a uma conta de usuário existente — o formulário de criação inclui a seleção do usuário e o preenchimento dos dados profissionais (CRM e especialidade).

---

## Contexto
- Doctors são perfis profissionais de médicos vinculados a um `User` existente no sistema.
- A API expõe os endpoints REST sob `/doctors`.
- DTOs vêm do `@app/shared` (`DoctorResponseDto`, `CreateDoctorDto`, `UpdateDoctorDto`).
- A listagem deve suportar busca por nome do usuário ou especialidade.
- O formulário de criação exige a seleção de um usuário existente (campo `userId`) — exibir nome e email na seleção.
- Apenas usuários autenticados acessam o módulo — proteção via `middleware.ts`.

---

## Contratos

### Input (dados do formulário)

ICreateDoctorInput:
- userId: string (uuid — selecionado via input de busca/select)
- crmNumber: string (formato `NNNNN/UF`, ex: `12345/SP`)
- specialty: string
- bio?: string

IUpdateDoctorInput:
- crmNumber?: string
- specialty?: string
- bio?: string

### Output (modelo exibido na UI)

IDoctorModel:
- id: string
- user: { id: string, fullName: string, email: string }
- crmNumber: string
- specialty: string
- bio: string | null
- createdAt: Date
- updatedAt: Date

---

## Assinaturas esperadas

```ts
// Hooks
useDoctors(params?: IDoctorListParams): UseQueryResult<IPaginatedDoctors>
useDoctor(id: string): UseQueryResult<IDoctorModel>
useCreateDoctor(): UseMutationResult<IDoctorModel, IApiError, ICreateDoctorInput>
useUpdateDoctor(): UseMutationResult<IDoctorModel, IApiError, { id: string; data: IUpdateDoctorInput }>
useDeleteDoctor(): UseMutationResult<void, IApiError, string>

// Use-cases
listDoctorsUseCase(params?: IDoctorListParams): Promise<IPaginatedDoctors>
getDoctorUseCase(id: string): Promise<IDoctorModel>
createDoctorUseCase(input: ICreateDoctorInput): Promise<IDoctorModel>
updateDoctorUseCase(id: string, input: IUpdateDoctorInput): Promise<IDoctorModel>
deleteDoctorUseCase(id: string): Promise<void>

// Service
doctorsService.getAll(params?): Promise<DoctorResponseDto[]>
doctorsService.getById(id: string): Promise<DoctorResponseDto>
doctorsService.create(data: CreateDoctorDto): Promise<DoctorResponseDto>
doctorsService.update(id: string, data: UpdateDoctorDto): Promise<DoctorResponseDto>
doctorsService.remove(id: string): Promise<void>
```

---

## Fluxo principal

### Listagem (`/doctors`)
1. Página renderiza `DoctorList`.
2. Hook `useDoctors` busca dados via `listDoctorsUseCase`.
3. Service chama `GET /doctors` → DTOs convertidos via `toDoctorModel`.
4. Renderiza tabela com nome, email, CRM, especialidade e ações (visualizar, editar, remover).
5. Botão "Novo Médico" leva a `/doctors/new`.
6. Campo de busca com debounce de 300ms envia `search` como query param.

### Criação (`/doctors/new`)
1. Renderiza `DoctorForm` (modo create) com `react-hook-form`.
2. Campo `userId` é um select com busca — lista usuários via `GET /users`.
3. Submit dispara `useCreateDoctor`.
4. Sucesso → invalida `['doctors']`, exibe toast e redireciona para `/doctors`.
5. Erro `409` (CRM duplicado ou usuário já tem perfil) → mensagem amigável no topo do formulário.
6. Erro de validação backend → mapeado para campos via `setError()`.

### Detalhes (`/doctors/[id]`)
1. `useDoctor(id)` carrega dados.
2. Renderiza `DoctorDetails` com nome do usuário vinculado, CRM, especialidade, bio e data de criação.
3. Botões de editar e remover visíveis.

### Edição (`/doctors/[id]/edit`)
1. `useDoctor(id)` carrega dados.
2. `DoctorForm` populado com `defaultValues` — campo `userId` é somente leitura (não é possível reatribuir um perfil de doctor a outro usuário).
3. Submit dispara `useUpdateDoctor`.
4. Sucesso → invalida `['doctors']` e `['doctors', id]`, redireciona para detalhes.

### Remoção
1. Modal de confirmação com nome do médico → `useDeleteDoctor`.
2. Sucesso → invalida `['doctors']`, toast e volta à listagem.

---

## Estados e feedbacks

- Loading → `DoctorListSkeleton` / `DoctorDetailsSkeleton` / spinner em botões
- Erro → componente `ErrorMessage` com mensagem amigável (nunca detalhe técnico)
- Sucesso → toast + invalidação de cache + redirecionamento
- Botão de submit desabilitado enquanto `isPending`
- Modal de confirmação obrigatório antes de remover

---

## Regras de negócio

- Campo `userId` obrigatório na criação — desabilitado na edição.
- CRM no formato `NNNNN/UF` — validação local antes do envio.
- `specialty` obrigatória — mínimo 3 caracteres.
- `bio` opcional — exibida apenas se preenchida na tela de detalhes.
- Busca aplica debounce de 300ms.
- Apenas usuários autenticados — rota privada.

---

## Dependências

- `doctorsService` (novo)
- `usersService` (existente — para listar usuários no select de criação)
- `apiClient` (existente)
- `@app/shared` — DTOs (`DoctorResponseDto`, `CreateDoctorDto`, `UpdateDoctorDto`)
- React Query
- React Hook Form + zod
- Componente de toast já existente

---

## Decisões técnicas da task

- React Query: **sim** — `useQuery` para listagem/detalhes, `useMutation` para create/update/delete
- Zustand: **não** — todos os dados vêm da API, gerenciados pelo React Query
- Optimistic update: **não** na primeira versão (apenas invalidação após sucesso)
- Formulário com react-hook-form: **sim** — com validação via zod resolver

---

## Restrições

- NÃO importar `axios` fora de `lib/api-client.ts`
- NÃO armazenar dados de doctors em Zustand
- NÃO mapear DTOs dentro de componentes ou hooks — usar `toDoctorModel`
- NÃO usar `useState` para campos de formulário
- NÃO exibir `detail` técnico de erro ao usuário
- NÃO importar tipos do backend diretamente — apenas via `@app/shared`
- NÃO reutilizar DTOs como tipo do formulário — criar interface local
- NÃO permitir alterar o `userId` no formulário de edição

---

## Estrutura esperada

```
apps/frontend/
  app/
    (authenticated)/
      doctors/
        page.tsx                    → listagem
        new/page.tsx                → criação
        [id]/page.tsx               → detalhes
        [id]/edit/page.tsx          → edição
  components/features/doctors/
    components/
      doctor-list.tsx
      doctor-list-skeleton.tsx
      doctor-form.tsx
      doctor-details.tsx
      doctor-details-skeleton.tsx
      doctor-delete-dialog.tsx
    hooks/
      use-doctors.hook.ts
      use-doctor.hook.ts
      use-create-doctor.hook.ts
      use-update-doctor.hook.ts
      use-delete-doctor.hook.ts
    services/
      doctors.service.ts
    use-cases/
      list-doctors.use-case.ts
      get-doctor.use-case.ts
      create-doctor.use-case.ts
      update-doctor.use-case.ts
      delete-doctor.use-case.ts
    mappers/
      to-doctor-model.ts
    types/
      doctor.types.ts
```

---

## Cenários de teste adicionais

- Listagem vazia → mensagem "Nenhum médico encontrado"
- Busca sem resultados → mensagem "Nenhum médico encontrado para a busca realizada"
- Erro 409 (CRM duplicado) na criação → mensagem de erro visível
- Erro 409 (usuário já tem perfil) na criação → mensagem de erro visível
- Campo `userId` desabilitado no formulário de edição
- `bio` não exibida na tela de detalhes quando vazia
- Cancelar modal de remoção não dispara mutation
- Após remoção, doctor não aparece mais na listagem
- Refresh em tela de detalhes recarrega corretamente os dados

---

## Definition of Done

- [ ] Listagem, detalhes, criação, edição e remoção implementados
- [ ] Estados de loading, error e success tratados em todas as telas
- [ ] Skeletons específicos para listagem e detalhes
- [ ] Formulário com react-hook-form + validação zod + mapeamento de erro backend
- [ ] Campo `userId` com select de usuários na criação e somente leitura na edição
- [ ] Modal de confirmação na remoção
- [ ] Mapper convertendo DTO → Model corretamente
- [ ] Service consome apenas `apiClient` (sem axios direto)
- [ ] Hooks invalidando queries corretamente após mutations
- [ ] Testes unitários com 100% de cobertura (mappers, use-cases, hooks)
- [ ] Testes de integração (loading / error / success) para cada tela
- [ ] Testes E2E cobrindo fluxo completo de CRUD com `data-testid`
- [ ] Sem warnings de lint, `console.log` ou código comentado
- [ ] Naming convention respeitada
- [ ] Nenhum tipo de axios fora do API Client
- [ ] Nenhum dado de doctor em Zustand
