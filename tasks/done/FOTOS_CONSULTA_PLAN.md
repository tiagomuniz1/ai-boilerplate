# Acervo de Fotos da Consulta (Consultation Photos)

> **Status: planejado, não iniciado.** Levantado em 2026-07-27 a partir de um pedido do usuário para registrar evolução de tratamento com imagens. Ver ordem de execução ao final.

## Contexto

Médicos precisam registrar com imagens a evolução do tratamento de um paciente. Hoje o sistema já tem dois módulos de "anexar arquivo à consulta" (`exames` e `atestados`), mas nenhum foi pensado para fotos clínicas nem para visualização cronológica entre consultas diferentes.

O requisito, confirmado com o usuário:
- **Upload acontece dentro da consulta** (como exames/atestados hoje).
- **Visualização em dois lugares**: (1) na própria aba da consulta onde foram enviadas, e (2) numa galeria no histórico do paciente, agregando fotos de **todas as consultas do mesmo profissional** com aquele paciente — para acompanhar evolução ao longo do tempo. Um profissional **nunca** vê fotos que outro profissional anexou em consultas diferentes com o mesmo paciente, mesmo sendo o mesmo paciente/clínica.
- Organizadas por **data de envio** (`createdAt`), não data da consulta.
- Permissões iguais ao módulo `exames`: PROFESSIONAL só vê/envia nas próprias consultas; ADMIN vê/gerencia tudo da clínica; USER sem acesso.

A investigação confirmou que o padrão de `exams` (`ExamResult`) é o molde certo para clonar no backend, e que `find-medical-records-by-patient.use-case.ts` já implementa exatamente a regra de "PROFESSIONAL só vê o próprio filtro, mesmo que tente passar outro `professionalId`" (linha 33-38: sobrescreve `professionalIdFilter` sempre que `role === PROFESSIONAL`, ignorando o que vier do client) — essa é a base de autorização para a galeria por paciente.

## Decisão: corrigir o gap de storage (não replicar em `exams`)

`IStorageAdapter` (`apps/backend/src/common/adapters/storage.adapter.interface.ts`) hoje só tem `upload`/`download` — `exams` faz soft-delete do registro no banco mas nunca remove o arquivo do S3/disco, gerando lixo órfão. Para fotos isso tende a se acumular mais rápido (mais uploads por consulta, ao longo de anos). Vamos:
- Adicionar `abstract remove(path: string): Promise<void>` na interface.
- Implementar em `storage.adapter.ts` (S3 `DeleteObjectCommand`) e `local-storage.adapter.ts` (`fs.unlink`, tolerando arquivo inexistente).
- `DeleteConsultationPhotoUseCase` chama `remove()` depois do soft-delete confirmado, em `try/catch` best-effort (mesmo padrão de invalidação de cache já usado em todo o projeto — nunca falha a operação principal).
- **Não mexer no módulo `exams`** — fica registrado como fast-follow, fora de escopo aqui.

## Backend

Novo módulo `apps/backend/src/modules/consultation-photos/`, clonando a estrutura do `exams` (Clean Architecture: controller → use-case → repository, `BaseUseCase`/`runInTransaction`, interfaces `abstract class`).

**Entidade** `ConsultationPhoto` (tabela `consultation_photos`), com FKs **denormalizadas** (`patientId` e `professionalId` direto na linha, copiados do appointment no momento do upload) para a query por paciente nunca precisar de join com `appointments`:

`id, clinic_id, appointment_id, patient_id, professional_id, file_path, file_name, mime_type, file_size_bytes, uploaded_by_user_id, created_at, updated_at, deleted_at`

Índices: `appointment_id`, `clinic_id`, composto `(patient_id, professional_id)` — este último é a query da galeria do paciente.

Migration `apps/backend/src/database/migrations/<timestamp>-create-consultation-photos-table.ts`, seguindo exatamente o formato de `1753000000000-create-exam-results-table.ts` (SQL raw, `down()` simétrico).

**Repository** (`consultation-photos.repository.interface.ts` + `.ts`): `findByAppointment`, `findByPatient(clinicId, patientId, page, limit, professionalId?)` (mesmo query-builder de `MedicalRecordsRepository.findByPatient`), `findById`, `create`, `delete` — todos aceitando `QueryRunner` opcional.

**Use-cases** (cada um com teste unitário, mockando todas as dependências):
1. `UploadConsultationPhotosUseCase` — clona `AddExamResultUseCase` (`apps/backend/src/modules/exams/use-cases/add-exam-result.use-case.ts`) quase linha a linha: valida appointment existe, checa ownership (`professionalsRepository.findByUserId` + compara `.id` com `appointment.professionalId`), valida mime (`image/jpeg|png|webp` — **sem PDF**, diferente de exames) e tamanho (recomendo 8MB/arquivo), sobe em paralelo (`Promise.all`) pra chave `consultation-photos/${clinicId}/${appointmentId}/${photoId}.${ext}`, insere tudo num `runInTransaction`, copiando `patientId`/`professionalId` do appointment pra cada linha.
2. `FindConsultationPhotosByAppointmentUseCase` — mesma checagem de ownership, lista ordenada por `createdAt DESC`.
3. `FindConsultationPhotosByPatientUseCase` — clona `FindMedicalRecordsByPatientUseCase` (linha 33-38): se `currentUser.role === PROFESSIONAL`, força `professionalIdFilter = professional.id` **ignorando** qualquer valor vindo do client. ADMIN não filtra. Paginado.
4. `DownloadConsultationPhotoFileUseCase` — carrega foto por `id+clinicId`, checa `professional.id === photo.professionalId` (comparação direta, já que está denormalizado — mais simples que em exames), stream via `storageAdapter.download()`. Nunca expõe URL pública.
5. `DeleteConsultationPhotoUseCase` — ownership check, soft-delete em transação, depois `storageAdapter.remove()` best-effort.

**Controller** `consultation-photos.controller.ts`:
```
POST   /consultation-photos/appointments/:appointmentId   Roles(PROFESSIONAL)   FilesInterceptor('files', 10, memoryStorage())
GET    /consultation-photos?appointmentId=X                Roles(ADMIN, PROFESSIONAL)
GET    /consultation-photos/by-patient/:patientId          Roles(ADMIN, PROFESSIONAL)   paginado (PaginationDto)
GET    /consultation-photos/:id/file                        Roles(ADMIN, PROFESSIONAL)   stream
DELETE /consultation-photos/:id                              Roles(ADMIN, PROFESSIONAL)   204
```
Dois endpoints de listagem separados (não um único com parâmetros opcionais ambíguos) — mesma divisão de estilo que já existe hoje entre `exames` (lista por consulta, sem paginação) e `medical-records` (lista por paciente, paginada).

**Módulo**: registra as 5 use-cases + `IConsultationPhotosRepository` + a mesma factory de `IStorageAdapter` baseada em env (copiar o bloco, não compartilhar entre módulos — é a convenção já usada em todo o projeto). Importa `AppointmentsModule`, `ProfessionalsModule`, `PatientsModule`, `ClinicsModule`, `CacheModule`. Registrar em `app.module.ts` junto com `ExamsModule`.

**DTOs compartilhados** (`packages/shared/src/dtos/`, exportados via `index.ts`):
- `consultation-photo-response.dto.ts` — `{ id, appointmentId, fileName, mimeType, fileSizeBytes, createdAt }` (nunca `filePath`).
- `consultation-photo-gallery-item-response.dto.ts` — estende o acima + `professionalName`, `appointmentDate` (join no repository, não denormalizado, pra não ficar com nome desatualizado).
- `paginated-consultation-photos-response.dto.ts` — `{ data, total, page, limit }`.

**Permissões** — adicionar ao `ai/context/permissions.md` uma seção `Fotos da Consulta (/consultation-photos)` igual à tabela de `exames`, deixando explícito que a listagem por paciente restringe PROFESSIONAL às próprias consultas.

## Frontend

Nova feature `apps/frontend/components/features/consultation-photos/`, espelhando a estrutura de `exames/` (services/use-cases/mappers/hooks/types/components — 4 camadas: service → use-case → mapper → hook, todas testadas).

**Componentes principais:**
- `photo-section.tsx` — widget da aba da consulta, mesmo formato de `exame-section.tsx`: lista própria via `useAppointmentPhotos(appointmentId)` (`queryKey: ['appointment-photos', appointmentId]`).
- `photo-upload.tsx` — input escondido atrás de botão (padrão único de upload no projeto, sem drag-and-drop), `accept="image/jpeg,image/png,image/webp"`.
- `photo-thumbnail.tsx` + `use-photo-thumbnail.hook.ts` — **peça nova**: nada no projeto hoje renderiza imagem autenticada inline. Busca o blob via `apiClient.getBlob()`, `URL.createObjectURL()`, e **precisa revogar a URL no unmount/troca de foto** (cobrir isso em teste de integração — é fácil esquecer).
- `photo-preview-modal.tsx` — visualização em tamanho maior + excluir.
- `patient-photo-gallery.tsx` — grid paginado para a página do paciente, via `usePatientPhotos(patientId, page, limit)` (`queryKey: ['patient-photos', patientId, page, limit]`). A filtragem por profissional é **inteiramente server-side** — o frontend só consome o resultado já restrito, mesma confiança que `PatientMedicalHistory` já deposita no backend hoje.

**Wiring nos dois pontos confirmados por leitura direta do código:**
- `apps/frontend/app/[slug]/(authenticated)/appointments/[id]/page.tsx` — adicionar `'fotos'` a `TabId`, chamar `useAppointmentPhotos(id)` pro contador da aba, renderizar `<PhotoSection appointmentId={id} professionalId={appointment.professionalId} canManage={canManage} userRole={role} />` seguindo o mesmo `if (canManage)` de `atestados`/`exames`.
- `apps/frontend/components/features/appointments/components/resumo-tab.tsx` — nova `<DocumentRow label="Fotos" count={photoCount} onClick={() => onNavigate('fotos')} />`.
- `apps/frontend/app/[slug]/(authenticated)/patients/[id]/page.tsx` (linhas 71-78 hoje) — logo depois da seção `<PatientMedicalHistory>`, mesma flag `canSeeMedicalHistory`, adicionar `<PatientPhotoGallery patientId={id} />` numa nova `<section>`.

## Testes

- **Backend**: unitário 100% (cada use-case + os dois adapters de storage com o novo `remove()`), integração HTTP completa (`consultation-photos.integration.spec.ts`, espelhando `exams.integration.spec.ts`).
- **Frontend**: unit/integration pros 4 camadas + componentes (loading/error/success), incluindo o teste de `URL.revokeObjectURL` no thumbnail.
- **Cypress** (`apps/frontend/cypress/e2e/consultation-photos/`): upload na consulta, listagem por consulta, exclusão, e o **cenário crítico de permissão**: dois profissionais com consultas separadas do mesmo paciente, cada um sobe uma foto — logado como profissional A só vê a própria no histórico do paciente, ADMIN vê as duas, USER sem acesso a nenhuma superfície.

## Ordem de execução

1. DTOs compartilhados (`packages/shared`)
2. `IStorageAdapter.remove()` + as duas implementações + testes
3. Entidade + migration + repository + módulo (esqueleto)
4. Use-cases (com testes unitários)
5. Controller + DTOs de query + registro em `app.module.ts` + teste de integração
6. Camadas de frontend (service/use-case/mapper/hook) + testes
7. Componentes da aba da consulta (`photo-section`, upload, thumbnail, preview, delete) + wiring na página de consulta e no `resumo-tab`
8. `patient-photo-gallery` + wiring na página do paciente
9. Cypress E2E + atualizar `ai/context/permissions.md` e os `CHANGELOG.md`

## Verificação

- `yarn workspace @app/backend test:unit --coverage` — 100% no módulo novo
- `yarn workspace @app/backend test:integration` — sobe upload, lista por consulta, lista por paciente com dois profissionais (confirmar isolamento), download, delete
- `yarn workspace @app/backend migration:run` local antes de testar manualmente
- `yarn workspace @app/frontend test` — unit + integration
- `yarn workspace @app/frontend cypress:run` — specs novos de `consultation-photos`
- Teste manual: subir 2 fotos numa consulta como profissional A, confirmar que aparecem na aba e no histórico do paciente; logar como profissional B (consulta diferente, mesmo paciente) e confirmar que as fotos de A **não aparecem**; logar como ADMIN e confirmar que vê as duas.
