# Plano de Implementação — Prontuários Flexíveis (Medical Records)

> Status: **proposta para análise** — nada implementado ainda.
> Decisão de granularidade: **template por `clinic + specialty`**.

---

## 1. Visão geral e decisão

Cada clínica conduz consultas à sua maneira, então o prontuário precisa ser **flexível** — a clínica define quais campos compõem o atendimento. Como a **especialidade** já é a unidade de cobrança do plano futuro, o **template de prontuário é configurado por `clinic + specialty`**.

- A clínica (ADMIN) define um **template** (estrutura de campos) por especialidade que ela oferece.
- O médico, ao atender, preenche um **prontuário (medical record)** vinculado à consulta, seguindo o template vigente.
- O histórico do paciente é o conjunto de prontuários daquele paciente naquela clínica.

O template é **estritamente por `clinic + specialty`** — não há customização por médico. Todos os médicos de uma especialidade na clínica seguem o mesmo template, o que garante padronização do atendimento, continuidade do histórico mesmo com rotatividade de médicos e coerência com a especialidade como unidade de cobrança.

### Glossário

| Termo | Significado |
|---|---|
| **Template** (`medical_record_template`) | Define a estrutura de campos do prontuário para uma `clinic + specialty`. Configurado pela clínica. |
| **Field** | Um campo do template (label, tipo, obrigatório, opções, ordem). Armazenado como JSONB no template. |
| **Medical Record** (`medical_record`) | Prontuário preenchido em uma consulta. Vincula `appointment` + `template` + valores. |
| **Schema snapshot** | Cópia imutável da estrutura do template no momento em que o prontuário foi criado — garante que registros antigos renderizam com o formato original mesmo após o template mudar. |

---

## 2. Modelagem de banco

### 2.1 Diagrama ER

```
clinics ──┐
          │ 1:N
specialties ──┐
              ├──< medical_record_templates >
              │        │
              │        │ define a estrutura (fields JSONB)
              │        │
appointments ─┼────────┼──< medical_records >──┐
   (1:1)      │        │     - snapshot do template          │
              │        └─────┘                                │
patients ─────┘              valores (data JSONB)             │
doctors ──────────────────────────────────────────────────────┘
```

- `medical_record_templates` **N:1** `clinics`, **N:1** `specialties`
- `medical_records` **1:1** `appointments` (cada consulta gera no máximo um prontuário)
- `medical_records` **N:1** `patients`, `doctors`, `clinics`, `medical_record_templates`

### 2.2 Tabela `medical_record_templates`

Estrutura dos campos guardada como **JSONB** (`fields`) — escolha alinhada ao requisito de flexibilidade (cada clínica monta sua estrutura sem migration). Ver decisão **D1**.

```sql
CREATE TABLE "medical_record_templates" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id"   uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
  "specialty_id" uuid NOT NULL REFERENCES "specialties"("id") ON DELETE RESTRICT,
  "name"        varchar NOT NULL,
  "fields"      jsonb NOT NULL DEFAULT '[]',
  "is_active"   boolean NOT NULL DEFAULT true,
  "version"     integer NOT NULL DEFAULT 1,   -- @VersionColumn (optimistic lock)
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "updated_at"  timestamptz NOT NULL DEFAULT now(),
  "deleted_at"  timestamptz NULL
);

-- Um template por clinic+specialty. Índice parcial ignora soft-deleted.
CREATE UNIQUE INDEX "UQ_template_clinic_specialty"
  ON "medical_record_templates" ("clinic_id", "specialty_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "IDX_templates_clinic" ON "medical_record_templates" ("clinic_id");

-- Alvo da FK composta de medical_records (garante template.specialty == record.specialty no banco).
-- id já é PK (único), mas a FK composta exige uma UNIQUE explícita sobre (id, specialty_id).
ALTER TABLE "medical_record_templates"
  ADD CONSTRAINT "UQ_template_id_specialty" UNIQUE ("id", "specialty_id");
```

**Formato do JSONB `fields`** (contrato documentado — validado no DTO, não no banco):

```jsonc
[
  {
    "key": "blood_pressure_a1b2",   // GERADA PELO BACKEND, imutável — nunca digitada pela clínica
    "label": "Pressão arterial",    // texto de exibição, editável
    "type": "text",                 // ver enum MedicalRecordFieldType
    "required": true,
    "order": 1,
    "options": null,                // só para select/multiselect — ver formato abaixo
    "placeholder": "120/80",
    "helpText": "mmHg",
    "canonical": true,              // veio do catálogo da plataforma
    "canonicalKey": "blood_pressure" // chave estável do catálogo (null se campo livre)
  },
  {
    "key": "humor_paciente_9f3c",   // campo livre criado pela clínica
    "label": "Humor do paciente",
    "type": "select",
    "required": false,
    "order": 2,
    "options": [                    // select/multiselect: SEMPRE { value, label }
      { "value": "good", "label": "Bom" },
      { "value": "neutral", "label": "Neutro" },
      { "value": "bad", "label": "Ruim" }
    ],
    "placeholder": null,
    "helpText": null,
    "canonical": false,
    "canonicalKey": null
  }
]
```

**Regras do contrato (mitigam o problema de `key` — ver D9):**

- **Camada 1 — `key` gerada e imutável.** A clínica preenche só o `label`; o backend deriva a `key` (slug normalizado do label + sufixo curto aleatório, ex: `blood_pressure_a1b2`). Após criada, a `key` **nunca muda** — editar o `label` não altera a `key`. Isso elimina divergência acidental (`riskLevel` vs `risco_nivel`) dentro de uma clínica e garante que `medical_records.data` sempre case com o snapshot.
- **Camada 2 — `options` com `value` + `label`.** Para `select`/`multiselect`, separa-se o **valor canônico** (estável, gravado em `data`, ex: `"good"`) do **label** (exibição, ex: `"Bom"`). Relatórios agrupam por `value`, imunes a maiúscula/acento/tradução.
- **Camada 3 — `canonical` / `canonicalKey`.** Quando o campo vem do **catálogo de campos canônicos da plataforma** (ver 2.5), guarda-se `canonical: true` e a `canonicalKey` estável do catálogo. É a `canonicalKey` (igual entre todas as clínicas) que viabiliza relatórios **cross-clínica**. Campos livres têm `canonical: false` e `canonicalKey: null`.

### 2.3 Tabela `medical_records`

```sql
CREATE TABLE "medical_records" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id"      uuid NOT NULL REFERENCES "clinics"("id"),
  "appointment_id" uuid NOT NULL REFERENCES "appointments"("id"),
  "patient_id"     uuid NOT NULL REFERENCES "patients"("id"),
  "doctor_id"      uuid NOT NULL REFERENCES "doctors"("id"),
  "specialty_id"   uuid NOT NULL REFERENCES "specialties"("id"),
  "template_id"    uuid NOT NULL,
  "template_schema_snapshot" jsonb NOT NULL,  -- cópia de fields no momento da criação
  "data"           jsonb NOT NULL DEFAULT '{}', -- { "<field.key>": <valor> }
  "notes"          text NULL,                  -- evolução / observação livre
  "version"        integer NOT NULL DEFAULT 1,
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "updated_at"     timestamptz NOT NULL DEFAULT now(),
  "deleted_at"     timestamptz NULL,
  -- FK COMPOSTA: garante no banco que o template pertence à mesma especialidade do prontuário.
  -- Impossível gravar specialty=cardiologia com template de ginecologia, mesmo com bug no código.
  CONSTRAINT "FK_medical_record_template_specialty"
    FOREIGN KEY ("template_id", "specialty_id")
    REFERENCES "medical_record_templates" ("id", "specialty_id")
);

-- 1:1 com a consulta (um prontuário por consulta)
CREATE UNIQUE INDEX "UQ_medical_record_appointment"
  ON "medical_records" ("appointment_id") WHERE "deleted_at" IS NULL;

CREATE INDEX "IDX_medical_records_clinic_patient"
  ON "medical_records" ("clinic_id", "patient_id");  -- histórico do paciente
CREATE INDEX "IDX_medical_records_clinic_doctor"
  ON "medical_records" ("clinic_id", "doctor_id");
```

**Por que `template_schema_snapshot`:** prontuário é registro clínico/legal e precisa preservar como foi preenchido. Se a clínica editar o template depois, registros antigos continuam renderizando com a estrutura original. O `template_id` mantém a rastreabilidade; o snapshot garante a imutabilidade visual.

**Invariante `template.specialty == record.specialty` em duas camadas:** o `specialty_id` do prontuário e o do seu template **têm que coincidir sempre**. Garantido de forma redundante e proposital:
1. **Camada de negócio** — guard explícito no `create-medical-record.use-case` (ver 5.2), com mensagem/log claros.
2. **Camada de banco** — FK composta `(template_id, specialty_id) → medical_record_templates(id, specialty_id)`. Mesmo que um refactor futuro burle a regra de negócio, o Postgres **rejeita** o INSERT de um prontuário cuja especialidade não bate com a do template. Estado inconsistente (ex: `specialty = cardiologia` + `template = ginecologia`) fica fisicamente impossível.

### 2.4 Pré-requisito: `specialty_id` em `appointments`

Hoje `appointments` não guarda especialidade (tem `doctor`, `patient`, `schedule`). O template é resolvido por `clinic + specialty`, então a consulta precisa saber **para qual especialidade** ela é. Adicionamos:

```sql
ALTER TABLE "appointments" ADD COLUMN "specialty_id" uuid NULL REFERENCES "specialties"("id");
CREATE INDEX "IDX_appointments_specialty" ON "appointments" ("specialty_id");
```

- Nullable para não quebrar consultas existentes; nas novas, `CreateAppointmentDto` passa a aceitar `specialtyId` (validado: precisa ser uma especialidade vinculada à clínica via `clinic_specialties` **e** ao médico).
- Sem isso, não há como derivar o template de forma determinística quando o médico tem mais de uma especialidade.

**Especialidade: fonte única no `appointment`, herdada pelo prontuário (decidido).** A escolha da especialidade é feita **uma vez**, no agendamento (necessária para agenda, duração, cobrança e relatórios — inclusive de consultas canceladas/no-show, que nunca geram prontuário). O `medical_record.specialty_id` é **herdado do appointment** no momento da criação do prontuário — o cliente **nunca** envia `specialtyId` ao criar o prontuário. Isso garante:

```
appointment.specialty_id   → fonte da escolha (agendamento)
        │  herda na criação (cópia)
        ▼
medical_record.specialty_id → snapshot imutável; define o template
```

- **Sem override:** o prontuário não permite trocar a especialidade — evita divergência entre o que foi agendado/cobrado e o que foi documentado. Se a consulta foi de outra especialidade, o caminho correto é corrigir o appointment (ou criar outro), não divergir no prontuário.
- **Um prontuário = uma especialidade = um template.** Atendimento de duas especialidades na mesma sessão (raro) → dois prontuários / dois appointments, nunca um prontuário "misto".

**Onde a especialidade é escolhida no agendamento (mudança no fluxo atual).** Hoje o formulário de marcar consulta (`book-appointment-dialog.tsx`) **não** coleta especialidade, e `create-appointment.use-case.ts` cria a consulta sem ela. Como o médico pode ter mais de uma especialidade (`doctor.specialties`, ManyToMany), é preciso escolher **qual** no agendamento:

- **Seletor de especialidade no formulário**, restrito às especialidades **daquele médico** (`doctor.specialties`), e não ao catálogo inteiro da clínica.
- **Auto-seleção quando há apenas uma:** se o médico tem exatamente 1 especialidade, marca direto nela (campo pré-selecionado/oculto, sem exigir ação do usuário).
- **Mais de uma:** o usuário escolhe; campo obrigatório.
- **Nenhuma:** **não é um caminho normal** — o cadastro de médico já garante ≥1 especialidade (`CreateDoctorDto.specialtyIds` tem `@ArrayMinSize(1)`; `UpdateDoctorDto` também impede zerar). A borda de soft-delete deixar um médico sem especialidade fica **fechada pela regra de exclusão de especialidade (ver 5.7)**: não se exclui uma specialty enquanto houver médico/clínica/consulta vinculados. Manter ainda assim um tratamento defensivo no agendamento (mensagem "médico sem especialidade ativa") como rede de segurança.

**Validação no backend (`create-appointment.use-case`):**
- Se `specialtyId` informado → validar que pertence a `doctor.specialties` (e, por consequência, a `clinic_specialties`). Senão `UnprocessableEntityException`.
- Se omitido e o médico tem **exatamente 1** especialidade → usar essa (safety net, espelha a UI).
- Se omitido e o médico tem **mais de 1** → `UnprocessableEntityException` ("especialidade obrigatória").

### 2.5 Tabela `medical_record_canonical_fields` (catálogo da plataforma)

Catálogo de campos **padronizados pela plataforma** (não pela clínica). Quando o ADMIN monta um template, a aplicação **sugere** esses campos — quanto mais a clínica adota o catálogo, maior a **aderência** e a comparabilidade entre prontuários e clínicas. É reference data: gerida pelo **PLATFORM_ADMIN**, não tem `clinic_id`, e é **read-only** para as clínicas.

```sql
CREATE TABLE "medical_record_canonical_fields" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "canonical_key" varchar NOT NULL,            -- chave estável global, ex: 'blood_pressure'
  "label"         varchar NOT NULL,            -- sugestão de label, ex: 'Pressão arterial'
  "type"          varchar NOT NULL,            -- MedicalRecordFieldType
  "options"       jsonb NULL,                  -- [{ value, label }] p/ select/multiselect
  "unit"          varchar NULL,                -- ex: 'bpm', 'kg', 'mmHg'
  "specialty_id"  uuid NULL REFERENCES "specialties"("id"), -- sugestão por especialidade (null = geral)
  "description"   varchar NULL,
  "is_active"     boolean NOT NULL DEFAULT true,
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "updated_at"    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "UQ_canonical_field_key" ON "medical_record_canonical_fields" ("canonical_key");
CREATE INDEX "IDX_canonical_fields_specialty" ON "medical_record_canonical_fields" ("specialty_id");
```

**Como funciona o fluxo de sugestão:**

1. Ao montar/editar o template de uma especialidade, o builder chama `GET /medical-record-canonical-fields?specialtyId=...` e mostra os campos sugeridos (gerais + da especialidade).
2. Ao **adotar** uma sugestão, o campo entra em `fields` com `canonical: true`, `canonicalKey` preenchida, e `type`/`options`/label herdados do catálogo (o label continua editável).
3. A clínica pode ignorar o catálogo e criar campos livres (`canonical: false`) — flexibilidade preservada.

**Seed inicial do catálogo** (v1, exemplos): gerais — `weight` (kg), `height` (cm), `blood_pressure` (mmHg), `heart_rate` (bpm), `temperature` (°C), `chief_complaint`, `allergies`, `smoker` (boolean); por especialidade — cardiologia: `risk_level` (select), etc. O catálogo cresce sem deploy via PLATFORM_ADMIN.

> `medical_record_canonical_fields` é **sugestão/normalização**, não trava: nada impede a clínica de divergir. O ganho é estatístico — quanto mais adesão, melhores os relatórios cross-clínica (D9).

---

## 3. Decisões em aberto (analisar antes de implementar)

| # | Decisão | Recomendação | Trade-off |
|---|---|---|---|
| **D1** | Estrutura dos campos: **JSONB** no template vs **tabela relacional** `template_fields` | **JSONB** | JSONB = flexível, sem migration por mudança de campo, simples. Relacional = consultas/validação no banco mas rígido e verboso. Para "prontuário flexível", JSONB ganha. |
| **D2** | Granularidade do template | **`clinic + specialty`** (sem customização por médico) | Padronização do atendimento e continuidade do histórico. Se um dia houver demanda real de override por médico, será tratada como mudança de escopo própria (nova migration). |
| **D3** | Edição de prontuário já preenchido | **Permitir edição apenas pelo médico dono enquanto a consulta não está `completed`; depois, somente append em `notes` / versionado** | Prontuário tem peso legal. Edição livre é risco. v1: bloquear edição estrutural após `complete`. |
| **D4** | Exclusão | **Soft delete apenas para ADMIN**, nunca hard delete (retenção legal) | Segue padrão do projeto + compliance. |
| **D5** | USER (recepcionista) vê prontuário? | **Não** — dado clínico sensível | Recepcionista vê agenda/consulta, não o conteúdo clínico. |
| **D6** | Anexos (exames, imagens) | **Fora do escopo v1** — modelar `medical_record_attachments` depois (S3) | Evita inflar o primeiro entregável. |
| **D7** | Quando criar o prontuário | **Ao concluir/atender** (`POST /medical-records` referenciando o appointment) ou auto-criado vazio em `complete` | Sugiro criação explícita pelo médico; mantém o fluxo de `complete-appointment` intacto. |
| **D8** | Pré-preencher retorno com o último prontuário | **A decidir** — no retorno, abrir o form já populado com o `data` do registro anterior do paciente naquela especialidade, em vez de tela em branco | **Apenas comportamento de UI — não muda a modelagem.** Cada consulta continua gerando um `medical_record` novo e independente (1:1 com o appointment); o pré-preenchimento é só um valor inicial editável no form. Cuidado clínico: deixar visualmente claro que é um rascunho do atendimento anterior, para o médico não "carimbar" dados desatualizados (ex: PA). Avaliar se entra no v1 ou fica para depois. |
| **D9** | Estratégia de relatórios / consistência de `key` | **Atacar na entrada, em camadas — descartado MongoDB.** v1 entra com **camada 1** (key gerada + imutável), **camada 2** (`value`/`label` em select) e **camada 3** (catálogo canônico da plataforma que sugere campos — ver 2.5). **Camada 4** (promover canônicos a colunas tipadas / view materializada para BI) fica para quando houver demanda real de analytics. | **Por que não MongoDB:** o problema é do *schema flexível*, não do Postgres — Mongo é igualmente schemaless e levaria a mesma inconsistência, além de perder FK, joins relacionais (histórico/por médico/por especialidade) e cascade transacional. JSONB já é document store com índice GIN. **Tensão central:** template livre (flexibilidade) vs. dado padronizado (relatabilidade) — o catálogo canônico opt-in resolve sem matar nenhum dos dois. Limpar na entrada é muito mais barato que reconciliar keys depois de milhares de prontuários. |

> Pontos D1, D3, D7 são os que mais mudam o desenho. Confirme antes da implementação.

---

## 4. Shared (`packages/shared`)

### Enums (`src/enums/`)
- `medical-record-field-type.enum.ts`
  ```ts
  export enum MedicalRecordFieldType {
    TEXT = 'text',
    TEXTAREA = 'textarea',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    DATE = 'date',
    SELECT = 'select',
    MULTISELECT = 'multiselect',
  }
  ```
- Exportar em `src/enums/index.ts`.

### DTOs (`src/dtos/`)
- `medical-record-field-option.dto.ts` — `MedicalRecordFieldOptionDto` (`value`, `label`) — usado em select/multiselect.
- `medical-record-template-field.dto.ts` — `MedicalRecordTemplateFieldDto` (`key`, `label`, `type`, `required`, `order`, `options?: MedicalRecordFieldOptionDto[]`, `placeholder?`, `helpText?`, `canonical`, `canonicalKey?`) com `class-validator` (`@IsString`, `@IsEnum`, `@IsBoolean`, `@ValidateNested({ each: true })` nas options). **Nota:** `key` no DTO de entrada é ignorada/gerada pelo backend (ver camada 1) — o cliente não a define.
- `create-medical-record-template.dto.ts` — `specialtyId`, `name`, `fields: MedicalRecordTemplateFieldDto[]` (`@ValidateNested({ each: true })` + `@Type`).
- `update-medical-record-template.dto.ts` — campos parciais + `isActive`.
- `medical-record-template-response.dto.ts`.
- `paginated-medical-record-templates-response.dto.ts`.
- `canonical-field-response.dto.ts` — `CanonicalFieldResponseDto` (`id`, `canonicalKey`, `label`, `type`, `options`, `unit`, `specialtyId`, `description`). **Read-only** — catálogo da plataforma (ver 2.5).
- `create-canonical-field.dto.ts` / `update-canonical-field.dto.ts` — gestão pelo PLATFORM_ADMIN.
- `create-medical-record.dto.ts` — `appointmentId`, `data: Record<string, unknown>`, `notes?`. **Não inclui `specialtyId`** — a especialidade é herdada do appointment no use-case (ver 2.4).
- `update-medical-record.dto.ts` — `data?`, `notes?`.
- `medical-record-response.dto.ts` (inclui `templateSchemaSnapshot`, `patientName`, `doctorName`, `specialtyName`).
- `paginated-medical-records-response.dto.ts`.
- Atualizar `create-appointment.dto.ts` → adicionar `specialtyId` (`@IsOptional` + `@IsUUID`). É opcional no DTO mas o use-case o exige quando o médico tem >1 especialidade e auto-resolve quando tem exatamente 1 (ver 2.4).
- Exportar tudo em `src/dtos/index.ts`.

> Validação do **conteúdo** (`data` casa com o template, required preenchidos, tipos corretos, `value` de select pertence às `options`) é regra de negócio → vai no **use-case**, não no DTO.

---

## 5. Backend

Dois módulos novos, seguindo a arquitetura (controller → use-case → repository, interface `abstract class`, `BaseUseCase`, soft delete, cache-aside).

### 5.1 Módulo `medical-record-templates`

```
modules/medical-record-templates/
  entities/medical-record-template.entity.ts        # @VersionColumn, fields jsonb, @DeleteDateColumn
  repositories/medical-record-templates.repository.interface.ts
  repositories/medical-record-templates.repository.ts   # innerJoinAndSelect clinic/specialty
  use-cases/
    create-medical-record-template.use-case.ts        # valida specialty ∈ clinic_specialties; UQ clinic+specialty
    update-medical-record-template.use-case.ts        # optimistic lock → ConflictException
    find-all-medical-record-templates.use-case.ts     # scoped por clinicId
    find-medical-record-template-by-id.use-case.ts
    find-template-by-clinic-and-specialty.use-case.ts # usado pelo módulo de records (exportado)
    delete-medical-record-template.use-case.ts        # soft delete (ADMIN)
  controllers/medical-record-templates.controller.ts
  dto/medical-record-templates-list-query.dto.ts      # extends PaginationDto + specialtyId?
  tests/ (unit + integration)
  medical-record-templates.module.ts                  # exporta FindTemplateByClinicAndSpecialtyUseCase
```

**Regras de negócio principais:**
- Criar: a `specialtyId` deve estar vinculada à clínica (`clinic_specialties`); senão `UnprocessableEntityException`. Conflito de template já existente → `ConflictException`.
- **Gerar `key` (camada 1):** o use-case deriva a `key` de cada field a partir do `label` (slug normalizado + sufixo curto), garante unicidade dentro do template e a torna imutável. Em `update`, fields existentes preservam a `key`; só novos fields ganham key gerada.
- Validar `fields`: `options` (formato `{ value, label }`, `value` único) obrigatório quando `type ∈ {select, multiselect}`. Se `canonical: true`, a `canonicalKey` deve existir em `medical_record_canonical_fields` e o `type` bater com o catálogo.
- Tudo escopado por `clinicId` do `currentUser` (own-clinic), exceto PLATFORM_ADMIN (não acessa templates de clínica — ver permissions.md).

### 5.1.1 Módulo `medical-record-canonical-fields` (catálogo da plataforma)

```
modules/medical-record-canonical-fields/
  entities/medical-record-canonical-field.entity.ts   # options jsonb, sem clinic_id, sem soft-delete (is_active)
  repositories/...interface.ts | ...repository.ts      # leftJoin specialty (opcional)
  use-cases/
    find-canonical-fields.use-case.ts                  # filtro por specialtyId (gerais + da especialidade)
    create-canonical-field.use-case.ts                 # PLATFORM_ADMIN
    update-canonical-field.use-case.ts                 # PLATFORM_ADMIN
  controllers/medical-record-canonical-fields.controller.ts
  medical-record-canonical-fields.module.ts
```

- `GET /medical-record-canonical-fields?specialtyId=...` — **read** para ADMIN/DOCTOR (alimenta o builder de template). Escrita só PLATFORM_ADMIN.
- Reference data: sem `clinic_id`, sem soft delete (usa `is_active`). Cache de leitura agressivo (muda pouco).

### 5.2 Módulo `medical-records`

```
modules/medical-records/
  entities/medical-record.entity.ts
  repositories/medical-records.repository.interface.ts
  repositories/medical-records.repository.ts          # innerJoin appointment/patient/doctor/specialty
  use-cases/
    create-medical-record.use-case.ts                 # resolve template, snapshot, valida data×schema
    update-medical-record.use-case.ts                 # respeita D3; optimistic lock
    find-medical-records-by-patient.use-case.ts        # histórico
    find-medical-record-by-id.use-case.ts
    find-medical-record-by-appointment.use-case.ts
    delete-medical-record.use-case.ts                  # soft delete, ADMIN
  controllers/medical-records.controller.ts
  dto/medical-records-list-query.dto.ts                # patientId?, doctorId?, paginação
  tests/ (unit + integration)
  medical-records.module.ts
```

**`create-medical-record.use-case` (núcleo):**
1. Carrega o `appointment` (próprio do médico se DOCTOR), valida que pertence à clínica. Exige `appointment.specialtyId` definido → senão `UnprocessableEntityException`.
2. **Herda a especialidade do appointment** (`specialtyId = appointment.specialtyId`) — o DTO **não** aceita `specialtyId`. Resolve o template via `FindTemplateByClinicAndSpecialtyUseCase(clinicId, appointment.specialtyId)` → 404/422 se não houver.
3. **Invariante forte (guard) — `template.specialtyId === specialtyId` SEMPRE.** Em teoria já é verdade (o template foi resolvido *por* essa especialidade), mas a asserção explícita protege contra regressões futuras: se um refactor algum dia passar um template de outra especialidade (ex: `specialty = cardiologia`, `template = ginecologia`), o use-case lança erro em vez de gravar um prontuário inconsistente. Falha aqui é bug de programação, não erro do usuário → lançar com log de contexto (não deveria acontecer em fluxo normal).
   ```ts
   if (template.specialtyId !== specialtyId) {
     this.logger.error('Template/specialty mismatch', { context, templateId: template.id, templateSpecialtyId: template.specialtyId, specialtyId })
     throw new UnprocessableEntityException('Template does not belong to the appointment specialty')
   }
   ```
4. Copia `template.fields` para `template_schema_snapshot` e grava `specialtyId` + `templateId` no prontuário.
5. **Valida `data`** contra o snapshot: required preenchidos, tipos coerentes, sem chaves desconhecidas, options válidas.
6. Garante 1:1 com appointment (índice único + checagem → `ConflictException`).
7. Persiste. Sem transação (registro único) — usa transação só se for orquestrar com `complete-appointment` (D7).

**Permissões (estende `ai/context/permissions.md`):**

| Ação | PLATFORM_ADMIN | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|:---:|
| Gerir catálogo canônico | ✓ | ✗ | ✗ | ✗ | ✗ |
| Ver catálogo canônico | ✓ | ✓ | ✓ | ✗ | ✗ |
| Configurar template | ✗ | ✓ | ✗ | ✗ | ✗ |
| Ver template | ✗ | ✓ | ✓ | ✗ | ✗ |
| Criar prontuário | ✗ | ✓ | só os próprios | ✗ | ✗ |
| Ver prontuário | ✗ | ✓ todos | só os próprios | ✗ | ✗ |
| Editar prontuário | ✗ | ✓ | só os próprios (pré-`complete`) | ✗ | ✗ |
| Excluir | ✗ | ✓ | ✗ | ✗ | ✗ |

Aplicado via `@Roles(...)` no controller + checagem own-resource no use-case (`currentUser`). O catálogo canônico é o único recurso desta feature acessível ao PLATFORM_ADMIN (reference data global); templates e prontuários são sempre clinic-scoped.

### 5.3 Cache (Redis, cache-aside)
- `medical_record_template:${id}`, `medical_record_templates:list:${clinicId}:${page}:${limit}` (TTL 300/60s).
- `medical_record:${id}`, `medical_records:patient:${patientId}` (TTL 60s).
- `canonical_fields:list:${specialtyId}` (TTL alto, ex: 600s — muda pouco; invalidar em create/update do PLATFORM_ADMIN).
- Invalidar no use-case após mutation (try/catch isolado).
- **Nunca cachear `data`/conteúdo clínico sensível além do necessário** — avaliar não cachear o `data` (ver "Dados sensíveis" no backend.md). Recomendo cachear só listagens de template/catálogo; prontuário individual sem cache.

### 5.4 Migrations (`src/database/migrations/`)
Ordem (timestamps após o último `1750500000000`):
1. `1750600000000-create-medical-record-canonical-fields-table.ts`
2. `1750700000000-create-medical-record-templates-table.ts`
3. `1750800000000-add-specialty-id-to-appointments.ts`
4. `1750900000000-create-medical-records-table.ts`

Cada uma com o padrão `SET search_path TO "${schema}", public` já usado no projeto, `up`/`down` simétricos, índices criados/dropados.

### 5.5 Seeds
- **Catálogo canônico (todos os ambientes, inclusive seed base):** popular `medical_record_canonical_fields` com os campos gerais + por especialidade (ver 2.5). É reference data — diferente de seed de dev, deve existir também onde o catálogo precisa estar disponível. Definir via migration de seed ou seed dedicado idempotente.
- Dev (`seeds/dev/`): 1 template por especialidade da clínica seed (usando campos canônicos + 1 livre) + 1–2 prontuários de exemplo.
- Test (`seeds/test/`): catálogo mínimo + dados mínimos para integração.

### 5.6 Registro de módulos
- Importar `MedicalRecordCanonicalFieldsModule`, `MedicalRecordTemplatesModule` e `MedicalRecordsModule` em `app.module.ts`.
- `MedicalRecordTemplatesModule` importa `MedicalRecordCanonicalFieldsModule` (valida `canonicalKey` ao salvar fields) e `ClinicSpecialtiesModule`.
- `MedicalRecordsModule` importa `MedicalRecordTemplatesModule` (usa o use-case exportado) e `AppointmentsModule` conforme necessidade. Avaliar `forwardRef` só se houver ciclo.

### 5.7 Mudança no módulo de especialidades — regra de exclusão

Hoje `delete-specialty.use-case` só bloqueia a exclusão quando há **médicos vinculados** (`countLinkedDoctors > 0` → `ConflictException`). Ampliar para também bloquear quando a especialidade está em uso, evitando órfãos e preservando integridade histórica:

- **Clínicas vinculadas** (`clinic_specialties`) → bloquear.
- **Consultas atreladas** (`appointments.specialty_id`) → bloquear (qualquer consulta referenciando a especialidade, inclusive canceladas/concluídas — é dado histórico).

**No repositório `ISpecialtiesRepository`** (somar aos métodos existentes):
- `abstract countLinkedClinics(id: string): Promise<number>` — `COUNT` em `clinic_specialties` por `specialty_id`.
- `abstract countLinkedAppointments(id: string): Promise<number>` — `COUNT` em `appointments` por `specialty_id`.

**No `delete-specialty.use-case`** (após a checagem de médicos já existente):

```ts
const linkedClinics = await this.specialtiesRepository.countLinkedClinics(id)
if (linkedClinics > 0) {
  throw new ConflictException(
    `Specialty is linked to ${linkedClinics} clinic(s) and cannot be deleted`,
  )
}

const linkedAppointments = await this.specialtiesRepository.countLinkedAppointments(id)
if (linkedAppointments > 0) {
  throw new ConflictException(
    `Specialty has ${linkedAppointments} appointment(s) and cannot be deleted`,
  )
}
```

- Mensagens distintas por motivo (médico / clínica / consulta) para o usuário entender o que desvincular antes.
- **Dependência:** a checagem de consultas só é possível **após** a migration `add-specialty-id-to-appointments` (passo 3). A checagem de clínicas pode ser implementada de imediato (`clinic_specialties` já existe).
- Cobrir os três bloqueios + caminho de sucesso em testes unitários e de integração.

> Resolve também a borda do soft-delete de especialidade discutida em 2.4: se a especialidade não pode ser excluída enquanto houver clínica/médico/consulta, o agendamento nunca encontra um médico que ficou sem especialidade ativa por exclusão.

---

## 6. Frontend

```
components/features/medical-record-templates/
  types/  services/  mappers/  use-cases/  hooks/  components/
components/features/medical-records/
  types/  services/  mappers/  use-cases/  hooks/  components/
```

### Templates (área ADMIN)
- `medical-record-templates.service.ts` e `canonical-fields.service.ts` (CRUD/read via `apiClient`).
- Mappers DTO→Model. Use-cases (funções). Hooks React Query (`useTemplates`, `useCreateTemplate`, `useCanonicalFields`, ...).
- Componentes: `TemplateList`, `TemplateForm` (**builder de campos dinâmico** com `react-hook-form` + `useFieldArray` para adicionar/remover/reordenar fields), `FieldEditor`, **`CanonicalFieldPicker`**.
- **Fluxo de sugestão (aderência):** ao abrir o builder para uma especialidade, o `CanonicalFieldPicker` lista os campos canônicos sugeridos (`useCanonicalFields(specialtyId)`); ao adotar um, ele entra no `useFieldArray` já com `type`/`options`/label e `canonical: true`. Destacar visualmente campos canônicos vs. livres. Incentivar adoção (ex: "campos sugeridos melhoram relatórios").
- Página: `app/[slug]/medical-record-templates/` (rota protegida ADMIN).

### Prontuários (área DOCTOR/ADMIN)
- `medical-records.service.ts`.
- Componentes: `MedicalRecordForm` — **renderiza campos dinamicamente** a partir do `templateSchemaSnapshot` (switch por `MedicalRecordFieldType` → input correto); `MedicalRecordView` (read-only); `PatientMedicalHistory` (lista de prontuários do paciente).
- Integração: na tela da consulta (`appointments`), botão "Preencher prontuário" → form do template resolvido pela especialidade da consulta.
- Estados loading/error/success sempre tratados; erros 422 → `setError` por campo.

### Agendamento (mudança no fluxo existente)
- `book-appointment-dialog.tsx`: adicionar **seletor de especialidade** populado com as especialidades do médico selecionado (`doctor.specialties` — obter via hook do médico, ex: `useDoctor(doctorId)`).
  - 1 especialidade → pré-selecionar e ocultar o campo (sem fricção).
  - >1 → `<select>` obrigatório.
  - 0 → bloquear agendamento com mensagem ("médico sem especialidade cadastrada").
- Atualizar `IBookAppointmentInput` (+`specialtyId?`), o schema zod, o mapper `to-book-appointment-dto` e o hook `useBookAppointment`.
- Tratar `422` ("especialidade obrigatória") mapeando para o campo.

### Sidebar / permissões UI
- Adicionar item "Prontuários" (DOCTOR/ADMIN) e "Modelos de prontuário" (ADMIN) conforme tabela de permissões. Backend continua sendo a fonte de verdade.

---

## 7. Testes (Definition of Done)

**Backend**
- Unitários 100% cobertura: cada use-case (sucesso + exceções: not found, conflict, validação de `data`×schema, own-resource forbidden, optimistic lock).
- Integração: endpoints de template e de record (201/200/204, 400 whitelist, 403 por role, 404, 409 1:1, 422 specialty fora da clínica). Schema `test` isolado, faker.

**Frontend**
- Unitários 100%: mappers, use-cases, validação do builder de campos.
- Integração (RTL): loading/error/success de `TemplateList`, `TemplateForm` (add/remove field), `MedicalRecordForm` (render dinâmico + submit + 422 mapping).
- E2E (Cypress, `data-testid`): fluxo crítico ADMIN cria template → DOCTOR preenche prontuário na consulta → visualiza histórico.

---

## 8. Ordem de implementação sugerida

1. **Shared**: enums + DTOs (incl. canonical field) + export no `index.ts`.
2. **Migration 1** (catálogo canônico) + entidade + módulo `medical-record-canonical-fields` + **seed do catálogo** + testes.
3. **Migration 2** (templates) + entidade + módulo `medical-record-templates` (geração de key, validação `canonicalKey`) + testes.
4. **Migration 3** (`specialty_id` em appointments) + ajuste em `CreateAppointmentDto`/`create-appointment.use-case` (validar specialty ∈ doctor.specialties, auto-resolver quando única) + **seletor de especialidade no `book-appointment-dialog`** (auto-seleção quando única) + testes.
5. **Migration 4** (records) + entidade + módulo `medical-records` (validação `data`×snapshot, `value` ∈ options) + testes.
6. **Seeds** dev/test (templates + prontuários de exemplo).
7. **Frontend** templates (builder + `CanonicalFieldPicker`) → prontuários (render dinâmico) → integração na consulta → sidebar.
8. **E2E** + atualizar `ai/context/permissions.md` e `CHANGELOG.md`.

Branch sugerida: `feature/medical-records`. PR para `develop`.

---

## 9. Pontos que exigem coordenação (breaking / contrato)

- `CreateAppointmentDto` ganha `specialtyId` → frontend e backend precisam subir juntos (regra do `shared`).
- `permissions.md` precisa ser atualizado com a nova matriz (templates + records).
- Definir política de retenção/imutabilidade do prontuário (D3/D4) com o time clínico/jurídico antes do GA.
