# Task — Galeria de Fotos no Histórico do Paciente (Frontend)

## Descrição
Implementar uma galeria paginada, na página de detalhe do paciente (`/[slug]/patients/[id]`), com as fotos de evolução do tratamento **agregadas de todas as consultas** daquele paciente com o profissional logado — para comparar a evolução ao longo do tempo num único lugar. Depende da task `criar-tela-de-fotos-na-consulta` (reaproveita tipos/mapper/thumbnail) e do endpoint da task backend `criar-endpoint-de-galeria-de-fotos-por-paciente`. A filtragem por profissional é **inteiramente do backend** — o frontend não precisa (e não deve) filtrar nada localmente, só consumir e renderizar o que a API já retorna restrito.

---

## Contexto
- Backend (task `criar-endpoint-de-galeria-de-fotos-por-paciente`) expõe `GET /consultation-photos/by-patient/:patientId?page=&limit=` (ADMIN, PROFESSIONAL) → `PaginatedConsultationPhotosResponseDto` (`{ data: ConsultationPhotoGalleryItemResponseDto[], total, page, limit }`), já restrito por profissional no servidor.
- `ConsultationPhotoGalleryItemResponseDto` estende os campos de `ConsultationPhotoResponseDto` (`id`, `appointmentId`, `fileName`, `mimeType`, `fileSizeBytes`, `createdAt`) e adiciona `professionalName: string`, `appointmentDate: Date`.
- Ponto de integração confirmado: `app/[slug]/(authenticated)/patients/[id]/page.tsx`, logo após a seção `<PatientMedicalHistory patientId={id} />` (linhas 71-78 hoje), sob a mesma flag `canSeeMedicalHistory` (`ADMIN || PROFESSIONAL`) — dado clínico sensível, mesma régua de acesso do histórico de prontuários.
- Reaproveitar da task `criar-tela-de-fotos-na-consulta`: `IConsultationPhotoModel` (types), `PhotoThumbnail`/`use-photo-thumbnail.hook.ts` (exibição de imagem autenticada com blob + object URL), `to-consultation-photo-model.mapper.ts` (adaptar/estender para o item de galeria, que tem campos extras).
- Diferente da seção da consulta (lista simples, sem paginação), aqui a lista **é paginada** — pode crescer bastante ao longo dos anos de acompanhamento de um mesmo paciente.

---

## Contratos (types locais)
```ts
// Estende o model de foto da task anterior com os campos extras da galeria
export interface IConsultationPhotoGalleryItemModel extends IConsultationPhotoModel {
  professionalName: string
  appointmentDate: Date
}

export interface IPaginatedConsultationPhotosModel {
  data: IConsultationPhotoGalleryItemModel[]
  total: number
  page: number
  limit: number
}
```

---

## Assinaturas esperadas
```ts
// Hook
usePatientPhotos(patientId: string, page: number, limit: number): UseQueryResult<IPaginatedConsultationPhotosModel>

// Use-case
listPatientPhotosUseCase(patientId: string, page: number, limit: number): Promise<IPaginatedConsultationPhotosModel>

// Service (adicionar ao consultationPhotosService já criado na task anterior)
consultationPhotosService.getByPatient(patientId: string, params: { page: number; limit: number }): Promise<PaginatedConsultationPhotosResponseDto>

// Mapper
toConsultationPhotoGalleryItemModel(dto: ConsultationPhotoGalleryItemResponseDto): IConsultationPhotoGalleryItemModel
```
- `usePatientPhotos` → `queryKey: ['patient-photos', patientId, page, limit]`.
- Reaproveitar `usePhotoThumbnail(photoId)` da task anterior sem alteração — a miniatura não muda dependendo de onde é exibida.

---

## Fluxo principal

### `PatientPhotoGallery` (props `{ patientId }`)
1. Estado local de paginação (`page`, `limit` — sugestão: `limit = 20`).
2. `usePatientPhotos(patientId, page, limit)` → dados paginados.
3. Loading: skeleton grid. Erro: alerta amigável. Vazio (`total === 0`): "Nenhuma foto registrada para este paciente ainda".
4. Grid de `PhotoThumbnail` (componente reaproveitado da task anterior), cada item mostrando adicionalmente `professionalName` e a data da consulta (`appointmentDate`) como legenda — a ordenação em si continua sendo por `createdAt` (data de envio), vindo do backend.
5. Clique numa miniatura abre o mesmo `PhotoPreviewModal` da task anterior — **sem botão de excluir aqui** (exclusão só faz sentido a partir da consulta específica onde a foto foi enviada, não a partir do agregado do paciente; se o `PhotoPreviewModal` for reaproveitado tal qual, controlar isso via uma prop `readOnly`/omitindo o `onDelete`).
6. Paginação: controles simples (anterior/próxima ou numerados), desabilitados durante `isFetching`, atualizando `total`/`page` conforme a resposta.

---

## Ligação nas telas existentes

### `app/[slug]/(authenticated)/patients/[id]/page.tsx`
Logo após a seção existente:
```tsx
{canSeeMedicalHistory && (
  <section className="mt-8">
    <h2 className="text-base font-semibold text-text mb-4" data-testid="patient-history-title">
      Histórico de Prontuários
    </h2>
    <PatientMedicalHistory patientId={id} />
  </section>
)}
```
adicionar, também sob `canSeeMedicalHistory`, uma nova seção:
```tsx
{canSeeMedicalHistory && (
  <section className="mt-8">
    <h2 className="text-base font-semibold text-text mb-4" data-testid="patient-photos-title">
      Fotos de Evolução
    </h2>
    <PatientPhotoGallery patientId={id} />
  </section>
)}
```
Importar `PatientPhotoGallery` de `@/components/features/consultation-photos/components/patient-photo-gallery`.

---

## Permissões na UI
- Seção inteira atrás de `canSeeMedicalHistory` (`ADMIN || PROFESSIONAL`) — mesmo critério do histórico de prontuários, já existente na página.
- **Não há filtro adicional no frontend** — o backend já restringe PROFESSIONAL às próprias consultas; a UI simplesmente renderiza o que a API devolve, sem tentar re-filtrar ou esconder itens no client.
- Sem ação de excluir nesta tela (só visualização) — exclusão fica exclusiva da aba "Fotos" dentro de cada consulta.

---

## Estados e feedbacks
- Loading inicial → skeleton grid. Loading de paginação (`isFetching` numa página já carregada antes) → indicador discreto, sem re-mostrar o skeleton cheio.
- Erro → `Alert`/`ErrorMessage` amigável.
- Vazio → mensagem "Nenhuma foto registrada para este paciente ainda".
- Paginação sempre visível quando `total > limit`, oculta quando cabe tudo numa página.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Paginação | Client-side state (`page`/`limit`) + query params na chamada, backend faz a paginação real |
| Exibição de imagem | Reaproveita `PhotoThumbnail`/`usePhotoThumbnail` da task `criar-tela-de-fotos-na-consulta`, sem duplicar |
| Filtragem por profissional | 100% backend — frontend só exibe o que recebe |
| Exclusão | Não disponível nesta tela |

---

## Restrições
- NÃO implementar filtro de profissional no frontend (nem esconder itens no client) — confiar inteiramente na resposta do backend.
- NÃO duplicar `PhotoThumbnail`/`usePhotoThumbnail` — importar da feature `consultation-photos` já criada.
- NÃO adicionar botão de excluir nesta tela.
- NÃO importar axios fora do API Client.
- NÃO armazenar dados da API em Zustand.
- NÃO buscar todas as páginas de uma vez (sem paginação real) — respeitar `page`/`limit` do backend.

---

## Estrutura esperada
```
components/features/consultation-photos/
  types/ consultation-photo-model.types.ts → MODIFICAR (+ IConsultationPhotoGalleryItemModel, IPaginatedConsultationPhotosModel)
  services/ consultation-photos.service.ts → MODIFICAR (+ getByPatient) (+ .spec MODIFICAR)
  mappers/ to-consultation-photo-gallery-item-model.mapper.ts (+ .spec)
  use-cases/ list-patient-photos.use-case.ts (+ .spec)
  hooks/ use-patient-photos.hook.ts (+ .spec)
  components/
    patient-photo-gallery.tsx (+ integration.spec)
    patient-photo-gallery-pagination.tsx (ou inline no componente acima, à critério de implementação)
    patient-photo-gallery-skeleton.tsx

app/[slug]/(authenticated)/patients/[id]/page.tsx → MODIFICAR (+ seção Fotos de Evolução)

cypress/e2e/consultation-photos/
  patient-photo-gallery.cy.ts
```

---

## Cenários de teste

### Unitários
- Mapper: `createdAt`/`appointmentDate` → `Date`; `professionalName` preservado.
- Use-case chama service + mapper com `page`/`limit` corretos.
- Hook usa `queryKey: ['patient-photos', patientId, page, limit]`.

### Integração
- `PatientPhotoGallery`: loading→skeleton; vazio→mensagem; grid renderiza com `professionalName`/`appointmentDate` visíveis; paginação atualiza a página exibida.
- Clique numa miniatura abre `PhotoPreviewModal` **sem** botão de excluir.
- Página do paciente: seção "Fotos de Evolução" só aparece para `canSeeMedicalHistory`.

### E2E — **cenário crítico de permissão**
- Seed: PROFESSIONAL A tem consulta com paciente X, envia foto; PROFESSIONAL B tem outra consulta com o mesmo paciente X, envia outra foto.
- Logado como PROFESSIONAL A, abrir `/patients/X` → galeria mostra **só** a foto de A (a de B não aparece, nem por engano).
- Logado como PROFESSIONAL B → galeria mostra **só** a foto de B.
- Logado como ADMIN → galeria mostra as duas fotos.
- Logado como USER → seção "Fotos de Evolução" não aparece na página do paciente.
- Paginação: com mais fotos que o `limit`, navegar para a página seguinte mostra os itens corretos.

---

## Definition of Done
- [ ] `PatientPhotoGallery` renderizada na página do paciente, atrás de `canSeeMedicalHistory`
- [ ] Consome `GET /consultation-photos/by-patient/:patientId` paginado
- [ ] Reaproveita `PhotoThumbnail`/`usePhotoThumbnail` sem duplicar
- [ ] Exibe `professionalName`/`appointmentDate` por item, mantendo ordenação por data de envio (do backend)
- [ ] Paginação funcional (client state + query params)
- [ ] Sem ação de excluir nesta tela
- [ ] **Nenhuma filtragem por profissional no frontend** — confia 100% no backend
- [ ] Estados loading/error/empty/success + skeleton
- [ ] Mappers DTO→Model; service só via apiClient
- [ ] Dados via React Query (nunca Zustand)
- [ ] Testes unitários 100% (mapper/use-case/hook)
- [ ] Testes de integração (loading/error/success/paginação)
- [ ] **E2E cobrindo explicitamente o isolamento entre dois profissionais no mesmo paciente**, com `data-testid`
- [ ] Naming convention e estrutura seguidas
