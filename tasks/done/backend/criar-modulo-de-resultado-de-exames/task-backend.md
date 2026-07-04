# Task — Módulo de Resultado de Exames (Backend / Upload)

## Descrição
Implementar o anexo de **resultados de exames** (upload de arquivo PDF/imagem) a uma solicitação já criada (task `criar-modulo-de-solicitacao-de-exames`). Cada solicitação pode receber **múltiplos arquivos de resultado** ao longo do tempo (`ExamResult`, 1:N). O upload muda o `status` da solicitação para `completed`; remover o último resultado ativo reverte para `requested`. Espelha o padrão de upload já existente em `upload-logomarca-clinica`, adaptado para múltiplos arquivos e com efeito colateral em outra entidade.

---

## Contexto
- Continuação da task #1 (`criar-modulo-de-solicitacao-de-exames`), que expõe `IExamRequestsRepository`/`FindExamRequestByIdUseCase`/`DeleteExamRequestUseCase`/`FindExamRequestsByAppointmentUseCase`.
- Único precedente de upload real no projeto é `UploadClinicLogoUseCase` (memoryStorage + `IStorageAdapter`), usado para 1 arquivo — esta task usa `FilesInterceptor` (plural) para múltiplos arquivos numa única requisição.
- Só o DOCTOR anexa e remove resultado — mesma pessoa que solicita, dono da consulta.
- Esta task **também modifica** arquivos criados na task #1 (não apenas adiciona arquivos novos):
  - `DeleteExamRequestUseCase`: passa a cascatear o soft-delete dos `ExamResult`s dentro de uma transação, já que a solicitação passa a ter dependentes.
  - `FindExamRequestsByAppointmentUseCase`/`FindExamRequestByIdUseCase`: passam a agregar `results` na resposta.
  - `ExamRequestResponseDto` (`@app/shared`): ganha o campo `results: ExamResultResponseDto[]` (mesmo padrão de `ClinicResponseDto` ganhando `logoUrl`/`faviconUrl` na task de upload de logomarca).

---

## Contratos

### Output
**ExamResultResponseDto:** `id`, `examRequestId`, `fileUrl`, `fileName`, `mimeType`, `fileSizeBytes`, `createdAt: Date`.

**Atualização em `ExamRequestResponseDto`** (`packages/shared/src/dtos/exam-request-response.dto.ts`, criado na task #1): adicionar campo `results: ExamResultResponseDto[]`.

### Input
**Upload de resultado (multipart/form-data):**
- `files`: um ou mais arquivos (obrigatório, mínimo 1, máximo 5 por requisição)
  - Tipos aceitos: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`
  - Tamanho máximo por arquivo: **10MB** (laudos/imagens de exame — maior que o limite de 2MB usado para logo)

---

## Assinaturas esperadas

**Use-cases:**
- `AddExamResultUseCase.execute(examRequestId: string, files: Express.Multer.File[], currentUser): Promise<ExamRequestResponseDto>`
- `DeleteExamResultUseCase.execute(resultId: string, currentUser): Promise<void>`

**IExamResultsRepository:**
- `findByExamRequestIds(examRequestIds: string[], clinicId: string): Promise<ExamResult[]>` — usado pelos use-cases `Find*` da task #1 (a modificar) para agregar `results` sem N+1: 1 query com `exam_request_id IN (...)`, agrupada em memória (`Map<examRequestId, ExamResult[]>`).
- `findById(id: string, clinicId: string): Promise<ExamResult | null>`
- `countActiveByExamRequest(examRequestId: string, queryRunner?: QueryRunner): Promise<number>`
- `create(data, queryRunner?): Promise<ExamResult>`
- `deleteByExamRequestId(examRequestId: string, queryRunner?: QueryRunner): Promise<void>` — cascade
- `delete(id: string, queryRunner?: QueryRunner): Promise<void>` (softDelete)

**Modificações nos arquivos da task #1 (edições, não arquivos novos):**
- `FindExamRequestsByAppointmentUseCase`/`FindExamRequestByIdUseCase`: após buscar os `ExamRequest`(s), buscam também os `ExamResult`s via `findByExamRequestIds` e incluem `results` no DTO retornado por `toExamRequestResponse`.
- `DeleteExamRequestUseCase`: passa a rodar em `runInTransaction`, chamando `examResultsRepository.deleteByExamRequestId(id, queryRunner)` **antes** de `examRequestsRepository.delete(id, queryRunner)`.

---

## Fluxo principal

**POST /exam-requests/:id/results** (DOCTOR)
1. Controller recebe os arquivos via `FilesInterceptor('files', 5, { storage: memoryStorage() })` + `@UploadedFiles()`.
2. Use-case busca a solicitação (`examRequestsRepository.findById(id, clinicId)`) → `NotFoundException`.
3. RBAC own: `doctorsRepository.findByUserId(currentUser.id, clinicId)`; `doctor.id !== request.doctorId` → `ForbiddenException`.
4. Valida cada arquivo: mimetype e tamanho (10MB) → `UnprocessableEntityException` se algum for inválido; nenhum arquivo → `UnprocessableEntityException`. **Valida todos antes de fazer qualquer upload** — se um falhar, nenhum é persistido.
5. Upload de cada arquivo ao storage (`IStorageAdapter.upload`, path `exam-results/{clinicId}/{examRequestId}/{resultId}.{ext}`) — fora da transação (S3 não é transacional, mesmo padrão do upload de logo).
6. `runInTransaction`: persiste cada `ExamResult`; se `request.status !== COMPLETED`, chama `examRequestsRepository.updateStatus(examRequestId, COMPLETED, queryRunner)`.
7. Invalida cache `exam-requests:appointment:${request.appointmentId}`.
8. Retorna `ExamRequestResponseDto` atualizado — reusar `FindExamRequestByIdUseCase.execute(examRequestId, currentUser)` para montar a resposta com `results` completos.

**DELETE /exam-results/:id** (DOCTOR)
1. Busca o resultado (`examResultsRepository.findById(id, clinicId)`) → `NotFoundException`.
2. Busca a solicitação pai (`examRequestsRepository.findById(result.examRequestId, clinicId)`) → `NotFoundException` (defesa em profundidade).
3. RBAC own: `doctor.id !== request.doctorId` → `ForbiddenException`.
4. `runInTransaction`: soft-delete do resultado; reconta `countActiveByExamRequest(request.id, queryRunner)` **depois** do delete, na mesma transação; se `0` e `request.status === COMPLETED`, `updateStatus(request.id, REQUESTED, queryRunner)`.
5. Invalida cache; `204`.

---

## Fluxos alternativos
- Nenhum arquivo enviado → `400`/`422` (validação de negócio se o array chegar vazio).
- Mimetype inválido → `UnprocessableEntityException('Invalid file type. Accepted: pdf, jpeg, png, webp')`.
- Arquivo maior que 10MB → `UnprocessableEntityException('File too large. Maximum size is 10MB')`.
- Solicitação/resultado inexistente → `404`; DOCTOR alheio → `403`; falha de cache → `warn` + segue.
- Excluir um resultado que não é o último → `status` da solicitação permanece `completed`.

---

## Regras de negócio
- `status` é derivado automaticamente — **nunca** setado diretamente pelo cliente.
- Upload não é transacional com o storage — se a transação de banco falhar após o upload ter sido feito, o arquivo fica órfão no S3 (mesma limitação aceita em `upload-clinic-logo`); não implementar compensação nesta versão.
- `clinicId` denormalizado em `exam_results` para isolamento de tenant sem depender de join com `exam_requests`.
- Múltiplos arquivos no mesmo POST são processados em lote — validar todos antes de qualquer upload.

---

## Permissões

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Anexar resultado (POST) | ✗ | ✓ própria | ✗ | ✗ |
| Remover resultado (DELETE) | ✗ | ✓ própria | ✗ | ✗ |

POST = `@Roles(DOCTOR)`; DELETE = `@Roles(DOCTOR)`. Own-resource no use-case (via `request.doctorId`, não via o resultado diretamente).

---

## Dependências
- `IStorageAdapter` (`common/adapters/storage.adapter.interface.ts`, implementações já existentes `storage.adapter.ts`/`local-storage.adapter.ts`) — registrar no `ExamsModule` com a mesma factory condicional (`AWS_S3_BUCKET`/`AWS_REGION`) usada em `clinics.module.ts` (duplicar a factory é o padrão já aceito no projeto — `LogoFetcherService` já é duplicado entre módulos).
- `multer`/`@types/multer` (já dependências).
- `IDoctorsRepository`, `CacheService`.

---

## Decisões técnicas
- `FilesInterceptor('files', 5, { storage: memoryStorage() })` — memória, sem disco, compatível com ECS.
- Path no S3: `exam-results/{clinicId}/{examRequestId}/{resultId}.{ext}`, `ext` derivado do mimetype (`application/pdf` → `pdf`, `image/jpeg` → `jpg`, `image/png` → `png`, `image/webp` → `webp`).
- URL pública sem expiração (mesmo padrão de `StorageAdapter`, ACL `public-read`) — aceito para esta versão; ver nota de trade-off abaixo.
- Transação: sim, para a escrita em `exam_results` + `updateStatus` (duas operações atômicas).
- Cache: invalidar `exam-requests:appointment:${appointmentId}` após upload/remoção.

> **Nota de segurança a registrar (não bloqueia a implementação):** arquivos de resultado de exame são dado clínico sensível (PHI). O `IStorageAdapter` atual gera URL pública permanente (mesma usada para logo de clínica, que não é sensível). O path usa apenas UUIDs (não enumerável), mitigando descoberta acidental, mas a URL não expira. Aceitar para este release por paridade com o único precedente de upload do projeto; considerar evoluir para signed URL com expiração numa iteração futura.

---

## Restrições
- NÃO gravar arquivo em disco no servidor. NÃO `process.env` fora de `env.config.ts`. NÃO persistir no banco antes do upload ter sucesso. NÃO deletar o arquivo do S3 ao remover o resultado (soft delete no banco é suficiente, mesmo padrão de `upload-clinic-logo`). NÃO permitir ADMIN/USER anexar ou remover resultado.

---

## Migration
`1753000000000-create-exam-results-table.ts` (`SET search_path TO "${schema}", public`): tabela `exam_results` (`id`, `clinic_id`, `exam_request_id`, `file_url text`, `file_name varchar(255)`, `mime_type varchar(100)`, `file_size_bytes integer`, `uploaded_by_user_id uuid`, `created_at`, `updated_at`, `deleted_at`) + índices em `exam_request_id`, `clinic_id`. `down` dropa índices e tabela.

---

## Estrutura esperada
```
modules/exams/
  entities/ exam-result.entity.ts
  repositories/ exam-results.repository.interface.ts, exam-results.repository.ts (+ .spec)
  use-cases/ add-exam-result.use-case.ts (+ .spec), delete-exam-result.use-case.ts (+ .spec)
  use-cases/ delete-exam-request.use-case.ts → MODIFICAR (cascade, ver Contexto)
  use-cases/ find-exam-requests-by-appointment.use-case.ts,
             find-exam-request-by-id.use-case.ts → MODIFICAR (agregar results)
  controllers/ exam-results.controller.ts (novo, @Controller('exam-results'))
  controllers/ exam-requests.controller.ts → MODIFICAR (+ POST /:id/results)
  exams.module.ts → MODIFICAR (+ entity ExamResult, + providers, + IStorageAdapter)
packages/shared/src/dtos/ exam-result-response.dto.ts (novo)
packages/shared/src/dtos/ exam-request-response.dto.ts → MODIFICAR (+ campo results)
```

---

## Cenários de teste

### `AddExamResultUseCase`
- Upload de 1 arquivo válido (PDF) → `status` muda para `completed`.
- Upload de 2 arquivos (PDF + imagem) na mesma chamada → ambos persistidos, 1 só update de status.
- Upload numa solicitação já `completed` → mantém `completed` (sem update redundante).
- Mimetype inválido (ex.: `text/plain`) → `UnprocessableEntityException`, nenhum arquivo é persistido.
- Arquivo > 10MB → `UnprocessableEntityException`.
- Nenhum arquivo → `UnprocessableEntityException`.
- DOCTOR alheio → `ForbiddenException`.
- Solicitação inexistente → `NotFoundException`.
- Invalida cache após sucesso.

### `DeleteExamResultUseCase`
- Remove o único resultado → `status` volta para `requested`.
- Remove 1 de 2 resultados → `status` permanece `completed`.
- Resultado inexistente → `404`; DOCTOR alheio → `403`.

### `DeleteExamRequestUseCase` (cascade, regressão da task #1)
- Excluir solicitação com resultados anexados → todos os `ExamResult`s são soft-deletados na mesma transação.
- Falha no meio da transação → rollback (nem solicitação nem resultados são deletados).

### `FindExamRequestByIdUseCase` / `FindExamRequestsByAppointmentUseCase` (regressão da task #1)
- Resposta inclui `results` agregados corretamente por solicitação (sem N+1 — 1 query adicional para todos os requests retornados).
- Solicitação sem nenhum resultado → `results: []`.

### Integração
- `POST /exam-requests/:id/results` DOCTOR próprio, multipart com 2 arquivos → sucesso, `status` no corpo é `completed`.
- `POST` com arquivo inválido → `422`; `POST` sem arquivo → `400`/`422`; `POST` ADMIN/USER → `403`; `POST` DOCTOR alheio → `403`.
- `DELETE /exam-results/:id` DOCTOR próprio, último resultado → `204`, GET subsequente mostra `status: requested`.
- `DELETE /exam-results/:id` ADMIN/USER → `403`.

---

## Definition of Done
- [ ] `ExamResult` (entidade + migration) criado
- [ ] `ExamResultResponseDto` no `@app/shared`; `ExamRequestResponseDto` atualizado com `results`
- [ ] `POST /exam-requests/:id/results` com `FilesInterceptor`, validação de tipo/tamanho, upload via `IStorageAdapter`
- [ ] `DELETE /exam-results/:id` com reversão de status quando é o último resultado
- [ ] `DeleteExamRequestUseCase` cascateia soft-delete dos resultados (transação)
- [ ] `Find*` da task #1 agregam `results` sem N+1
- [ ] `IStorageAdapter` registrado no `ExamsModule`
- [ ] Testes unitários (100%) e integração cobrindo os cenários (incluindo regressão da task #1)
- [ ] Naming convention e estrutura seguidas
