# Task — Exames na Tela da Consulta (Frontend)

## Descrição
Implementar a **solicitação de exames**, a **listagem**, o **download do PDF do pedido** e o **anexo/remoção de resultados** na tela de detalhe da consulta (`/[slug]/appointments/[id]`), na aba "Exames" (hoje um placeholder). O médico adiciona um ou mais itens de exame (nome livre + observação opcional) e uma observação geral, e solicita. Cada solicitação listada mostra os itens, um badge de status (Solicitado/Concluído) e, se o usuário for o médico responsável, um controle para anexar arquivo(s) de resultado e remover resultados já anexados. Espelha `AtestadoSection`/`PrescriptionSection`.

---

## Contexto
Backend (tasks `criar-modulo-de-solicitacao-de-exames`, `gerar-pdf-do-pedido-de-exames`, `criar-modulo-de-resultado-de-exames`) expõe:
- `POST /exam-requests` (DOCTOR) — body `{ appointmentId, items: [{name, observations?}], notes? }`
- `GET /exam-requests?appointmentId=` (ADMIN, DOCTOR) → `ExamRequestResponseDto[]` (inclui `results` embutidos)
- `GET /exam-requests/:id` (ADMIN, DOCTOR)
- `GET /exam-requests/:id/pdf` (ADMIN, DOCTOR) → binário `application/pdf`
- `DELETE /exam-requests/:id` (ADMIN, DOCTOR) → `204`
- `POST /exam-requests/:id/results` (DOCTOR) — multipart `files` (múltiplos) → `ExamRequestResponseDto` atualizado
- `DELETE /exam-results/:id` (DOCTOR) → `204`

`status`: `ExamRequestStatus` de `@app/shared` (`requested` | `completed`).
Roteamento por clínica: `app/[slug]/(authenticated)/...` (usar `useSlug`).

**Pontos de integração já preparados:**
- `app/[slug]/(authenticated)/appointments/[id]/page.tsx` — a aba `'exames'` renderiza `ExamesPlaceholder` (stub local a **remover**); a aba está incondicional no `tabItems`, sem `count` e sem gating por `canManage`.
- `components/features/appointments/components/resumo-tab.tsx` — `DocumentRow` "Exames" com `count={0}` fixo, sem prop de contagem nem gating.

Reuso: `apiClient.getBlob` (download de PDF, já existe, criado nas receitas), `FormData` para upload multi-arquivo (mesmo padrão de `clinic-upload-section.tsx`, adaptado para múltiplos arquivos).

DTOs do `@app/shared`: `ExamRequestResponseDto`, `ExamResultResponseDto`, `CreateExamRequestDto`, `ExamRequestStatus`, `UserRole`.

---

## Contratos (types locais)
```ts
export interface IExamResultModel {
  id: string
  fileUrl: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  createdAt: Date
}

export interface IExamRequestItemModel {
  name: string
  observations: string | null
}

export interface IExamRequestModel {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  items: IExamRequestItemModel[]
  notes: string | null
  status: ExamRequestStatus
  results: IExamResultModel[]
  issuedAt: Date
  createdAt: Date
}

// Input do formulário de solicitação (não reutilizar DTO do shared)
export interface ICreateExamRequestInput {
  appointmentId: string
  items: Array<{ name: string; observations?: string }>
  notes?: string
}
```

---

## Assinaturas esperadas
```ts
// Hooks
useExamRequests(appointmentId: string): UseQueryResult<IExamRequestModel[]>
useCreateExamRequest(): UseMutationResult<IExamRequestModel, IApiError, ICreateExamRequestInput>
useDeleteExamRequest(appointmentId: string): UseMutationResult<void, IApiError, string>
useDownloadExamRequestPdf(): UseMutationResult<void, IApiError, { id: string; fileName?: string }>
useAddExamResult(appointmentId: string): UseMutationResult<IExamRequestModel, IApiError, { examRequestId: string; files: File[] }>
useDeleteExamResult(appointmentId: string): UseMutationResult<void, IApiError, string>

// Use-cases
listExamRequestsUseCase(appointmentId): Promise<IExamRequestModel[]>
createExamRequestUseCase(input): Promise<IExamRequestModel>
deleteExamRequestUseCase(id): Promise<void>
downloadExamRequestPdfUseCase(id, fileName?): Promise<void>   // dispara o download no navegador
addExamResultUseCase(examRequestId, files): Promise<IExamRequestModel>
deleteExamResultUseCase(id): Promise<void>

// Service
examsService.{ getByAppointment(appointmentId), getById(id), create(dto), remove(id), downloadPdf(id), addResult(examRequestId, files), removeResult(resultId) }
```

- `useCreateExamRequest`/`useDeleteExamRequest`/`useAddExamResult`/`useDeleteExamResult` invalidam `['exam-requests', appointmentId]` (mutations que dependem do appointment recebem `appointmentId` como argumento do hook, como em `useDeletePrescription`).
- `downloadExamRequestPdfUseCase` usa `apiClient.getBlob('/exam-requests/${id}/pdf')`, cria `URL.createObjectURL`, dispara `<a download>` e faz `revokeObjectURL`.
- `examsService.addResult` monta `FormData` com múltiplos `files.forEach(f => formData.append('files', f))`.

---

## Fluxo principal

### Seção na consulta (`ExameSection`, props `{ appointmentId, canManage, userRole }`)
1. `useExamRequests(appointmentId)` → lista (ordenada por `issuedAt` desc pelo backend).
2. Estado vazio: "Nenhum exame solicitado". Loading: skeleton. Erro: alerta amigável.
3. Para cada solicitação: badge de status ("Solicitado" / "Concluído"), data, lista dos itens (nome + observação, se houver), observação geral (se houver), botões **Baixar PDF do pedido**, **Excluir** (com confirmação, `canManage`).
4. Sub-lista de resultados anexados: nome do arquivo + link de download (`fileUrl` direto) + botão remover (`isDoctor && canManage`).
5. Botão **Anexar resultado** (`isDoctor && canManage`) abre o seletor de múltiplos arquivos.
6. Botão **Novo pedido de exames** (`isDoctor && canManage`) abre o modal de solicitação.

### Modal de solicitação (`ExameForm`)
1. Lista dinâmica de itens (`useFieldArray`): campo "Nome do exame" (texto livre, obrigatório) + "Observação" (opcional) por item. Botão "+ Adicionar exame" / remover item (mínimo 1 item).
2. Campo "Observação geral" (textarea, opcional).
3. Validação (zod): `items` não vazio, `name` obrigatório por item.
4. Submit → `useCreateExamRequest` → invalida `['exam-requests', appointmentId]`, fecha o modal, feedback. Botão desabilitado enquanto `isPending`. Erros `422`/`403` mapeados para mensagem amigável.

### Anexar resultado (`ExameResultUpload`)
1. Input `type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp"`.
2. Validação client-side de mimetype/tamanho (10MB) antes do submit — mesma lista de tipos aceitos do backend.
3. Submit → `useAddExamResult` → invalida a query, feedback. Erros `422` (tipo/tamanho) mapeados para mensagem amigável.

### Baixar PDF / Excluir pedido / Remover resultado
- Download do pedido: `useDownloadExamRequestPdf({ id, fileName: 'pedido-exames-<id>.pdf' })`, loading no botão, erro → alerta.
- Excluir pedido: `ExameDeleteDialog` de confirmação → `useDeleteExamRequest(id)` → invalida a key, feedback.
- Remover resultado: `ExameResultDeleteDialog` de confirmação → `useDeleteExamResult(resultId)` → invalida a key, feedback.

---

## Ligação nas telas existentes

### `appointments/[id]/page.tsx`
- Importar `useExamRequests` e `ExameSection`; `const { data: examRequests } = useExamRequests(id)`.
- No `tabItems`, gatear a aba `exames` atrás de `canManage` (como "Receitas"/"Atestados") e adicionar `count: examRequests?.length ?? 0`.
- Substituir `{activeTab === 'exames' && <ExamesPlaceholder />}` por
  `{activeTab === 'exames' && canManage && <ExameSection appointmentId={id} canManage={canManage} userRole={role} />}`.
- **Remover** a função `ExamesPlaceholder`.
- Passar `examCount`/`showExames` ao `ResumoTab`.

### `appointments/components/resumo-tab.tsx`
- Adicionar props `examCount?: number` e `showExames: boolean`.
- Envolver o `DocumentRow` "Exames" (hoje `count={0}` fixo) em `{showExames && (...)}`, usando `examCount ?? 0` — espelhando "Receitas"/"Atestados".
- Antes de tornar `showExames` obrigatório, rodar `grep -rn "<ResumoTab" apps/frontend` e ajustar todos os call-sites.

---

## Permissões na UI
- Renderizar `ExameSection` apenas para `canManage` (DOCTOR própria consulta / ADMIN) — mesmo critério de receitas/atestados/prontuário.
- Botão **Novo pedido de exames** e **Anexar/remover resultado** somente para DOCTOR (`isDoctor && canManage`). ADMIN vê a lista, baixa o PDF do pedido e pode excluir a solicitação, mas não solicita nem mexe em resultado.
- Backend é a fonte de verdade — a UI apenas esconde ações.

---

## Estados e feedbacks
- Loading → skeleton; spinner nos botões de download/submit/upload.
- Erro → `Alert`/`ErrorMessage` amigável (nunca `detail` técnico).
- Vazio → "Nenhum exame solicitado".
- Sucesso solicitar/excluir/anexar/remover → feedback + invalidação de `['exam-requests', appointmentId]`.
- Submit/Download/Upload desabilitados enquanto `isPending`. Confirmação obrigatória ao excluir pedido ou remover resultado.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Form de solicitação | react-hook-form + zod + `useFieldArray` (itens dinâmicos) |
| Download de PDF | `apiClient.getBlob` + `createObjectURL` (axios só no API Client) |
| Upload de resultado | `FormData` multi-arquivo via `apiClient.post` (axios só no API Client) |
| Modelo | várias solicitações por consulta; itens imutáveis após criada; resultados podem ser adicionados/removidos ao longo do tempo |
| Acesso | DOCTOR solicita e anexa/remove resultado (própria); ADMIN vê/baixa PDF do pedido/exclui pedido |

---

## Restrições
- NÃO importar axios fora do API Client (incluindo download binário e upload multipart). NÃO armazenar dados da API em Zustand. NÃO mapear DTO em componentes/hooks — usar mappers. NÃO usar `useState` para campos do form (`useFieldArray` para os itens). NÃO reutilizar DTOs do shared como tipo do formulário. NÃO renderizar solicitação/anexo de resultado para quem não é o DOCTOR da consulta.

---

## Estrutura esperada
```
components/features/exames/
  types/ exam-request-model.types.ts, exam-request-input.types.ts
  services/ exams.service.ts (+ .spec)
  mappers/ to-exam-request-model.mapper.ts, to-create-exam-request-dto.mapper.ts (+ .spec)
  use-cases/ list-exam-requests, create-exam-request, delete-exam-request,
             download-exam-request-pdf, add-exam-result, delete-exam-result (+ .spec)
  hooks/ use-exam-requests, use-create-exam-request, use-delete-exam-request,
         use-download-exam-request-pdf, use-add-exam-result, use-delete-exam-result (+ .spec)
  components/
    exame-section.tsx (+ integration.spec)
    exame-form.tsx (+ integration.spec)
    exame-list-skeleton.tsx
    exame-delete-dialog.tsx
    exame-result-upload.tsx
    exame-result-delete-dialog.tsx

app/[slug]/(authenticated)/appointments/[id]/page.tsx      → aba Exames real + count + remover placeholder
components/features/appointments/components/resumo-tab.tsx  → DocumentRow "Exames" com count real

cypress/e2e/exames/
  exames-create.cy.ts, exames-upload-result.cy.ts, exames-delete.cy.ts
cypress/fixtures/exames.json
```

---

## Cenários de teste

### Unitários
- Mappers DTO↔Model: `issuedAt`/`createdAt` → `Date`; `items`/`results` mapeados; `notes`/`observations` `null` preservados.
- `to-create-exam-request-dto` monta o body com `items` e `notes` (omite `notes` vazio).
- Use-cases chamam service + mapper; `downloadExamRequestPdfUseCase` cria e revoga objectURL; `addExamResultUseCase` retorna o model atualizado.
- Hooks invalidam `['exam-requests', appointmentId]`.

### Integração
- `ExameSection`: loading→skeleton; vazio→mensagem; lista renderiza (itens + badge de status); ADMIN não vê "Novo pedido"/"Anexar resultado"; DOCTOR vê.
- `ExameForm`: adiciona/remove itens dinamicamente; valida item sem nome; submit chama a mutation; `422`/`403` exibem mensagem.
- Upload de resultado: valida tipo/tamanho no client antes de enviar; sucesso atualiza o badge para "Concluído"; erro → alerta.
- Download chama o service e dispara o objectURL; erro → alerta.
- Excluir pedido/remover resultado pedem confirmação e chamam a mutation correspondente.
- `resumo-tab`: `count` de exames reflete a lista; oculto quando `showExames=false`.

### E2E
- DOCTOR solicita exame com múltiplos itens → aparece na lista e no `count` da aba, badge "Solicitado".
- DOCTOR anexa 1 arquivo de resultado → badge muda para "Concluído".
- DOCTOR remove o único resultado anexado → badge volta para "Solicitado".
- DOCTOR baixa o PDF do pedido.
- DOCTOR exclui um pedido → some da lista.
- ADMIN vê a lista e baixa o PDF, sem botões de solicitar/anexar/remover resultado.

---

## Definition of Done
- [ ] Aba "Exames" real na página da consulta com `ExameSection` (visível p/ DOCTOR própria / ADMIN); placeholder removido; `count` na aba
- [ ] `DocumentRow` "Exames" no resumo ligado ao count real
- [ ] Solicitação (DOCTOR): itens dinâmicos (nome + observação) + observação geral + validação
- [ ] Lista com badge de status, itens, resultados anexados, Baixar PDF do pedido e Excluir (confirmação)
- [ ] Anexar resultado (multi-arquivo) e remover resultado (DOCTOR apenas), com validação client-side de tipo/tamanho
- [ ] Download binário via `apiClient.getBlob` (axios só no API Client) + `createObjectURL`
- [ ] Upload multipart via `apiClient.post` com `FormData` (axios só no API Client)
- [ ] Estados loading/error/empty/success + skeleton
- [ ] Botões de solicitar/anexar/remover resultado só para DOCTOR; ADMIN somente lê/baixa PDF/exclui pedido
- [ ] Mappers DTO→Model; service só via apiClient
- [ ] Dados via React Query (nunca Zustand)
- [ ] Testes unitários 100% (mappers/use-cases/hooks)
- [ ] Testes de integração por componente (loading/error/success)
- [ ] E2E dos fluxos críticos com `data-testid`
- [ ] Naming convention e estrutura seguidas
