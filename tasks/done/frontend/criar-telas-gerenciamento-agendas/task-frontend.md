# Task — Módulo de Agendas (Frontend)

## Descrição

Implementar as telas do módulo de agendas dos médicos contemplando listagem, visualização de detalhes, criação, edição e remoção. O resultado final deve ser um CRUD completo de agendas integrado à API do backend, seguindo a arquitetura em camadas (UI → Hooks → Use Cases → Services → API Client), com comportamento diferenciado por papel do usuário (DOCTOR vs ADMIN).

---

## Pré-requisito: expor `role` na resposta de autenticação

A UI precisa saber o papel do usuário logado para diferenciar o comportamento (DOCTOR vê apenas as próprias agendas; ADMIN pode filtrar por qualquer médico). Atualmente o backend retorna apenas `{ id, fullName, email }` no login e em `GET /auth/me`.

### Mudanças necessárias antes de implementar o módulo

**Backend — `packages/shared/src/dtos/`**
- `UserResponseDto` (ou criar `AuthResponseDto`): adicionar campo `role: UserRole`

**Backend — `AuthController` / `LoginUseCase` / `GetMeUseCase`**
- Incluir `role` na resposta de `/auth/login` e `/auth/me`
- Atualizar testes de integração em `auth.integration.spec.ts` para verificar o campo `role`

**Frontend — `components/features/auth/types/auth.types.ts`**
- Adicionar `role: UserRole` em `IAuthUserDto` e `IAuthUserModel`

**Frontend — `components/features/auth/mappers/to-auth-user-model.ts`**
- Mapear `dto.role → model.role`

**Frontend — `components/features/auth/components/auth-initializer.tsx`**
- Passar `role` ao `setUser()`

---

## Contexto

- Agendas definem a disponibilidade semanal de um médico: dia da semana, janela de horário e duração de cada slot.
- A API expõe os endpoints sob `/schedules`.
- DTOs vêm do `@app/shared` (`ScheduleResponseDto`, `CreateScheduleDto`, `UpdateScheduleDto`, `PaginatedSchedulesResponseDto`).
- Comportamento difere por papel:
  - **DOCTOR**: vê e gerencia apenas as próprias agendas. O backend ignora `doctorId` enviado no body e usa o perfil do usuário logado.
  - **ADMIN**: pode listar agendas de qualquer médico (usando filtro `?doctorId=`), e ao criar precisa informar `doctorId`.
- Listagem suporta filtro por `dayOfWeek`, `doctorId` (admin), `activeOn` (data de referência para validade) e paginação.
- Apenas usuários autenticados acessam o módulo — proteção via `middleware.ts`.

---

## Contratos

### `IScheduleModel` — modelo de domínio (exibição)

```ts
import { DayOfWeek } from '@app/shared'

export interface IScheduleModel {
  id: string
  doctorId: string
  dayOfWeek: DayOfWeek
  startTime: string       // HH:MM
  endTime: string         // HH:MM
  slotDurationInMinutes: number
  validFrom: string | null  // YYYY-MM-DD
  validUntil: string | null // YYYY-MM-DD
  createdAt: Date
  updatedAt: Date
}
```

### `ICreateScheduleInput` — dados do formulário de criação

```ts
export interface ICreateScheduleInput {
  doctorId?: string          // obrigatório apenas para ADMIN
  dayOfWeek: DayOfWeek
  startTime: string          // HH:MM
  endTime: string            // HH:MM
  slotDurationInMinutes: number
  validFrom?: string         // YYYY-MM-DD, opcional
  validUntil?: string        // YYYY-MM-DD, opcional
}
```

### `IUpdateScheduleInput` — dados do formulário de edição

```ts
export interface IUpdateScheduleInput {
  dayOfWeek?: DayOfWeek
  startTime?: string
  endTime?: string
  slotDurationInMinutes?: number
  validFrom?: string | null  // null remove o campo
  validUntil?: string | null // null remove o campo
}
```

### `IScheduleListParams` — parâmetros de listagem

```ts
export interface IScheduleListParams {
  doctorId?: string
  dayOfWeek?: DayOfWeek
  activeOn?: string    // YYYY-MM-DD, padrão = hoje
  page?: number
  limit?: number
}
```

---

## Assinaturas esperadas

```ts
// Hooks
useSchedules(params?: IScheduleListParams): UseQueryResult<IPaginatedSchedulesModel>
useSchedule(id: string): UseQueryResult<IScheduleModel>
useCreateSchedule(): UseMutationResult<IScheduleModel, IApiError, ICreateScheduleInput>
useUpdateSchedule(): UseMutationResult<IScheduleModel, IApiError, { id: string; data: IUpdateScheduleInput }>
useDeleteSchedule(): UseMutationResult<void, IApiError, string>

// Use-cases
listSchedulesUseCase(params?: IScheduleListParams): Promise<IPaginatedSchedulesModel>
getScheduleUseCase(id: string): Promise<IScheduleModel>
createScheduleUseCase(input: ICreateScheduleInput): Promise<IScheduleModel>
updateScheduleUseCase(id: string, input: IUpdateScheduleInput): Promise<IScheduleModel>
deleteScheduleUseCase(id: string): Promise<void>

// Service
schedulesService.getAll(params?: IScheduleListParams): Promise<PaginatedSchedulesResponseDto>
schedulesService.getById(id: string): Promise<ScheduleResponseDto>
schedulesService.create(data: CreateScheduleDto): Promise<ScheduleResponseDto>
schedulesService.update(id: string, data: UpdateScheduleDto): Promise<ScheduleResponseDto>
schedulesService.remove(id: string): Promise<void>
```

Onde `IPaginatedSchedulesModel`:
```ts
export interface IPaginatedSchedulesModel {
  data: IScheduleModel[]
  total: number
  page: number
  limit: number
}
```

---

## Fluxo principal por tela

### Listagem (`/schedules`)

1. Página renderiza `ScheduleList`.
2. `ScheduleList` lê `role` do `useAuthStore`.
3. Hook `useSchedules(params)` busca dados via `listSchedulesUseCase`.
4. Service chama `GET /schedules?...` → DTO paginado convertido via `toScheduleModel` para cada item.
5. Renderiza tabela com colunas: dia da semana, horário, duração do slot, validade, ações.
6. **ADMIN**: exibe select de médico para filtrar (`useDoctors()` para popular o select), exibe coluna "Médico" na tabela.
7. **DOCTOR**: oculta filtro e coluna de médico; botão "Nova agenda" visível.
8. Filtros adicionais disponíveis para ambos os papéis: dia da semana (select) e data de referência (input date, padrão = hoje).
9. Paginação com `page` e `limit`.

### Criação (`/schedules/new`)

1. Página renderiza `ScheduleForm` (modo `create`).
2. **ADMIN**: exibe select de médico (obrigatório). Popula com `useDoctors()`.
3. **DOCTOR**: campo de médico não exibido.
4. Submit dispara `useCreateSchedule`.
5. Sucesso → invalida `['schedules']`, redireciona para `/schedules`.
6. Erro `422` → mapeia mensagens para campos via `setError()`.
7. Erro `409` (sobreposição) → exibe alerta global no topo do formulário.

### Detalhes (`/schedules/:id`)

1. `useSchedule(id)` carrega dados.
2. Renderiza `ScheduleDetails` com todos os campos formatados.
3. **ADMIN** e dono (**DOCTOR**): botões "Editar" e "Excluir" visíveis.
4. **DOCTOR** tentando acessar agenda de outro médico → backend retorna 403 → exibir mensagem "Acesso negado".

### Edição (`/schedules/:id/edit`)

1. `useSchedule(id)` carrega dados atuais.
2. `ScheduleForm` (modo `edit`) populado com `defaultValues`.
3. Submit dispara `useUpdateSchedule`.
4. Sucesso → invalida `['schedules']` e `['schedules', id]`, redireciona para detalhes.
5. Erro `409` (sobreposição) → alerta global no formulário.
6. Erro `422` (regra de negócio) → campo correspondente marcado com erro.

### Remoção

1. Botão "Excluir" na listagem ou na tela de detalhes abre `ScheduleDeleteDialog`.
2. Modal de confirmação → dispara `useDeleteSchedule`.
3. Sucesso → invalida `['schedules']`, redireciona para `/schedules` (se em detalhes).

---

## Validação do formulário (Zod)

As regras abaixo devem ser validadas **localmente** no frontend antes do envio, espelhando as regras do backend:

```ts
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const scheduleSchema = z.object({
  dayOfWeek: z.nativeEnum(DayOfWeek, { required_error: 'Dia da semana obrigatório' }),
  startTime: z.string().regex(timeRegex, 'Horário inválido. Use HH:MM'),
  endTime: z.string().regex(timeRegex, 'Horário inválido. Use HH:MM'),
  slotDurationInMinutes: z.number().int().min(15).max(120),
  validFrom: z.string().regex(dateRegex).optional().or(z.literal('')),
  validUntil: z.string().regex(dateRegex).optional().or(z.literal('')),
})
.superRefine((data, ctx) => {
  // endTime deve ser após startTime
  if (timeToMinutes(data.startTime) >= timeToMinutes(data.endTime)) {
    ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Horário de fim deve ser após o início' })
  }
  // intervalo deve ser divisível pela duração do slot
  const interval = timeToMinutes(data.endTime) - timeToMinutes(data.startTime)
  if (interval > 0 && interval % data.slotDurationInMinutes !== 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['slotDurationInMinutes'],
      message: 'O intervalo de tempo deve ser divisível pela duração do slot',
    })
  }
  // validFrom deve ser anterior a validUntil quando ambos fornecidos
  if (data.validFrom && data.validUntil && data.validFrom >= data.validUntil) {
    ctx.addIssue({ code: 'custom', path: ['validUntil'], message: 'Data final deve ser após a data inicial' })
  }
})
```

No modo `create` com ADMIN adicionar ao schema:
```ts
doctorId: z.string().uuid('Selecione um médico').min(1, 'Médico obrigatório')
```

---

## Mapeamento de dias da semana

Deve existir uma constante de apresentação dos dias da semana:

```ts
export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Segunda-feira',
  TUESDAY: 'Terça-feira',
  WEDNESDAY: 'Quarta-feira',
  THURSDAY: 'Quinta-feira',
  FRIDAY: 'Sexta-feira',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
}
```

Esta constante deve ser definida em `types/schedule-model.types.ts` (ou em arquivo de constantes local ao feature) e usada tanto nos componentes quanto nos testes.

---

## Navegação

Adicionar item "Agendas" em `lib/constants.tsx` dentro de `NAVIGATION_ITEMS`:

```tsx
{
  id: 'schedules',
  label: 'Agendas',
  href: '/schedules',
  icon: <svg ...ícone de calendário... />,
}
```

---

## Mapper

```ts
// to-schedule-model.mapper.ts
export function toScheduleModel(dto: ScheduleResponseDto): IScheduleModel {
  return {
    id: dto.id,
    doctorId: dto.doctorId,
    dayOfWeek: dto.dayOfWeek,
    startTime: dto.startTime,
    endTime: dto.endTime,
    slotDurationInMinutes: dto.slotDurationInMinutes,
    validFrom: dto.validFrom,
    validUntil: dto.validUntil,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}

// to-create-schedule-dto.mapper.ts
export function toCreateScheduleDto(input: ICreateScheduleInput): CreateScheduleDto {
  return {
    doctorId: input.doctorId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    slotDurationInMinutes: input.slotDurationInMinutes,
    validFrom: input.validFrom || undefined,
    validUntil: input.validUntil || undefined,
  }
}

// to-update-schedule-dto.mapper.ts
export function toUpdateScheduleDto(input: IUpdateScheduleInput): UpdateScheduleDto {
  return {
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    slotDurationInMinutes: input.slotDurationInMinutes,
    validFrom: input.validFrom,    // null remove o campo
    validUntil: input.validUntil,  // null remove o campo
  }
}
```

---

## Service

```ts
// schedules.service.ts
export const schedulesService = {
  getAll: (params?: IScheduleListParams): Promise<PaginatedSchedulesResponseDto> => {
    const searchParams = new URLSearchParams()
    if (params?.doctorId) searchParams.set('doctorId', params.doctorId)
    if (params?.dayOfWeek) searchParams.set('dayOfWeek', params.dayOfWeek)
    if (params?.activeOn) searchParams.set('activeOn', params.activeOn)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    return apiClient.get<PaginatedSchedulesResponseDto>(`/schedules${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => apiClient.get<ScheduleResponseDto>(`/schedules/${id}`),
  create: (data: CreateScheduleDto) => apiClient.post<ScheduleResponseDto>('/schedules', data),
  update: (id: string, data: UpdateScheduleDto) =>
    apiClient.patch<ScheduleResponseDto>(`/schedules/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/schedules/${id}`),
}
```

---

## Query Keys

```ts
['schedules']                     // invalidação geral após create/delete
['schedules', params]             // listagem filtrada
['schedules', id]                 // item individual
```

---

## Estados e feedbacks

- **Loading**: `ScheduleListSkeleton` na tabela; `ScheduleDetailsSkeleton` nos detalhes; botão de submit com `isLoading`
- **Erro de rede/servidor**: componente `Alert` com mensagem amigável (sem exibir `detail` técnico)
- **Erro 403**: mensagem "Você não tem permissão para acessar esta agenda"
- **Erro 404**: mensagem "Agenda não encontrada"
- **Erro 409 (sobreposição)**: alerta global no formulário "Esta agenda conflita com outra já existente"
- **Sucesso create**: redireciona para `/schedules`; mensagem de sucesso opcional na listagem
- **Sucesso update**: redireciona para `/schedules/:id`
- **Sucesso delete**: redireciona para `/schedules`; mensagem de sucesso na listagem
- Botão de submit desabilitado enquanto `isPending`
- Modal de confirmação obrigatório antes de remover

---

## Regras de negócio adicionais

- `validFrom` e `validUntil` são opcionais. Se ausentes, a agenda é considerada válida indefinidamente (presente e futura).
- Ao enviar o formulário de edição com `validFrom = null` (campo limpo), enviar `null` explicitamente no body — o backend remove o campo.
- A listagem sem filtro de data usa hoje como referência (apenas agendas ativas no dia de hoje são retornadas por padrão).
- Um DOCTOR não pode criar agenda sem ter um perfil de médico cadastrado (o backend retorna 404 nesse caso — exibir mensagem adequada).
- Busca com debounce de 300ms no filtro de texto (se houver campo de busca na listagem).

---

## Estrutura esperada

```
apps/frontend/
  app/(authenticated)/
    schedules/
      page.tsx                      → listagem
      new/page.tsx                  → criação
      [id]/page.tsx                 → detalhes
      [id]/edit/page.tsx            → edição

components/features/schedules/
  types/
    schedule-model.types.ts         → IScheduleModel, IPaginatedSchedulesModel, DAY_OF_WEEK_LABELS
    schedule-input.types.ts         → ICreateScheduleInput, IUpdateScheduleInput, IScheduleListParams
  services/
    schedules.service.ts
    schedules.service.spec.ts
  mappers/
    to-schedule-model.mapper.ts
    to-schedule-model.mapper.spec.ts
    to-create-schedule-dto.mapper.ts
    to-create-schedule-dto.mapper.spec.ts
    to-update-schedule-dto.mapper.ts
    to-update-schedule-dto.mapper.spec.ts
  use-cases/
    list-schedules.use-case.ts
    list-schedules.use-case.spec.ts
    get-schedule.use-case.ts
    get-schedule.use-case.spec.ts
    create-schedule.use-case.ts
    create-schedule.use-case.spec.ts
    update-schedule.use-case.ts
    update-schedule.use-case.spec.ts
    delete-schedule.use-case.ts
    delete-schedule.use-case.spec.ts
  hooks/
    use-schedules.hook.ts
    use-schedules.hook.spec.ts
    use-schedule.hook.ts
    use-schedule.hook.spec.ts
    use-create-schedule.hook.ts
    use-create-schedule.hook.spec.ts
    use-update-schedule.hook.ts
    use-update-schedule.hook.spec.ts
    use-delete-schedule.hook.ts
    use-delete-schedule.hook.spec.ts
  components/
    schedule-list.tsx
    schedule-list.integration.spec.tsx
    schedule-list-skeleton.tsx
    schedule-form.tsx
    schedule-form.integration.spec.tsx
    schedule-details.tsx
    schedule-details.integration.spec.tsx
    schedule-delete-dialog.tsx

cypress/
  e2e/schedules/
    schedules-list.cy.ts
    schedules-create.cy.ts
    schedules-detail.cy.ts
    schedules-update.cy.ts
    schedules-delete.cy.ts
  fixtures/
    schedules.json
```

---

## Cenários de teste esperados

### Unitários (mappers, use-cases, hooks)
- `toScheduleModel`: converte `createdAt`/`updatedAt` para `Date`; mantém `validFrom`/`validUntil` como `string | null`
- `toCreateScheduleDto`: não inclui `doctorId` se undefined; transforma string vazia de `validFrom`/`validUntil` em `undefined`
- `toUpdateScheduleDto`: envia `null` para `validFrom`/`validUntil` quando explicitamente removidos
- `listSchedulesUseCase`: chama `schedulesService.getAll(params)` e converte cada item com `toScheduleModel`
- `createScheduleUseCase`: chama mapper + service + retorna modelo convertido
- `useSchedules`: `queryKey` inclui params; chama `listSchedulesUseCase`
- `useCreateSchedule`: invalida `['schedules']` após sucesso; passa erro adiante

### Integração (componentes)
- `ScheduleList` (ADMIN): exibe filtro de médico; renderiza coluna "Médico"
- `ScheduleList` (DOCTOR): oculta filtro de médico; oculta coluna "Médico"
- `ScheduleList`: loading → skeleton; error → alerta; vazio → mensagem adequada
- `ScheduleList`: lista com itens → tabela com linhas corretas
- `ScheduleForm` (create, ADMIN): campo de médico visível e obrigatório
- `ScheduleForm` (create, DOCTOR): campo de médico não renderizado
- `ScheduleForm`: erro 409 exibe alerta global; erro 422 marca campo correto
- `ScheduleDetails`: exibe todos os campos formatados; botões editar/excluir
- `ScheduleDetails`: loading → skeleton; error 403 → mensagem de acesso negado

### E2E (Cypress)
- DOCTOR: login → criar agenda sem informar médico → sucesso → aparece na lista
- DOCTOR: editar agenda própria → salvar → detalhes atualizados
- DOCTOR: tentar acessar agenda de outro médico → 403
- ADMIN: criar agenda selecionando médico → sucesso
- ADMIN: filtrar lista por médico e por dia da semana
- Remover agenda com confirmação → desaparece da lista
- Cancelar modal de remoção → agenda permanece

---

## Dependências

- `schedulesService` (novo)
- `apiClient` (existente em `lib/api-client.ts`)
- `useAuthStore` (existente em `stores/auth.store.ts`) — para ler `role`
- `useDoctors` (existente em `components/features/doctors/`) — para popular select de médico (admin)
- `@app/shared` — `ScheduleResponseDto`, `CreateScheduleDto`, `UpdateScheduleDto`, `PaginatedSchedulesResponseDto`, `DayOfWeek`, `UserRole`
- React Query — `useQuery`, `useMutation`, `useQueryClient`
- React Hook Form + Zod resolver

---

## Decisões técnicas

| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Formulário | react-hook-form + zod resolver |
| Diferenciação por role | `useAuthStore().user.role` — ler no componente, não no use-case |
| Otimistic update | Não — apenas invalidação após sucesso |
| Resolução de nome do médico (admin) | `useDoctors()` em paralelo na listagem; montar map `doctorId → fullName` no componente |
| Campo `validFrom`/`validUntil` null | Enviar `null` explicitamente no update (não omitir) para limpar o campo |

---

## Restrições

- NÃO importar `axios` fora de `lib/api-client.ts`
- NÃO armazenar dados de agendas em Zustand
- NÃO mapear DTOs dentro de componentes ou hooks — usar mappers dedicados
- NÃO usar `useState` para campos de formulário
- NÃO exibir `detail` técnico de erro ao usuário
- NÃO importar tipos do backend diretamente — apenas via `@app/shared`
- NÃO reutilizar DTOs do shared como tipo do formulário — criar interface local (`ICreateScheduleInput`, `IUpdateScheduleInput`)
- NÃO aplicar lógica de role nos use-cases ou service — apenas nos componentes

---

## Definition of Done

- [ ] Pré-requisito: `role` exposto no backend e mapeado no auth store do frontend
- [ ] Item "Agendas" adicionado ao `NAVIGATION_ITEMS` em `lib/constants.tsx`
- [ ] Listagem, detalhes, criação, edição e remoção implementados
- [ ] Comportamento diferenciado por papel (DOCTOR / ADMIN) funcionando nas telas de listagem e criação
- [ ] Estados de loading, error e success tratados em todas as telas
- [ ] Skeletons específicos para listagem e detalhes
- [ ] Formulário com react-hook-form + validação zod (incluindo regras de negócio: endTime > startTime, intervalo divisível por slot, validFrom < validUntil)
- [ ] Erro 409 (sobreposição) exibido como alerta global no formulário
- [ ] Modal de confirmação na remoção
- [ ] Mappers convertendo DTO → Model (incluindo `createdAt`/`updatedAt` como `Date`)
- [ ] `toUpdateScheduleDto` envia `null` explicitamente para limpar `validFrom`/`validUntil`
- [ ] Service consome apenas `apiClient` (sem axios direto)
- [ ] Hooks invalidando queries corretas após mutations
- [ ] Testes unitários com 100% de cobertura (mappers, use-cases, hooks)
- [ ] Testes de integração (loading / error / success) para cada componente
- [ ] Testes E2E cobrindo os fluxos críticos de CRUD para DOCTOR e ADMIN com `data-testid`
- [ ] Sem warnings de lint, `console.log` ou código comentado
- [ ] Naming convention respeitada (kebab-case nos arquivos, sufixos obrigatórios)
- [ ] Nenhum tipo de axios fora do API Client
- [ ] Nenhum dado de agenda em Zustand
