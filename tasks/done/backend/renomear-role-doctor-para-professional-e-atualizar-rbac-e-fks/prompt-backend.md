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
# Task — Renomear role DOCTOR para PROFESSIONAL e generalizar FKs (Backend)

## Descrição

Substituir a role `UserRole.DOCTOR` por `UserRole.PROFESSIONAL` em todo o backend e renomear a FK `doctorId` → `professionalId` nas 8 entidades que referenciam o profissional (appointments, schedules, schedule-exceptions, exams, medical-certificates, medical-records, prescription-templates, prescriptions). Depende da task `generalizar-modelo-de-profissionais-e-tipos-de-conselho` já ter renomeado o módulo `doctors` → `professionals`.

**Não é uma redesign de RBAC** — o modelo "uma role por usuário", o `RolesGuard` e a mecânica de `@Roles()` continuam idênticos. É puramente um rename de vocabulário, exceto pelos poucos branches de negócio que decidem comportamento com base em `role === UserRole.DOCTOR` (self-service de agendamento), que precisam de revisão manual (não são find/replace mecânico).

---

## Contexto

- `packages/shared/src/enums/user-role.enum.ts`: `DOCTOR = 'doctor'` é o único valor específico de profissão no enum (`PLATFORM_ADMIN`, `ADMIN`, `USER`, `PATIENT` não mudam).
- `UserRole.DOCTOR` aparece em ~300 pontos em ~120-140 arquivos (backend + specs): a maioria é `@Roles(UserRole.ADMIN, UserRole.DOCTOR)` em controllers de appointments, schedules, schedule-exceptions, medical-records, medical-record-templates, prescriptions, prescription-templates, exams, medical-certificates, dashboard, medical-record-canonical-fields, medications, professionals (renomeado na task anterior).
- `RolesGuard` (`apps/backend/src/modules/auth/guards/roles.guard.ts`) faz `requiredRoles.includes(user.role)` — **não muda estruturalmente**.
- Branch não-mecânico crítico: `apps/backend/src/modules/appointments/use-cases/create-appointment.use-case.ts` — linha ~69: `if (currentUser.role === UserRole.DOCTOR) { doctor = await this.professionalsRepository.findByUserId(...) } else { exigir dto.doctorId }`. Esse arquivo também tem uma **raw SQL** (`fetchDoctorName`, `FROM "doctors" d ... d.user_id ...`) que não é pega por rename de entidade TypeORM — precisa de fix manual para `FROM "professionals" p ...`.
- Padrão "sou eu mesmo o profissional, resolvo via `findByUserId`" pode se repetir em outros use-cases de schedules/schedule-exceptions/medical-records/prescriptions/prescription-templates/exams/medical-certificates (ver regra "Own-resource" em `ai/context/backend.md` — implementada na camada de use-case). Localizar cada ocorrência via grep de `UserRole.DOCTOR` fora de decorators `@Roles(...)`.
- `Appointment`, `Schedule`, `ScheduleException`, `ExamRequest`, `MedicalCertificate`, `MedicalRecord`, `PrescriptionTemplate`, `Prescription` têm `doctorId`/relação `doctor` apontando para a entidade `Professional` (já renomeada pela task anterior, mas a FK/coluna nessas 8 tabelas ainda se chama `doctor_id`/`doctorId`).

---

## Parte A — Enum `UserRole`

`packages/shared/src/enums/user-role.enum.ts`:
```ts
export enum UserRole {
  PLATFORM_ADMIN = 'platform_admin',
  ADMIN = 'admin',
  USER = 'user',
  PATIENT = 'patient',
  PROFESSIONAL = 'professional',   // era DOCTOR = 'doctor'
}
```

### Migration de dado
`<ts>-rename-doctor-role-to-professional.ts`: `UPDATE users SET role = 'professional' WHERE role = 'doctor'`. Precisa rodar **no mesmo deploy** que o código desta task (aplicação passa a ler/escrever `'professional'` a partir daqui — não pode haver janela em que código novo escreve `'professional'` antes da migration, nem código antigo escreva `'doctor'` depois).

`down()`: `UPDATE users SET role = 'doctor' WHERE role = 'professional'`.

---

## Parte B — Sweep de guards/decorators (mecânico)

Substituir `UserRole.DOCTOR` por `UserRole.PROFESSIONAL` em todo `@Roles(...)` nos controllers de: `appointments`, `schedules`, `schedule-exceptions`, `medical-records`, `medical-record-templates`, `prescriptions`, `prescription-templates`, `exams`, `medical-certificates`, `dashboard`, `medical-record-canonical-fields`, `medications`, `professionals`. Nenhuma mudança de lógica — é rename do enum member referenciado.

---

## Parte C — Branches de negócio (revisão manual, não mecânico)

Para cada use-case com `role === UserRole.DOCTOR`:

1. **`appointments/use-cases/create-appointment.use-case.ts`**: branch de auto-agendamento vira `if (currentUser.role === UserRole.PROFESSIONAL) { professional = await this.professionalsRepository.findByUserId(...) } else { exigir dto.professionalId }` — **semântica idêntica**, só nomes. Renomear também `doctorId`/`doctorName` no `AppointmentResponseDto`/`toResponse` deste arquivo e corrigir a raw SQL `fetchDoctorName` para `FROM "professionals" p ...` com as colunas renomeadas.
2. Grep `UserRole.DOCTOR` fora de `@Roles(...)` em `schedules`, `schedule-exceptions`, `medical-records`, `prescriptions`, `prescription-templates`, `exams`, `medical-certificates` — cada ocorrência é um ponto de "sou eu mesmo o profissional, resolvo via `findByUserId`" que deve ser revisado individualmente e migrado para `UserRole.PROFESSIONAL` + `professionalsRepository`/`professionalId`, preservando a regra de "só o próprio" descrita em `ai/context/permissions.md`.

---

## Parte D — Rename de FK `doctorId` → `professionalId` nas entidades dependentes

Para cada uma das 8 entidades abaixo: renomear coluna `doctor_id` → `professional_id` (migration dedicada por tabela, ver abaixo), propriedade `doctorId` → `professionalId`, relação `doctor` → `professional` (incluindo `@JoinColumn`), e qualquer alias de query builder (`createQueryBuilder('doctor')` → `createQueryBuilder('professional')`):

- `appointments/entities/appointment.entity.ts`
- `schedules/entities/schedule.entity.ts`
- `schedule-exceptions/entities/schedule-exception.entity.ts`
- `exams/entities/exam-request.entity.ts`
- `medical-certificates/entities/medical-certificate.entity.ts`
- `medical-records/entities/medical-record.entity.ts`
- `prescription-templates/entities/prescription-template.entity.ts`
- `prescriptions/entities/prescription.entity.ts`

Dentro de cada módulo, varrer (grep `doctorId\|doctor\b` no diretório do módulo) repository, use-cases, controller, DTOs e specs — não é rename de pasta (só o módulo `professionals` foi renomeado na task anterior), é rename de campo dentro dos módulos já estáveis.

`apps/backend/src/modules/schedules/use-cases/get-active-schedules-for-doctor.use-case.ts` (nome do arquivo referencia "doctor") → `get-active-schedules-for-professional.use-case.ts` (`GetActiveSchedulesForDoctorUseCase` → `GetActiveSchedulesForProfessionalUseCase`).

### Migrations (uma por tabela, para permitir reverter isoladamente)
`<ts>-rename-doctor-id-to-professional-id-on-appointments.ts`, `...-on-schedules.ts`, `...-on-schedule-exceptions.ts`, `...-on-exam-requests.ts`, `...-on-medical-certificates.ts`, `...-on-medical-records.ts`, `...-on-prescription-templates.ts`, `...-on-prescriptions.ts`.

Cada uma: `ALTER TABLE <tabela> RENAME COLUMN doctor_id TO professional_id`; renomear a constraint de FK (verificar o nome real via `\d <tabela>` antes de escrever — não assumir, pois pode variar por tabela). `down()` reverte.

---

## Regras de negócio

- Nenhuma regra de autorização muda de comportamento — só de nome. "Só o próprio" (DOCTOR hoje, PROFESSIONAL depois) continua significando "o profissional só vê/edita registros onde `professionalId` corresponde ao seu próprio cadastro, resolvido via `findByUserId(currentUser.id)`".
- A migration de dado (`UPDATE users SET role = ...`) e o deploy do código que lê/escreve o novo valor devem coincidir — não há suporte a período de convivência dos dois valores.

---

## Estrutura de arquivos (resumo — full sweep, não uma lista exaustiva de todos os ~140 arquivos)

```
packages/shared/src/enums/user-role.enum.ts        ← DOCTOR → PROFESSIONAL

apps/backend/src/database/migrations/
  <ts>-rename-doctor-role-to-professional.ts
  <ts>-rename-doctor-id-to-professional-id-on-appointments.ts
  <ts>-rename-doctor-id-to-professional-id-on-schedules.ts
  <ts>-rename-doctor-id-to-professional-id-on-schedule-exceptions.ts
  <ts>-rename-doctor-id-to-professional-id-on-exam-requests.ts
  <ts>-rename-doctor-id-to-professional-id-on-medical-certificates.ts
  <ts>-rename-doctor-id-to-professional-id-on-medical-records.ts
  <ts>-rename-doctor-id-to-professional-id-on-prescription-templates.ts
  <ts>-rename-doctor-id-to-professional-id-on-prescriptions.ts

apps/backend/src/modules/
  appointments/       ← entity, repository, use-cases (create-appointment.use-case.ts com atenção especial), controller, DTOs, specs
  schedules/           ← idem + get-active-schedules-for-professional.use-case.ts (renomeado)
  schedule-exceptions/ ← idem
  exams/                ← idem
  medical-certificates/ ← idem
  medical-records/      ← idem
  prescription-templates/ ← idem
  prescriptions/         ← idem
  dashboard/             ← @Roles + qualquer doctorId em DTOs de estatística
  medical-record-canonical-fields/, medications/ ← só @Roles (leitura ADMIN/PROFESSIONAL)
  professionals/         ← @Roles do controller (criado na task anterior, ainda com UserRole.DOCTOR)
```

---

## Cenários de teste

- Migration de role: usuários com `role='doctor'` viram `role='professional'`; `migration:revert` volta ao estado anterior.
- Login/RolesGuard: usuário PROFESSIONAL acessa rotas antes gated por DOCTOR; usuário com role antiga (se restar em ambiente de teste) não quebra o guard (comparação é por string, então só funciona pós-migration — não há fallback).
- `create-appointment.use-case`: PROFESSIONAL autenticado agenda para si mesmo sem informar `professionalId` (resolvido via `findByUserId`); ADMIN/USER precisam informar `professionalId` explicitamente; `fetchDoctorName` (renomeado) retorna nome correto via raw SQL ajustada.
- Cada módulo com FK renomeada: testes de integração existentes continuam passando com `professionalId` no lugar de `doctorId` nos payloads/responses.
- Regressão: nenhuma referência residual a `UserRole.DOCTOR` no código de produção (grep deve retornar zero fora de migrations antigas/changelog).

---

## Definition of Done

- [ ] `UserRole.PROFESSIONAL` substitui `UserRole.DOCTOR` no `@app/shared`
- [ ] Migration de dado (`role`) criada e testada com `migration:run`/`migration:revert`
- [ ] Todos os `@Roles(...)` atualizados (sweep mecânico completo, zero ocorrências residuais)
- [ ] `create-appointment.use-case.ts` revisado manualmente (branch de auto-agendamento + raw SQL `fetchDoctorName`)
- [ ] Demais branches de negócio com `role === UserRole.DOCTOR` revisados um a um
- [ ] 8 migrations de rename de FK criadas e testadas
- [ ] `doctorId`/`doctor` renomeados para `professionalId`/`professional` nas 8 entidades dependentes e seus módulos completos (repository, use-cases, controller, DTOs, specs)
- [ ] `get-active-schedules-for-doctor.use-case.ts` renomeado
- [ ] Testes unitários 100% + integração ajustados e passando
- [ ] Build e lint sem erros
- [ ] Grep de `UserRole.DOCTOR`, `doctorId`, `doctor_id` no código de produção retorna zero resultados
