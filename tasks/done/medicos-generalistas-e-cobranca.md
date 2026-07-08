# Médicos generalistas e cobrança de valores

## Context

Clínicas sem especialidades atribuídas precisam operar com **médicos generalistas** — profissionais que têm apenas CRM, sem especialidade vinculada. Hoje o sistema **impede** isso e, além disso, **não tem nenhum conceito de valor/cobrança**. Este plano cobre os dois temas de forma acoplada, porque a decisão de como precificar depende de como o generalista é modelado.

Dois fatos levantados na exploração fundamentam tudo:

1. **Especialidade é obrigatória só na camada de aplicação, não no schema.** O banco já tolera médico e consulta sem especialidade (`doctors` não tem coluna, `appointments.specialty_id` é `nullable`). Os bloqueios são: `@ArrayMinSize(1)` no DTO compartilhado, `.min(1)` no Zod do frontend, e `resolveSpecialty` na criação de consulta lançando `'Doctor has no active specialty'`. O **único obstáculo de schema** é `medical_record_templates.specialty_id` ser `NOT NULL`.
2. **Cobrança de valores é greenfield.** Não existe preço/valor/pagamento em nenhuma entidade, DTO ou migration. O único conceito adjacente é o enum `AppointmentInsuranceType` (`particular` vs `convenio`).

## Decisões

- **Modelagem do generalista (confirmada pelo usuário): especialidade opcional/nullable.** O generalista é um médico com CRM(s) e **zero** `doctor_specialties`. Nada de pseudo-especialidade "Clínico Geral". Isso exige relaxar o acoplamento em algumas camadas e uma migration para o template.
- **Granularidade de preço (confirmada pelo usuário): por médico + especialidade.** O preço vive em `doctor_specialties.price` — mesmo médico pode cobrar valores diferentes por especialidade. Como o **generalista não tem linha em `doctor_specialties`**, ele precisa de um **fallback a nível de médico** (`doctors.consultation_price`). O valor cobrado é **congelado em snapshot na consulta**.
- **Escopo (assunção — a confirmar): preço + snapshot, sem status de pagamento.** Diferencia `particular` (cobra) de `convenio` (não cobra o paciente diretamente). Controle de pagamento (pago/pendente) fica para uma fase 2.

> A assunção de escopo acima ficou sem resposta do usuário; está sinalizada para revisão na aprovação.

---

## Parte A — Habilitar médicos generalistas (relaxar acoplamento de especialidade)

### A1. DTOs compartilhados
`packages/shared/src/dtos/create-doctor.dto.ts` e `update-doctor.dto.ts`
- Remover `@ArrayMinSize(1)` de `specialties` (permitir array vazio) — manter `@IsArray()` e `@ValidateNested`.
- **Manter** `@ArrayMinSize(1)` em `crms` — generalista continua obrigado a ter CRM.

### A2. Frontend — formulário de médico
`apps/frontend/components/features/doctors/components/doctor-form.tsx` (linhas ~38-49)
- Relaxar `specialtiesField` removendo `.min(1, 'Selecione ao menos uma especialidade')`.
- Aproveitar o empty-state já existente (linha ~580) para clínicas com zero especialidades: permitir submeter sem selecionar especialidade em vez de bloquear.

### A3. Criação de consulta
`apps/backend/src/modules/appointments/use-cases/create-appointment.use-case.ts` — `resolveSpecialty` (linhas 166-187)
- Quando `specialties.length === 0` **e** nenhum `requestedSpecialtyId` → retornar `null` (consulta de generalista) em vez de lançar `'Doctor has no active specialty'`.
- Ajustar o retorno de `execute`/`toResponse` (linha ~163) para aceitar especialidade `null` (nome nulo). Os use-cases de leitura/transição (`list-appointments`, `find-appointment-by-id`, `confirm/cancel/complete/mark-no-show`) já filtram `specialtyId` nulo — nenhuma mudança necessária neles.
- `CreateAppointmentDto.specialtyId` já é opcional — nenhuma mudança de DTO.

### A4. Templates de prontuário e criação de prontuário (acoplamento mais profundo)
- **Migration:** tornar `medical_record_templates.specialty_id` `nullable`. Um template com `specialty_id IS NULL` é o "template de generalista/clínica" (escopo apenas `clinicId`).
- Entidade `apps/backend/src/modules/medical-record-templates/entities/medical-record-template.entity.ts`: `specialtyId: string | null` com `@Column({ ..., type: 'uuid', nullable: true })` (declarar `type` explícito — union type).
- Repository `findByClinicAndSpecialty` + `find-template-by-clinic-and-specialty.use-case.ts`: aceitar `specialtyId` nulo, resolvendo o template cujo `specialty_id IS NULL` para a clínica.
- `apps/backend/src/modules/medical-records/use-cases/create-medical-record.use-case.ts` (linhas 69-78): quando `appointment.specialtyId` é nulo, **não** lançar `'Appointment has no specialty defined'`; buscar o template de generalista da clínica. Se não houver, manter erro claro (`NotFoundException`).
- DTO/use-case de criação de template: permitir `specialtyId` opcional para cadastrar o template de generalista.

---

## Parte B — Modelo de cobrança de valores

### B1. Configuração de preço (source of truth) — por médico + especialidade
- **Migration + entidade `doctor_specialties`:** adicionar `price NUMERIC(10,2)` nullable (`price: number | null`, `type` explícito). **Fonte primária** do preço — cada par (médico, especialidade) tem seu valor. Refletir no `DoctorSpecialtyInputDto` (dentro de `create-doctor.dto.ts`) com `@IsOptional() @IsNumber() @Min(0)`.
- **Migration + entidade `doctors`:** adicionar `consultation_price NUMERIC(10,2)` nullable — **fallback do generalista**, que não tem linha em `doctor_specialties`. Refletir nos DTOs de médico (`create-doctor.dto.ts`, `update-doctor.dto.ts`, response DTO) com `@IsOptional() @IsNumber() @Min(0)`.

### B2. Snapshot na consulta
- **Migration + entidade `appointments`:** adicionar `price NUMERIC(10,2)` nullable (`price: number | null`, `type` explícito) — valor **congelado no momento do agendamento**, para que reajustes futuros não reescrevam o histórico.
- Na criação da consulta (`create-appointment.use-case.ts`), resolver o preço:
  - `insuranceType === CONVENIO` → `price = null` (não se cobra o paciente diretamente).
  - `insuranceType === PARTICULAR` (default) → `doctor_specialties.price` da especialidade escolhida (fonte primária); se a consulta não tem especialidade (generalista), usar o fallback `doctors.consultation_price`.
  - Generalista (sem especialidade) → sempre `doctors.consultation_price`.
- Incluir `price` no response DTO da consulta para o frontend exibir.

### B3. Frontend
- Formulário de médico: campo de preço em cada linha de especialidade (`doctor_specialties.price`) + campo de preço base do médico (`consultation_price`, usado quando ele atua como generalista/sem especialidade).
- Fluxo de agendamento: quando o médico não tem especialidade, ocultar o seletor de especialidade; exibir o valor da consulta (particular) no resumo. Seguir o padrão de camadas do projeto (service → use-case → hook → componente), sem axios fora de `lib/api-client.ts`, dados de API via React Query.

---

## Migrations necessárias (nomear com timestamp, snake_case)
1. `make_template_specialty_id_nullable`
2. `add_consultation_price_to_doctors`
3. `add_price_to_appointments`
4. `add_price_to_doctor_specialties`

> `synchronize` permanece desligado — todas as mudanças de schema via migration.

## Testes (obrigatório 100% de cobertura — CLAUDE.md)
- **Unit:** `resolveSpecialty` retornando null; resolução de preço (particular via `doctor_specialties.price`, generalista via `consultation_price`, convênio → null); create-medical-record buscando template de generalista.
- **Integração backend:** `POST /doctors` sem especialidades → 201; `POST /appointments` para médico generalista → 201 com `specialtyId: null` e `price` snapshot correto; criação de prontuário de generalista via template de clínica.
- Atualizar as specs de doctors/appointments/medical-records/templates já modificadas (aparecem no `git status`).

## Verificação end-to-end
1. `docker compose up -d` e `yarn workspace @app/backend migration:run`.
2. `yarn workspace @app/backend test:unit` e `test:integration` (schema `test`).
3. Via API: criar médico só com CRM (sem especialidade) → 201; criar consulta particular para ele → conferir `specialtyId: null` e `price = consultation_price`; criar consulta convênio → `price = null`.
4. Cadastrar template de generalista (specialty null) e criar um prontuário a partir da consulta generalista.
5. `yarn workspace @app/frontend test` e checar o fluxo de agendamento sem especialidade no app.
