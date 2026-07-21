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
# Task — Atualizar campos e copy de "doctor" nas demais features (Frontend)

## Descrição

O campo `doctorId`/`doctorName` está espalhado como campo de primeira classe em 8+ features que não fazem parte do módulo de profissionais em si (appointments, schedules, schedule-exceptions, exames, atestados, prescriptions, prescription-templates, medical-records, dashboard, prescription-verification, users). Esta task varre e renomeia esses campos, generaliza a flag `isDoctor` do usuário e a copy da UI de agenda/agendamento que hoje assume "médico".

Depende de `renomear-feature-doctors-para-professionals` (hooks `useProfessionals`/`useProfessional` já existem com esse nome) e da task de backend `renomear-role-doctor-para-professional-e-atualizar-rbac-e-fks` (contratos de API já usam `professionalId`).

---

## Contexto

- `IUserModel.isDoctor` (`components/features/users/types/user-model.types.ts`), populado por `to-user-model.mapper.ts` a partir de `dto.isDoctor` — consumido em `user-table-row.tsx` (badge de perfil), `user-list.tsx` (filtro), e mapas de label `[UserRole.DOCTOR]: 'Médico'` repetidos em `user-form.tsx`, `user-details.tsx`, `user-table-row.tsx`, `user-list.tsx`.
- `doctorId`/`doctorName` como campos de tipo em: `appointments/types/appointment-model.types.ts` + `appointment-input.types.ts`; `schedules/types/schedule-model.types.ts` + `schedule-input.types.ts` (+ mensagem Zod "Selecione um médico"); `schedule-exceptions`; `exames`; `atestados`; `prescriptions`; `prescription-templates`; `medical-records`; `dashboard/types/dashboard.types.ts` (`doctorId?: string`).
- `prescription-verification` (página pública de verificação de receita): exibe `doctorName`/`doctorCrmNumber`.
- UI de agenda/agendamento: `agenda-toolbar.tsx`, `agenda-day-grid.tsx`, `agenda-week-grid.tsx`, `book-appointment-dialog.tsx` — hardcodam "Selecione um médico"; `book-appointment-dialog.tsx` tem a frase "Médico sem especialidade — a consulta será registrada como clínica geral." (copy clínico-específica, generalizar por decisão confirmada).
- `useDoctors`/`useDoctor` (já renomeados para `useProfessionals`/`useProfessional` na task anterior) são consumidos diretamente por `appointment-agenda.tsx`, `schedule-list.tsx`, `schedules/new` page — confirmar que os imports já apontam para os novos hooks (podem já estar corretos se a task anterior cobriu isso; esta task foca nos campos de dados, não nos hooks em si).

---

## Mudanças

### `users` feature
- `IUserModel.isDoctor` → `isProfessional`; `to-user-model.mapper.ts`: `isDoctor: dto.isDoctor` → `isProfessional: dto.isProfessional`.
- `user-table-row.tsx`: badge condicional `{user.isDoctor && ...}` → `{user.isProfessional && ...}`, texto do badge "Médico" → "Profissional".
- `user-list.tsx`: filtro por `isDoctor` → `isProfessional`.
- `user-form.tsx`, `user-details.tsx`, `user-table-row.tsx`, `user-list.tsx`: mapa `[UserRole.DOCTOR]: 'Médico'` → `[UserRole.PROFESSIONAL]: 'Profissional'` (4 arquivos).

### Campos `doctorId`/`doctorName` → `professionalId`/`professionalName`
Em cada um dos tipos abaixo, renomear o campo e propagar pelos hooks/mappers/componentes que o consomem:
- `appointments/types/appointment-model.types.ts`, `appointment-input.types.ts`
- `schedules/types/schedule-model.types.ts`, `schedule-input.types.ts` — Zod: "Selecione um médico" → "Selecione um profissional"
- `schedule-exceptions/types/*`
- `exames/types/*`
- `atestados/types/*`
- `prescriptions/types/*`
- `prescription-templates/types/*`
- `medical-records/types/*`
- `dashboard/types/dashboard.types.ts`: `doctorId?: string` → `professionalId?: string`

### `prescription-verification` (página pública)
- `doctorName`/`doctorCrmNumber` → `professionalName`/`professionalRegistrationNumber`, exibindo o rótulo de conselho dinâmico (mesmo padrão de `COUNCIL_TYPE_LABELS` usado no PDF/backend e em `professional-signature-select.tsx`).

### UI de agenda/agendamento
- `agenda-toolbar.tsx`, `agenda-day-grid.tsx`, `agenda-week-grid.tsx`: "Selecione um médico" → "Selecione um profissional" em todos os pontos de copy.
- `book-appointment-dialog.tsx`: mesma troca de copy de seleção; frase "Médico sem especialidade — a consulta será registrada como clínica geral." → "Profissional sem especialidade — o atendimento será registrado como atendimento geral." (generalização de copy confirmada).

---

## Regras de negócio

- Nenhuma mudança de comportamento — é rename de campo/copy. A lógica de "profissional sem especialidade vira atendimento geral" continua idêntica, só o texto exibido muda.
- `isProfessional` continua refletindo exatamente a mesma condição de negócio que `isDoctor` refletia (usuário tem um cadastro de profissional vinculado).

---

## Estrutura de arquivos

```
apps/frontend/components/features/users/
  types/user-model.types.ts                    ← isDoctor → isProfessional
  mappers/to-user-model.mapper.ts
  components/user-table-row.tsx, user-list.tsx, user-form.tsx, user-details.tsx

apps/frontend/components/features/appointments/types/*
apps/frontend/components/features/schedules/types/*
apps/frontend/components/features/schedule-exceptions/types/*
apps/frontend/components/features/exames/types/*
apps/frontend/components/features/atestados/types/*
apps/frontend/components/features/prescriptions/types/*
apps/frontend/components/features/prescription-templates/types/*
apps/frontend/components/features/medical-records/types/*
apps/frontend/components/features/dashboard/types/dashboard.types.ts
apps/frontend/components/features/prescription-verification/*

apps/frontend/components/features/appointments/components/
  agenda-toolbar.tsx, agenda-day-grid.tsx, agenda-week-grid.tsx, book-appointment-dialog.tsx
```

---

## Cenários de teste

- Badge de perfil "Profissional" aparece corretamente na listagem/detalhe de usuários para quem tem `isProfessional: true`.
- Formulário de agenda/agendamento exibe "Selecione um profissional" em vez de "médico" em todos os pontos.
- `book-appointment-dialog.tsx`: ao selecionar um profissional sem especialidade, exibe a nova copy generalizada.
- Página pública de verificação de receita exibe nome e registro do profissional corretamente, com rótulo de conselho certo.
- Testes de integração das features listadas continuam passando com os campos renomeados (loading/error/success).

---

## Definition of Done

- [ ] `isDoctor` → `isProfessional` em `users` (tipo, mapper, 4 componentes com mapa de label)
- [ ] `doctorId`/`doctorName` renomeados em todas as 9 features listadas
- [ ] `prescription-verification` atualizada com rótulo de conselho dinâmico
- [ ] Copy de agenda/agendamento generalizada (incluindo "clínica geral" → "atendimento geral")
- [ ] Testes unitários 100% + integração ajustados
- [ ] Build e lint sem erros
- [ ] Grep de `doctorId`, `doctorName`, `isDoctor`, "médico" (case-insensitive, fora de strings de teste/fixture que serão tratadas na task de e2e) retorna zero resultados no código de produção do frontend
