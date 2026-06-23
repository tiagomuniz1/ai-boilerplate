# Task — Evoluir Consulta: Confirmação, Falta e Convênio (Backend)

## Descrição
Evoluir o ciclo de vida da consulta (`appointments`) para suportar os indicadores do dashboard. Adicionar dois novos status — `CONFIRMED` (paciente confirmou presença) e `NO_SHOW` (paciente faltou) — com seus endpoints de transição, e adicionar o campo `insuranceType` (`particular` | `convenio`) à consulta. Sem essas mudanças o dashboard não tem dados reais para os KPIs "Pacientes confirmados" / "Pacientes que faltaram" nem para o gráfico "Pacientes x Convênio".

---

## Contexto
- `AppointmentStatus` hoje tem apenas `SCHEDULED`, `CANCELLED`, `COMPLETED` (`packages/shared/src/enums/appointment-status.enum.ts`).
- Transições existentes: `PATCH /appointments/:id/cancel` e `PATCH /appointments/:id/complete`. `complete` hoje só aceita consulta em `SCHEDULED`.
- A consulta usa `@VersionColumn` (optimistic lock) e escopo por `clinicId` via `currentUser.clinicId`.
- DOCTOR só gerencia as próprias consultas (own-resource no use-case, via `doctorsRepository.findByUserId`).
- `insuranceType` é informado na criação da consulta; default `null` (não informado).

---

## Contratos

### Enum (shared)
`AppointmentStatus` passa a ter:
```ts
SCHEDULED = 'scheduled'
CONFIRMED = 'confirmed'
COMPLETED = 'completed'
CANCELLED = 'cancelled'
NO_SHOW   = 'no_show'
```

### Novo enum (shared) — `AppointmentInsuranceType`
```ts
PARTICULAR = 'particular'
CONVENIO   = 'convenio'
```
Exportar em `packages/shared/src/enums/index.ts`.

### DTO
- **CreateAppointmentDto:** adicionar `insuranceType?` (`@IsOptional() @IsEnum(AppointmentInsuranceType)`).
- **AppointmentResponseDto:** adicionar `insuranceType: AppointmentInsuranceType | null`.
- **ListAppointmentsQueryDto:** o `@IsEnum(AppointmentStatus)` passa a aceitar os novos valores automaticamente — sem mudança de código, mas cobrir nos testes.

### Entity (`Appointment`)
```ts
@Column({ name: 'insurance_type', type: 'varchar', nullable: true, default: null })
insuranceType: AppointmentInsuranceType | null
```
> `type: 'varchar'` explícito obrigatório — union type não é inferido (ver regra de colunas em `backend.md`).

---

## Assinaturas esperadas
**Use-cases novos:**
- `ConfirmAppointmentUseCase.execute(id, currentUser): Promise<AppointmentResponseDto>`
- `MarkAppointmentNoShowUseCase.execute(id, currentUser): Promise<AppointmentResponseDto>`

**Use-cases alterados:**
- `CreateAppointmentUseCase.execute(dto, currentUser)` — persistir `insuranceType` quando enviado.
- `CompleteAppointmentUseCase.execute(id, currentUser)` — aceitar transição a partir de `SCHEDULED` **ou** `CONFIRMED`.

---

## Fluxo principal

**PATCH /appointments/:id/confirm** (ADMIN, DOCTOR)
1. Carrega consulta por id + clinicId → `NotFoundException`.
2. DOCTOR own-resource → senão `ForbiddenException`.
3. Apenas `SCHEDULED` pode ser confirmada → senão `UnprocessableEntityException('Only scheduled appointments can be confirmed')`.
4. `status = CONFIRMED`; optimistic lock (`ConflictException` em mismatch).
5. Invalida cache de listagem/disponibilidade; retorna `200`.

**PATCH /appointments/:id/no-show** (ADMIN, DOCTOR)
1. Carrega consulta por id + clinicId → `NotFoundException`.
2. DOCTOR own-resource → senão `ForbiddenException`.
3. Apenas `SCHEDULED` ou `CONFIRMED` podem ir para falta → senão `UnprocessableEntityException('Only scheduled or confirmed appointments can be marked as no-show')`.
4. Não permitir marcar falta em consulta **futura** → `UnprocessableEntityException('Cannot mark a future appointment as no-show')` (mesma regra de `complete`).
5. `status = NO_SHOW`; optimistic lock; invalida cache; retorna `200`.

**PATCH /appointments/:id/complete** (alterado)
- Passa a aceitar `status ∈ { SCHEDULED, CONFIRMED }`. Mensagem: `'Only scheduled or confirmed appointments can be completed'`.

**POST /appointments** (alterado)
- Persistir `insuranceType` quando presente no DTO; ausente → `null`.

---

## Fluxos alternativos
- confirm/no-show em consulta de outra clínica → `404`
- DOCTOR confirma/marca falta em consulta de outro médico → `403`
- confirm em consulta já `CONFIRMED`/`COMPLETED`/`CANCELLED`/`NO_SHOW` → `422`
- no-show em consulta `COMPLETED`/`CANCELLED`/`NO_SHOW` → `422`
- no-show em consulta futura → `422`
- optimistic lock → `409`
- falha de cache → `warn` + segue

---

## Regras de negócio
- Máquina de estados: `SCHEDULED → CONFIRMED → COMPLETED`; `SCHEDULED|CONFIRMED → NO_SHOW`; `SCHEDULED|CONFIRMED → CANCELLED` (cancel já existente passa a aceitar `CONFIRMED` também).
- `NO_SHOW`, `COMPLETED`, `CANCELLED` são estados terminais.
- `insuranceType` é imutável após criação nesta task (sem endpoint de edição — fora de escopo).

---

## Permissões

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Confirmar | ✓ qualquer | só a própria | ✗ | ✗ |
| Marcar falta | ✓ qualquer | só a própria | ✗ | ✗ |

`@Roles(UserRole.ADMIN, UserRole.DOCTOR)` + own-resource no use-case.

---

## Dependências
- `IAppointmentsRepository` / `AppointmentsModule` (existentes).
- `IDoctorsRepository` (resolver doctor do currentUser).
- `CacheService`.

---

## Decisões técnicas da task
- **Transação:** transições são update único → sem transação.
- **Concorrência:** Optimistic Lock (`@VersionColumn` já existe).
- **Cache:** reutilizar as mesmas chaves de invalidação de `complete`/`cancel` (`appointments:list:<clinicId>:` e `appointments:availability:<clinicId>:<doctorId>:`).
- **`cancel` aceitar `CONFIRMED`:** ajustar a guarda de status em `CancelAppointmentUseCase` para `{ SCHEDULED, CONFIRMED }`.

---

## Restrições
- NÃO criar tabela nova — apenas `ALTER TABLE appointments ADD COLUMN insurance_type`.
- NÃO permitir USER/PATIENT nas transições.
- NÃO retornar entidade crua — sempre `AppointmentResponseDto`.
- NÃO validar status manualmente fora do use-case.
- NÃO `process.env` fora de `env.config.ts`.

---

## Estrutura esperada
```
modules/appointments/
  controllers/appointments.controller.ts            # + confirm, + no-show (alterar)
  use-cases/
    confirm-appointment.use-case.ts                 # novo
    mark-appointment-no-show.use-case.ts            # novo
    complete-appointment.use-case.ts                # alterar guarda de status
    cancel-appointment.use-case.ts                  # alterar guarda de status
    create-appointment.use-case.ts                  # persistir insuranceType
  entities/appointment.entity.ts                    # + insuranceType
  appointments.module.ts                            # registrar novos use-cases
  tests/
    confirm-appointment.use-case.spec.ts            # novo
    mark-appointment-no-show.use-case.spec.ts       # novo
    appointments.integration.spec.ts                # estender

packages/shared/src/enums/
  appointment-status.enum.ts                        # + CONFIRMED, NO_SHOW
  appointment-insurance-type.enum.ts                # novo
  index.ts                                          # exportar novo enum
packages/shared/src/dtos/
  create-appointment.dto.ts                         # + insuranceType
  appointment-response.dto.ts                       # + insuranceType
```

---

## Migration
`1751000000000-add-confirmed-no-show-and-insurance-type-to-appointments.ts`:
```sql
ALTER TABLE "appointments" ADD COLUMN "insurance_type" varchar NULL DEFAULT NULL;
```
> Os novos valores de status são string livre na coluna `status varchar` — não há tipo enum no banco, então **não** é necessário alterar a coluna `status`. Confirmar que a coluna é `varchar` (é). `down()` faz `DROP COLUMN "insurance_type"`.

---

## Seed (dev)
Atualizar o seed de consultas para distribuir status e convênio de forma realista:
- algumas `CONFIRMED`, algumas `NO_SHOW`, maioria `COMPLETED`;
- mistura de `insuranceType` `particular`/`convenio` (e alguns `null`);
- datas espalhadas nos últimos ~30 dias para alimentar a timeline do dashboard.

---

## Cenários de teste adicionais
### Unitários
- confirm: `SCHEDULED → CONFIRMED`; estado inválido → `422`; outro médico (DOCTOR) → `403`; not found → `404`; lock → `409`.
- no-show: `SCHEDULED → NO_SHOW`, `CONFIRMED → NO_SHOW`; consulta futura → `422`; estado terminal → `422`; own-resource; lock.
- complete: aceita `CONFIRMED → COMPLETED` (regressão do novo estado permitido).
- cancel: aceita `CONFIRMED → CANCELLED`.
- create: grava `insuranceType` quando enviado; `null` quando ausente.
### Integração
- `PATCH /confirm` e `/no-show` happy path → `200` com status correto e `insuranceType` no body.
- `POST /appointments` com `insuranceType=convenio` → persistido e refletido no GET.
- `GET /appointments?status=confirmed` e `?status=no_show` filtram corretamente.
- USER em `/confirm` ou `/no-show` → `403`.

---

## Definition of Done
- [ ] Enum `AppointmentStatus` com `CONFIRMED` e `NO_SHOW`; novo enum `AppointmentInsuranceType` exportado no `@app/shared`
- [ ] `insuranceType` na entity, no `CreateAppointmentDto` e no `AppointmentResponseDto`
- [ ] Use-cases `confirm` e `no-show` + endpoints com `@Roles` e own-resource
- [ ] `complete` e `cancel` aceitando transição a partir de `CONFIRMED`
- [ ] Migration criada e executada (`add insurance_type`)
- [ ] Seed de dev atualizado com mix de status/convênio nos últimos 30 dias
- [ ] Invalidação de cache nas transições
- [ ] Testes unitários (100%) + integração cobrindo os cenários
- [ ] Naming convention e arquitetura seguidas; sem mistura de camadas
