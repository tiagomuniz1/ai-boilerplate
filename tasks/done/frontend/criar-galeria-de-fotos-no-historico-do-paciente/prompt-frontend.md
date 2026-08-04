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
- Reaproveitar `PhotoThumbnail`/`usePhotoThumbnail`/tipos da feature `consultation-photos` já criada — não duplicar
- NÃO implementar nenhum filtro de profissional no frontend — o backend já restringe, a UI só exibe

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Galeria de Fotos no Histórico do Paciente (Frontend)

## Descrição
Galeria paginada na página do paciente (`/[slug]/patients/[id]`) com fotos agregadas de todas as consultas daquele paciente com o profissional logado. Depende de `criar-tela-de-fotos-na-consulta` (reaproveita tipos/thumbnail) e do endpoint `GET /consultation-photos/by-patient/:patientId`. Filtragem por profissional é 100% backend.

## Contexto
Backend expõe `GET /consultation-photos/by-patient/:patientId?page=&limit=` (ADMIN, PROFESSIONAL) → `PaginatedConsultationPhotosResponseDto` (`{ data: ConsultationPhotoGalleryItemResponseDto[], total, page, limit }`), já restrito no servidor. `ConsultationPhotoGalleryItemResponseDto` estende `ConsultationPhotoResponseDto` + `professionalName`, `appointmentDate`.

Ponto de integração: `app/[slug]/(authenticated)/patients/[id]/page.tsx`, logo após `<PatientMedicalHistory patientId={id} />` (linhas 71-78 hoje), sob a mesma flag `canSeeMedicalHistory` (`ADMIN || PROFESSIONAL`).

Reaproveitar da feature já criada: `IConsultationPhotoModel`, `PhotoThumbnail`, `use-photo-thumbnail.hook.ts`. Lista aqui é **paginada** (diferente da seção da consulta).

## Contratos (types locais)
```ts
export interface IConsultationPhotoGalleryItemModel extends IConsultationPhotoModel {
  professionalName: string
  appointmentDate: Date
}
export interface IPaginatedConsultationPhotosModel {
  data: IConsultationPhotoGalleryItemModel[]; total: number; page: number; limit: number
}
```

## Assinaturas esperadas
```ts
usePatientPhotos(patientId, page, limit): UseQueryResult<IPaginatedConsultationPhotosModel>
listPatientPhotosUseCase(patientId, page, limit): Promise<IPaginatedConsultationPhotosModel>
consultationPhotosService.getByPatient(patientId, params: { page, limit }): Promise<PaginatedConsultationPhotosResponseDto>
toConsultationPhotoGalleryItemModel(dto): IConsultationPhotoGalleryItemModel
```
`usePatientPhotos` → `queryKey: ['patient-photos', patientId, page, limit]`. Reaproveitar `usePhotoThumbnail(photoId)` sem alteração.

## Fluxo principal

### `PatientPhotoGallery` (props `{ patientId }`)
1. Estado local `page`/`limit` (sugestão `limit = 20`).
2. `usePatientPhotos(patientId, page, limit)`.
3. Loading→skeleton grid; erro→alerta; vazio (`total === 0`)→"Nenhuma foto registrada para este paciente ainda".
4. Grid de `PhotoThumbnail` reaproveitado, com legenda `professionalName` + `appointmentDate` por item (ordenação continua por `createdAt`, vinda do backend).
5. Clique abre `PhotoPreviewModal` **sem botão de excluir** (usar prop `readOnly`/omitir `onDelete`).
6. Paginação simples (anterior/próxima ou numerada), desabilitada durante `isFetching`.

## Ligação nas telas existentes

### `patients/[id]/page.tsx`
Logo após a seção `<PatientMedicalHistory>`, sob a mesma `canSeeMedicalHistory`, adicionar:
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

## Permissões na UI
Seção atrás de `canSeeMedicalHistory`. Sem filtro adicional no frontend — confiar 100% na resposta do backend. Sem exclusão nesta tela.

## Decisões técnicas
React Query. Paginação client-side (state) + query params, backend pagina de fato. Reaproveita `PhotoThumbnail`/`usePhotoThumbnail`, sem duplicar. Sem exclusão aqui.

## Restrições
NÃO implementar filtro de profissional no frontend nem esconder itens no client. NÃO duplicar `PhotoThumbnail`/`usePhotoThumbnail`. NÃO adicionar botão de excluir. NÃO axios fora do API Client. NÃO Zustand para dados da API. NÃO buscar todas as páginas de uma vez.

## Estrutura esperada
```
components/features/consultation-photos/
  types/ consultation-photo-model.types.ts → MODIFICAR
  services/ consultation-photos.service.ts → MODIFICAR (+ .spec MODIFICAR)
  mappers/ to-consultation-photo-gallery-item-model.mapper.ts (+ .spec)
  use-cases/ list-patient-photos.use-case.ts (+ .spec)
  hooks/ use-patient-photos.hook.ts (+ .spec)
  components/
    patient-photo-gallery.tsx (+ integration.spec)
    patient-photo-gallery-skeleton.tsx

app/[slug]/(authenticated)/patients/[id]/page.tsx → MODIFICAR

cypress/e2e/consultation-photos/ patient-photo-gallery.cy.ts
```

## Cenários de teste
- Mapper: `createdAt`/`appointmentDate` → `Date`; `professionalName` preservado.
- Use-case chama service+mapper com `page`/`limit` corretos.
- Hook: `queryKey: ['patient-photos', patientId, page, limit]`.
- `PatientPhotoGallery`: loading→skeleton; vazio→mensagem; grid com `professionalName`/`appointmentDate`; paginação atualiza itens exibidos.
- Preview aberto a partir daqui não tem botão de excluir.
- Seção só aparece para `canSeeMedicalHistory`.
- **E2E crítico:** PROFESSIONAL A e B com consultas separadas do mesmo paciente X, cada um envia foto. Logado como A → galeria só com a foto de A. Logado como B → só a de B. ADMIN → as duas. USER → seção não aparece. Paginação com mais itens que `limit` navega corretamente.

## Definition of Done
- [ ] `PatientPhotoGallery` na página do paciente, atrás de `canSeeMedicalHistory`
- [ ] Consome `GET /consultation-photos/by-patient/:patientId` paginado
- [ ] Reaproveita `PhotoThumbnail`/`usePhotoThumbnail` sem duplicar
- [ ] Exibe `professionalName`/`appointmentDate`, ordenação por data de envio do backend
- [ ] Paginação funcional
- [ ] Sem exclusão nesta tela
- [ ] Nenhuma filtragem por profissional no frontend
- [ ] Estados loading/error/empty/success + skeleton
- [ ] Mappers DTO→Model; service só via apiClient
- [ ] Dados via React Query
- [ ] Testes unitários 100%
- [ ] Testes de integração (loading/error/success/paginação)
- [ ] E2E cobrindo isolamento entre dois profissionais no mesmo paciente, com `data-testid`
- [ ] Naming convention e estrutura seguidas
