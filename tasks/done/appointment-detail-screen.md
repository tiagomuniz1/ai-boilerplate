# Tela própria de consulta (substituir modal de detalhes)

## Objetivo

Mover os detalhes da consulta de um modal para uma **tela própria**. Ao clicar numa consulta na agenda continua abrindo um modal, mas **enxuto**, apenas com as informações essenciais e um botão **"Ir para a consulta"** que leva à nova tela. Nessa tela ficam os detalhes completos da consulta, os **dados do paciente** e a opção de **preencher o prontuário**.

A tela é o ponto de extensão para a evolução futura: **gerenciar receitas, atestados e exames**.

## Decisões

- **Comportamento do clique:** mantém um modal leve (status, paciente, horário) com botão "Ir para a consulta". Não navega direto.
- **Dados do paciente:** embarcados na consulta (estender o DTO de detalhe via JOIN no backend). Respeita a regra de permissão: DOCTOR vê o paciente **apenas via vínculo da consulta**, sem acessar `/patients`.

## Contexto atual

- Clicar numa consulta na agenda (`agenda-day-grid` / `agenda-week-grid`) abre `AppointmentDetailsDialog`, um modal que concentra **tudo**: detalhes, concluir/cancelar e a seção de prontuário (`MedicalRecordSection`).
- `GET /appointments/:id` (`FindAppointmentByIdUseCase`) já resolve `doctorName`, `patientName` e `specialtyName` via queries pontuais. O `patientName` é o único dado do paciente exposto.
- Restrição de permissão: DOCTOR **não** acessa `/patients` — dados do paciente só chegam via vínculo da consulta. Por isso os campos serão embarcados no DTO da consulta.

---

## Parte 1 — Backend (embarcar dados do paciente no detalhe)

1. **`packages/shared/src/dtos/`** — novos DTOs (exportar no `index.ts`):
   - `AppointmentPatientDto`: `fullName`, `email`, `phoneNumber`, `birthDate`, `documentNumber`, `gender`.
   - `AppointmentDetailResponseDto extends AppointmentResponseDto` adicionando `patient: AppointmentPatientDto`.
   - Mantém o `AppointmentResponseDto` "magro" para a **listagem** (não infla a paginada).

2. **`find-appointment-by-id.use-case.ts`**:
   - Trocar `fetchPatientName` por `fetchPatientDetails` (mesmo padrão de `innerJoin` em `users`, somando colunas de `patients`: `phone_number`, `birth_date`, `document_number`, `gender`).
   - `toResponse` passa a montar o bloco `patient` e retornar `AppointmentDetailResponseDto`.
   - Permissão DOCTOR (own-resource) já é validada aqui — nada muda.

3. **Testes backend**: atualizar `find-appointment-by-id.use-case.spec.ts` (mock do raw query do paciente) e o integration spec de appointments para assertar o bloco `patient`.

## Parte 2 — Frontend: nova rota de detalhe

4. **Tipos/mapper** (`features/appointments`):
   - `IAppointmentDetailModel extends IAppointmentModel` com `patient: IAppointmentPatientModel` (convertendo `birthDate: string → Date`).
   - `get-appointment.use-case.ts` + mapper passam a mapear o bloco `patient`. Hook `useAppointment` continua igual (já consome `getById`).

5. **Nova página** `app/[slug]/(authenticated)/appointments/[id]/page.tsx`:
   - `useParams` para `id`, `useSlug`, role/`currentDoctorId` do `auth.store`.
   - Estados loading/error/success (skeleton + `Alert`), botão "← Voltar" para a agenda.
   - Seções: **Dados do paciente** (novo `PatientInfoCard`), **Detalhes da consulta** (status badge, médico, data/horário, motivo), **Ações** (concluir/cancelar — movidas do modal) e **Prontuário**.

6. **Extrair `MedicalRecordSection`** do `appointment-details-dialog.tsx` para `components/medical-record-section.tsx` (sem mudança de lógica) e usá-la na página. Reaproveita `templateFieldToRecordField` etc.

## Parte 3 — Modal enxuto

7. **`appointment-details-dialog.tsx`** vira leve: status, paciente (nome), médico, data/horário + botão primário **"Ir para a consulta"** (`router.push(/${slug}/appointments/${id})`). Remove concluir/cancelar/prontuário do modal (agora vivem na página). `agenda-day-grid` e `agenda-week-grid` seguem abrindo o modal igual.

## Parte 4 — Testes e fechamento

8. **Testes frontend**: integration da nova página (loading/error/success, ações, prontuário, gates por role); atualizar o spec do modal enxuto e os do `MedicalRecordSection` no novo local; mapper spec.
9. **E2E Cypress** (`cypress/e2e/appointments`): ajustar o fluxo — clique → modal → "Ir para a consulta" → tela → preencher prontuário.

## Preparo para a evolução futura

- A página é montada em **seções** desde já, deixando o ponto de extensão pronto para abas/blocos de **Receitas, Atestados e Exames** (cada um virará seu próprio feature module seguindo o padrão use-case → service → hook).

---

## Pontos de atenção

- `USER` (recepcionista) acessa a tela em leitura (vê paciente e detalhes), mas sem prontuário nem ações — reaproveitar os gates `canManage` / `canSeeMedicalRecord` já existentes.
- O bloco `patient` fica **só** no endpoint de detalhe (`:id`), não na listagem.
- Cobertura 100% exigida pelo projeto — cada arquivo novo precisa de spec.
