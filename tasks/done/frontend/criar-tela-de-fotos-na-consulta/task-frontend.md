# Task — Fotos na Tela da Consulta (Frontend)

## Descrição
Implementar o **envio de fotos**, a **listagem em miniatura**, a **visualização ampliada** e a **exclusão** de fotos de evolução do tratamento na tela de detalhe da consulta (`/[slug]/appointments/[id]`), numa nova aba "Fotos" (hoje inexistente — a aba precisa ser criada do zero, diferente de `exames`/`atestados` que já tinham placeholder). O profissional envia uma ou mais fotos, vê a lista em miniaturas ordenada por data de envio, e pode abrir cada uma em tamanho maior ou excluí-la. Espelha `ExameSection`/`exame-result-upload.tsx`, com um componente novo (`photo-thumbnail`) para exibir imagem autenticada — nada no projeto hoje renderiza `<img>` apontando para um endpoint autenticado.

---

## Contexto
Backend (task `criar-modulo-de-fotos-da-consulta`) expõe:
- `POST /consultation-photos/appointments/:appointmentId` (PROFESSIONAL) — multipart `files` (múltiplos) → `ConsultationPhotoResponseDto[]`
- `GET /consultation-photos?appointmentId=` (ADMIN, PROFESSIONAL) → `ConsultationPhotoResponseDto[]`
- `GET /consultation-photos/:id/file` (ADMIN, PROFESSIONAL) → binário (`image/jpeg`/`png`/`webp`)
- `DELETE /consultation-photos/:id` (ADMIN, PROFESSIONAL) → `204`

`ConsultationPhotoResponseDto` (`@app/shared`): `id`, `appointmentId`, `fileName`, `mimeType`, `fileSizeBytes`, `createdAt`. **Nunca** um campo de URL — toda imagem é obtida via `apiClient.getBlob('/consultation-photos/:id/file')` (mesmo padrão de download binário autenticado já usado em `downloadExamRequestPdfUseCase`), nunca `<img src="/api/...">` direto.

Roteamento por clínica: `app/[slug]/(authenticated)/...` (usar `useSlug`/`useBasePath` conforme já usado na página).

**Pontos de integração (sem placeholder pré-existente, diferente de `exames`):**
- `app/[slug]/(authenticated)/appointments/[id]/page.tsx` — `TabId` hoje é `'resumo' | 'prontuario' | 'receitas' | 'atestados' | 'exames'`; esta task adiciona `'fotos'` ao union type e um novo item em `tabItems`, seguindo o mesmo padrão condicional (`...(canManage ? [{ id: 'fotos', label: 'Fotos', count: photos?.length ?? 0 }] : [])`) de `'atestados'`/`'exames'`.
- `components/features/appointments/components/resumo-tab.tsx` — hoje só tem `DocumentRow` para Receitas/Atestados/Exames; esta task adiciona uma nova linha "Fotos", seguindo exatamente o padrão das existentes (props `photoCount`/`showPhotos`, `onNavigate('fotos')`). Rodar `grep -rn "<ResumoTab" apps/frontend` e ajustar todos os call-sites antes de tornar `showPhotos` obrigatório.

---

## Contratos (types locais)
```ts
export interface IConsultationPhotoModel {
  id: string
  appointmentId: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  createdAt: Date
}

// Input do upload (não reutilizar DTO do shared)
export interface IUploadConsultationPhotosInput {
  appointmentId: string
  files: File[]
}
```

---

## Assinaturas esperadas
```ts
// Hooks
useAppointmentPhotos(appointmentId: string): UseQueryResult<IConsultationPhotoModel[]>
useUploadConsultationPhotos(appointmentId: string): UseMutationResult<IConsultationPhotoModel[], IApiError, File[]>
useDeleteConsultationPhoto(appointmentId: string): UseMutationResult<void, IApiError, string>
usePhotoThumbnail(photoId: string): { url: string | null; isLoading: boolean; isError: boolean }

// Use-cases
listAppointmentPhotosUseCase(appointmentId): Promise<IConsultationPhotoModel[]>
uploadConsultationPhotosUseCase(appointmentId, files): Promise<IConsultationPhotoModel[]>
deleteConsultationPhotoUseCase(id): Promise<void>
fetchConsultationPhotoBlobUseCase(id): Promise<Blob>   // usado tanto pela thumbnail quanto pelo preview em tamanho maior

// Service
consultationPhotosService.{ getByAppointment(appointmentId), upload(appointmentId, files), remove(id), getFileBlob(id) }
```

- `useUploadConsultationPhotos`/`useDeleteConsultationPhoto` invalidam `['appointment-photos', appointmentId]` (mutations recebem `appointmentId` como argumento do hook, como em `useDeleteExamResult`).
- `consultationPhotosService.upload` monta `FormData` com `files.forEach(f => formData.append('files', f))`.
- `usePhotoThumbnail`: `useQuery({ queryKey: ['photo-thumbnail', photoId], queryFn: () => fetchConsultationPhotoBlobUseCase(photoId), staleTime: Infinity, gcTime: 1000 * 60 * 30 })` — arquivo é imutável após upload, cache longo é seguro. Converte o `Blob` resolvido em `URL.createObjectURL` num `useEffect` local ao componente que consome o hook (não guardar a object URL no cache do React Query, só o `Blob`), e **revoga a URL** (`URL.revokeObjectURL`) no cleanup do `useEffect` (unmount ou troca de `photoId`).

---

## Fluxo principal

### Seção na consulta (`PhotoSection`, props `{ appointmentId, canManage, userRole }`)
1. `useAppointmentPhotos(appointmentId)` → lista (ordenada por `createdAt` desc pelo backend).
2. Estado vazio: "Nenhuma foto enviada". Loading: skeleton (grid de placeholders). Erro: alerta amigável.
3. Grid de miniaturas (`PhotoThumbnail` por item), cada uma mostrando a data de envio (`createdAt`) formatada.
4. Clique numa miniatura abre `PhotoPreviewModal` com a imagem em tamanho maior e um botão **Excluir** (`isProfessional && canManage`).
5. Botão **Enviar fotos** (`isProfessional && canManage`) abre o seletor de múltiplos arquivos.

### Upload (`PhotoUpload`)
1. Input `type="file" multiple accept="image/jpeg,image/png,image/webp"`.
2. Validação client-side de mimetype/tamanho (8MB) antes do submit — mesma lista de tipos aceitos do backend (sem PDF).
3. Submit → `useUploadConsultationPhotos` → invalida a query, feedback. Erros `422` (tipo/tamanho) mapeados para mensagem amigável. Botão desabilitado enquanto `isPending`.

### Miniatura (`PhotoThumbnail`, prop `{ photoId, fileName, createdAt }`)
1. `usePhotoThumbnail(photoId)` → `{ url, isLoading, isError }`.
2. Loading → skeleton do tamanho da miniatura. Erro → placeholder de imagem quebrada com ícone. Sucesso → `<img src={url} alt={fileName} loading="lazy">`.
3. **Obrigatório:** `useEffect` de cleanup chamando `URL.revokeObjectURL(url)` ao desmontar ou quando `photoId` muda — cobrir isso em teste de integração.

### Preview ampliado / Excluir (`PhotoPreviewModal`)
1. Reusa (ou reconsulta em maior escala) o blob da foto selecionada, exibe em tamanho maior + `fileName` + data de envio.
2. Botão **Excluir** (`isProfessional && canManage`) abre `PhotoDeleteDialog` de confirmação → `useDeleteConsultationPhoto(photoId)` → invalida a key, fecha o modal, feedback.

---

## Ligação nas telas existentes

### `appointments/[id]/page.tsx`
- Adicionar `'fotos'` ao union `TabId`.
- Importar `useAppointmentPhotos` e `PhotoSection`; `const { data: photos } = useAppointmentPhotos(id)`.
- No `tabItems`, adicionar entrada gateada por `canManage` (como "Receitas"/"Atestados"/"Exames") com `count: photos?.length ?? 0`.
- Renderizar `{activeTab === 'fotos' && canManage && <PhotoSection appointmentId={id} canManage={canManage} userRole={role} />}`.
- Passar `photoCount`/`showPhotos` ao `ResumoTab`.

### `appointments/components/resumo-tab.tsx`
- Adicionar props `photoCount?: number` e `showPhotos: boolean`.
- Adicionar um novo `DocumentRow` "Fotos" envolvido em `{showPhotos && (...)}`, usando `photoCount ?? 0` — espelhando "Receitas"/"Atestados"/"Exames".
- Antes de tornar `showPhotos` obrigatório, rodar `grep -rn "<ResumoTab" apps/frontend` e ajustar todos os call-sites.

---

## Permissões na UI
- Renderizar `PhotoSection` apenas para `canManage` (PROFESSIONAL própria consulta / ADMIN) — mesmo critério de receitas/atestados/exames/prontuário.
- Botão **Enviar fotos** e **Excluir** somente para PROFESSIONAL (`isProfessional && canManage`). ADMIN vê a lista e abre o preview, mas não envia nem exclui.
- Backend é a fonte de verdade — a UI apenas esconde ações.

---

## Estados e feedbacks
- Loading → skeleton (grid de placeholders na seção; skeleton individual em cada thumbnail).
- Erro → `Alert`/`ErrorMessage` amigável (nunca `detail` técnico); thumbnail com erro individual mostra placeholder de imagem quebrada sem quebrar o grid inteiro.
- Vazio → "Nenhuma foto enviada".
- Sucesso enviar/excluir → feedback + invalidação de `['appointment-photos', appointmentId]`.
- Upload/Excluir desabilitados enquanto `isPending`. Confirmação obrigatória ao excluir.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Upload | `FormData` multi-arquivo via `apiClient.post` (axios só no API Client) |
| Exibição de imagem | `apiClient.getBlob` + `URL.createObjectURL` por thumbnail (nunca `<img src="/api/...">` direto — endpoint é autenticado) |
| Ciclo de vida da object URL | Criada e revogada no componente que a usa (`useEffect` cleanup), nunca guardada crua no cache do React Query |
| Modelo | várias fotos por consulta; sem edição, só envio e exclusão |
| Acesso | PROFESSIONAL envia/exclui (própria); ADMIN vê/abre preview |

---

## Restrições
- NÃO importar axios fora do API Client (incluindo download binário de imagem e upload multipart). NÃO armazenar dados da API em Zustand. NÃO mapear DTO em componentes/hooks — usar mappers. NÃO usar `useState` para o campo de arquivos do upload. NÃO reutilizar DTOs do shared como tipo do formulário/input. NÃO renderizar `<img>` apontando direto para a URL da API (sempre via blob + object URL). NÃO esquecer de revogar a object URL no unmount/troca de foto (vazamento de memória em galerias grandes). NÃO permitir envio/exclusão para quem não é o PROFESSIONAL da consulta.

---

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
    photo-thumbnail.tsx (+ integration.spec — cobrir revokeObjectURL)
    photo-preview-modal.tsx (+ integration.spec)
    photo-delete-dialog.tsx
    photo-grid-skeleton.tsx

app/[slug]/(authenticated)/appointments/[id]/page.tsx       → aba Fotos + count
components/features/appointments/components/resumo-tab.tsx  → DocumentRow "Fotos" com count real

cypress/e2e/consultation-photos/
  upload-consultation-photo.cy.ts, delete-consultation-photo.cy.ts
cypress/fixtures/consultation-photos.json
```

---

## Cenários de teste

### Unitários
- Mapper DTO↔Model: `createdAt` → `Date`.
- Use-cases chamam service + mapper corretamente; `fetchConsultationPhotoBlobUseCase` retorna o `Blob` cru (sem criar object URL — isso é responsabilidade do componente/hook).
- Hooks invalidam `['appointment-photos', appointmentId]` após upload/exclusão.

### Integração
- `PhotoSection`: loading→skeleton; vazio→mensagem; grid renderiza miniaturas; ADMIN não vê "Enviar fotos"/botão excluir; PROFESSIONAL vê.
- `PhotoUpload`: valida tipo/tamanho no client antes de enviar (rejeita PDF, rejeita >8MB); sucesso invalida a lista; erro `422` → alerta.
- `PhotoThumbnail`: mostra skeleton durante loading; mostra imagem ao resolver; **chama `URL.revokeObjectURL` no unmount** (teste explícito, mockando `URL.revokeObjectURL`); erro individual não quebra o grid.
- `PhotoPreviewModal`: abre com a imagem em tamanho maior; botão excluir pede confirmação e chama a mutation.
- `resumo-tab`: `count` de fotos reflete a lista; oculto quando `showPhotos=false`.

### E2E
- PROFESSIONAL envia 2 fotos numa consulta → aparecem no grid e no `count` da aba.
- PROFESSIONAL abre uma foto em preview e a vê ampliada.
- PROFESSIONAL exclui uma foto (com confirmação) → some do grid e do count.
- ADMIN vê o grid e abre o preview, sem botão de enviar/excluir.
- USER não vê a aba "Fotos" (nem no `tabItems`, nem na `resumo-tab`).

---

## Definition of Done
- [ ] Aba "Fotos" real na página da consulta com `PhotoSection` (visível p/ PROFESSIONAL própria / ADMIN); `count` na aba
- [ ] `DocumentRow` "Fotos" no resumo ligado ao count real
- [ ] Envio (PROFESSIONAL): multi-arquivo, validação client-side de tipo (só imagem)/tamanho (8MB)
- [ ] Grid de miniaturas ordenado por data de envio, com preview ampliado ao clicar
- [ ] Exclusão (PROFESSIONAL apenas) com confirmação
- [ ] Toda imagem exibida via `apiClient.getBlob` + `URL.createObjectURL`, nunca `<img src>` direto pra API
- [ ] Object URLs revogadas corretamente (sem vazamento de memória) — coberto em teste
- [ ] Upload multipart via `apiClient.post` com `FormData` (axios só no API Client)
- [ ] Estados loading/error/empty/success + skeleton (seção e por thumbnail)
- [ ] Botões de enviar/excluir só para PROFESSIONAL; ADMIN somente vê/abre preview
- [ ] Mappers DTO→Model; service só via apiClient
- [ ] Dados via React Query (nunca Zustand)
- [ ] Testes unitários 100% (mappers/use-cases/hooks)
- [ ] Testes de integração por componente (loading/error/success), incluindo `revokeObjectURL`
- [ ] E2E dos fluxos críticos com `data-testid`
- [ ] Naming convention e estrutura seguidas
