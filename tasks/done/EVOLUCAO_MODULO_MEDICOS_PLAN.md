# Evolução do módulo de médicos — RQE por especialidade + múltiplos CRMs

## Objetivo

Duas evoluções no cadastro do médico, feitas juntas por compartilharem os mesmos arquivos (entidade `Doctor`, DTOs, formulário, mappers, use-cases, seeds, testes):

1. **RQE por especialidade** — cada especialidade do médico pode ter um **RQE (Registro de Qualificação de Especialista)** opcional. Um médico com várias especialidades pode ter vários RQEs (um por especialidade).
2. **Múltiplos CRMs** — o CRM deixa de ser um campo único (`string`) e passa a ser uma **coleção**. Um médico pode ter mais de um CRM (ex.: registros em UFs diferentes), com um marcado como **principal**.

## Motivação

- O **RQE** acompanha o CRM em documentos médicos (receita, atestado, pedido de exame) e é atrelado à especialidade. Hoje o sistema não guarda o RQE.
- Um médico registrado em mais de um estado tem **mais de um CRM**. Hoje só cabe um. Precisamos permitir vários e escolher qual é o principal (o que sai nos documentos).

## Situação atual

- `Doctor.crmNumber: string` (`@Column name: 'crm_number'`), formato `NNNNN/UF` (ex.: `12345/SP`), com **índice único parcial** `(crm_number, clinic_id) WHERE deleted_at IS NULL` (`doctors_crm_number_clinic_active_unique`) — soft-delete do médico libera o CRM.
- `Doctor.specialties` é `@ManyToMany(() => Specialty)` puro, com tabela de junção magra `doctor_specialties` (só `doctor_id` + `specialty_id`).
- Contrato: request `crmNumber: string` + `specialtyIds: string[]`; response `crmNumber: string` + `specialties: [{ id, name }]`.
- **Documentos** capturam um **snapshot** com `doctor.crmNumber: string` único (tipos `prescription-snapshot`, `medical-certificate-snapshot`, `exam-request-snapshot`); os PDF builders e a **verificação pública** leem esse campo string.

## Decisões (confirmadas com o usuário)

### RQE
- **Opcional** por especialidade (coluna nullable, sem backfill).
- **Somente números** — o input do frontend impede digitar qualquer caractere não numérico (filtro no `onChange`, inclusive ao colar); zod/`class-validator` usam `/^\d{1,10}$/` como rede de segurança. Guardado como **`string`** (`varchar(10)`) para acomodar mudança de formato no futuro.
- Modelado como **entidade de junção `DoctorSpecialty`** (padrão do precedente `ClinicSpecialty`), substituindo o `@ManyToMany` puro. Tabela `doctor_specialties` alterada in-place, preservando vínculos (`rqe = NULL`).

### CRM
- **Número + UF separados** — entidade **`DoctorCrm`** `{ number, state, isPrimary }`, `@OneToMany` a partir de `Doctor`. Substitui `crmNumber: string`.
- **Documentos usam o CRM principal** (`isPrimary`). O **snapshot continua com um único `crmNumber: string`**, derivado do CRM principal na emissão (`${number}/${state}`) — **PDF builders e verificação pública não mudam**.
- **RQE permanece só por especialidade** — não é vinculado a um CRM específico.
- **Exatamente um** CRM principal; **no mínimo um** CRM. Unicidade preservada por índice **parcial** `(number, state, clinic_id) WHERE deleted_at IS NULL` — soft-delete do médico solta o CRM (paridade com o comportamento atual).

## Tasks

1. **`tasks/backend/evoluir-modulo-de-medicos-rqe-e-multiplos-crms/task-backend.md`**
   `DoctorSpecialty` (RQE) + `DoctorCrm` (múltiplos CRMs), migrations, DTOs no shared, repository, use-cases de create/update/find/delete, derivação do CRM principal nos snapshots de receita/atestado/exame, `specialties.countLinkedDoctors`, module e seeds. Testes unit + integração.

2. **`tasks/frontend/evoluir-modulo-de-medicos-rqe-e-multiplos-crms/task-frontend.md`**
   Tipos e mappers, formulário (lista dinâmica de CRMs com principal + input de RQE por especialidade marcada), exibição em detalhes e listagem. Testes unit + integração.

## Ordem e coordenação

- **Backend primeiro** (fonte do contrato `@app/shared`), depois frontend.
- Ambas as evoluções tocam os mesmos arquivos — implementar as duas **no mesmo passo por arquivo** (uma migration para CRM, uma para RQE; um único ajuste no `doctor.entity.ts`, no `doctor-form.tsx`, nos DTOs, etc.).

## Verificação end-to-end

1. `docker compose up -d` + `yarn workspace @app/backend migration:run`. Conferir:
   - `doctor_crms` criada, cada médico existente com **1 CRM principal** migrado de `crm_number` (número/UF separados), `doctors.crm_number` removido, índice único parcial em `(number, state, clinic_id)`.
   - `doctor_specialties` com `id`/`rqe`/`created_at`, vínculos antigos preservados (`rqe = NULL`).
2. `yarn workspace @app/backend seed:run` + `yarn dev`.
3. `yarn workspace @app/backend test` + `yarn workspace @app/frontend test`.
4. Manual:
   - Criar médico com 2 CRMs (marcando um principal) e 2 especialidades (RQE em uma, vazio na outra) → detalhes exibem os CRMs (principal destacado) e o RQE onde preenchido → editar (tudo pré-preenchido) → salvar → confirmar persistência.
   - Validar bloqueio de não-números no CRM (número) e no RQE; UF só 2 letras; exatamente um CRM principal.
   - Emitir receita/atestado/exame → PDF e verificação pública mostram o **CRM principal**.
   - Conflito: cadastrar CRM já usado por outro médico ativo → erro `409`.
