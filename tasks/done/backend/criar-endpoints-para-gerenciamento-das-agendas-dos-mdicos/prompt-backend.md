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
# Task — Gerenciamento de Agendas dos Médicos (Backend)

## Descrição
Implementar os endpoints REST para gerenciamento das agendas dos médicos (CRUD completo), permitindo que cada médico crie, consulte, atualize e remova seus horários disponíveis para atendimento. O resultado final é um módulo `schedules` funcional, testado e integrado ao módulo de médicos existente.

---

## Contexto

- Cada médico (`Doctor`) possui uma ou mais agendas (`Schedule`) associadas — relação 1:N.
- Uma agenda representa um intervalo de disponibilidade do médico em um dia da semana (ex: segunda-feira das 08:00 às 12:00).
- Não pode haver sobreposição de horários para o mesmo médico no mesmo dia da semana.
- A agenda é base para futuras reservas de consultas — **não é permitido atualizar ou deletar uma agenda que possua consultas futuras confirmadas**.
- Agendas são recorrentes por dia da semana; `validFrom` e `validUntil` delimitam o período de vigência (ex: agenda válida apenas durante um trimestre). Ambos são opcionais — ausência significa vigência indefinida.
- Exceções pontuais (ex: "não atendo na segunda-feira do dia 10/06") estão **fora do escopo desta task** e serão tratadas por uma entidade `ScheduleException` em task futura.
- Soft delete obrigatório — agendas removidas mantêm histórico para auditoria.
- Apenas o próprio médico autenticado **ou um administrador do sistema** podem gerenciar agendas (verificação via `@CurrentUser()` — checar `id` e `role`).
- Um médico autenticado só pode **visualizar** suas próprias agendas — não pode listar ou buscar agendas de outro médico.
- Administradores podem visualizar agendas de qualquer médico, filtrando por `doctorId`.

---

## Contratos

### Input (DTO)

**CreateScheduleDto:**
- doctorId?: string (UUID) — obrigatório apenas para `ADMIN`; ignorado para médicos (use-case usa `currentUser.id`)
- dayOfWeek: DayOfWeek (enum: MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY)
- startTime: string (formato HH:mm)
- endTime: string (formato HH:mm)
- slotDurationInMinutes: number (min: 15, max: 120)
- validFrom?: string (ISO 8601 date — ex: `2025-01-01`)
- validUntil?: string (ISO 8601 date — ex: `2025-03-31`)

**UpdateScheduleDto:**
- dayOfWeek?: DayOfWeek
- startTime?: string (HH:mm)
- endTime?: string (HH:mm)
- slotDurationInMinutes?: number
- validFrom?: string | null (ISO 8601 date — `null` remove o valor existente)
- validUntil?: string | null (ISO 8601 date — `null` remove o valor existente)

**ListSchedulesQueryDto** (estende PaginationDto):
- doctorId?: string (UUID) — opcional para `ADMIN` (ausente = retorna todos os médicos); ignorado para médicos (forçado ao próprio `id` no use-case)
- dayOfWeek?: DayOfWeek
- activeOn?: string (ISO 8601 date) — filtra agendas cuja vigência cobre a data informada; padrão: data de hoje

### Output

**ScheduleResponse:**
- id: string (UUID)
- doctorId: string (UUID)
- dayOfWeek: DayOfWeek
- startTime: string
- endTime: string
- slotDurationInMinutes: number
- validFrom: string | null
- validUntil: string | null
- createdAt: Date
- updatedAt: Date

**PaginatedScheduleResponse:**
- data: ScheduleResponse[]
- total: number
- page: number
- limit: number

---

## Assinaturas esperadas

**Use-cases:**
- `CreateScheduleUseCase.execute(dto: CreateScheduleDto, currentUser: ICurrentUser): Promise<Schedule>`
- `UpdateScheduleUseCase.execute(id: string, dto: UpdateScheduleDto, currentUser: ICurrentUser): Promise<Schedule>`
- `DeleteScheduleUseCase.execute(id: string, currentUser: ICurrentUser): Promise<void>`
- `FindScheduleByIdUseCase.execute(id: string, currentUser: ICurrentUser): Promise<Schedule>`
- `ListSchedulesUseCase.execute(query: ListSchedulesQueryDto, currentUser: ICurrentUser): Promise<[Schedule[], number]>`

`ICurrentUser` contém `{ id: string; role: UserRole }` — extraído via `@CurrentUser()` no controller.

**Repositories:**
- `ISchedulesRepository`:
  - `findAll(filters: ListSchedulesQueryDto): Promise<[Schedule[], number]>` — aplica filtro de vigência usando `filters.activeOn` (padrão: data de hoje)
  - `findById(id: string): Promise<Schedule | null>`
  - `findOverlapping(doctorId: string, dayOfWeek: DayOfWeek, startTime: string, endTime: string, validFrom: string | null, validUntil: string | null, excludeId?: string): Promise<Schedule | null>` — só retorna conflito se os períodos de vigência se intersectam
  - `create(data: CreateScheduleDto, queryRunner?: QueryRunner): Promise<Schedule>`
  - `update(id: string, data: UpdateScheduleDto, queryRunner?: QueryRunner): Promise<Schedule>`
  - `delete(id: string, queryRunner?: QueryRunner): Promise<void>`

- `IDoctorsRepository` (existente):
  - `findById(id: string): Promise<Doctor | null>`

- `IAppointmentsRepository` (futuro — a integrar quando o módulo `appointments` existir):
  - `hasFutureAppointmentsByScheduleId(scheduleId: string): Promise<boolean>`

---

## Fluxo principal

**Criar agenda (POST /schedules):**
1. Controller recebe `CreateScheduleDto` e usuário autenticado.
2. Use-case resolve o `doctorId` efetivo: se `currentUser.role === UserRole.DOCTOR`, usa `currentUser.id` (ignora `dto.doctorId`); se `ADMIN`, usa `dto.doctorId` (obrigatório — lança `UnprocessableEntityException` se ausente).
3. Valida que o médico existe via `IDoctorsRepository`.
4. Se `validFrom` e `validUntil` informados, valida que `validFrom < validUntil`.
5. Valida que `startTime < endTime`.
6. Valida que `(endTime - startTime)` é divisível por `slotDurationInMinutes`.
7. Valida que não há sobreposição via `findOverlapping`, passando `validFrom`/`validUntil` — só conflita se os períodos de vigência se intersectam.
8. Persiste a agenda via `ISchedulesRepository.create`.
9. Invalida cache via `delByPrefix('schedules:list:${doctorId}:')` e `delByPrefix('schedules:list:all:')`.
10. Retorna a entidade criada.

**Atualizar agenda (PATCH /schedules/:id):**
1. Use-case busca a agenda por ID — se não encontrada, lança `NotFoundException`.
2. Valida que `currentUser.id` é dono da agenda **ou** que `currentUser.role === UserRole.ADMIN`.
3. Verifica via `IAppointmentsRepository.hasFutureAppointmentsByScheduleId` — se houver consultas futuras, lança `ConflictException`.
4. Monta os valores efetivos do merge usando `!== undefined` (não `??`) para preservar `null` explícito enviado pelo cliente: `merged = { dayOfWeek: dto.dayOfWeek !== undefined ? dto.dayOfWeek : schedule.dayOfWeek, startTime: dto.startTime !== undefined ? dto.startTime : schedule.startTime, endTime: dto.endTime !== undefined ? dto.endTime : schedule.endTime, slotDurationInMinutes: dto.slotDurationInMinutes !== undefined ? dto.slotDurationInMinutes : schedule.slotDurationInMinutes, validFrom: dto.validFrom !== undefined ? dto.validFrom : schedule.validFrom, validUntil: dto.validUntil !== undefined ? dto.validUntil : schedule.validUntil }`.
5. Valida que `merged.startTime < merged.endTime` → `UnprocessableEntityException` se violado.
6. Valida que `(merged.endTime - merged.startTime)` é divisível por `merged.slotDurationInMinutes` → `UnprocessableEntityException` se violado.
7. Se `merged.validFrom` e `merged.validUntil` ambos não-nulos, valida que `merged.validFrom < merged.validUntil`.
8. Se houve mudança em `merged.dayOfWeek`, `merged.startTime`, `merged.endTime`, `merged.validFrom` ou `merged.validUntil` (comparados com os valores originais de `schedule`), valida sobreposição via `findOverlapping` passando os valores de `merged` (excluindo o próprio ID). Mudança isolada em `slotDurationInMinutes` não dispara essa verificação.
9. Persiste alteração e invalida cache via `delByPrefix('schedules:list:${schedule.doctorId}:')` e `delByPrefix('schedules:list:all:')` — usar `schedule.doctorId` (entidade buscada no passo 1), nunca `dto.doctorId` (inexistente no UpdateScheduleDto).

**Listar agendas (GET /schedules):**
1. Se `currentUser.role === UserRole.DOCTOR`, ignora `doctorId` do query e força `doctorId = currentUser.id`.
2. Se `currentUser.role === UserRole.ADMIN` e nenhum `doctorId` informado, retorna todas as agendas (paginado).
3. Use-case resolve a data efetiva: `const resolvedDate = activeOn ?? new Date().toISOString().split('T')[0]` e consulta cache `schedules:list:${doctorId ?? 'all'}:${dayOfWeek ?? 'all'}:${resolvedDate}:${page}:${limit}`.
4. Se miss, busca no repositório passando `{ ...query, activeOn: resolvedDate }` — o `resolvedDate` já calculado garante que cache e repositório usam exatamente a mesma data.
5. Salva no cache (TTL 60s) e retorna.

**Buscar agenda por ID (GET /schedules/:id):**
1. Use-case busca a agenda por ID — `NotFoundException` se não existir.
2. Se `currentUser.role === UserRole.DOCTOR` e `schedule.doctorId !== currentUser.id` → `ForbiddenException`.
3. Retorna a agenda.

**Deletar agenda (DELETE /schedules/:id):**
1. Use-case busca agenda — `NotFoundException` se não existir.
2. Valida que `currentUser.id` é dono da agenda **ou** que `currentUser.role === UserRole.ADMIN`.
3. Verifica via `IAppointmentsRepository.hasFutureAppointmentsByScheduleId` — se houver consultas futuras, lança `ConflictException`.
4. Aplica soft delete e invalida cache via `delByPrefix('schedules:list:${schedule.doctorId}:')` e `delByPrefix('schedules:list:all:')` — usar `schedule.doctorId` (entidade buscada no passo 1).

---

## Fluxos alternativos

- Médico não encontrado → `NotFoundException('Doctor not found')`
- Agenda não encontrada → `NotFoundException('Schedule not found')`
- `currentUser.id` diferente do dono da agenda **e** `currentUser.role !== UserRole.ADMIN` (em mutações) → `ForbiddenException('You are not allowed to manage this schedule')`
- Médico tenta visualizar (GET by ID ou listagem) agenda de outro médico → `ForbiddenException('You are not allowed to view this schedule')`
- `startTime >= endTime` → `UnprocessableEntityException('startTime must be before endTime')`
- `validFrom >= validUntil` (quando ambos informados) → `UnprocessableEntityException('validFrom must be before validUntil')`
- `ADMIN` envia `CreateScheduleDto` sem `doctorId` → `UnprocessableEntityException('doctorId is required for admin')`
- Sobreposição com agenda existente → `ConflictException('Schedule overlaps with an existing one')`
- `slotDurationInMinutes` não divide o intervalo exatamente → `UnprocessableEntityException('Interval must be divisible by slot duration')`
- Agenda possui consultas futuras confirmadas (update ou delete) → `ConflictException('Schedule has future appointments and cannot be modified')`

---

## Regras de negócio

- Horários no formato `HH:mm` (24h).
- `startTime` sempre menor que `endTime`.
- `(endTime - startTime)` deve ser divisível por `slotDurationInMinutes`.
- Não pode existir sobreposição de horários para o mesmo médico no mesmo dia da semana **dentro de períodos de vigência que se intersectam** — duas agendas com mesmo horário mas vigências mutuamente exclusivas (ex: jan-mar e abr-jun) são permitidas.
- `validFrom` e `validUntil` são opcionais — ausência significa vigência indefinida (equivalente a `-∞` e `+∞` na checagem de interseção).
- Quando ambos informados, `validFrom` deve ser anterior a `validUntil`.
- Listagens filtram agendas pela vigência ativa na data `activeOn` (padrão: hoje): `(validFrom IS NULL OR validFrom <= activeOn) AND (validUntil IS NULL OR validUntil >= activeOn)`. Para ver agendas expiradas, o cliente deve passar `activeOn` com a data desejada.
- Não é permitido atualizar ou deletar uma agenda com consultas futuras confirmadas.
- Soft delete obrigatório — agendas removidas não aparecem em consultas.
- Apenas o próprio médico (autenticado) **ou um administrador do sistema** podem criar/atualizar/deletar agendas.
- Um médico só pode visualizar (listar ou buscar por ID) suas próprias agendas — `doctorId` da query é sempre sobrescrito pelo `currentUser.id` no use-case.
- Administradores podem visualizar agendas de qualquer médico, filtrando por `doctorId`.

---

## Dependências

- `ISchedulesRepository` (novo)
- `IDoctorsRepository` (existente — módulo `doctors`)
- `IAppointmentsRepository` (futuro — criar `AppointmentsRepositoryStub` em `modules/schedules/repositories/appointments.repository.stub.ts` implementando `hasFutureAppointmentsByScheduleId` com retorno fixo `false`; registrar no `SchedulesModule` via `{ provide: IAppointmentsRepository, useClass: AppointmentsRepositoryStub }` até o módulo `appointments` existir)
- `CacheService` — requer método `delByPrefix(prefix: string): Promise<void>` (implementado via Redis `SCAN + DEL`). Se o método ainda não existir no `CacheService`, deve ser adicionado nesta task.
- `DataSource` (TypeORM)

---

## Decisões técnicas da task

- **Usar transação:** Não — operações são em uma única entidade por vez. `BaseUseCase` é estendido por consistência, mas `runInTransaction()` não é necessário.
- **Usar distributed lock:** Não — conflitos de sobreposição são raros e tratados via validação + constraint de banco.
- **Usar cache:** Sim — listagem paginada com chave `schedules:list:${doctorId ?? 'all'}:${dayOfWeek ?? 'all'}:${resolvedDate}:${page}:${limit}` (TTL 60s), onde `resolvedDate = activeOn ?? new Date().toISOString().split('T')[0]`. O `activeOn` deve ser resolvido para a data real antes de montar a chave — usar o literal `'today'` causaria colisão entre dias diferentes.
- **Invalidação de cache em mutations:** Como a chave inclui múltiplos segmentos variáveis, `del` com chave exata não cobre todas as variantes em cache. A invalidação usa `delByPrefix`: em qualquer mutation de um médico, apagar `schedules:list:${doctorId}:*` (agendas daquele médico) e `schedules:list:all:*` (listagens globais de admin). Implementado via `CacheService.delByPrefix`.
- **Estratégia de concorrência:** Optimistic Lock via `@VersionColumn` na entidade `Schedule` — converter `OptimisticLockVersionMismatchError` em `ConflictException`.

---

## Restrições

- NÃO permitir hard delete — usar `@DeleteDateColumn`.
- NÃO acessar `IDoctorsRepository` direto do controller — somente via use-case.
- NÃO validar formato de horário manualmente no use-case — usar `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/)` no DTO.
- NÃO usar `dto.doctorId` para médicos — derivar sempre de `currentUser.id` no use-case.
- NÃO permitir update ou delete de agenda com consultas futuras confirmadas.
- NÃO usar `cacheService.del` com chave exata para invalidar listagens — usar `delByPrefix` para cobrir todas as variantes de filtro em cache.
- NÃO usar o literal `'today'` na chave de cache — sempre resolver `activeOn` para a data ISO real antes de montar a chave.
- NÃO usar `validFrom`/`validUntil` como substituto para exceções pontuais — isso é escopo de `ScheduleException` (task futura).
- NÃO logar dados sensíveis do médico nos logs.
- NÃO instanciar repositórios manualmente — sempre via DI.

---

## Estrutura esperada

```
modules/schedules/
  controllers/
    schedules.controller.ts
  use-cases/
    create-schedule.use-case.ts
    update-schedule.use-case.ts
    delete-schedule.use-case.ts
    find-schedule-by-id.use-case.ts
    list-schedules.use-case.ts
  repositories/
    schedules.repository.interface.ts
    schedules.repository.ts
    appointments.repository.stub.ts
  dto/
    create-schedule.dto.ts
    update-schedule.dto.ts
    list-schedules-query.dto.ts
  entities/
    schedule.entity.ts
  tests/
    schedules.integration.spec.ts
  schedules.module.ts
```

Adicionar `DayOfWeek` enum em `packages/shared/src/enums/`.

---

## Cenários de teste adicionais

- Criar agenda com sucesso e verificar persistência.
- Médico cria agenda sem enviar `doctorId` → use-case usa `currentUser.id` (sucesso).
- Médico cria agenda enviando `doctorId` de outro médico → use-case ignora e usa `currentUser.id` (sucesso com o próprio id).
- Admin cria agenda sem `doctorId` → `422 Unprocessable Entity`.
- Admin cria agenda com `doctorId` de outro médico → sucesso.
- Admin cria agenda com `doctorId` de médico inexistente → `404 Not Found`.
- Criar agenda com `validFrom` após `validUntil` → `422 Unprocessable Entity`.
- Criar agenda com `validFrom` igual a `validUntil` → `422 Unprocessable Entity`.
- Criar agenda com apenas `validFrom` (sem `validUntil`) → sucesso (vigência aberta no futuro).
- Criar agenda com `startTime >= endTime` → `422 Unprocessable Entity`.
- Criar agenda com intervalo não divisível por `slotDurationInMinutes` → `422 Unprocessable Entity`.
- Criar agenda com `slotDurationInMinutes` menor que 15 → `422 Unprocessable Entity`.
- Criar agenda com `slotDurationInMinutes` maior que 120 → `422 Unprocessable Entity`.
- Tentar criar agenda sobreposta no mesmo dia → `409 Conflict`.
- Criar agenda em dias diferentes com mesmos horários → sucesso.
- Atualizar agenda mantendo horários → sucesso (não dispara validação de sobreposição contra ela mesma).
- Atualizar apenas `slotDurationInMinutes` (sem alterar horário/dia/vigência) → sucesso e overlap check não é disparado.
- Atualizar `startTime` para valor maior que `endTime` existente → `422 Unprocessable Entity`.
- Atualizar `endTime` para valor menor que `startTime` existente → `422 Unprocessable Entity`.
- Atualizar `slotDurationInMinutes` para valor que não divide o intervalo existente → `422 Unprocessable Entity`.
- Atualizar `startTime` de forma que o `slotDurationInMinutes` existente deixa de dividir o novo intervalo → `422 Unprocessable Entity`.
- Atualizar agenda enviando `validUntil: null` → remove o campo e agenda passa a ter vigência indefinida.
- Atualizar agenda enviando `validFrom: null` → remove o campo; se `validUntil` existente for no passado, agenda deixa de aparecer em listagens padrão.
- Atualizar agenda sem enviar `validFrom` → campo existente é preservado (undefined ≠ null).
- Atualizar agenda enviando `validFrom` após `validUntil` existente → `422 Unprocessable Entity`.
- Atualizar agenda enviando `validUntil` anterior a `validFrom` existente → `422 Unprocessable Entity`.
- Atualizar agenda alterando para horário sobreposto a outra → `409 Conflict`.
- Médico A tenta atualizar agenda do médico B → `403 Forbidden`.
- Médico A tenta deletar agenda do médico B → `403 Forbidden`.
- Administrador atualiza agenda de qualquer médico → sucesso.
- Administrador deleta agenda de qualquer médico → `204 No Content`.
- Deletar agenda → `204 No Content` e `deletedAt` preenchido.
- Deletar agenda com consultas futuras → `409 Conflict`.
- Atualizar agenda com consultas futuras → `409 Conflict`.
- Buscar agenda deletada → `404 Not Found`.
- Médico lista suas agendas → retorna apenas as próprias (mesmo que envie `doctorId` diferente no query).
- Buscar agenda por ID existente como médico dono → `200 OK` com dados corretos.
- Buscar agenda por ID existente como admin → `200 OK` com dados corretos.
- Médico tenta buscar por ID uma agenda de outro médico → `403 Forbidden`.
- Administrador lista agendas sem filtro → retorna todas (paginado).
- Administrador filtra por `doctorId` → retorna apenas agendas daquele médico.
- Criar duas agendas com mesmo horário/dia mas vigências que não se intersectam (ex: jan-mar e abr-jun) → sucesso (não é sobreposição).
- Criar duas agendas com mesmo horário/dia e vigências que se intersectam → `409 Conflict`.
- Criar agenda sem vigência e outra com mesmo horário/dia → `409 Conflict` (vigência indefinida intersecta tudo).
- Listagem sem `activeOn` retorna apenas agendas com vigência ativa hoje — expiradas não aparecem.
- Listagem com `activeOn` de data passada retorna agendas que estavam ativas naquela data.
- Listagem com filtro `dayOfWeek=MONDAY` retorna apenas agendas daquele dia — agendas de outros dias não aparecem.
- Listagem com `dayOfWeek=MONDAY` e sem filtro retornam dados diferentes — cache não colide.
- Listagem usa cache no segundo request idêntico.
- Atualização concorrente da mesma agenda → segunda falha com `409 Conflict` (optimistic lock).
- Cache é invalidado após `POST`, `PATCH` e `DELETE`.
- Falha na invalidação de cache não quebra o fluxo principal.

---

## Definition of Done

- [ ] Fluxo principal implementado (CRUD completo)
- [ ] Fluxos alternativos tratados com exceções corretas
- [ ] Validação de ownership e role via `currentUser` (mutações e leituras)
- [ ] Validação de sobreposição de horários
- [ ] Bloqueio de update/delete quando há consultas futuras (via `IAppointmentsRepository`)
- [ ] Suporte a `validFrom`/`validUntil` com validação de intervalo
- [ ] `doctorId` derivado de `currentUser.id` para médicos (não aceito do body)
- [ ] Soft delete configurado
- [ ] Optimistic locking configurado na entidade
- [ ] Cache implementado com invalidação por prefixo (`delByPrefix`) isolada em `try/catch`
- [ ] `CacheService.delByPrefix` implementado (Redis `SCAN + DEL`) se ainda não existir
- [ ] `findOverlapping` considera interseção de vigência (`validFrom`/`validUntil`)
- [ ] `findAll` filtra por vigência ativa via `activeOn` (padrão: hoje)
- [ ] Testes unitários (100% de cobertura)
- [ ] Testes de integração para todos os endpoints
- [ ] Naming convention respeitada
- [ ] Sem `process.env` fora de `env.config.ts`
- [ ] Sem dados sensíveis em logs
- [ ] Migration criada para tabela `schedules`
- [ ] Enum `DayOfWeek` exportado via `@app/shared`