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
- Espelhar a feature `exames/` (estrutura de arquivos, `ExameSection`, `exame-result-upload.tsx`) para upload/listagem
- `PhotoThumbnail` é peça nova: nenhum componente existente renderiza imagem autenticada — implementar via `apiClient.getBlob` + `URL.createObjectURL`, com revogação obrigatória no cleanup
- Role atual do sistema é `PROFESSIONAL` (não `DOCTOR`)

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Fotos na Tela da Consulta (Frontend)

## Descrição
Envio, listagem em miniatura, visualização ampliada e exclusão de fotos de evolução do tratamento na tela da consulta (`/[slug]/appointments/[id]`), nova aba "Fotos" (sem placeholder pré-existente — criar do zero). Profissional envia fotos, vê miniaturas ordenadas por data de envio, abre em tamanho maior ou exclui. Espelha `ExameSection`/`exame-result-upload.tsx`.

## Contexto
Backend expõe:
- `POST /consultation-photos/appointments/:appointmentId` (PROFESSIONAL) — multipart `files` → `ConsultationPhotoResponseDto[]`
- `GET /consultation-photos?appointmentId=` (ADMIN, PROFESSIONAL) → `ConsultationPhotoResponseDto[]`
- `GET /consultation-photos/:id/file` (ADMIN, PROFESSIONAL) → binário
- `DELETE /consultation-photos/:id` (ADMIN, PROFESSIONAL) → `204`

`ConsultationPhotoResponseDto`: `id`, `appointmentId`, `fileName`, `mimeType`, `fileSizeBytes`, `createdAt`. Sem URL — toda imagem via `apiClient.getBlob('/consultation-photos/:id/file')`, nunca `<img src="/api/...">` direto.

**Sem placeholder pré-existente** (diferente de `exames`): `app/[slug]/(authenticated)/appointments/[id]/page.tsx` tem `TabId = 'resumo' | 'prontuario' | 'receitas' | 'atestados' | 'exames'` — adicionar `'fotos'`. `components/features/appointments/components/resumo-tab.tsx` não tem linha de Fotos — adicionar.

## Contratos (types locais)
```ts
export interface IConsultationPhotoModel {
  id: string; appointmentId: string; fileName: string; mimeType: string; fileSizeBytes: number; createdAt: Date
}
export interface IUploadConsultationPhotosInput { appointmentId: string; files: File[] }
```

## Assinaturas esperadas
```ts
useAppointmentPhotos(appointmentId): UseQueryResult<IConsultationPhotoModel[]>
useUploadConsultationPhotos(appointmentId): UseMutationResult<IConsultationPhotoModel[], IApiError, File[]>
useDeleteConsultationPhoto(appointmentId): UseMutationResult<void, IApiError, string>
usePhotoThumbnail(photoId): { url: string | null; isLoading: boolean; isError: boolean }

listAppointmentPhotosUseCase(appointmentId): Promise<IConsultationPhotoModel[]>
uploadConsultationPhotosUseCase(appointmentId, files): Promise<IConsultationPhotoModel[]>
deleteConsultationPhotoUseCase(id): Promise<void>
fetchConsultationPhotoBlobUseCase(id): Promise<Blob>

consultationPhotosService.{ getByAppointment(appointmentId), upload(appointmentId, files), remove(id), getFileBlob(id) }
```
- Mutations de upload/delete invalidam `['appointment-photos', appointmentId]`.
- `upload` monta `FormData` com `files.forEach(f => formData.append('files', f))`.
- `usePhotoThumbnail`: `useQuery({ queryKey: ['photo-thumbnail', photoId], queryFn: () => fetchConsultationPhotoBlobUseCase(photoId), staleTime: Infinity, gcTime: 1000*60*30 })`; converte o `Blob` em `URL.createObjectURL` num `useEffect` do componente consumidor (não guardar object URL no cache do React Query, só o `Blob`), **revoga no cleanup** (unmount ou troca de `photoId`).

## Fluxo principal

### `PhotoSection` (props `{ appointmentId, canManage, userRole }`)
1. `useAppointmentPhotos(appointmentId)` → lista (ordenada por `createdAt` desc pelo backend).
2. Vazio: "Nenhuma foto enviada". Loading: skeleton grid. Erro: alerta.
3. Grid de `PhotoThumbnail`, cada uma com data de envio formatada.
4. Clique abre `PhotoPreviewModal` com imagem ampliada + Excluir (`isProfessional && canManage`).
5. Botão "Enviar fotos" (`isProfessional && canManage`) abre seletor multi-arquivo.

### `PhotoUpload`
Input `type="file" multiple accept="image/jpeg,image/png,image/webp"`. Validação client-side de mimetype/tamanho (8MB, sem PDF) antes do submit. Submit → `useUploadConsultationPhotos` → invalida query, feedback. `422` → mensagem amigável. Desabilitado enquanto `isPending`.

### `PhotoThumbnail` (props `{ photoId, fileName, createdAt }`)
`usePhotoThumbnail(photoId)` → `{ url, isLoading, isError }`. Loading → skeleton. Erro → placeholder de imagem quebrada. Sucesso → `<img src={url} alt={fileName} loading="lazy">`. **Obrigatório:** `useEffect` cleanup chamando `URL.revokeObjectURL(url)` ao desmontar/trocar `photoId`.

### `PhotoPreviewModal`
Exibe a foto selecionada ampliada + `fileName` + data. Botão Excluir (`isProfessional && canManage`) abre `PhotoDeleteDialog` → `useDeleteConsultationPhoto(photoId)` → invalida, fecha, feedback.

## Ligação nas telas existentes

### `appointments/[id]/page.tsx`
Adicionar `'fotos'` ao `TabId`. Importar `useAppointmentPhotos`/`PhotoSection`. No `tabItems`, entrada gateada por `canManage` com `count: photos?.length ?? 0`. Renderizar `{activeTab === 'fotos' && canManage && <PhotoSection appointmentId={id} canManage={canManage} userRole={role} />}`. Passar `photoCount`/`showPhotos` ao `ResumoTab`.

### `appointments/components/resumo-tab.tsx`
Adicionar props `photoCount?: number`, `showPhotos: boolean`. Novo `DocumentRow` "Fotos" em `{showPhotos && (...)}`, usando `photoCount ?? 0`. Rodar `grep -rn "<ResumoTab" apps/frontend` e ajustar call-sites antes de tornar `showPhotos` obrigatório.

## Permissões na UI
`PhotoSection` só para `canManage`. Enviar/Excluir só para PROFESSIONAL (`isProfessional && canManage`). ADMIN vê lista/preview, não envia/exclui. Backend é fonte de verdade.

## Decisões técnicas
React Query (nunca Zustand). Upload via `FormData` + `apiClient.post`. Imagem sempre via `apiClient.getBlob` + `URL.createObjectURL` por thumbnail — nunca `<img src="/api/...">` direto. Object URL criada/revogada no componente consumidor. Sem edição — só envio/exclusão. PROFESSIONAL envia/exclui própria; ADMIN só vê.

## Restrições
NÃO axios fora do API Client. NÃO Zustand para dados da API. NÃO mapear DTO fora de mappers. NÃO `useState` para o campo de arquivos. NÃO reusar DTO do shared como tipo de form/input. NÃO `<img>` direto pra URL da API. NÃO esquecer `revokeObjectURL`. NÃO permitir envio/exclusão para quem não é o PROFESSIONAL da consulta.

## Estrutura esperada
```
components/features/consultation-photos/
  types/ consultation-photo-model.types.ts, consultation-photo-input.types.ts
  services/ consultation-photos.service.ts (+ .spec)
  mappers/ to-consultation-photo-model.mapper.ts (+ .spec)
  use-cases/ list-appointment-photos, upload-consultation-photos, delete-consultation-photo,
             fetch-consultation-photo-blob (+ .spec)
  hooks/ use-appointment-photos, use-upload-consultation-photos, use-delete-consultation-photo,
         use-photo-thumbnail (+ .spec)
  components/
    photo-section.tsx (+ integration.spec)
    photo-upload.tsx
    photo-thumbnail.tsx (+ integration.spec)
    photo-preview-modal.tsx (+ integration.spec)
    photo-delete-dialog.tsx
    photo-grid-skeleton.tsx

app/[slug]/(authenticated)/appointments/[id]/page.tsx       → MODIFICAR (aba Fotos + count)
components/features/appointments/components/resumo-tab.tsx  → MODIFICAR (DocumentRow Fotos)

cypress/e2e/consultation-photos/ upload-consultation-photo.cy.ts, delete-consultation-photo.cy.ts
cypress/fixtures/consultation-photos.json
```

## Cenários de teste
- Mapper: `createdAt` → `Date`. Use-cases chamam service+mapper; `fetchConsultationPhotoBlobUseCase` retorna `Blob` cru. Hooks invalidam `['appointment-photos', appointmentId]`.
- `PhotoSection`: loading→skeleton; vazio→mensagem; grid renderiza; ADMIN sem botões de ação, PROFESSIONAL com.
- `PhotoUpload`: rejeita PDF/>8MB no client; sucesso invalida lista; `422`→alerta.
- `PhotoThumbnail`: skeleton→imagem; **chama `revokeObjectURL` no unmount** (teste explícito); erro individual não quebra o grid.
- `PhotoPreviewModal`: abre ampliado; excluir pede confirmação.
- `resumo-tab`: count reflete lista; oculto se `showPhotos=false`.
- E2E: PROFESSIONAL envia 2 fotos → aparecem no grid/count; abre preview; exclui com confirmação → some; ADMIN vê sem botões de ação; USER não vê a aba.

## Definition of Done
- [ ] Aba "Fotos" real com `PhotoSection`; `count` na aba
- [ ] `DocumentRow` "Fotos" no resumo com count real
- [ ] Envio (PROFESSIONAL): multi-arquivo, validação client-side (tipo só imagem, 8MB)
- [ ] Grid de miniaturas por data de envio, preview ampliado ao clicar
- [ ] Exclusão (PROFESSIONAL) com confirmação
- [ ] Toda imagem via `apiClient.getBlob` + `URL.createObjectURL`
- [ ] Object URLs revogadas corretamente (testado)
- [ ] Upload multipart via `apiClient.post` + `FormData`
- [ ] Estados loading/error/empty/success + skeleton
- [ ] Enviar/excluir só PROFESSIONAL; ADMIN só vê
- [ ] Mappers DTO→Model; service só via apiClient
- [ ] Dados via React Query
- [ ] Testes unitários 100%
- [ ] Testes de integração (loading/error/success + revokeObjectURL)
- [ ] E2E dos fluxos críticos com `data-testid`
- [ ] Naming convention e estrutura seguidas
