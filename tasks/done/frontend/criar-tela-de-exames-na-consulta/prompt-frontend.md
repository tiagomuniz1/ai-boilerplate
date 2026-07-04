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
- Espelhar a feature `atestados/` (estrutura de arquivos, `AtestadoSection`/`AtestadoForm`) e `clinic-upload-section.tsx` (upload de arquivo)

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Exames na Tela da Consulta (Frontend)

## Descrição
Implementar solicitação de exames, listagem, download do PDF do pedido e anexo/remoção de resultados na tela da consulta (`/[slug]/appointments/[id]`), aba "Exames" (hoje placeholder). Médico adiciona itens (nome livre + observação) + observação geral e solicita. Cada solicitação mostra itens, badge de status (Solicitado/Concluído) e, se o usuário for o médico responsável, controle para anexar/remover arquivos de resultado. Espelha `AtestadoSection`/`PrescriptionSection`.

## Contexto
Backend expõe:
- `POST /exam-requests` (DOCTOR) — `{ appointmentId, items: [{name, observations?}], notes? }`
- `GET /exam-requests?appointmentId=` (ADMIN, DOCTOR) → `ExamRequestResponseDto[]` (inclui `results`)
- `GET /exam-requests/:id` (ADMIN, DOCTOR)
- `GET /exam-requests/:id/pdf` (ADMIN, DOCTOR) → binário
- `DELETE /exam-requests/:id` (ADMIN, DOCTOR) → `204`
- `POST /exam-requests/:id/results` (DOCTOR) — multipart `files` → `ExamRequestResponseDto`
- `DELETE /exam-results/:id` (DOCTOR) → `204`

`status`: `ExamRequestStatus` (`requested`|`completed`) de `@app/shared`.

**Pontos já preparados:**
- `app/[slug]/(authenticated)/appointments/[id]/page.tsx`: aba `'exames'` renderiza `ExamesPlaceholder` (stub a remover); tab incondicional no `tabItems`, sem `count`/gating.
- `components/features/appointments/components/resumo-tab.tsx`: `DocumentRow` "Exames" com `count={0}` fixo.

Reuso: `apiClient.getBlob` (PDF), `FormData` multi-arquivo (`apiClient.post`).

## Contratos (types locais)
```ts
export interface IExamResultModel {
  id: string; fileUrl: string; fileName: string; mimeType: string; fileSizeBytes: number; createdAt: Date
}
export interface IExamRequestItemModel { name: string; observations: string | null }
export interface IExamRequestModel {
  id: string; appointmentId: string; patientId: string; patientName: string
  doctorId: string; doctorName: string; items: IExamRequestItemModel[]; notes: string | null
  status: ExamRequestStatus; results: IExamResultModel[]; issuedAt: Date; createdAt: Date
}
export interface ICreateExamRequestInput {
  appointmentId: string; items: Array<{ name: string; observations?: string }>; notes?: string
}
```

## Assinaturas esperadas
```ts
useExamRequests(appointmentId): UseQueryResult<IExamRequestModel[]>
useCreateExamRequest(): UseMutationResult<IExamRequestModel, IApiError, ICreateExamRequestInput>
useDeleteExamRequest(appointmentId): UseMutationResult<void, IApiError, string>
useDownloadExamRequestPdf(): UseMutationResult<void, IApiError, { id: string; fileName?: string }>
useAddExamResult(appointmentId): UseMutationResult<IExamRequestModel, IApiError, { examRequestId: string; files: File[] }>
useDeleteExamResult(appointmentId): UseMutationResult<void, IApiError, string>

listExamRequestsUseCase(appointmentId), createExamRequestUseCase(input), deleteExamRequestUseCase(id),
downloadExamRequestPdfUseCase(id, fileName?), addExamResultUseCase(examRequestId, files), deleteExamResultUseCase(id)

examsService.{ getByAppointment, getById, create, remove, downloadPdf, addResult(examRequestId, files), removeResult }
```
Mutations que dependem do appointment recebem `appointmentId` como argumento do hook (como `useDeletePrescription`), invalidam `['exam-requests', appointmentId]`. `downloadExamRequestPdfUseCase` usa `apiClient.getBlob` + `createObjectURL`/`revokeObjectURL`. `addResult` monta `FormData` com `files.forEach(f => formData.append('files', f))`.

## Fluxo principal

**`ExameSection`** (props `{ appointmentId, canManage, userRole }`): lista via `useExamRequests`; loading→skeleton, vazio→"Nenhum exame solicitado", erro→alerta; cada item mostra badge de status, itens (nome+observação), observação geral, botões Baixar PDF/Excluir (`canManage`); sub-lista de `results` com link de download + remover (`isDoctor && canManage`); botão "Anexar resultado" e "Novo pedido de exames" (`isDoctor && canManage`).

**`ExameForm`**: `useFieldArray` para itens (nome obrigatório + observação opcional, mínimo 1, botão adicionar/remover), campo observação geral opcional. Zod: `items` não vazio, `name` obrigatório. Submit → `useCreateExamRequest`, invalida query, fecha modal, `422`/`403` mapeados.

**`ExameResultUpload`**: input `type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp"`; valida mimetype/tamanho (10MB) no client antes do submit; submit → `useAddExamResult`.

**Download/Excluir/Remover**: `useDownloadExamRequestPdf({id, fileName:'pedido-exames-<id>.pdf'})`; `ExameDeleteDialog`→`useDeleteExamRequest`; `ExameResultDeleteDialog`→`useDeleteExamResult`.

## Ligação nas telas existentes

**`appointments/[id]/page.tsx`**: importar `useExamRequests`/`ExameSection`; `const { data: examRequests } = useExamRequests(id)`; gatear tab `exames` atrás de `canManage` com `count: examRequests?.length ?? 0`; substituir `{activeTab === 'exames' && <ExamesPlaceholder />}` por `{activeTab === 'exames' && canManage && <ExameSection appointmentId={id} canManage={canManage} userRole={role} />}`; remover `ExamesPlaceholder`; passar `examCount`/`showExames` ao `ResumoTab`.

**`resumo-tab.tsx`**: adicionar props `examCount?: number`, `showExames: boolean`; envolver `DocumentRow` "Exames" em `{showExames && (...)}` usando `examCount ?? 0`. Checar `grep -rn "<ResumoTab" apps/frontend` antes de tornar `showExames` obrigatório.

## Permissões na UI
`ExameSection` só para `canManage`. "Novo pedido"/"Anexar/remover resultado" só para `isDoctor && canManage`. ADMIN vê lista/baixa PDF/exclui pedido, não solicita nem mexe em resultado.

## Decisões técnicas
React Query (nunca Zustand); react-hook-form + zod + `useFieldArray`; download via `apiClient.getBlob`+`createObjectURL`; upload via `FormData`+`apiClient.post` (axios só no API Client).

## Restrições
NÃO axios fora do API Client. NÃO Zustand para dados de API. NÃO mapear DTO fora de mappers. NÃO `useState` para campos do form. NÃO reutilizar DTO do shared como tipo de form. NÃO renderizar solicitar/anexar para quem não é o DOCTOR da consulta.

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
    exame-section.tsx (+ integration.spec), exame-form.tsx (+ integration.spec),
    exame-list-skeleton.tsx, exame-delete-dialog.tsx, exame-result-upload.tsx, exame-result-delete-dialog.tsx

app/[slug]/(authenticated)/appointments/[id]/page.tsx      → aba Exames real + count
components/features/appointments/components/resumo-tab.tsx  → count real

cypress/e2e/exames/ exames-create.cy.ts, exames-upload-result.cy.ts, exames-delete.cy.ts
cypress/fixtures/exames.json
```

## Cenários de teste
- Mappers: datas→`Date`; `items`/`results` mapeados; `null` preservados. `to-create-exam-request-dto` monta body (omite `notes` vazio).
- Use-cases chamam service+mapper; download cria/revoga objectURL; hooks invalidam `['exam-requests', appointmentId]`.
- `ExameSection`: loading/vazio/lista; ADMIN sem botões de ação de DOCTOR.
- `ExameForm`: adiciona/remove itens; valida item sem nome; `422`/`403`.
- Upload: valida tipo/tamanho no client; sucesso muda badge para Concluído.
- Download/Excluir/Remover: confirmação, chama mutation, erro→alerta.
- `resumo-tab`: count reflete lista; oculto se `showExames=false`.
- E2E: solicitar com múltiplos itens; anexar resultado (badge Concluído); remover único resultado (badge volta Solicitado); baixar PDF; excluir pedido; ADMIN sem botões de ação.

## Definition of Done
- [ ] Aba "Exames" real com `ExameSection`; placeholder removido; count na aba e no resumo
- [ ] Solicitação com itens dinâmicos + observação geral + validação
- [ ] Lista com badge de status, itens, resultados, Baixar PDF, Excluir (confirmação)
- [ ] Anexar/remover resultado (DOCTOR apenas) com validação client-side
- [ ] Download via `apiClient.getBlob`+`createObjectURL`; upload via `FormData`+`apiClient.post`
- [ ] Estados loading/error/empty/success
- [ ] Botões de ação de DOCTOR ocultos para ADMIN
- [ ] Mappers DTO→Model; dados via React Query
- [ ] Testes unitários 100%; integração (loading/error/success); E2E dos fluxos críticos
- [ ] Naming convention e estrutura seguidas
