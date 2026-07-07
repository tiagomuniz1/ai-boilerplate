# Task — Evoluir Módulo de Médicos: RQE por especialidade + múltiplos CRMs (Frontend)

## Descrição

Adaptar o módulo de doctors ao novo contrato:

- **A) Múltiplos CRMs** — o campo único de CRM vira uma **lista dinâmica**. Cada CRM tem `number` (só dígitos), `state` (UF) e um marcador **principal**. Mínimo 1, exatamente um principal.
- **B) RQE por especialidade** — ao marcar uma especialidade, aparece um campo de **RQE** opcional (só números) para aquela especialidade.

Exibição em detalhes e listagem passam a refletir múltiplos CRMs (principal destacado) e o RQE por especialidade.

---

## Contexto

- Backend passa a retornar `crms: { id, number, state, isPrimary }[]` (sem `crmNumber`) e `specialties: { id, name, rqe }[]`.
- Request muda de `crmNumber: string` para `crms: { number, state, isPrimary }[]`; e de `specialtyIds: string[]` para `specialties: { specialtyId, rqe? }[]` (`@app/shared`).
- O formulário (`components/doctors/components/doctor-form.tsx`) tem **dois sub-componentes** — `DoctorFormCreate` e `DoctorFormEdit` — cada um com `useForm`/`toggleSpecialty`/`handleFormSubmit`, usando `SpecialtyCheckboxGroup`. Hoje o CRM é um único `Input` com regex `NNNNN/UF` (`crmRegex`). **Toda mudança vale para os dois.**
- Especialidades vêm de `clinicSpecialtiesService.getAll(clinicId, { limit: 100 })`.
- Testes com 100% de cobertura.

---

## Contratos

### Input (formulário)
```diff
- crmNumber: string
+ crms: Array<{ number: string; state: string; isPrimary: boolean }>
- specialtyIds: string[]
+ specialties: Array<{ specialtyId: string; rqe?: string }>
```
(no update, `crms?` e `specialties?`)

### Output (modelo)
```ts
export interface IDoctorCrmModel { id: string; number: string; state: string; isPrimary: boolean }
export interface IDoctorSpecialtyModel { id: string; name: string; rqe: string | null }
// IDoctorModel: crms: IDoctorCrmModel[]  (remove crmNumber); specialties: IDoctorSpecialtyModel[]
```

---

## Alterações

### 1. Tipos (`components/doctors/types/`)
- `doctor-model.types.ts`: `IDoctorCrmModel` (novo), `IDoctorModel.crms` (remove `crmNumber`); `IDoctorSpecialtyModel.rqe`.
- `doctor-input.types.ts`: `crms` e `specialties` no novo shape em `ICreateDoctorInput`/`IUpdateDoctorInput`.

### 2. Mappers (`components/doctors/mappers/`)
- `to-doctor-model.mapper.ts`: `crms: dto.crms.map((c) => ({ id: c.id, number: c.number, state: c.state, isPrimary: c.isPrimary }))`; `specialties: dto.specialties.map((s) => ({ id: s.id, name: s.name, rqe: s.rqe }))`.
- `to-create-doctor-dto.mapper.ts` / `to-update-doctor-dto.mapper.ts`: repassar `crms` e `specialties` (novo shape).

### 3. Formulário (`doctor-form.tsx`) — aplicar em `DoctorFormCreate` **e** `DoctorFormEdit`

#### A) CRMs — lista dinâmica (`useFieldArray`)
- Substituir o `Input` único de CRM por uma **lista** via `useFieldArray({ name: 'crms' })`. Cada linha:
  - **Número** (`Input`): filtro só-dígitos no `onChange` (`value.replace(/\D/g, '')`), `inputMode="numeric"`, `maxLength={6}`, `data-testid={`doctor-form-crm-number-${index}`}`.
  - **UF** (`select` com as 27 UFs, ou `Input` `maxLength={2}` com uppercase e filtro `[A-Za-z]`→upper): `data-testid={`doctor-form-crm-state-${index}`}`.
  - **Principal** (`radio`, name compartilhado): marca `isPrimary`; ao marcar um, desmarca os demais (atualizar todos os itens do array). `data-testid={`doctor-form-crm-primary-${index}`}`.
  - **Remover** linha (desabilitado quando só há 1). Botão **Adicionar CRM** (`doctor-form-crm-add`).
- Zod:
  ```ts
  const crmsField = z
    .array(z.object({
      number: z.string().regex(/^\d{1,6}$/, 'Número inválido'),
      state: z.string().regex(/^[A-Z]{2}$/, 'UF inválida'),
      isPrimary: z.boolean(),
    }))
    .min(1, 'Informe ao menos um CRM')
    .refine((arr) => arr.filter((c) => c.isPrimary).length === 1, 'Marque exatamente um CRM como principal')
  ```
- Ao **adicionar** a 1ª linha, marcar `isPrimary: true` por padrão. Ao remover a linha principal, promover a primeira restante a principal.
- Remover o `crmRegex`/`crmField` antigos e o `Input` único de CRM.

#### B) RQE por especialidade
- Estado do campo de especialidades passa de `string[]` para `Array<{ specialtyId: string; rqe: string }>`.
- Zod:
  ```ts
  const specialtiesField = z
    .array(z.object({
      specialtyId: z.string().uuid(),
      rqe: z.string().regex(/^\d{1,10}$/, 'RQE deve conter apenas dígitos').optional().or(z.literal('')),
    }))
    .min(1, 'Selecione ao menos uma especialidade')
  ```
- `toggleSpecialty(id)`: adiciona `{ specialtyId: id, rqe: '' }` / remove o par.
- `onRqeChange(specialtyId, value)`: **filtra não-dígitos** (`value.replace(/\D/g, '')`, máx. 10) e atualiza o `rqe` do par (imutável). Impede digitar/colar qualquer coisa não numérica.
- `SpecialtyCheckboxGroup`: receber os pares (`value`, `onToggle`, `onRqeChange`); quando marcada, renderizar `Input` de RQE (`inputMode="numeric"`, `maxLength={10}`, placeholder `"RQE (opcional)"`, `data-testid={`doctor-form-rqe-${specialty.id}`}`).

#### handleFormSubmit / defaults
- Enviar `crms` e `specialties` (mapeando `rqe: ''` → `undefined`).
- **Edit** (`reset`/`defaultValues`): `crms: defaultValues.crms.map((c) => ({ number: c.number, state: c.state, isPrimary: c.isPrimary }))`; `specialties: defaultValues.specialties.map((s) => ({ specialtyId: s.id, rqe: s.rqe ?? '' }))`.

### 4. Exibição
- `doctor-details.tsx`: substituir o `DetailRow` de CRM (`value={doctor.crmNumber}`) por uma lista de CRMs (`${c.number}/${c.state}`) com o **principal** destacado (badge/marcador). Especialidades: badge exibe RQE quando presente (`{s.name}{s.rqe ? ` — RQE ${s.rqe}` : ''}`). `data-testid` para os CRMs (`doctor-details-crm-${id}`).
- `doctor-list.tsx`: onde exibe `doctor.crmNumber`, mostrar o **CRM principal** (`${principal.number}/${principal.state}`), com `+N` se houver mais. Especialidades: manter badges por nome (compatibilidade de tipo com `rqe`).
- `appointments/components/book-appointment-dialog.tsx`: verificar uso de `.specialties`/`crmNumber` do doctor; ajustar para o novo shape se necessário.

---

## Regras de negócio

- **CRM:** mínimo 1; **exatamente um** principal. Número só dígitos (bloqueio na digitação/colagem, máx. 6); UF 2 letras maiúsculas.
- **RQE:** opcional por especialidade; **só números** (input bloqueia não-dígitos, inclusive ao colar; máx. 10); trafega como `string`.
- `crms` e `specialties` no update sempre enviam a seleção atual (replace).
- Dados da API via React Query; sem Zustand. Sem mapear DTO em componente/hook. Sem `useState` para campos (usar react-hook-form).

---

## Estrutura de arquivos modificados

```
components/features/doctors/
  types/
    doctor-model.types.ts            ← IDoctorCrmModel, crms[]; IDoctorSpecialtyModel.rqe
    doctor-input.types.ts            ← crms[] e specialties[] (novo shape)
  mappers/
    to-doctor-model.mapper.ts (+spec)     ← crms + rqe
    to-create-doctor-dto.mapper.ts (+spec) ← crms + specialties
    to-update-doctor-dto.mapper.ts (+spec) ← idem
  components/
    doctor-form.tsx (+integration.spec)    ← lista de CRMs (useFieldArray) + RQE por especialidade
    doctor-details.tsx (+integration.spec) ← lista de CRMs (principal) + RQE
    doctor-list.tsx (+integration.spec)    ← CRM principal + compatibilidade rqe
  use-cases/ e hooks/ (specs)              ← mocks com crms + specialties(rqe)
```

---

## Cenários de teste

**Mappers:** `crms`/`specialties` mapeados nos dois sentidos, incluindo `rqe` nulo e `isPrimary`.

**DoctorForm (create e edit):**
- Adicionar/remover linhas de CRM; não permite remover a última.
- Número do CRM descarta não-dígitos; UF vira maiúscula/2 letras.
- Marcar um CRM principal desmarca os outros; submeter sem principal ou com dois → erro.
- Marcar especialidade exibe input de RQE (`doctor-form-rqe-{id}`); digitar `12a3` mantém `123`; colar texto misto mantém só dígitos; truncar em 10.
- Submit envia `crms` (com um `isPrimary`) e `specialties` (com/sem `rqe`).
- Edit: CRMs e RQEs pré-preenchidos.

**DoctorDetails:** lista de CRMs com principal destacado; RQE exibido só onde presente.

**DoctorList:** exibe CRM principal (`NNNNN/UF`); mocks atualizados com `crms`/`rqe`.

---

## Restrições
- NÃO importar `axios` fora de `lib/api-client.ts`.
- NÃO armazenar dados de doctors/specialties em Zustand.
- NÃO mapear DTOs em componentes/hooks; usar mappers.
- NÃO usar `useState` para campos de formulário (usar react-hook-form / `useFieldArray`).
- NÃO exibir `detail` técnico de erro ao usuário.
- NÃO importar de subpastas de `@app/shared`.

---

## Definition of Done
- [ ] `IDoctorCrmModel` + `IDoctorModel.crms` (sem `crmNumber`); `IDoctorSpecialtyModel.rqe`
- [ ] Inputs de `crms`/`specialties` no novo shape
- [ ] Mappers atualizados e testados
- [ ] Formulário: lista dinâmica de CRMs (`useFieldArray`) com principal único; número só dígitos; UF 2 letras
- [ ] Formulário: input de RQE por especialidade marcada, bloqueando não-dígitos (máx. 10)
- [ ] Validação zod: ≥1 CRM e exatamente um principal; ≥1 especialidade; RQE só dígitos
- [ ] Edit pré-populado (CRMs + RQEs)
- [ ] `DoctorDetails` lista CRMs (principal destacado) e RQE; `DoctorList` mostra CRM principal
- [ ] Testes unitários 100% + integração (loading/error/success + CRM múltiplo/principal + RQE)
- [ ] Sem lint/`console.log`/código comentado; sem erros de TypeScript; sem axios fora do API Client; sem API em Zustand
```
