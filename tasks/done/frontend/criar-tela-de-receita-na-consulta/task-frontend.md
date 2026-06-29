# Task — Receita na Tela da Consulta (Frontend)

## Descrição
Implementar a **emissão e o download de receitas** na tela de detalhe da consulta (`/[slug]/appointments/[id]`). O médico **busca medicamentos** na base canônica, **adiciona itens** com posologia, escreve uma **observação geral** e **emite** a receita. As receitas emitidas ficam listadas, cada uma com botões **Baixar PDF** e **Excluir**. Espelha a feature `medical-records` e a `MedicalRecordSection`.

---

## Contexto
- Backend (tasks #1 e #2) expõe:
  - `POST /prescriptions` (DOCTOR) — body `{ appointmentId, items: [{ medicationId, instructions }], notes? }`
  - `GET /prescriptions?appointmentId=` (ADMIN, DOCTOR) → `PrescriptionResponseDto[]`
  - `GET /prescriptions/:id` (ADMIN, DOCTOR)
  - `GET /prescriptions/:id/pdf` (ADMIN, DOCTOR) → **binário** `application/pdf`
  - `DELETE /prescriptions/:id` (ADMIN, DOCTOR) → `204`
- Roteamento por clínica: `app/[slug]/(authenticated)/...` (usar `useSlug`).
- Ponto de integração: a página `app/[slug]/(authenticated)/appointments/[id]/page.tsx` já renderiza `MedicalRecordSection` dentro de `canSeeMedicalRecord`. Adicionar uma `<section>` "Receitas" com um novo `PrescriptionSection`, no mesmo bloco visível para `canManage` (DOCTOR própria consulta / ADMIN).
- Reuso: a **busca de medicamentos** usa o `useMedications` já existente (`components/features/medications/hooks/use-medications.hook.ts`) com `search` debounced.
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
export interface ICreatePrescriptionItemInput {
  medicationId: string
  instructions: string
}
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
usePrescriptions(appointmentId: string): UseQueryResult<IPrescriptionModel[]>
useCreatePrescription(): UseMutationResult<IPrescriptionModel, IApiError, ICreatePrescriptionInput>
useDeletePrescription(): UseMutationResult<void, IApiError, string>
useDownloadPrescriptionPdf(): UseMutationResult<void, IApiError, { id: string; fileName?: string }>

// Use-cases
listPrescriptionsUseCase(appointmentId): Promise<IPrescriptionModel[]>
createPrescriptionUseCase(input): Promise<IPrescriptionModel>
deletePrescriptionUseCase(id): Promise<void>
downloadPrescriptionPdfUseCase(id, fileName?): Promise<void>   // dispara o download no navegador

// Service
prescriptionsService.{ getByAppointment(appointmentId), create(dto), remove(id), downloadPdf(id) }
```

---

## API Client — download binário
- Adicionar em `lib/api-client.ts` (única fronteira com axios):
  ```ts
  getBlob: (url: string): Promise<Blob> => client.get<never, Blob>(url, { responseType: 'blob' }),
  ```
- `prescriptionsService.downloadPdf(id)` usa `apiClient.getBlob(`/prescriptions/${id}/pdf`)`.
- `downloadPrescriptionPdfUseCase` recebe o `Blob`, cria `URL.createObjectURL`, dispara o download via âncora (`<a download>`) e faz `revokeObjectURL`. Nenhum `axios` fora do API Client.

---

## Fluxo principal

### Seção na consulta (`PrescriptionSection`)
1. `usePrescriptions(appointmentId)` → lista de receitas (ordenadas por `issuedAt` desc, vindo do backend).
2. Estado vazio: "Nenhuma receita emitida". Loading: skeleton. Erro: alerta amigável.
3. Para cada receita: data de emissão, nº de itens (e/ou resumo), botão **Baixar PDF**, botão **Excluir** (com confirmação).
4. Botão **Nova receita** (apenas DOCTOR na própria consulta) → abre o modal de emissão.

### Modal de emissão (`PrescriptionForm`)
1. **Busca de medicamento:** input debounced → `useMedications({ search, limit })`; resultados clicáveis adicionam o medicamento à lista de itens (evitar duplicar o mesmo `medicationId`).
2. **Itens adicionados:** cada um mostra `name` (+ princípio ativo) e um **textarea de posologia** (`instructions`, obrigatório) + botão remover item.
3. **Observação geral:** textarea opcional (`notes`).
4. Validação (zod): `items` com ao menos 1; `instructions` de cada item min 1, max 1000; `notes` max 2000.
5. Submit → `useCreatePrescription` → invalida `['prescriptions', appointmentId]`, fecha o modal, feedback de sucesso. Botão desabilitado enquanto `isPending`. Erros `422`/`403` mapeados para mensagem amigável.

### Baixar PDF
- Botão dispara `useDownloadPrescriptionPdf({ id, fileName: 'receita-<id>.pdf' })` → baixa o arquivo. Indicar loading no botão; erro → alerta.

### Excluir
- `PrescriptionDeleteDialog` de confirmação → `useDeletePrescription(id)` → invalida `['prescriptions', appointmentId]`, feedback.

---

## Permissões na UI
- Renderizar `PrescriptionSection` apenas para `canManage` (DOCTOR própria consulta / ADMIN) — mesmo critério já usado para o prontuário na página.
- Botão **Nova receita** somente para DOCTOR (quem assina). ADMIN vê a lista, baixa o PDF e pode excluir, mas não emite.
- Backend é a fonte de verdade — a UI apenas esconde ações.

---

## Estados e feedbacks
- Loading → skeleton da lista; spinner nos botões de download/submit.
- Erro → `Alert`/`ErrorMessage` amigável (nunca `detail` técnico).
- Vazio → "Nenhuma receita emitida".
- Sucesso emitir/excluir → feedback + invalidação de `['prescriptions', appointmentId]`.
- Submit/Download desabilitados enquanto `isPending`. Confirmação obrigatória ao excluir.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Form | react-hook-form + zod (itens via `useFieldArray`) |
| Busca de medicamento | reuso de `useMedications` (input debounced) |
| Download de PDF | `apiClient.getBlob` + `createObjectURL` (axios só no API Client) |
| Modelo | várias receitas por consulta; cada uma imutável |
| Acesso | DOCTOR emite (própria); ADMIN vê/baixa/exclui |

---

## Restrições
- NÃO importar axios fora do API Client (incluindo o download binário).
- NÃO armazenar dados da API em Zustand.
- NÃO mapear DTO em componentes/hooks — usar mappers.
- NÃO usar `useState` para campos do form (só busca/UI).
- NÃO reutilizar DTOs do shared como tipo do formulário.
- NÃO renderizar emissão para quem não é DOCTOR da consulta.

---

## Estrutura esperada
```
components/features/prescriptions/
  types/ prescription-model.types.ts, prescription-input.types.ts
  services/ prescriptions.service.ts (+ .spec)
  mappers/ to-prescription-model.mapper.ts, to-create-prescription-dto.mapper.ts (+ .spec)
  use-cases/ list-prescriptions, create-prescription, delete-prescription, download-prescription-pdf (+ .spec)
  hooks/ use-prescriptions, use-create-prescription, use-delete-prescription, use-download-prescription-pdf (+ .spec)
  components/
    prescription-section.tsx (+ integration.spec)
    prescription-form.tsx (+ integration.spec)
    prescription-list-skeleton.tsx
    prescription-delete-dialog.tsx

app/[slug]/(authenticated)/appointments/[id]/page.tsx   → adicionar <section> "Receitas" com <PrescriptionSection>
lib/api-client.ts                                        → adicionar getBlob

cypress/e2e/prescriptions/
  prescriptions-create.cy.ts, prescriptions-download.cy.ts, prescriptions-delete.cy.ts
cypress/fixtures/prescriptions.json
```

---

## Cenários de teste adicionais
### Unitários
- mappers DTO↔Model (`issuedAt`/`createdAt` → Date, `items`, `notes` null).
- `to-create-prescription-dto` monta `{ appointmentId, items, notes }` corretamente (omite `notes` vazio).
- use-cases chamam service + mapper; `downloadPrescriptionPdfUseCase` cria e revoga objectURL.
- hooks invalidam `['prescriptions', appointmentId]`.
### Integração
- `PrescriptionSection`: loading→skeleton; vazio→mensagem; lista renderiza receitas; ADMIN não vê "Nova receita"; DOCTOR vê.
- `PrescriptionForm`: busca adiciona item; posologia obrigatória; remover item; submit chama mutation; `422`/`403` exibem mensagem.
- Download chama o service e dispara o objectURL; erro → alerta.
- Excluir pede confirmação e chama a mutation.
### E2E
- DOCTOR emite receita com 2 medicamentos + posologia + observação → aparece na lista.
- DOCTOR baixa o PDF da receita.
- DOCTOR exclui a receita → some da lista.
- ADMIN vê a lista e baixa o PDF, sem botão de emitir.

---

## Definition of Done
- [ ] `<section>` "Receitas" na página da consulta com `PrescriptionSection` (visível p/ DOCTOR própria / ADMIN)
- [ ] Emissão (DOCTOR): busca de medicamentos + itens com posologia + observação geral + validação
- [ ] Lista de receitas emitidas com Baixar PDF e Excluir (confirmação)
- [ ] Download binário via `apiClient.getBlob` (axios só no API Client) + `createObjectURL`
- [ ] Estados loading/error/empty/success + skeleton
- [ ] Botão de emitir só para DOCTOR; ADMIN somente lê/baixa/exclui
- [ ] Mappers DTO→Model; service só via apiClient
- [ ] Dados via React Query (nunca Zustand)
- [ ] Testes unitários 100% (mappers/use-cases/hooks)
- [ ] Testes de integração por componente (loading/error/success)
- [ ] E2E dos fluxos críticos com `data-testid`
- [ ] Naming convention e estrutura seguidas
