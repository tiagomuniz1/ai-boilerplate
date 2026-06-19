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
# Task — Bloqueio de Períodos na Agenda do Médico / Exceções de Agenda (Frontend)

## Descrição

Implementar a interface que permite **bloquear um período de tempo pontual** na agenda de um médico, diretamente na tela de Consultas (agenda visual já existente). O médico (ou ADMIN) poderá registrar que, em uma data específica, não atenderá em todo ou parte do período recorrente — ex: "nesta sexta-feira não atendo à tarde". Os bloqueios devem aparecer visualmente na agenda e os slots bloqueados deixam de ser ofertados para agendamento (o backend já remove esses slots da disponibilidade).

Segue a arquitetura em camadas (UI → Hooks → Use Cases → Services → API Client), com comportamento diferenciado por papel (ADMIN/DOCTOR gerenciam; USER apenas visualiza).

---

## Pré-requisito (Backend)

Depende da task de backend **"Bloqueio de Períodos na Agenda do Médico / Exceções de Agenda"**, que expõe os endpoints `/schedule-exceptions` e passa a remover os slots bloqueados de `GET /appointments/availability`. Os DTOs (`ScheduleExceptionResponseDto`, `CreateScheduleExceptionDto`, `UpdateScheduleExceptionDto`, `PaginatedScheduleExceptionsResponseDto`) vêm de `@app/shared`.

---

## Contexto

- A tela de Consultas (`app/[slug]/(authenticated)/appointments`) já possui a agenda visual (`AppointmentAgenda`) com visões **dia** e **semana**, composta por `AgendaDayGrid` / `AgendaWeekGrid` e o hook `useDayAgenda`.
- Hoje o `useDayAgenda` compõe **disponibilidade** (`useAvailability`) + **consultas** (`useAppointments`) em `IAgendaSlot[]` (status `free` | `booked`).
- Os **bloqueios** (exceções) são uma terceira fonte: representam janelas em que o médico não atende numa data específica. Como o backend já **remove** os slots bloqueados da disponibilidade, eles não aparecem como `free` — para torná-los **visíveis e gerenciáveis**, a UI precisa buscar a lista de exceções da(s) data(s) visível(is) e renderizá-las como itens de "bloqueio".
- Comportamento por papel:
  - **ADMIN**: vê/gerencia bloqueios de qualquer médico (após selecionar o médico na toolbar).
  - **DOCTOR**: vê/gerencia os próprios bloqueios (backend deriva o `doctorId`).
  - **USER**: apenas visualiza os bloqueios — sem criar/remover.
- Endpoints consumidos: `GET/POST/PATCH/DELETE /schedule-exceptions`.
- Acesso protegido via `middleware.ts` (já configurado para a área autenticada).

---

## Contratos

### `IScheduleExceptionModel` — modelo de domínio

```ts
export interface IScheduleExceptionModel {
  id: string
  doctorId: string
  date: string            // YYYY-MM-DD
  startTime: string | null // HH:MM, null = início do dia
  endTime: string | null   // HH:MM, null = fim do dia
  reason: string | null
  createdAt: Date
  updatedAt: Date
}
```

### `ICreateScheduleExceptionInput` — dados do formulário

```ts
export interface ICreateScheduleExceptionInput {
  doctorId?: string        // obrigatório apenas para ADMIN
  date: string             // YYYY-MM-DD
  startTime?: string | null // HH:MM — ausente/null quando "dia inteiro"
  endTime?: string | null   // HH:MM — ausente/null quando "dia inteiro"
  reason?: string | null
}
```

### `IScheduleExceptionListParams`

```ts
export interface IScheduleExceptionListParams {
  doctorId?: string
  from?: string  // YYYY-MM-DD
  to?: string    // YYYY-MM-DD
  page?: number
  limit?: number
}
```

---

## Camadas e assinaturas esperadas

**Service** (`schedule-exceptions.service.ts`) — única fronteira de chamada à API via `apiClient`:
- `getAll(params?: IScheduleExceptionListParams): Promise<PaginatedScheduleExceptionsResponseDto>`
- `create(data: CreateScheduleExceptionDto): Promise<ScheduleExceptionResponseDto>`
- `update(id: string, data: UpdateScheduleExceptionDto): Promise<ScheduleExceptionResponseDto>`
- `remove(id: string): Promise<void>`

**Mapper** (`to-schedule-exception-model.mapper.ts`):
- `toScheduleExceptionModel(dto: ScheduleExceptionResponseDto): IScheduleExceptionModel` — converte `createdAt`/`updatedAt` para `Date`.

**Use-cases** (funções):
- `listScheduleExceptionsUseCase(params?): Promise<IScheduleExceptionModel[]>`
- `createScheduleExceptionUseCase(input: ICreateScheduleExceptionInput): Promise<IScheduleExceptionModel>`
- `deleteScheduleExceptionUseCase(id: string): Promise<void>`

**Hooks** (React Query):
- `useScheduleExceptions(params?: IScheduleExceptionListParams)` — `useQuery`, `queryKey: ['schedule-exceptions', params]`.
- `useCreateScheduleException()` — `useMutation`; em `onSuccess`, invalidar `['schedule-exceptions']` **e** `['availability']` (para os slots livres recalcularem).
- `useDeleteScheduleException()` — `useMutation`; mesma invalidação dupla em `onSuccess`.

**Componentes:**
- `BlockTimeDialog` — formulário (`react-hook-form` + `zod`) para criar bloqueio: campo `date`, toggle **"Dia inteiro"**, `startTime`/`endTime` (HH:MM, desabilitados quando "Dia inteiro"), `reason` (opcional). Erros `422` mapeados para os campos via `setError()`. Botão de submit desabilitado enquanto `isPending`.
- `BlockBanner` — exibe um bloqueio na coluna do dia (ex: "14:00–18:00 · Bloqueado" ou "Dia inteiro · Bloqueado", com `reason` quando houver) e, para ADMIN/DOCTOR, um botão de remover.
- Integração na agenda existente:
  - `AgendaToolbar`: botão **"Bloquear horário"** (visível apenas para ADMIN/DOCTOR; para ADMIN, habilitado apenas quando há médico selecionado) que abre o `BlockTimeDialog` pré-preenchido com a data corrente.
  - `AgendaDayGrid` / `AgendaWeekGrid` (coluna do dia): buscar as exceções da data via `useScheduleExceptions` e renderizar os `BlockBanner` correspondentes, junto dos slots, ordenados por horário.

---

## Fluxos

**Criar bloqueio:**
1. Usuário (ADMIN com médico selecionado, ou DOCTOR) clica em "Bloquear horário" na toolbar.
2. `BlockTimeDialog` abre com `date` = data corrente da agenda. Usuário escolhe "Dia inteiro" ou informa `startTime`/`endTime`, e opcionalmente `reason`.
3. Submit → `useCreateScheduleException`. Para ADMIN, inclui `doctorId` (médico selecionado); para DOCTOR, omite (backend deriva).
4. Sucesso → fecha o diálogo; invalida `['schedule-exceptions']` e `['availability']`; a agenda atualiza (bloqueio aparece, slots da janela somem da disponibilidade).
5. Erro `409` (consulta agendada na janela) → **manter o diálogo aberto** e exibir um alerta acionável orientando a **remarcar**: "Existe consulta agendada nesse período. Remarque ou cancele a consulta antes de bloquear o horário." A mensagem deve aproveitar o `detail` do backend (que lista os horários conflitantes) quando disponível, com fallback para o texto padrão. Além do alerta, **direcionar o usuário à consulta em conflito**: como a agenda da data já exibe as consultas (`booked`), o fluxo orienta o usuário a fechar o diálogo e abrir a consulta conflitante (`AppointmentDetailsDialog`) para remarcá-la (cancelar e reagendar em outro horário). Opcionalmente, destacar visualmente o(s) slot(s) `booked` conflitante(s) na coluna do dia.
6. Erro `422` (horário inválido) → mensagem amigável no campo correspondente.

**Visualizar bloqueios:**
- Cada coluna de dia busca `useScheduleExceptions({ doctorId, from: date, to: date })` e renderiza `BlockBanner` para cada exceção daquela data.
- USER vê os banners sem ação de remover.

**Remover bloqueio:**
1. ADMIN/DOCTOR clica em remover no `BlockBanner`.
2. `useDeleteScheduleException` → sucesso invalida `['schedule-exceptions']` e `['availability']`; o banner some e os slots voltam a aparecer como livres.

---

## Regras de negócio (UI)

- "Dia inteiro" envia `startTime`/`endTime` como `null` (ou omitidos); caso contrário, ambos no formato `HH:MM` com `startTime < endTime` (validar no `zod`).
- ADMIN só pode bloquear/visualizar bloqueios após selecionar um médico (reutilizar o seletor de médico já existente na toolbar). Sem médico selecionado, o botão "Bloquear horário" fica desabilitado e a agenda mostra o estado vazio já existente.
- DOCTOR nunca envia `doctorId` (backend deriva do perfil).
- USER nunca vê botões de criar/remover bloqueio.
- Slots em datas passadas continuam regidos pela regra já existente (`isPast`) — bloqueio não altera esse comportamento.
- **Não é possível bloquear um período que já tenha consulta agendada.** O backend rejeita com `409`; a UI nunca tenta "forçar" o bloqueio. O usuário deve **remarcar** (no sistema, remarcar = cancelar a consulta e reagendá-la em outro horário/dia via o fluxo já existente) ou cancelar a consulta antes de cadastrar a exceção. Após remarcar/cancelar, o usuário repete a criação do bloqueio.
- Tratar sempre os três estados (`loading`, `error`, `success`) nas buscas; erro nunca expõe `detail` técnico ao usuário.

---

## Estrutura esperada

```
apps/frontend/components/features/schedule-exceptions/
  components/
    BlockTimeDialog.tsx
    BlockBanner.tsx
  hooks/
    use-schedule-exceptions.hook.ts
    use-create-schedule-exception.hook.ts
    use-delete-schedule-exception.hook.ts
  mappers/
    to-schedule-exception-model.mapper.ts
  services/
    schedule-exceptions.service.ts
  types/
    schedule-exception-model.types.ts
    schedule-exception-input.types.ts
  use-cases/
    list-schedule-exceptions.use-case.ts
    create-schedule-exception.use-case.ts
    delete-schedule-exception.use-case.ts

apps/frontend/components/features/appointments/components/
  agenda-toolbar.tsx        (alterado: botão "Bloquear horário")
  agenda-day-grid.tsx       (alterado: renderiza BlockBanner)
  agenda-week-grid.tsx      (alterado: renderiza BlockBanner por coluna)
  appointment-agenda.tsx    (alterado: estado/abertura do BlockTimeDialog, passa doctorId)
```

Todos os componentes usam `data-testid` para teste/E2E.

---

## Testes

**Integração (React Testing Library + Jest, services mockados):**
- `BlockTimeDialog`: renderiza campos; toggle "Dia inteiro" desabilita `startTime`/`endTime`; validação de `startTime < endTime`; submit chama o service com payload correto (com/sem `doctorId`); sucesso fecha o diálogo; erro `409` **mantém o diálogo aberto** e mostra o alerta orientando a remarcar (usando o `detail` do backend quando presente); erro `422` mostra erro no campo.
- `BlockBanner`: exibe janela e `reason`; mostra botão remover para ADMIN/DOCTOR e oculta para USER; clicar remover chama o service.
- `AgendaDayGrid`/`AgendaWeekGrid`: com exceções mockadas, renderiza os banners na data correta; sem exceções, não renderiza banner.
- `AgendaToolbar`/`AppointmentAgenda`: botão "Bloquear horário" visível para ADMIN/DOCTOR e ausente para USER; desabilitado para ADMIN sem médico selecionado; abre o diálogo.
- Hooks de mutation: `onSuccess` invalida `['schedule-exceptions']` e `['availability']`.
- Sempre cobrir `loading`, `error`, `success`.

**Unitários:**
- Mapper `toScheduleExceptionModel` (incl. conversão de datas e campos `null`).
- Use-cases (services mockados).
- 100% de cobertura.

**E2E (Cypress):**
- DOCTOR cria bloqueio parcial → banner aparece e slot da janela some da disponibilidade.
- DOCTOR remove bloqueio → banner some e slot reaparece.
- ADMIN sem médico selecionado → botão "Bloquear horário" desabilitado.
- Tentar bloquear janela com consulta agendada → alerta `409` orientando a remarcar; diálogo permanece aberto e nenhum bloqueio é criado.
- Após remarcar/cancelar a consulta conflitante, criar o bloqueio novamente → sucesso (banner aparece).
- USER → sem botões de criar/remover bloqueio.
- Sempre `data-testid`; cada teste independente; fixtures em `cypress/fixtures/`.

---

## Restrições

- NÃO importar `axios` nem seus tipos fora de `lib/api-client.ts` — usar `apiClient`.
- NÃO gerenciar dados da API via Zustand — usar **React Query**.
- NÃO mapear dentro de componentes/hooks — usar o mapper.
- NÃO reutilizar DTOs do backend como tipo de formulário — usar interface local (`zod` infer).
- NÃO usar `useState` para campos de formulário — usar `react-hook-form`.
- NÃO exibir `detail` técnico de erro ao usuário.
- NÃO enviar `doctorId` para DOCTOR.
- NÃO buscar/derivar slots a partir das agendas no frontend — disponibilidade vem do backend (que já exclui bloqueios); os banners vêm da lista de exceções.

---

## Definition of Done

- [ ] Camadas completas: types, service, mapper, use-cases, hooks (naming convention)
- [ ] `BlockTimeDialog` com `react-hook-form` + `zod`, toggle "Dia inteiro", validação `startTime < endTime`, mapeamento de erro `422`/`409`
- [ ] Conflito `409` mantém o diálogo aberto, orienta a **remarcar** (aproveitando o `detail` do backend) e direciona o usuário à consulta em conflito — sem nunca forçar o bloqueio
- [ ] `BlockBanner` com exibição da janela/motivo e remoção (ADMIN/DOCTOR), somente leitura (USER)
- [ ] Botão "Bloquear horário" na toolbar (ADMIN/DOCTOR; desabilitado p/ ADMIN sem médico)
- [ ] Bloqueios renderizados na agenda (dia e semana) na data correta
- [ ] Invalidação dupla (`['schedule-exceptions']` + `['availability']`) após criar/remover
- [ ] Comportamento por papel correto (ADMIN/DOCTOR/USER)
- [ ] Estados `loading`/`error`/`success` tratados; sem `detail` técnico ao usuário
- [ ] `data-testid` em todos os elementos relevantes
- [ ] Testes unitários (100%) + integração (loading/error/success) + E2E dos fluxos críticos
- [ ] Sem erros de build/lint; sem `console.log`; nenhum tipo do axios fora do API Client
