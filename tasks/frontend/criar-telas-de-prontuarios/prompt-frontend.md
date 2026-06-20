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
# Task — Telas de Prontuário / Medical Records (Frontend)

## Descrição
Implementar as telas de prontuário: preenchimento do prontuário de uma consulta (formulário **renderizado dinamicamente** a partir do `templateSchemaSnapshot`), visualização em modo leitura e **histórico do paciente** (linha do tempo de prontuários). Integrar o acesso ao prontuário na tela de consultas. Acesso a DOCTOR (apenas os próprios) e ADMIN (todos); USER/PATIENT não acessam.

---

## Contexto
- Backend: `/medical-records` (criar, ver, listar por paciente, by-appointment, editar, excluir).
- O prontuário é 1:1 com a consulta; herda a especialidade da consulta; o template é resolvido no backend.
- O formulário é **dinâmico**: os campos vêm do `templateSchemaSnapshot` do prontuário (ou, para um prontuário novo, do template resolvido — ver fluxo). Cada `type` (`text/textarea/number/boolean/date/select/multiselect`) renderiza o input adequado.
- `data` é `{ [field.key]: valor }`.
- Edição bloqueada após a consulta estar `completed` (backend retorna `422`).
- DTOs: `MedicalRecordResponseDto`, `CreateMedicalRecordDto`, `UpdateMedicalRecordDto`, `PaginatedMedicalRecordsResponseDto`, `MedicalRecordFieldType`.

---

## Contratos (types locais)
```ts
export interface IRecordFieldModel {
  key: string; label: string; type: MedicalRecordFieldType; required: boolean; order: number
  options: { value: string; label: string }[] | null; placeholder: string | null; helpText: string | null
}
export interface IMedicalRecordModel {
  id: string; appointmentId: string
  patientId: string; patientName: string
  doctorId: string; doctorName: string
  specialtyId: string; specialtyName: string
  schema: IRecordFieldModel[]            // do templateSchemaSnapshot
  data: Record<string, unknown>
  notes: string | null
  createdAt: Date; updatedAt: Date
}
export interface ICreateMedicalRecordInput { appointmentId: string; data: Record<string, unknown>; notes?: string }
export interface IUpdateMedicalRecordInput { data?: Record<string, unknown>; notes?: string }
```

---

## Assinaturas esperadas
```ts
// Hooks
useMedicalRecord(id): UseQueryResult<IMedicalRecordModel>
useMedicalRecordByAppointment(appointmentId): UseQueryResult<IMedicalRecordModel | null>
usePatientMedicalHistory(patientId, params?): UseQueryResult<IPaginatedMedicalRecordsModel>
useCreateMedicalRecord(): UseMutationResult<IMedicalRecordModel, IApiError, ICreateMedicalRecordInput>
useUpdateMedicalRecord(): UseMutationResult<IMedicalRecordModel, IApiError, { id: string; data: IUpdateMedicalRecordInput }>

// Use-cases + service (.getById, .getByAppointment, .listByPatient, .create, .update)
```

---

## Fluxo principal por tela

### Preencher prontuário (a partir da consulta)
1. Na tela de consultas (`appointment-details-dialog.tsx` ou similar), para consulta sem prontuário, botão "Preencher prontuário" (DOCTOR dono / ADMIN).
2. Resolver o schema: para um prontuário novo, obter os campos a renderizar do template da especialidade da consulta — preferir um endpoint/objeto já disponível; se o backend só fornece o snapshot após criação, renderizar o form a partir do template resolvido (via template by clinic+specialty) ou de um preview retornado. **Decisão de implementação:** usar o template da especialidade para montar o form em branco; no submit, o backend cria o prontuário e congela o snapshot.
3. `MedicalRecordForm` renderiza um input por campo conforme `type`; required marcado; helpText/placeholder exibidos.
4. Submit → `useCreateMedicalRecord({ appointmentId, data, notes })`.
5. Sucesso → invalida histórico do paciente + by-appointment; toast; fecha/redireciona.
6. Erros: `409` (já existe prontuário) → alerta; `422` (validação data×schema, sem template) → mapear aos campos / alerta amigável.

### Visualizar prontuário (read-only)
- `MedicalRecordView` renderiza os campos do `schema` com seus valores em `data`, na ordem; campos sem valor exibidos como vazios; `notes` ao final.

### Editar prontuário
- Apenas enquanto a consulta não está `completed`. `MedicalRecordForm` em modo edição, populado a partir de `schema` + `data`. Após `completed`, exibir somente leitura (e o backend retorna `422` se tentado).

### Histórico do paciente
- `PatientMedicalHistory`: linha do tempo (mais recente no topo) com data, especialidade, médico; clique abre a visualização. Paginado. Acessível a ADMIN (qualquer paciente) e DOCTOR (apenas registros dos quais é dono).

---

## Renderização dinâmica por tipo
| type | input |
|---|---|
| text | input texto |
| textarea | textarea |
| number | input numérico (coage para número no `data`) |
| boolean | checkbox/switch |
| date | input date (string ISO no `data`) |
| select | `<select>` simples (value das options) |
| multiselect | múltipla seleção (array de values) |

Validação no front espelha o schema (required, value ∈ options), mas o backend é a fonte de verdade (`422`).

---

## Navegação / Integração
- Não necessariamente um item de sidebar próprio para "Prontuários"; o acesso primário é pela consulta e pelo paciente. Avaliar item "Prontuários" só se fizer sentido (DOCTOR/ADMIN). O histórico pode viver dentro da tela do paciente (ADMIN) e/ou da consulta.
- USER e PATIENT nunca veem conteúdo de prontuário.

---

## Estados e feedbacks
- Loading: skeleton do form e do histórico.
- Erro: `ErrorMessage` amigável.
- `409`: "Esta consulta já possui prontuário".
- `422` edição após conclusão: "Prontuário não pode ser editado após a conclusão da consulta".
- Sucesso: toast + invalidação.
- Submit desabilitado enquanto `isPending`.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Form dinâmico | react-hook-form com campos gerados a partir do schema; valores em `data` por `field.key` |
| Coerção de tipos | mapper/helper converte string→number/boolean/date conforme `type` |
| Fonte do schema (novo) | template da especialidade da consulta; snapshot definido pelo backend na criação |
| Role | own-resource respeitado; UI esconde o que o backend bloquearia |

---

## Restrições
- NÃO importar axios fora do API Client.
- NÃO armazenar prontuários em Zustand.
- NÃO mapear DTO em componentes/hooks — usar mappers.
- NÃO usar `useState` para campos do form dinâmico — usar react-hook-form.
- NÃO exibir conteúdo de prontuário para USER/PATIENT.
- NÃO validar exclusivamente no front — backend é a fonte de verdade.

---

## Estrutura esperada
```
components/features/medical-records/
  types/medical-record-model.types.ts, medical-record-input.types.ts
  services/medical-records.service.ts (+ .spec)
  mappers/ to-medical-record-model, to-create-medical-record-dto, to-update-medical-record-dto,
           coerce-field-value (+ .spec)
  use-cases/ get-medical-record, get-medical-record-by-appointment,
             list-patient-medical-history, create-medical-record, update-medical-record (+ .spec)
  hooks/ use-medical-record, use-medical-record-by-appointment, use-patient-medical-history,
         use-create-medical-record, use-update-medical-record (+ .spec)
  components/
    medical-record-form.tsx (+ integration.spec)        # render dinâmico
    dynamic-field.tsx (+ integration.spec)               # 1 campo por type
    medical-record-view.tsx (+ integration.spec)
    patient-medical-history.tsx (+ integration.spec)
    medical-record-form-skeleton.tsx

cypress/e2e/medical-records/
  medical-record-fill.cy.ts, medical-record-view.cy.ts, patient-history.cy.ts
cypress/fixtures/medical-records.json
```

---

## Cenários de teste adicionais
### Unitários
- `to-medical-record-model` converte datas; mapeia `templateSchemaSnapshot`→`schema`.
- `coerce-field-value` converte por type (number/boolean/date/multiselect).
- use-cases chamam service + mapper; hooks invalidam histórico/by-appointment.
### Integração
- `MedicalRecordForm` renderiza um input por tipo do schema.
- required ausente → erro de validação; value de select fora de options → erro.
- erro `409` → alerta "já possui prontuário".
- consulta `completed` → form em modo leitura.
- `PatientMedicalHistory`: loading→skeleton; vazio→mensagem; lista ordenada DESC.
- DOCTOR não vê registros de outro médico; ADMIN vê todos.
### E2E
- DOCTOR preenche prontuário de uma consulta sua → aparece no histórico do paciente.
- Visualização read-only mostra os valores na ordem do schema.
- Tentar editar prontuário de consulta concluída → bloqueado/`422`.

---

## Definition of Done
- [ ] Form dinâmico renderizando todos os `type`s a partir do schema
- [ ] Criar, visualizar, editar (pré-`completed`) e histórico do paciente
- [ ] Integração na tela de consulta (botão "Preencher prontuário")
- [ ] Coerção de tipos no `data` por `field.key`
- [ ] Own-resource respeitado na UI (DOCTOR só os próprios); USER/PATIENT sem acesso
- [ ] Estados loading/error/success + skeleton
- [ ] Tratamento de `409` e `422` (incl. edição após conclusão)
- [ ] Mappers DTO→Model; services só via apiClient
- [ ] Testes unitários 100% (mappers/use-cases/hooks)
- [ ] Testes de integração por componente
- [ ] E2E dos fluxos críticos com `data-testid`
- [ ] Sem axios fora do API Client; nada de prontuário em Zustand
- [ ] Naming convention e estrutura seguidas
