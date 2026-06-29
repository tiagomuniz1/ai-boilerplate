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
// caminho/do/arquivo.tsx

---
## TASK
# Task — Receita na Tela da Consulta (Frontend)

## Descrição
Implementar a **emissão e o download de receitas** na tela de detalhe da consulta (`/[slug]/appointments/[id]`). O médico **busca medicamentos**, **adiciona itens** com posologia, escreve uma **observação geral** e **emite** a receita. As receitas emitidas ficam listadas, cada uma com **Baixar PDF** e **Excluir**. Espelha a feature `medical-records` e a `MedicalRecordSection`.

---

## Contexto
- Backend (tasks #1 e #2):
  - `POST /prescriptions` (DOCTOR) — `{ appointmentId, items: [{ medicationId, instructions }], notes? }`
  - `GET /prescriptions?appointmentId=` (ADMIN, DOCTOR) → `PrescriptionResponseDto[]`
  - `GET /prescriptions/:id` (ADMIN, DOCTOR)
  - `GET /prescriptions/:id/pdf` (ADMIN, DOCTOR) → **binário** `application/pdf`
  - `DELETE /prescriptions/:id` (ADMIN, DOCTOR) → `204`
- Roteamento por clínica `app/[slug]/(authenticated)/...` (`useSlug`).
- Integração: a página `app/[slug]/(authenticated)/appointments/[id]/page.tsx` já renderiza `MedicalRecordSection` dentro de `canSeeMedicalRecord`/`canManage`. Adicionar `<section>` "Receitas" com `PrescriptionSection` no mesmo bloco visível para `canManage` (DOCTOR própria consulta / ADMIN).
- Reuso: busca de medicamentos via `useMedications` existente (`components/features/medications/hooks/use-medications.hook.ts`), com `search` debounced.
- DTOs do `@app/shared`: `PrescriptionResponseDto`, `CreatePrescriptionDto`, `UserRole`.

---

## Contratos (types locais)
```ts
export interface IPrescriptionItemModel {
  medicationId: string | null
  name: string
  activeIngredient: string | null
  instructions: string
}
export interface IPrescriptionModel {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  issuedAt: Date
  items: IPrescriptionItemModel[]
  notes: string | null
  createdAt: Date
}
export interface ICreatePrescriptionItemInput { medicationId: string; instructions: string }
export interface ICreatePrescriptionInput {
  appointmentId: string
  items: ICreatePrescriptionItemInput[]
  notes?: string
}
```

---

## Assinaturas esperadas
```ts
// Hooks
usePrescriptions(appointmentId): UseQueryResult<IPrescriptionModel[]>
useCreatePrescription(): UseMutationResult<IPrescriptionModel, IApiError, ICreatePrescriptionInput>
useDeletePrescription(): UseMutationResult<void, IApiError, string>
useDownloadPrescriptionPdf(): UseMutationResult<void, IApiError, { id: string; fileName?: string }>

// Use-cases
listPrescriptionsUseCase(appointmentId): Promise<IPrescriptionModel[]>
createPrescriptionUseCase(input): Promise<IPrescriptionModel>
deletePrescriptionUseCase(id): Promise<void>
downloadPrescriptionPdfUseCase(id, fileName?): Promise<void>

// Service
prescriptionsService.{ getByAppointment(appointmentId), create(dto), remove(id), downloadPdf(id) }
```

---

## API Client — download binário
- Adicionar em `lib/api-client.ts` (única fronteira com axios):
  ```ts
  getBlob: (url: string): Promise<Blob> => client.get<never, Blob>(url, { responseType: 'blob' }),
  ```
- `prescriptionsService.downloadPdf(id)` usa `apiClient.getBlob('/prescriptions/${id}/pdf')`.
- `downloadPrescriptionPdfUseCase` recebe o `Blob`, cria `URL.createObjectURL`, dispara `<a download>` e faz `revokeObjectURL`. Nenhum axios fora do API Client.

---

## Fluxo principal
### `PrescriptionSection`
1. `usePrescriptions(appointmentId)` → lista (ordem do backend).
2. Vazio: "Nenhuma receita emitida"; loading: skeleton; erro: alerta amigável.
3. Cada receita: data, nº de itens, **Baixar PDF**, **Excluir** (confirmação).
4. **Nova receita** (apenas DOCTOR na própria consulta) → modal.

### `PrescriptionForm` (modal)
1. Busca debounced → `useMedications({ search, limit })`; clicar adiciona o item (sem duplicar `medicationId`).
2. Cada item: `name` (+ princípio ativo) + textarea de posologia (`instructions`, obrigatório) + remover.
3. Textarea de observação geral (`notes`, opcional).
4. Zod: `items` ≥ 1; `instructions` min 1 max 1000; `notes` max 2000. Itens via `useFieldArray`.
5. Submit → `useCreatePrescription` → invalida `['prescriptions', appointmentId]`, fecha modal, sucesso. Desabilitar enquanto `isPending`. `422`/`403` → mensagem amigável.

### Baixar PDF
- `useDownloadPrescriptionPdf({ id, fileName })` → baixa; loading no botão; erro → alerta.

### Excluir
- `PrescriptionDeleteDialog` → `useDeletePrescription(id)` → invalida `['prescriptions', appointmentId]`.

---

## Permissões na UI
- `PrescriptionSection` só para `canManage` (DOCTOR própria / ADMIN).
- **Nova receita** só DOCTOR. ADMIN lê/baixa/exclui, não emite.
- Backend é a fonte de verdade — UI só esconde ações.

---

## Estados e feedbacks
- Loading→skeleton; spinner em download/submit. Erro→alerta amigável (nunca `detail`). Vazio→mensagem. Sucesso→feedback + invalidação. Confirmação ao excluir.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Form | react-hook-form + zod (`useFieldArray`) |
| Busca | reuso de `useMedications` (debounced) |
| Download | `apiClient.getBlob` + `createObjectURL` |
| Modelo | várias por consulta; imutável |
| Acesso | DOCTOR emite; ADMIN vê/baixa/exclui |

---

## Restrições
- NÃO axios fora do API Client (incl. download). NÃO Zustand p/ dados de API. NÃO mapear DTO em componentes/hooks. NÃO `useState` para campos do form. NÃO reutilizar DTOs do shared como tipo do form. NÃO renderizar emissão p/ quem não é DOCTOR da consulta.

---

## Estrutura esperada
```
components/features/prescriptions/
  types/ prescription-model.types.ts, prescription-input.types.ts
  services/ prescriptions.service.ts (+ .spec)
  mappers/ to-prescription-model.mapper.ts, to-create-prescription-dto.mapper.ts (+ .spec)
  use-cases/ list-prescriptions, create-prescription, delete-prescription, download-prescription-pdf (+ .spec)
  hooks/ use-prescriptions, use-create-prescription, use-delete-prescription, use-download-prescription-pdf (+ .spec)
  components/ prescription-section.tsx (+ integration.spec), prescription-form.tsx (+ integration.spec), prescription-list-skeleton.tsx, prescription-delete-dialog.tsx
app/[slug]/(authenticated)/appointments/[id]/page.tsx  → adicionar <section> "Receitas"
lib/api-client.ts                                       → adicionar getBlob
cypress/e2e/prescriptions/ prescriptions-create.cy.ts, prescriptions-download.cy.ts, prescriptions-delete.cy.ts
cypress/fixtures/prescriptions.json
```

---

## Cenários de teste adicionais
### Unitários
- mappers DTO↔Model (`issuedAt`/`createdAt`→Date, `items`, `notes` null); `to-create-prescription-dto` (omite `notes` vazio); use-cases (service+mapper); `downloadPrescriptionPdfUseCase` cria/revoga objectURL; hooks invalidam `['prescriptions', appointmentId]`.
### Integração
- `PrescriptionSection`: loading→skeleton; vazio→mensagem; lista renderiza; ADMIN sem "Nova receita"; DOCTOR com.
- `PrescriptionForm`: busca adiciona item; posologia obrigatória; remover item; submit chama mutation; `422`/`403`→mensagem.
- Download chama service e dispara objectURL; erro→alerta. Excluir pede confirmação.
### E2E
- DOCTOR emite com 2 medicamentos + posologia + observação → na lista; baixa PDF; exclui → some. ADMIN vê/baixa, sem emitir.

---

## Definition of Done
- [ ] `<section>` "Receitas" na consulta com `PrescriptionSection` (DOCTOR própria / ADMIN)
- [ ] Emissão (DOCTOR): busca de medicamentos + itens com posologia + observação + validação
- [ ] Lista com Baixar PDF e Excluir (confirmação)
- [ ] Download via `apiClient.getBlob` + `createObjectURL`
- [ ] Estados loading/error/empty/success + skeleton
- [ ] Emitir só DOCTOR; ADMIN lê/baixa/exclui
- [ ] Mappers DTO→Model; service só via apiClient
- [ ] Dados via React Query (nunca Zustand)
- [ ] Unitários 100%; integração por componente; E2E com `data-testid`
- [ ] Naming convention e estrutura seguidas
