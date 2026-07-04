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
- Espelhar `UploadClinicLogoUseCase`/`IStorageAdapter` (upload de logomarca) adaptando para múltiplos arquivos
- Modificar os arquivos indicados da task `criar-modulo-de-solicitacao-de-exames` — não recriá-los do zero

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Módulo de Resultado de Exames (Backend / Upload)

## Descrição
Anexar resultados de exames (upload de arquivo PDF/imagem, múltiplos por solicitação, `ExamResult` 1:N) a uma `ExamRequest` já existente. Upload muda `status` para `completed`; remover o último resultado ativo reverte para `requested`. Só o DOCTOR dono da consulta anexa/remove.

## Contexto
Continuação de `criar-modulo-de-solicitacao-de-exames`, que expõe `IExamRequestsRepository`/`FindExamRequestByIdUseCase`/`DeleteExamRequestUseCase`/`FindExamRequestsByAppointmentUseCase`. Único precedente de upload é `UploadClinicLogoUseCase` (1 arquivo) — aqui usar `FilesInterceptor` (plural).

**Esta task MODIFICA arquivos já existentes (não recriar do zero):**
- `DeleteExamRequestUseCase`: cascatear soft-delete dos `ExamResult`s numa transação.
- `FindExamRequestsByAppointmentUseCase`/`FindExamRequestByIdUseCase`: agregar `results` na resposta via `findByExamRequestIds` (evita N+1: 1 query com `IN (...)`, agrupada em memória).
- `ExamRequestResponseDto` (`@app/shared`): adicionar campo `results: ExamResultResponseDto[]`.

## Output — `ExamResultResponseDto` (novo, `@app/shared`)
`id`, `examRequestId`, `fileUrl`, `fileName`, `mimeType`, `fileSizeBytes`, `createdAt: Date`.

## Input — upload (multipart/form-data)
`files`: 1 a 5 arquivos. Tipos aceitos: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`. Tamanho máximo por arquivo: 10MB.

## Assinaturas esperadas
- `AddExamResultUseCase.execute(examRequestId, files: Express.Multer.File[], currentUser): Promise<ExamRequestResponseDto>`
- `DeleteExamResultUseCase.execute(resultId, currentUser): Promise<void>`

**IExamResultsRepository:** `findByExamRequestIds(examRequestIds, clinicId)`, `findById(id, clinicId)`, `countActiveByExamRequest(examRequestId, queryRunner?)`, `create(data, queryRunner?)`, `deleteByExamRequestId(examRequestId, queryRunner?)`, `delete(id, queryRunner?)` (softDelete).

## Fluxo principal

**POST /exam-requests/:id/results** (DOCTOR)
1. `FilesInterceptor('files', 5, { storage: memoryStorage() })` + `@UploadedFiles()`.
2. Busca `ExamRequest` → `NotFoundException`.
3. RBAC own: `doctorsRepository.findByUserId`; `doctor.id !== request.doctorId` → `ForbiddenException`.
4. Valida TODOS os arquivos (mimetype + tamanho 10MB) antes de qualquer upload → `UnprocessableEntityException` se algum inválido; nenhum arquivo → `UnprocessableEntityException`.
5. Upload de cada arquivo via `IStorageAdapter.upload`, path `exam-results/{clinicId}/{examRequestId}/{resultId}.{ext}` — fora da transação.
6. `runInTransaction`: persiste cada `ExamResult`; se `request.status !== COMPLETED`, `updateStatus(examRequestId, COMPLETED, queryRunner)`.
7. Invalida cache `exam-requests:appointment:${request.appointmentId}`; retorna via `FindExamRequestByIdUseCase.execute(examRequestId, currentUser)`.

**DELETE /exam-results/:id** (DOCTOR)
1. Busca resultado → `NotFoundException`. Busca solicitação pai → `NotFoundException`.
2. RBAC own: `doctor.id !== request.doctorId` → `ForbiddenException`.
3. `runInTransaction`: soft-delete do resultado; reconta `countActiveByExamRequest` (depois do delete); se `0` e `status === COMPLETED`, `updateStatus(request.id, REQUESTED, queryRunner)`.
4. Invalida cache; `204`.

## Permissões
POST = `@Roles(DOCTOR)`; DELETE = `@Roles(DOCTOR)`. Own-resource via `request.doctorId`.

## Dependências
`IStorageAdapter` (registrar no `ExamsModule` com a mesma factory condicional `AWS_S3_BUCKET`/`AWS_REGION` de `clinics.module.ts` — duplicar é o padrão aceito, `LogoFetcherService` já é duplicado entre módulos). `multer`. `IDoctorsRepository`, `CacheService`.

## Decisões técnicas
Path `exam-results/{clinicId}/{examRequestId}/{resultId}.{ext}`. URL pública sem expiração (mesmo padrão do `StorageAdapter` — aceito para este release, PHI fica com path não-enumerável mas sem expiração; registrar como trade-off, não implementar signed URL agora). Transação para escrita de `ExamResult` + `updateStatus`. Cache `exam-requests:appointment:${appointmentId}` invalidado após upload/remoção.

## Restrições
NÃO gravar em disco. NÃO `process.env` fora de `env.config.ts`. NÃO persistir no banco antes do upload ter sucesso. NÃO deletar arquivo do S3 ao remover resultado (soft delete basta). NÃO permitir ADMIN/USER anexar/remover.

## Migration
`1753000000000-create-exam-results-table.ts` (`SET search_path TO "${schema}", public`): `exam_results` (`id`, `clinic_id`, `exam_request_id`, `file_url text`, `file_name varchar(255)`, `mime_type varchar(100)`, `file_size_bytes integer`, `uploaded_by_user_id uuid`, `created_at`, `updated_at`, `deleted_at`) + índices `exam_request_id`, `clinic_id`.

## Estrutura esperada
```
modules/exams/
  entities/ exam-result.entity.ts
  repositories/ exam-results.repository.interface.ts, exam-results.repository.ts (+ .spec)
  use-cases/ add-exam-result.use-case.ts (+ .spec), delete-exam-result.use-case.ts (+ .spec)
  use-cases/ delete-exam-request.use-case.ts → MODIFICAR
  use-cases/ find-exam-requests-by-appointment.use-case.ts, find-exam-request-by-id.use-case.ts → MODIFICAR
  controllers/ exam-results.controller.ts (novo), exam-requests.controller.ts → MODIFICAR (+ POST /:id/results)
  exams.module.ts → MODIFICAR
packages/shared/src/dtos/ exam-result-response.dto.ts (novo), exam-request-response.dto.ts → MODIFICAR (+ results)
```

## Cenários de teste
- `AddExamResultUseCase`: 1 arquivo → `completed`; 2 arquivos no mesmo POST → ambos persistidos, 1 update; já `completed` → idempotente; mimetype inválido → nenhum persistido; >10MB → erro; sem arquivo → erro; DOCTOR alheio → `403`; inexistente → `404`; invalida cache.
- `DeleteExamResultUseCase`: remove único → `requested`; remove 1 de 2 → mantém `completed`; inexistente → `404`; alheio → `403`.
- `DeleteExamRequestUseCase` (regressão): cascade soft-delete dos resultados; rollback em falha.
- `Find*` (regressão): agregam `results` sem N+1; solicitação sem resultado → `results: []`.
- Integração: upload multi-arquivo sucesso; arquivo inválido `422`; sem arquivo `400`/`422`; ADMIN/USER `403`; DOCTOR alheio `403`; delete último resultado → `204` + GET mostra `requested`; delete por ADMIN/USER `403`.

## Definition of Done
- [ ] `ExamResult` (entidade + migration)
- [ ] `ExamResultResponseDto`; `ExamRequestResponseDto` com `results`
- [ ] `POST /exam-requests/:id/results` (FilesInterceptor, validação, upload)
- [ ] `DELETE /exam-results/:id` com reversão de status
- [ ] `DeleteExamRequestUseCase` cascateia (transação)
- [ ] `Find*` agregam `results` sem N+1
- [ ] `IStorageAdapter` registrado no `ExamsModule`
- [ ] Testes unitários (100%) e integração, incluindo regressão da task #1
- [ ] Naming convention e estrutura seguidas
