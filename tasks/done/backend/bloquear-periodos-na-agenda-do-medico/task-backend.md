# Task — Bloqueio de Períodos na Agenda do Médico / Exceções de Agenda (Backend)

## Descrição

Implementar a funcionalidade que permite **bloquear um período de tempo pontual** na agenda recorrente de um médico, tratando eventualidades sem alterar a agenda semanal base. O resultado final é um módulo `schedule-exceptions` funcional, testado e **integrado ao cálculo de disponibilidade** (`GET /appointments/availability`), de modo que os horários bloqueados deixem de ser ofertados para agendamento.

Esta task implementa a entidade `ScheduleException` que foi explicitamente deixada como escopo futuro na task de gerenciamento de agendas (`schedules`).

---

## Contexto

- O médico cadastra agendas (`Schedule`) **recorrentes por dia da semana** — ex: segunda a sexta das 08:00 às 12:00 e das 14:00 às 18:00.
- Eventualmente, em uma data específica, o médico não atenderá em parte ou na totalidade do período — ex: "nesta sexta-feira (10/06) não atendo à tarde".
- Uma **exceção de agenda** (`ScheduleException`) representa um **bloqueio pontual** de um intervalo de tempo em uma **data específica** para um médico. Ela **não altera** a agenda recorrente — apenas remove disponibilidade naquela data.
- A exceção é **subtrativa**: ela nunca cria disponibilidade nova, apenas remove slots que existiriam pela agenda recorrente.
- O bloqueio pode ser:
  - **Parcial** — `startTime` e/ou `endTime` informados (ex: 14:00–18:00).
  - **Dia inteiro** — `startTime` e `endTime` ambos `null` (bloqueia o dia todo).
  - Bordas abertas: `startTime` ausente significa "do início do dia"; `endTime` ausente significa "até o fim do dia".
- O bloqueio impacta diretamente o endpoint de disponibilidade (`GET /appointments/availability`): qualquer slot que **se sobreponha** a uma exceção ativa naquela data é removido da resposta.
- Multi-tenant: toda exceção pertence a uma clínica (`clinicId`) e é isolada por clínica — derivado de `currentUser.clinicId`, nunca do body.
- Soft delete obrigatório — exceções removidas mantêm histórico.
- Permissões espelham o módulo `schedules`:
  - **DOCTOR**: cria/lista/consulta/remove apenas as **próprias** exceções. O `doctorId` é derivado de `currentUser` (via perfil de médico), nunca aceito do body.
  - **ADMIN**: gerencia exceções de qualquer médico — informa `doctorId` no body ao criar e pode filtrar por `doctorId` na listagem.
  - **USER / PATIENT**: sem acesso ao CRUD de exceções (a disponibilidade já reflete os bloqueios automaticamente).

---

## Contratos

### Input (DTO — em `packages/shared`)

**CreateScheduleExceptionDto:**
- `doctorId?: string` (UUID) — obrigatório apenas para `ADMIN`; ignorado para `DOCTOR` (use-case usa o perfil de `currentUser`)
- `date: string` (ISO 8601 date — `YYYY-MM-DD`) — data específica do bloqueio
- `startTime?: string | null` (HH:mm) — início do bloqueio; `null`/ausente = início do dia
- `endTime?: string | null` (HH:mm) — fim do bloqueio; `null`/ausente = fim do dia
- `reason?: string | null` — motivo opcional (ex: "Compromisso pessoal"), `maxLength: 500`

**UpdateScheduleExceptionDto:**
- `date?: string` (`YYYY-MM-DD`)
- `startTime?: string | null` (HH:mm)
- `endTime?: string | null` (HH:mm)
- `reason?: string | null`

**ListScheduleExceptionsQueryDto** (local ao módulo, estende `PaginationDto`):
- `doctorId?: string` (UUID) — opcional para `ADMIN` (ausente = todos os médicos da clínica); ignorado para `DOCTOR` (forçado ao próprio perfil)
- `from?: string` (`YYYY-MM-DD`) — limite inferior do intervalo de datas (inclusive)
- `to?: string` (`YYYY-MM-DD`) — limite superior do intervalo de datas (inclusive)

### Output (DTO — em `packages/shared`)

**ScheduleExceptionResponseDto:**
- `id: string` (UUID)
- `doctorId: string` (UUID)
- `date: string` (`YYYY-MM-DD`)
- `startTime: string | null` (HH:mm)
- `endTime: string | null` (HH:mm)
- `reason: string | null`
- `createdAt: Date`
- `updatedAt: Date`

**PaginatedScheduleExceptionsResponseDto:**
- `data: ScheduleExceptionResponseDto[]`
- `total: number`
- `page: number`
- `limit: number`

---

## Assinaturas esperadas

**Use-cases:**
- `CreateScheduleExceptionUseCase.execute(dto: CreateScheduleExceptionDto, currentUser: ICurrentUser): Promise<ScheduleException>`
- `UpdateScheduleExceptionUseCase.execute(id: string, dto: UpdateScheduleExceptionDto, currentUser: ICurrentUser): Promise<ScheduleException>`
- `DeleteScheduleExceptionUseCase.execute(id: string, currentUser: ICurrentUser): Promise<void>`
- `FindScheduleExceptionByIdUseCase.execute(id: string, currentUser: ICurrentUser): Promise<ScheduleException>`
- `ListScheduleExceptionsUseCase.execute(query: ListScheduleExceptionsQueryDto, currentUser: ICurrentUser): Promise<[ScheduleException[], number]>`
- `GetActiveExceptionsForDoctorUseCase.execute(doctorId: string, clinicId: string, date: string): Promise<ScheduleException[]>` — **exportado** para consumo pelo módulo `appointments` (cálculo de disponibilidade)

`ICurrentUser` contém `{ id: string; role: UserRole; clinicId: string }` — extraído via `@CurrentUser()`.

**Repository — `IScheduleExceptionsRepository`:**
- `findAll(filters: ListScheduleExceptionsQueryDto, clinicId: string): Promise<[ScheduleException[], number]>`
- `findById(id: string, clinicId: string): Promise<ScheduleException | null>`
- `findActiveByDoctorAndDate(doctorId: string, date: string, clinicId: string): Promise<ScheduleException[]>`
- `create(data: Partial<ScheduleException>, queryRunner?: QueryRunner): Promise<ScheduleException>`
- `update(id: string, data: Partial<ScheduleException>, queryRunner?: QueryRunner): Promise<ScheduleException>`
- `delete(id: string, queryRunner?: QueryRunner): Promise<void>`

**Dependência cross-módulo (appointments) — via adapter local:**
- `IAppointmentsRepository` (adapter em `modules/schedule-exceptions/repositories/appointments.repository.adapter.ts`):
  - `findScheduledAppointmentsInWindow(doctorId: string, date: string, startTime: string | null, endTime: string | null, clinicId: string): Promise<IConflictingAppointment[]>`
  - Retorna as **consultas com status `scheduled`** que se sobrepõem à janela (vazio = sem conflito) — não apenas um booleano, para que a mensagem de erro possa orientar o usuário sobre **qual** consulta remarcar.
  - `IConflictingAppointment` (tipo local do adapter): `{ id: string; startTime: string; endTime: string; patientName: string }`.
  - Implementação delega para um **novo use-case exportado** do módulo `appointments`: `FindScheduledAppointmentsInWindowUseCase`.
  - Seguir exatamente o padrão já existente em `modules/schedules/repositories/appointments.repository.adapter.ts` (abstract class + `@Injectable()` + `forwardRef`).

**Dependência (doctors):**
- `IDoctorsRepository` (existente): `findById(id, clinicId)` e `findByUserId(userId, clinicId)`.

---

## Fluxo principal

### Criar bloqueio (`POST /schedule-exceptions`)
1. Controller recebe `CreateScheduleExceptionDto` e `currentUser`. `clinicId = currentUser.clinicId`.
2. Use-case resolve o `doctorId` efetivo:
   - `DOCTOR` → busca o próprio perfil via `doctorsRepository.findByUserId(currentUser.id, clinicId)`; se não existir → `NotFoundException('Doctor not found')`. Ignora `dto.doctorId`.
   - `ADMIN` → exige `dto.doctorId` (`UnprocessableEntityException('doctorId is required for admin')` se ausente); valida existência via `doctorsRepository.findById(dto.doctorId, clinicId)` → `NotFoundException('Doctor not found')`.
3. Valida regra de horário: se `startTime` e `endTime` ambos não-nulos, exige `startTime < endTime` → `UnprocessableEntityException('startTime must be before endTime')`.
4. Verifica colisão com consultas agendadas: `const conflicts = await appointmentsRepository.findScheduledAppointmentsInWindow(doctorId, date, startTime, endTime, clinicId)`. Se `conflicts.length > 0` → `ConflictException` com mensagem **acionável** que orienta a remarcar, incluindo os horários conflitantes: ``There are scheduled appointments in this period (${conflicts.map(c => c.startTime).join(', ')}). Reschedule or cancel them before blocking this time.`` O bloqueio **não** é criado enquanto houver consulta agendada na janela.
5. Persiste a exceção (`clinicId`, `doctorId`, `date`, `startTime`, `endTime`, `reason`).
6. Invalida cache:
   - listagem: `delByPrefix('schedule-exceptions:list:${clinicId}:${doctorId}:')` e `delByPrefix('schedule-exceptions:list:${clinicId}:all:')`
   - disponibilidade afetada: `del('appointments:availability:${clinicId}:${doctorId}:${date}')`
7. Retorna a entidade criada (`201 Created`).

### Listar bloqueios (`GET /schedule-exceptions`)
1. `DOCTOR` → resolve o próprio `doctorId` (via perfil) e força `query.doctorId` para ele, ignorando o valor enviado.
2. `ADMIN` → usa `query.doctorId` se informado; ausente = todos os médicos da clínica.
3. Monta chave de cache `schedule-exceptions:list:${clinicId}:${doctorId ?? 'all'}:${from ?? 'all'}:${to ?? 'all'}:${page}:${limit}` (TTL 60s).
4. Em miss, busca no repositório (isolando por `clinicId`, filtrando por intervalo `from`/`to` quando informado), salva no cache e retorna paginado.

### Buscar por ID (`GET /schedule-exceptions/:id`)
1. Busca por ID isolado por `clinicId` — `NotFoundException('Schedule exception not found')` se não existir.
2. `DOCTOR` cujo `exception.doctorId` não corresponde ao próprio perfil → `ForbiddenException('You are not allowed to view this schedule exception')`.
3. Retorna a exceção (`200 OK`).

### Atualizar bloqueio (`PATCH /schedule-exceptions/:id`)
1. Busca por ID isolado por `clinicId` — `NotFoundException` se não existir.
2. Valida ownership: `DOCTOR` dono **ou** `ADMIN`; caso contrário `ForbiddenException('You are not allowed to manage this schedule exception')`.
3. Merge com `!== undefined` (preserva `null` explícito): `date`, `startTime`, `endTime`, `reason`.
4. Se `merged.startTime` e `merged.endTime` ambos não-nulos, valida `startTime < endTime` → `UnprocessableEntityException`.
5. Revalida colisão com consultas agendadas na janela resultante (`findScheduledAppointmentsInWindow`) → `ConflictException` (mesma mensagem acionável de remarcar) se `conflicts.length > 0`.
6. Persiste e invalida cache de listagem (do `exception.doctorId`) + disponibilidade da **data antiga e da nova** (`del` para `...:${date_antigo}` e `...:${date_novo}` quando a data muda).
7. Retorna a entidade atualizada (`200 OK`).

### Remover bloqueio (`DELETE /schedule-exceptions/:id`)
1. Busca por ID isolado por `clinicId` — `NotFoundException` se não existir.
2. Valida ownership (`DOCTOR` dono **ou** `ADMIN`) → `ForbiddenException` caso contrário.
3. Soft delete.
4. Invalida cache de listagem (do `exception.doctorId`) + disponibilidade da data (`del('appointments:availability:${clinicId}:${exception.doctorId}:${exception.date}')`).
5. Retorna `204 No Content`.

### Integração com disponibilidade (`GET /appointments/availability`) — **alteração no módulo `appointments`**
1. Em `GetAvailabilityUseCase`, após gerar os slots a partir das agendas e antes/junto da remoção dos slots reservados, injetar `GetActiveExceptionsForDoctorUseCase` e buscar as exceções ativas para `(doctorId, clinicId, query.date)`.
2. Para cada exceção, calcular a janela bloqueada: `blockStart = startTime ?? '00:00'`, `blockEnd = endTime ?? '24:00'` (em minutos).
3. Remover qualquer slot `[slotStart, slotEnd)` que **se sobreponha** à janela bloqueada — regra de interseção de intervalos: `slotStart < blockEnd && slotEnd > blockStart`.
4. O cache de disponibilidade (`appointments:availability:${clinicId}:${doctorId}:${date}`, TTL 30s) permanece, mas passa a ser invalidado também pelas mutations de `schedule-exceptions` (ver fluxos acima).
5. Atualizar os testes de `get-availability.use-case.spec.ts` e `appointments.integration.spec.ts` para cobrir o filtro por exceções.

---

## Fluxos alternativos

- Médico (perfil) não encontrado → `NotFoundException('Doctor not found')`
- Exceção não encontrada → `NotFoundException('Schedule exception not found')`
- `ADMIN` cria sem `doctorId` → `UnprocessableEntityException('doctorId is required for admin')`
- `ADMIN` cria com `doctorId` inexistente na clínica → `NotFoundException('Doctor not found')`
- `startTime >= endTime` (ambos informados) → `UnprocessableEntityException('startTime must be before endTime')`
- Janela do bloqueio cobre consulta com status `scheduled` → `ConflictException` com mensagem que orienta a **remarcar ou cancelar** a(s) consulta(s) antes (incluindo os horários conflitantes no `detail`) — o bloqueio não é criado
- `DOCTOR` tenta visualizar/editar/remover exceção de outro médico → `ForbiddenException`
- Acesso de outra clínica (isolamento) → `NotFoundException` (registro não visível fora da clínica)

---

## Regras de negócio

- Horários no formato `HH:mm` (24h), validados via `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/)` no DTO.
- `date`, `from`, `to` no formato `YYYY-MM-DD`, validados via `@Matches(/^\d{4}-\d{2}-\d{2}$/)` (ou `@IsDateString` restrito a data).
- `startTime` e `endTime` são **independentemente opcionais/nuláveis**: ambos `null` = dia inteiro; apenas um informado = borda aberta no lado ausente.
- Quando ambos informados, `startTime < endTime`.
- A exceção é **subtrativa** — nunca adiciona disponibilidade; apenas remove slots da agenda recorrente que se sobreponham.
- **Sobreposições entre exceções são permitidas** (bloqueios são aditivos/idempotentes em efeito) — **não** validar conflito entre exceções.
- **Não é permitido bloquear uma janela que contenha consultas com status `scheduled`** — a operação é rejeitada com `409` e o sistema orienta o usuário a **remarcar ou cancelar** a(s) consulta(s) antes de cadastrar a exceção. A mensagem de erro deve listar os horários conflitantes para que o usuário saiba exatamente o que remarcar. Consultas com status `cancelled` não bloqueiam.
- Isolamento por clínica obrigatório em **todas** as queries (`clinicId` de `currentUser`, nunca do body/query).
- `doctorId` para `DOCTOR` é sempre derivado do perfil do usuário logado — nunca aceito do body/query.
- Soft delete obrigatório — exceções removidas não aparecem em consultas nem afetam disponibilidade.

---

## Dependências

- `IScheduleExceptionsRepository` (novo)
- `IDoctorsRepository` (existente — módulo `doctors`; importar `DoctorsModule`)
- `IAppointmentsRepository` (adapter novo, delegando para `FindScheduledAppointmentsInWindowUseCase` — **novo use-case exportado** no módulo `appointments`; usar `forwardRef` para a dependência circular `appointments ↔ schedule-exceptions`)
- `GetAvailabilityUseCase` (existente — módulo `appointments`; passa a importar `ScheduleExceptionsModule` e injetar `GetActiveExceptionsForDoctorUseCase`)
- `CacheService` — `get`, `set`, `del`, `delByPrefix` (já existentes; `delByPrefix` foi adicionado na task de `schedules`)
- `DataSource` (TypeORM)

---

## Decisões técnicas da task

- **Módulo dedicado:** criar `modules/schedule-exceptions/` (não embutir em `schedules`) — domínio distinto, consumido tanto por `appointments` (disponibilidade) quanto exposto por REST próprio.
- **Exportação:** o módulo exporta **apenas use-cases** (`GetActiveExceptionsForDoctorUseCase`), nunca o repository — conforme regra de arquitetura.
- **Dependência circular `appointments ↔ schedule-exceptions`:** resolver com `forwardRef` em ambos os módulos (appointments precisa de `GetActiveExceptionsForDoctorUseCase`; schedule-exceptions precisa de `HasScheduledAppointmentsInWindowUseCase`). Usar `forwardRef` apenas onde a circularidade é inevitável.
- **Usar transação:** Não — operações em uma única entidade. `BaseUseCase` é estendido por consistência; `runInTransaction()` não é necessário.
- **Usar distributed lock:** Não.
- **Concorrência:** Optimistic Lock via `@VersionColumn` na entidade — converter `OptimisticLockVersionMismatchError` em `ConflictException`.
- **Cache:** listagem com chave `schedule-exceptions:list:${clinicId}:${doctorId ?? 'all'}:${from ?? 'all'}:${to ?? 'all'}:${page}:${limit}` (TTL 60s); invalidação por `delByPrefix`. Disponibilidade reaproveita a chave existente do módulo `appointments` e é invalidada por `del` exato (chave totalmente determinada por `clinicId`+`doctorId`+`date`).
- **Migration:** criar tabela `schedule_exceptions`. **Definir `SET search_path TO "${schema}", public` no início de `up()` e `down()`** (igual às demais migrations do projeto) — sem isso, referências não-qualificadas (`clinics`, `doctors`) falham com `relation does not exist` no schema `dev`/`test`. FKs para `clinics(id)` e `doctors(id)`; índice em `(clinic_id, doctor_id, date)`.

---

## Restrições

- NÃO permitir hard delete — usar `@DeleteDateColumn`.
- NÃO aceitar `doctorId`/`clinicId` do body para `DOCTOR` — derivar sempre de `currentUser`.
- NÃO validar formato de data/hora manualmente no use-case — usar decorators do `class-validator` no DTO.
- NÃO criar disponibilidade via exceção — a entidade é estritamente subtrativa.
- NÃO validar conflito entre exceções (sobreposições são permitidas).
- NÃO acessar `IDoctorsRepository` nem o repository de `appointments` direto do controller — somente via use-case/adapter.
- NÃO expor o repository de exceções no `exports` do módulo — exportar apenas use-case.
- NÃO usar `del` com chave exata para invalidar listagens — usar `delByPrefix`.
- NÃO esquecer o `SET search_path` na migration.
- NÃO logar dados sensíveis.
- NÃO instanciar dependências manualmente — sempre via DI.

---

## Estrutura esperada

```
packages/shared/src/dtos/
  create-schedule-exception.dto.ts
  update-schedule-exception.dto.ts
  schedule-exception-response.dto.ts
  paginated-schedule-exceptions-response.dto.ts
  (exportar tudo via index.ts)

apps/backend/src/modules/schedule-exceptions/
  controllers/
    schedule-exceptions.controller.ts
  use-cases/
    create-schedule-exception.use-case.ts
    update-schedule-exception.use-case.ts
    delete-schedule-exception.use-case.ts
    find-schedule-exception-by-id.use-case.ts
    list-schedule-exceptions.use-case.ts
    get-active-exceptions-for-doctor.use-case.ts
  repositories/
    schedule-exceptions.repository.interface.ts
    schedule-exceptions.repository.ts
    appointments.repository.adapter.ts
  dto/
    list-schedule-exceptions-query.dto.ts
  entities/
    schedule-exception.entity.ts
  tests/
    create-schedule-exception.use-case.spec.ts
    update-schedule-exception.use-case.spec.ts
    delete-schedule-exception.use-case.spec.ts
    find-schedule-exception-by-id.use-case.spec.ts
    list-schedule-exceptions.use-case.spec.ts
    get-active-exceptions-for-doctor.use-case.spec.ts
    schedule-exceptions.integration.spec.ts
  schedule-exceptions.module.ts

apps/backend/src/modules/appointments/
  use-cases/
    find-scheduled-appointments-in-window.use-case.ts   (novo, exportado)
    get-availability.use-case.ts                         (alterado: filtra exceções)

apps/backend/src/database/migrations/
  <timestamp>-create-schedule-exceptions-table.ts
```

Registrar `ScheduleExceptionsModule` no `app.module.ts`.

---

## Cenários de teste adicionais

**CRUD / permissões:**
- DOCTOR cria bloqueio sem `doctorId` → usa o próprio perfil (sucesso).
- DOCTOR cria bloqueio enviando `doctorId` de outro médico → ignorado, usa o próprio (sucesso com o próprio id).
- ADMIN cria sem `doctorId` → `422`.
- ADMIN cria com `doctorId` de outro médico (mesma clínica) → sucesso.
- ADMIN cria com `doctorId` inexistente → `404`.
- Criar bloqueio de dia inteiro (`startTime`/`endTime` nulos) → sucesso.
- Criar bloqueio parcial (14:00–18:00) → sucesso.
- Criar bloqueio com apenas `endTime` (borda aberta no início) → sucesso.
- Criar com `startTime >= endTime` → `422`.
- Criar/editar bloqueio sobre janela com consulta `scheduled` → `409`, e a mensagem (`detail`) lista o(s) horário(s) da(s) consulta(s) conflitante(s) e orienta a remarcar/cancelar.
- Bloqueio rejeitado por conflito **não** persiste a exceção (nenhum registro criado).
- Criar bloqueio em data com consulta `cancelled` na janela → sucesso (cancelada não conta).
- Bloqueio de dia inteiro sobre data com consulta `scheduled` em qualquer horário → `409`.
- Após remarcar/cancelar a consulta conflitante, recriar o mesmo bloqueio → sucesso.
- Duas exceções sobrepostas na mesma data → ambas criadas (sem `409`).
- DOCTOR A edita/remove/consulta exceção do DOCTOR B → `403`.
- ADMIN edita/remove exceção de qualquer médico → sucesso.
- Atualizar enviando `reason: null` → remove o motivo.
- Atualizar sem enviar `startTime` → valor existente preservado (undefined ≠ null).
- Remover exceção → `204` e `deletedAt` preenchido.
- Buscar exceção removida → `404`.
- Isolamento: usuário da clínica X não enxerga exceção da clínica Y → `404`.
- Listagem filtra por intervalo `from`/`to`.
- Listagem do DOCTOR retorna apenas as próprias (mesmo enviando `doctorId` diferente).
- Listagem usa cache no segundo request idêntico; cache invalidado após `POST`/`PATCH`/`DELETE`.
- Atualização concorrente da mesma exceção → segunda falha com `409` (optimistic lock).

**Disponibilidade (integração com `appointments`):**
- Slot que se sobrepõe a um bloqueio parcial é removido da disponibilidade.
- Slot fora da janela de bloqueio permanece disponível.
- Bloqueio de dia inteiro remove todos os slots daquela data.
- Slot que apenas encosta na borda do bloqueio (`slotEnd == blockStart` ou `slotStart == blockEnd`) **permanece** disponível (sem sobreposição real).
- Exceção em data diferente não afeta a disponibilidade consultada.
- Após criar/remover bloqueio, o cache de disponibilidade daquela data é invalidado e o próximo request reflete a mudança.

---

## Definition of Done

- [ ] Entidade `ScheduleException` com soft delete e optimistic lock
- [ ] Migration `schedule_exceptions` criada **com `SET search_path`** e FKs/índices
- [ ] CRUD completo (`POST`/`GET`/`GET/:id`/`PATCH`/`DELETE`) em `/schedule-exceptions`
- [ ] `doctorId` derivado de `currentUser` para DOCTOR; isolamento por `clinicId` em todas as queries
- [ ] Validação de horário (`HH:mm`, `startTime < endTime`) e datas (`YYYY-MM-DD`) nos DTOs
- [ ] Bloqueio sobre consulta `scheduled` rejeitado com `409` (via `FindScheduledAppointmentsInWindowUseCase`), com `detail` listando os horários conflitantes e orientando a remarcar/cancelar antes de cadastrar a exceção
- [ ] `GetActiveExceptionsForDoctorUseCase` exportado e consumido por `GetAvailabilityUseCase`
- [ ] Disponibilidade remove slots que se sobrepõem a exceções ativas (regra de interseção)
- [ ] Cache de listagem (`delByPrefix`) e de disponibilidade (`del`) invalidados nas mutations, em `try/catch` isolado
- [ ] Dependência circular `appointments ↔ schedule-exceptions` resolvida com `forwardRef`
- [ ] DTOs exportados via `@app/shared`
- [ ] Testes unitários (100% de cobertura)
- [ ] Testes de integração para todos os endpoints + cobertura do filtro de disponibilidade
- [ ] Naming convention respeitada; sem `process.env` fora de `env.config.ts`; sem dados sensíveis em logs
