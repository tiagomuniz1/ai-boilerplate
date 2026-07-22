# Generalizar a plataforma de "médicos" para "profissionais de saúde"

## Objetivo

Hoje a Pulso só modela médicos (`Doctor`, CRM, RQE, especialidades médicas). O objetivo é permitir que nutricionistas, fisioterapeutas, psicólogos e outras profissões de saúde usem a mesma plataforma — agendas, consultas, prontuários, receitas, atestados — sem tratamento especial de "médico" embutido no domínio, no RBAC ou na UI.

## Motivação

O acoplamento a "médico" é profundo, não superficial: `UserRole.DOCTOR` aparece em ~300 pontos (guards, decorators, branches de negócio) em ~140 arquivos entre backend e frontend; a entidade `Doctor` tem campos exclusivamente médicos (CRM, RQE); há uma rota `/doctors` dedicada; e FKs `doctorId` atravessam 8+ entidades clínicas (appointments, schedules, schedule-exceptions, exams, medical-certificates, medical-records, prescriptions, prescription-templates). Sem essa generalização, cada nova profissão exigiria gambiarras no modelo de dados existente.

## Situação atual

- `Doctor` (`apps/backend/src/modules/doctors/entities/doctor.entity.ts`): `id, userId, clinicId, crms: DoctorCrm[], doctorSpecialties: DoctorSpecialty[], bio, version, timestamps`.
- `DoctorCrm` (tabela `doctor_crms`): `number varchar(6)`, `state varchar(2)`, `isPrimary` — formato fixo de CRM, validado por regex hardcoded no shared (`/^\d{1,6}$/`, `/^[A-Z]{2}$/`).
- `DoctorSpecialty` (tabela `doctor_specialties`): vínculo profissional↔especialidade com `rqe varchar(10)` opcional — RQE é conceito exclusivo de medicina (CFM).
- `UserRole.DOCTOR = 'doctor'` é role de primeira classe, usada em `@Roles(...)` em praticamente todo controller clínico e em branches de negócio de auto-agendamento.
- `specialties`, `medical-record-templates` e `medical-record-canonical-fields` **já são genéricos** (indexados por `specialtyId`, sem campo médico-específico) — não precisam de rework estrutural, só ajuste de copy.
- Frontend: feature `doctors/` dedicada, rota `/doctors`, formulário com CRM hardcoded (6 dígitos + UF), item de navegação "Médicos", flag `IUserModel.isDoctor`, campos `doctorId`/`doctorName` espalhados por 8+ outras features.

## Decisões (confirmadas com o usuário)

- **RBAC**: uma única role genérica `UserRole.PROFESSIONAL` substitui `UserRole.DOCTOR`. A profissão em si vira atributo do cadastro (via `CouncilType`), não uma role separada — todas as permissões de DOCTOR hoje já são idênticas independente de especialidade.
- **Registro profissional**: generalizar CRM para um conceito de **tipo de conselho** (`CouncilType`) com formato de validação configurável por tipo. Catálogo inicial: **CRM, CRN, CREFITO, CRP, CRO, COREN, CREF, CRFA**.
- **Rename**: completo e coordenado, sem camada de compatibilidade — `doctors` → `professionals` em tabelas, módulo, rotas, DTOs, enum. Sem redirect da rota antiga `/doctors` (404 aceitável).
- **RQE**: continua exclusivo de profissionais com `councilType = CRM`, oculto no formulário para as demais profissões — sem mudança de validação.
- **Copy específica de medicina** ("Atestado Médico", "clínica geral" etc.): generalizada já nesta leva, não fica para depois.

## Tasks

### Backend (nesta ordem)

1. **`tasks/backend/generalizar-modelo-de-profissionais-e-tipos-de-conselho/task-backend.md`**
   Task fundacional: `CouncilType` + config de validação por conselho no shared; entidades `Professional`/`ProfessionalRegistration`/`ProfessionalSpecialty` (renomeadas de `Doctor`/`DoctorCrm`/`DoctorSpecialty`); migrations de rename de tabela/coluna; módulo/repository/use-cases renomeados. Ainda usa `UserRole.DOCTOR` temporariamente nos guards (renomeado na task 2).

2. **`tasks/backend/renomear-role-doctor-para-professional-e-atualizar-rbac-e-fks/task-backend.md`**
   `UserRole.DOCTOR` → `UserRole.PROFESSIONAL` (enum + migration de dado + sweep de `@Roles(...)`); revisão manual dos branches de auto-agendamento (`create-appointment.use-case.ts`); rename de FK `doctorId` → `professionalId` em 8 entidades dependentes (appointments, schedules, schedule-exceptions, exams, medical-certificates, medical-records, prescription-templates, prescriptions).

3. **`tasks/backend/generalizar-assinatura-de-documentos-e-pdfs/task-backend.md`**
   Tipos de snapshot (`doctor`→`professional`), `resolveProfessionalSigningIdentity`, e os 3 PDF builders (receita/atestado/exame) passam a exibir o rótulo de conselho dinâmico em vez de "CRM" fixo; título "Atestado Médico" → "Atestado".

4. **`tasks/backend/atualizar-seeds-e-documentacao-multi-profissao/task-backend.md`**
   Seeds (`carga`, `dev`, `canonical-fields`) passam a incluir profissionais não-médicos; reescrita completa de `ai/context/permissions.md`.

### Frontend (nesta ordem, após o backend correspondente)

5. **`tasks/frontend/renomear-feature-doctors-para-professionals/task-frontend.md`**
   Feature `doctors/`→`professionals/` (tipos, service, use-cases, hooks, mappers, listagem/detalhes/delete-dialog), rota `/doctors`→`/professionals`, navegação, copy de `specialties`. Formulário só movido, sem rework ainda.

6. **`tasks/frontend/reformular-formulario-de-profissional-com-conselho-dinamico/task-frontend.md`**
   Rework funcional do formulário: seletor de `councilType` por registro, máscara/validação/placeholder dinâmicos, campo de RQE restrito a CRM. `professional-signature-select.tsx` com rótulo dinâmico.

7. **`tasks/frontend/atualizar-campos-e-copy-de-doctor-nas-demais-features/task-frontend.md`**
   `doctorId`/`doctorName`→`professionalId`/`professionalName` em 9 features (appointments, schedules, schedule-exceptions, exames, atestados, prescriptions, prescription-templates, medical-records, dashboard, prescription-verification); `isDoctor`→`isProfessional`; copy de agenda/agendamento generalizada.

8. **`tasks/frontend/atualizar-e2e-para-profissionais/task-frontend.md`**
   Suíte Cypress `doctors/`→`professionals/` + novo spec de conselho não-CRM + sweep dos ~30 specs restantes.

## Ordem e coordenação

- **Backend sempre antes do frontend correspondente** — o frontend consome os DTOs/enum do `@app/shared` que só existem após as tasks de backend rodarem.
- Dentro do backend, a ordem 1→2→3→4 é estrita: a task 2 usa os nomes de entidade/repository definidos na 1; a task 3 usa `CouncilType`/`ProfessionalRegistration` da 1 e os módulos já com `professionalId` da 2; a task 4 semeia dados no shape final de 1+2+3.
- Dentro do frontend, 5→6→7→8: a 6 reformula um arquivo que só existe (no novo caminho) após a 5; a 7 depende dos hooks renomeados na 5; a 8 depende dos `data-testid`s e da copy finais de 6 e 7.
- **Risco de deploy**: as migrations de rename de tabela/coluna das tasks 1 e 2 são operações de metadata no Postgres (rápidas), mas a aplicação e o banco precisam mudar no mesmo deploy — confirmar que o pipeline (GitHub Actions → ECS) roda `migration:run` imediatamente antes do novo código subir.

### Grafo de dependências

```
backend#1 ─> backend#2 ─> backend#3 ─> backend#4
    │            │
    └────────────┴─> frontend#5 ─> frontend#6 ─┐
                                   frontend#7 ──┴─> frontend#8
```

## Verificação end-to-end

1. `docker compose up -d` + `yarn workspace @app/backend migration:run` (rodar as migrations das tasks 1 e 2 em sequência) — conferir: `professionals`/`professional_registrations`/`professional_specialties` criadas com dados migrados; `council_type='crm'` em todos os registros pré-existentes; `role='professional'` para todos os usuários que eram `'doctor'`; FKs `professional_id` renomeadas nas 8 tabelas dependentes.
2. `yarn workspace @app/backend seed:run` + `yarn dev` — confirmar que os seeds criam ao menos um profissional não-médico (ex. nutricionista CRN).
3. `yarn workspace @app/backend test` + `yarn workspace @app/frontend test` — 100% de cobertura unitária mantida, testes de integração passando.
4. Manual, no navegador:
   - Criar um profissional com `councilType = CRN`, número `12345678`, sem RQE disponível na especialidade → salvar → detalhes exibem "CRN 12345678".
   - Criar um profissional CRM com RQE em uma especialidade → emitir atestado/receita/pedido de exame → PDF mostra `"CRM {number} · RQE {registryNumber}"`, título "Atestado" (sem "Médico").
   - Emitir documento por um profissional CRN → PDF mostra `"CRN {number}"`, sem segmento de RQE.
   - Acessar `/professionals` normalmente; acessar `/doctors` (rota antiga) → 404.
   - Login como usuário PROFESSIONAL → agenda própria + auto-agendamento funcionam sem informar `professionalId` explicitamente.
5. `yarn workspace @app/frontend cypress:run` — suíte `professionals/` + specs afetados (appointments, schedules, exames, medical-records, users, clinics, mobile) verdes.
