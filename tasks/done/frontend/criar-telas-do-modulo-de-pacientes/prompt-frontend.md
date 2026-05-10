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
# Task — Módulo de Pacientes (Frontend)

## Descrição
Implementar as telas do módulo de pacientes contemplando listagem, visualização de detalhes, criação, edição e remoção. O resultado final deve ser um CRUD completo de pacientes integrado à API do backend, seguindo a arquitetura em camadas (UI → Hooks → Use Cases → Services → API Client).

---

## Contexto
- Pacientes são uma entidade central do sistema e são consumidos por outros módulos (consultas, prontuários, etc.).
- A API expõe os endpoints REST sob `/patients`.
- DTOs vêm do `@app/shared` (`IPatientDto`, `ICreatePatientDto`, `IUpdatePatientDto`).
- Listagem deve suportar busca por nome e paginação.
- Apenas usuários autenticados acessam o módulo — proteção via `middleware.ts`.

---

## Contratos

### Input (dados do formulário)
ICreatePatientInput / IUpdatePatientInput:
- fullName: string
- email: string
- phone: string
- birthDate: string (ISO date)
- documentNumber: string
- gender: 'male' | 'female' | 'other'
- address?: string

### Output (modelo exibido na UI)
IPatientModel:
- id: string
- fullName: string
- email: string
- phone: string
- birthDate: Date
- documentNumber: string
- gender: 'male' | 'female' | 'other'
- address: string | null
- createdAt: Date
- updatedAt: Date

---

## Assinaturas esperadas

```ts
// Hooks
usePatients(params?: IPatientListParams): UseQueryResult<IPatientModel[]>
usePatient(id: string): UseQueryResult<IPatientModel>
useCreatePatient(): UseMutationResult<IPatientModel, IApiError, ICreatePatientInput>
useUpdatePatient(): UseMutationResult<IPatientModel, IApiError, { id: string; data: IUpdatePatientInput }>
useDeletePatient(): UseMutationResult<void, IApiError, string>

// Use-cases
listPatientsUseCase(params?: IPatientListParams): Promise<IPatientModel[]>
getPatientUseCase(id: string): Promise<IPatientModel>
createPatientUseCase(input: ICreatePatientInput): Promise<IPatientModel>
updatePatientUseCase(id: string, input: IUpdatePatientInput): Promise<IPatientModel>
deletePatientUseCase(id: string): Promise<void>

// Service
patientsService.getAll(params?): Promise<IPatientDto[]>
patientsService.getById(id: string): Promise<IPatientDto>
patientsService.create(data: ICreatePatientDto): Promise<IPatientDto>
patientsService.update(id: string, data: IUpdatePatientDto): Promise<IPatientDto>
patientsService.remove(id: string): Promise<void>
```

---

## Fluxo principal

### Listagem (`/patients`)
1. Página renderiza `PatientList`.
2. Hook `usePatients` busca dados via `listPatientsUseCase`.
3. Service chama `GET /patients` → DTOs convertidos via `toPatientModel`.
4. Renderiza tabela com ações (visualizar, editar, remover) e botão "Novo Paciente".

### Criação (`/patients/new`)
1. Renderiza `PatientForm` (modo create) com `react-hook-form`.
2. Submit dispara `useCreatePatient`.
3. Sucesso → invalida `['patients']`, exibe toast e redireciona para `/patients`.
4. Erro `422` → mapeia para campos via `setError()`.

### Edição (`/patients/[id]/edit`)
1. `usePatient(id)` carrega dados.
2. `PatientForm` é populado com `defaultValues`.
3. Submit dispara `useUpdatePatient`.
4. Sucesso → invalida `['patients']` e `['patients', id]`, redireciona para detalhes.

### Detalhes (`/patients/[id]`)
1. `usePatient(id)` carrega dados.
2. Renderiza `PatientDetails` com botões editar/remover.

### Remoção
1. Modal de confirmação → `useDeletePatient`.
2. Sucesso → invalida `['patients']`, toast e volta à listagem.

---

## Estados e feedbacks

- Loading → `PatientListSkeleton` / `PatientDetailsSkeleton` / spinner em botões
- Erro → componente `ErrorMessage` com mensagem amigável
- Sucesso → toast + invalidação de cache + redirecionamento
- Botão de submit desabilitado enquanto `isPending`
- Modal de confirmação obrigatório antes de remover

---

## Regras de negócio

- Email e documento devem ser únicos (validação backend, frontend trata erro 422).
- `birthDate` não pode ser futura.
- `phone` e `documentNumber` devem ser validados localmente (formato).
- Listagem ordenada por `fullName` ASC por padrão.
- Busca aplica debounce de 300ms.
- Apenas usuários autenticados — rota privada.

---

## Dependências

- `patientsService` (novo)
- `apiClient` (existente)
- `@app/shared` — DTOs (`IPatientDto`, `ICreatePatientDto`, `IUpdatePatientDto`)
- React Query
- React Hook Form
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
- NÃO armazenar dados de pacientes em Zustand
- NÃO mapear DTOs dentro de componentes ou hooks — usar `toPatientModel`
- NÃO usar `useState` para campos de formulário
- NÃO exibir `detail` técnico de erro ao usuário
- NÃO importar tipos do backend diretamente — apenas via `@app/shared`
- NÃO reutilizar DTOs como tipo do formulário — criar interface local

---

## Estrutura esperada

```
apps/frontend/
  app/
    patients/
      page.tsx                    → listagem
      new/page.tsx                → criação
      [id]/page.tsx               → detalhes
      [id]/edit/page.tsx          → edição
  components/features/patients/
    components/
      patient-list.tsx
      patient-list-skeleton.tsx
      patient-form.tsx
      patient-details.tsx
      patient-delete-dialog.tsx
    hooks/
      use-patients.hook.ts
      use-patient.hook.ts
      use-create-patient.hook.ts
      use-update-patient.hook.ts
      use-delete-patient.hook.ts
    services/
      patients.service.ts
    use-cases/
      list-patients.use-case.ts
      get-patient.use-case.ts
      create-patient.use-case.ts
      update-patient.use-case.ts
      delete-patient.use-case.ts
    mappers/
      to-patient-model.ts
      to-patient-dto.ts
    types/
      patient.types.ts
```

---

## Cenários de teste adicionais

- Listagem vazia → mensagem "Nenhum paciente encontrado"
- Busca sem resultados → mensagem apropriada
- Erro 422 na criação → erros aparecem nos campos correspondentes
- Erro 409 (email/documento duplicado) → mensagem amigável
- Cancelar modal de remoção não dispara mutation
- Edição com dados inalterados → ainda permite submit
- `birthDate` futura → erro de validação local
- Refresh em tela de detalhes recarrega corretamente os dados
- Após remoção, paciente removido não aparece mais na listagem

---

## Definition of Done

- [ ] Listagem, detalhes, criação, edição e remoção implementados
- [ ] Estados de loading, error e success tratados em todas as telas
- [ ] Skeletons específicos para listagem e detalhes
- [ ] Formulário com react-hook-form + validação + mapeamento de erro 422
- [ ] Modal de confirmação na remoção
- [ ] Mappers convertendo DTO → Model corretamente (Date, etc.)
- [ ] Service consome apenas `apiClient` (sem axios direto)
- [ ] Hooks invalidando queries corretamente após mutations
- [ ] Testes unitários com 100% de cobertura (mappers, use-cases, hooks)
- [ ] Testes de integração (loading / error / success) para cada tela
- [ ] Testes E2E cobrindo fluxo completo de CRUD com `data-testid`
- [ ] Sem warnings de lint, `console.log` ou código comentado
- [ ] Naming convention respeitada
- [ ] Nenhum tipo de axios fora do API Client
- [ ] Nenhum dado de paciente em Zustand