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
- Espelhar o mecanismo de upload de `AddExamResultUseCase`/`FilesInterceptor`/`IStorageAdapter`, mas sem entidade "pai" — a foto se relaciona direto com `appointmentId`
- Usar `IStorageAdapter.remove()` na exclusão (assumir que já existe, task anterior)
- Role atual do sistema é `PROFESSIONAL` (não `DOCTOR`)

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Módulo de Fotos da Consulta (Backend / Upload por Consulta)

## Descrição
Módulo `consultation-photos`: upload de fotos de evolução do tratamento anexadas a uma consulta (`ConsultationPhoto`, 1:N por `appointmentId`), listagem por consulta, download e exclusão. Sem etapa de "solicitação" — o upload já é o registro. A galeria agregada por paciente é outra task, que depende desta.

## Contexto
Espelha `AddExamResultUseCase`/`FilesInterceptor`/`IStorageAdapter`, mas sem entidade pai. Recurso escopado por `clinic_id`. `patientId`/`professionalId` são **denormalizados** na linha da foto (copiados do `appointment` no upload) — decisão para a galeria por paciente nunca precisar de join. Só o PROFESSIONAL dono da consulta anexa/remove; ADMIN lê/baixa/remove qualquer foto da clínica; USER sem acesso.

## Input (multipart/form-data)
`POST /consultation-photos/appointments/:appointmentId` — `files`: 1 a 10 arquivos. Tipos aceitos: `image/jpeg`, `image/png`, `image/webp` (sem PDF). Tamanho máximo por arquivo: 8MB.

## Output — `ConsultationPhotoResponseDto` (novo, `@app/shared`)
`id`, `appointmentId`, `fileName`, `mimeType`, `fileSizeBytes`, `createdAt: Date`. Nunca `filePath`.

## Assinaturas esperadas
- `UploadConsultationPhotosUseCase.execute(appointmentId, files: Express.Multer.File[], currentUser): Promise<ConsultationPhotoResponseDto[]>`
- `FindConsultationPhotosByAppointmentUseCase.execute(appointmentId, currentUser): Promise<ConsultationPhotoResponseDto[]>`
- `DownloadConsultationPhotoFileUseCase.execute(photoId, currentUser): Promise<{ buffer: Buffer; mimeType: string; fileName: string }>`
- `DeleteConsultationPhotoUseCase.execute(photoId, currentUser): Promise<void>`

**IConsultationPhotosRepository:**
```ts
export interface CreateConsultationPhotoData {
  id: string; clinicId: string; appointmentId: string; patientId: string; professionalId: string
  filePath: string; fileName: string; mimeType: string; fileSizeBytes: number; uploadedByUserId: string
}
export abstract class IConsultationPhotosRepository {
  abstract findByAppointment(appointmentId: string, clinicId: string): Promise<ConsultationPhoto[]>
  abstract findById(id: string, clinicId: string): Promise<ConsultationPhoto | null>
  abstract create(data: CreateConsultationPhotoData, queryRunner?: QueryRunner): Promise<ConsultationPhoto>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
```
(`findByPatient` NÃO entra aqui — é de outra task, que estende esta mesma interface/implementação.)

## Fluxo principal

**POST /consultation-photos/appointments/:appointmentId** (PROFESSIONAL)
1. `FilesInterceptor('files', 10, { storage: memoryStorage() })` + `@UploadedFiles()`.
2. Busca consulta (`appointmentsRepository.findById`) → `NotFoundException`.
3. RBAC own: `professionalsRepository.findByUserId`; `professional.id !== appointment.professionalId` → `ForbiddenException`.
4. Valida TODOS os arquivos (mimetype `image/jpeg|png|webp` + tamanho 8MB) antes de qualquer upload → `UnprocessableEntityException` se algum inválido; nenhum arquivo → `UnprocessableEntityException`.
5. Upload em paralelo (`Promise.all`) via `IStorageAdapter.upload`, path `consultation-photos/{clinicId}/{appointmentId}/{photoId}.{ext}` — fora da transação.
6. `runInTransaction`: persiste cada `ConsultationPhoto`, copiando `patientId`/`professionalId` do appointment.
7. Invalida cache `consultation-photos:appointment:${appointmentId}`; retorna array de DTOs.

**GET /consultation-photos?appointmentId=** (ADMIN, PROFESSIONAL) — RBAC own (PROFESSIONAL), ordena `createdAt DESC`, cache TTL 60s.

**GET /consultation-photos/:id/file** (ADMIN, PROFESSIONAL) — busca foto → `404`; RBAC own comparando `professional.id === photo.professionalId` direto (denormalizado, sem recarregar appointment); `storageAdapter.download` + stream, nunca URL pública.

**DELETE /consultation-photos/:id** (ADMIN, PROFESSIONAL) — busca foto → `404`; RBAC own → `403`; `runInTransaction` soft-delete; após commit, `storageAdapter.remove(photo.filePath)` em `try/catch` best-effort (warn + segue se falhar); invalida cache; `204`.

## Regras de negócio
Sem "solicitação" prévia. `patientId`/`professionalId` sempre do `appointment`, nunca do cliente. Múltiplos arquivos no POST processados em lote, validar todos antes de subir qualquer um. `clinicId` denormalizado. Exclusão remove do storage de fato (diferente de `exam-results`, que não remove).

## Permissões
POST = `@Roles(PROFESSIONAL)`; GET lista/GET file/DELETE = `@Roles(ADMIN, PROFESSIONAL)`. Own-resource no use-case.

## Dependências
`IAppointmentsRepository`, `IProfessionalsRepository`. `IStorageAdapter` (incluindo `remove()`) registrado no `ConsultationPhotosModule` com a mesma factory condicional `AWS_S3_BUCKET`/`AWS_REGION` de `exams.module.ts` (duplicar é o padrão aceito). `multer`. `CacheService`.

## Decisões técnicas
`FilesInterceptor('files', 10, { storage: memoryStorage() })`. Path `consultation-photos/{clinicId}/{appointmentId}/{photoId}.{ext}`. Download sempre por stream autenticado, nunca URL pública/assinada. Transação na escrita em lote. Cache `consultation-photos:appointment:${appointmentId}` TTL 60s. Migration já cria índice composto `(patient_id, professional_id)`, usado só pela task seguinte.

## Restrições
NÃO gravar em disco. NÃO `process.env` fora de `env.config.ts`. NÃO persistir antes do upload ter sucesso. NÃO aceitar PDF. NÃO permitir ADMIN fazer upload. NÃO permitir USER acessar nada do módulo. NÃO expor `filePath` no DTO. NÃO implementar listagem por paciente nesta task.

## Migration
`<timestamp>-create-consultation-photos-table.ts` (`SET search_path TO "${schema}", public`): `consultation_photos` (`id`, `clinic_id`, `appointment_id`, `patient_id`, `professional_id`, `file_path text`, `file_name varchar(255)`, `mime_type varchar(100)`, `file_size_bytes integer`, `uploaded_by_user_id uuid`, `created_at`, `updated_at`, `deleted_at`) + índices `appointment_id`, `clinic_id`, composto `(patient_id, professional_id)`.

## Estrutura esperada
```
apps/backend/src/modules/consultation-photos/
  entities/ consultation-photo.entity.ts
  repositories/ consultation-photos.repository.interface.ts, consultation-photos.repository.ts (+ .spec)
  use-cases/ upload-consultation-photos, find-consultation-photos-by-appointment,
             download-consultation-photo-file, delete-consultation-photo (.use-case.ts + .spec)
  controllers/ consultation-photos.controller.ts (+ .spec)
  consultation-photos.module.ts
  tests/ consultation-photos.integration.spec.ts
apps/backend/src/database/migrations/ <timestamp>-create-consultation-photos-table.ts
apps/backend/src/app.module.ts → MODIFICAR
packages/shared/src/dtos/ consultation-photo-response.dto.ts (novo), index.ts → MODIFICAR
```

## Cenários de teste
- `UploadConsultationPhotosUseCase`: 1 arquivo → sucesso; 3 arquivos → todos persistidos numa transação; mimetype inválido → nenhum persistido; >8MB → erro; sem arquivo → erro; PROFESSIONAL alheio → `403`; consulta inexistente → `404`; `patientId`/`professionalId` batem com o appointment; invalida cache.
- `FindConsultationPhotosByAppointmentUseCase`: ADMIN vê todas; PROFESSIONAL só as próprias; alheio → `403`; ordenado por `createdAt DESC`; cache hit/miss.
- `DownloadConsultationPhotoFileUseCase`: ADMIN qualquer foto; PROFESSIONAL só próprias; alheio → `403`; inexistente → `404`.
- `DeleteConsultationPhotoUseCase`: próprio → soft-delete + `storageAdapter.remove` chamado; erro no remove não impede a exclusão; inexistente → `404`; alheio → `403`.
- Integração: upload multi-arquivo `201`; arquivo inválido `422`; sem arquivo `422`; ADMIN/USER no POST `403`; PROFESSIONAL alheio `403`; GET lista ADMIN todas/PROFESSIONAL próprias/USER `403`; GET file retorna binário correto; DELETE `204` + some da listagem.

## Definition of Done
- [ ] `ConsultationPhoto` (entidade + migration) com `patientId`/`professionalId` denormalizados
- [ ] `ConsultationPhotoResponseDto` exportado, sem `filePath`
- [ ] POST com `FilesInterceptor`, validação de tipo/tamanho, upload via `IStorageAdapter`
- [ ] GET lista ordenada por `createdAt DESC`, com cache
- [ ] GET file faz stream autenticado
- [ ] DELETE soft-delete + remoção do storage best-effort
- [ ] Own-resource em todos os use-cases
- [ ] `ConsultationPhotosModule` registrado em `app.module.ts`, exporta `FindConsultationPhotosByAppointmentUseCase` e `IConsultationPhotosRepository`
- [ ] Testes unitários (100%) e integração
- [ ] Naming convention e estrutura seguidas
