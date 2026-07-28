# Task — Módulo de Fotos da Consulta (Backend / Upload por Consulta)

## Descrição
Implementar o módulo `consultation-photos`: upload de **fotos de evolução do tratamento** anexadas a uma consulta (`ConsultationPhoto`, 1:N por `appointmentId`), listagem dessas fotos por consulta, download do arquivo e exclusão. Diferente de `exams` (que separa "solicitação" de "resultado"), aqui não existe uma etapa de solicitação prévia — o upload em si já é o registro. A **galeria agregada por paciente** (cross-consulta) é uma task separada (`criar-endpoint-de-galeria-de-fotos-por-paciente`), que depende desta.

---

## Contexto
- Espelha o mecanismo de upload de `criar-modulo-de-resultado-de-exames` (`AddExamResultUseCase`, `FilesInterceptor`, `IStorageAdapter`), mas sem a entidade "pai" (`ExamRequest`) — aqui a foto se relaciona **diretamente** com a consulta (`appointmentId`), sem passar por um recurso intermediário.
- Depende da task `adicionar-exclusao-de-arquivo-ao-storage-adapter` (`IStorageAdapter.remove()`), usada na exclusão de foto.
- Recurso escopado por `clinic_id`. `patientId` e `professionalId` são **denormalizados** na própria linha da foto (copiados do `appointment` no momento do upload) — decisão deliberada para a task seguinte (galeria por paciente) nunca precisar de join com `appointments`.
- Só o **PROFESSIONAL** dono da consulta (`appointment.professionalId`) anexa e remove foto. ADMIN lê/baixa/remove qualquer foto da clínica. USER não acessa (dado clínico sensível).
- Sem PDF, sem tipos condicionais — apenas imagens.

---

## Contratos

### Input (multipart/form-data)
**Upload de fotos** — `POST /consultation-photos/appointments/:appointmentId`:
- `files`: um ou mais arquivos (obrigatório, mínimo 1, máximo 10 por requisição)
  - Tipos aceitos: `image/jpeg`, `image/png`, `image/webp` (**sem PDF** — diferente de `exam-results`, aqui é só foto)
  - Tamanho máximo por arquivo: **8MB**

### Output
**ConsultationPhotoResponseDto** (`packages/shared/src/dtos/consultation-photo-response.dto.ts`): `id`, `appointmentId`, `fileName`, `mimeType`, `fileSizeBytes`, `createdAt: Date`. **Nunca** incluir `filePath` (é o caminho interno de storage, nunca exposto ao cliente — mesma regra de `exam-result-response.dto.ts`).

Exportar via `packages/shared/src/dtos/index.ts`.

---

## Assinaturas esperadas

**Use-cases (classes, `@Injectable`, `extends BaseUseCase`):**
- `UploadConsultationPhotosUseCase.execute(appointmentId: string, files: Express.Multer.File[], currentUser): Promise<ConsultationPhotoResponseDto[]>`
- `FindConsultationPhotosByAppointmentUseCase.execute(appointmentId: string, currentUser): Promise<ConsultationPhotoResponseDto[]>`
- `DownloadConsultationPhotoFileUseCase.execute(photoId: string, currentUser): Promise<{ buffer: Buffer; mimeType: string; fileName: string }>`
- `DeleteConsultationPhotoUseCase.execute(photoId: string, currentUser): Promise<void>`

> Exportar `FindConsultationPhotosByAppointmentUseCase` e a entidade/repository — a task da galeria por paciente reaproveita `IConsultationPhotosRepository` e o mesmo módulo.

**IConsultationPhotosRepository** (`repositories/consultation-photos.repository.interface.ts`):
```ts
export interface CreateConsultationPhotoData {
  id: string
  clinicId: string
  appointmentId: string
  patientId: string
  professionalId: string
  filePath: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  uploadedByUserId: string
}

export abstract class IConsultationPhotosRepository {
  abstract findByAppointment(appointmentId: string, clinicId: string): Promise<ConsultationPhoto[]>
  abstract findById(id: string, clinicId: string): Promise<ConsultationPhoto | null>
  abstract create(data: CreateConsultationPhotoData, queryRunner?: QueryRunner): Promise<ConsultationPhoto>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
```
> `findByPatient` **não** entra nesta task — é adicionado na task da galeria (`criar-endpoint-de-galeria-de-fotos-por-paciente`), que estende esta mesma interface/implementação.

---

## Fluxo principal

**POST /consultation-photos/appointments/:appointmentId** (PROFESSIONAL)
1. Controller recebe os arquivos via `FilesInterceptor('files', 10, { storage: memoryStorage() })` + `@UploadedFiles()`.
2. Use-case busca a consulta (`appointmentsRepository.findById(appointmentId, clinicId)`) → `NotFoundException`.
3. RBAC own: `professionalsRepository.findByUserId(currentUser.id, clinicId)`; `professional.id !== appointment.professionalId` → `ForbiddenException`.
4. Valida **todos** os arquivos antes de qualquer upload: mimetype (`image/jpeg|png|webp`) e tamanho (8MB) → `UnprocessableEntityException` se algum for inválido; nenhum arquivo → `UnprocessableEntityException`.
5. Upload de cada arquivo ao storage (`IStorageAdapter.upload`, path `consultation-photos/{clinicId}/{appointmentId}/{photoId}.{ext}`) em paralelo (`Promise.all`) — fora da transação (storage não é transacional).
6. `runInTransaction`: persiste cada `ConsultationPhoto`, copiando `patientId`/`professionalId` de `appointment` para cada linha.
7. Invalida cache `consultation-photos:appointment:${appointmentId}`.
8. Retorna `ConsultationPhotoResponseDto[]` das fotos recém-criadas.

**GET /consultation-photos?appointmentId=** (ADMIN, PROFESSIONAL)
1. RBAC own (PROFESSIONAL): mesma checagem de ownership via `appointment.professionalId`.
2. Lista ordenada por `createdAt DESC` (mais recente primeiro — "organizadas por data de envio").
3. Cache TTL 60s, chave `consultation-photos:appointment:${appointmentId}`.

**GET /consultation-photos/:id/file** (ADMIN, PROFESSIONAL)
1. Busca a foto (`findById(id, clinicId)`) → `NotFoundException`.
2. RBAC own (PROFESSIONAL): compara `professional.id === photo.professionalId` **diretamente** (não precisa recarregar a consulta — `professionalId` já está denormalizado na foto).
3. `storageAdapter.download(photo.filePath)`, stream de volta (`Content-Type` = `photo.mimeType`) — nunca expõe URL pública.

**DELETE /consultation-photos/:id** (ADMIN, PROFESSIONAL)
1. Busca a foto → `NotFoundException`. RBAC own → `ForbiddenException`.
2. `runInTransaction`: soft-delete da foto.
3. Após o commit, `storageAdapter.remove(photo.filePath)` em `try/catch` best-effort (log + segue se falhar — nunca bloqueia a exclusão que o usuário pediu).
4. Invalida cache; `204`.

---

## Fluxos alternativos
- Consulta inexistente/de outra clínica → `404`; PROFESSIONAL em consulta alheia → `403`.
- Nenhum arquivo enviado → `422`; mimetype inválido (ex.: `application/pdf`, `text/plain`) → `UnprocessableEntityException('Invalid file type. Accepted: jpeg, png, webp')`, nenhum arquivo é persistido; arquivo maior que 8MB → `UnprocessableEntityException('File too large. Maximum size is 8MB')`.
- Foto inexistente → `404`; PROFESSIONAL alheio (download ou delete) → `403`; falha de cache → `warn` + segue; falha ao remover do storage na exclusão → `warn` + segue (soft-delete no banco já aconteceu, não desfazer).

---

## Regras de negócio
- Sem etapa de "solicitação" — o upload já é o registro definitivo (ao contrário de `exam-requests`/`exam-results`).
- `patientId`/`professionalId` sempre derivados do `appointment` no momento do upload (nunca do cliente), e denormalizados na linha da foto.
- Múltiplos arquivos no mesmo POST são processados em lote — validar todos antes de qualquer upload (mesma regra de `exam-results`).
- `clinicId` denormalizado em `consultation_photos` para isolamento de tenant sem depender de join com `appointments`.
- Exclusão remove o arquivo do storage (via `IStorageAdapter.remove`, ver task `adicionar-exclusao-de-arquivo-ao-storage-adapter`) — diferente de `exam-results`, que hoje deixa arquivo órfão; aqui a exclusão é completa.

---

## Permissões

| Ação | ADMIN | PROFESSIONAL | USER |
|---|:---:|:---:|:---:|
| Enviar foto (POST) | ✗ | ✓ própria consulta | ✗ |
| Listar por consulta | ✓ | ✓ própria consulta | ✗ |
| Ver/baixar arquivo | ✓ | ✓ própria | ✗ |
| Excluir | ✓ | ✓ própria | ✗ |

POST = `@Roles(PROFESSIONAL)`; demais = `@Roles(ADMIN, PROFESSIONAL)`. Own-resource no use-case.

---

## Dependências
- `IAppointmentsRepository`, `IProfessionalsRepository` (padrão cross-module já usado em `medical-records`/`exams`).
- `IStorageAdapter` (`common/adapters/storage.adapter.interface.ts`, incluindo o novo `remove()` da task `adicionar-exclusao-de-arquivo-ao-storage-adapter`) — registrar no `ConsultationPhotosModule` com a mesma factory condicional (`AWS_S3_BUCKET`/`AWS_REGION`) usada em `exams.module.ts`/`clinics.module.ts` (duplicar a factory é o padrão aceito no projeto).
- `multer`/`@types/multer` (já dependências).
- `CacheService`.

---

## Decisões técnicas
- `FilesInterceptor('files', 10, { storage: memoryStorage() })` — memória, sem disco, compatível com ECS.
- Path no storage: `consultation-photos/{clinicId}/{appointmentId}/{photoId}.{ext}`, `ext` derivado do mimetype (`image/jpeg` → `jpg`, `image/png` → `png`, `image/webp` → `webp`).
- Download sempre via endpoint autenticado que faz stream do buffer (`storageAdapter.download` + `res.end(buffer)`) — nunca URL pública/assinada.
- Transação: sim, para a escrita em lote de `consultation_photos` (múltiplas fotos por POST, todas ou nenhuma).
- Cache: `consultation-photos:appointment:${appointmentId}` TTL 60s, invalidado após upload/exclusão.
- Índices na tabela: `appointment_id`, `clinic_id`, e um composto `(patient_id, professional_id)` — este último não é usado por nenhuma query desta task, mas é criado aqui porque a migration já sobe a tabela; a task da galeria por paciente é quem de fato consulta por ele.

---

## Restrições
- NÃO gravar arquivo em disco no servidor. NÃO `process.env` fora de `env.config.ts`. NÃO persistir no banco antes do upload ter sucesso. NÃO aceitar `application/pdf` (só imagem). NÃO permitir ADMIN enviar foto em nome de um profissional (upload é exclusivo de `PROFESSIONAL`). NÃO permitir USER acessar nenhum endpoint deste módulo. NÃO expor `filePath` no DTO de resposta. NÃO implementar a listagem por paciente nesta task.

---

## Migration
`<timestamp>-create-consultation-photos-table.ts` (`SET search_path TO "${schema}", public`): tabela `consultation_photos` (`id`, `clinic_id`, `appointment_id`, `patient_id`, `professional_id`, `file_path text`, `file_name varchar(255)`, `mime_type varchar(100)`, `file_size_bytes integer`, `uploaded_by_user_id uuid`, `created_at`, `updated_at`, `deleted_at`) + índices em `appointment_id`, `clinic_id`, e composto `(patient_id, professional_id)`. `down` dropa índices e tabela. Seguir exatamente o formato de `1753000000000-create-exam-results-table.ts`.

---

## Estrutura esperada
```
apps/backend/src/modules/consultation-photos/
  entities/ consultation-photo.entity.ts
  repositories/ consultation-photos.repository.interface.ts, consultation-photos.repository.ts (+ .spec)
  use-cases/ upload-consultation-photos.use-case.ts (+ .spec),
             find-consultation-photos-by-appointment.use-case.ts (+ .spec),
             download-consultation-photo-file.use-case.ts (+ .spec),
             delete-consultation-photo.use-case.ts (+ .spec)
  controllers/ consultation-photos.controller.ts (+ .spec)
  consultation-photos.module.ts
  tests/ consultation-photos.integration.spec.ts
apps/backend/src/database/migrations/ <timestamp>-create-consultation-photos-table.ts
apps/backend/src/app.module.ts → MODIFICAR (registrar ConsultationPhotosModule)
packages/shared/src/dtos/ consultation-photo-response.dto.ts (novo), index.ts → MODIFICAR
```

---

## Cenários de teste

### `UploadConsultationPhotosUseCase`
- Upload de 1 arquivo válido (jpeg) → persistido, retorna `ConsultationPhotoResponseDto[]` com 1 item.
- Upload de 3 arquivos (jpeg + png + webp) na mesma chamada → todos persistidos numa única transação.
- Mimetype inválido (ex.: `application/pdf`, `text/plain`) → `UnprocessableEntityException`, nenhum arquivo é persistido.
- Arquivo > 8MB → `UnprocessableEntityException`.
- Nenhum arquivo → `UnprocessableEntityException`.
- PROFESSIONAL alheio → `ForbiddenException`.
- Consulta inexistente → `NotFoundException`.
- `patientId`/`professionalId` da foto batem com os do appointment.
- Invalida cache após sucesso.

### `FindConsultationPhotosByAppointmentUseCase`
- ADMIN vê todas as fotos da consulta; PROFESSIONAL só as próprias; PROFESSIONAL alheio → `403`.
- Lista ordenada por `createdAt DESC`.
- Cache hit/miss (TTL 60s).

### `DownloadConsultationPhotoFileUseCase`
- ADMIN baixa qualquer foto da clínica; PROFESSIONAL baixa só as próprias; PROFESSIONAL alheio → `403`.
- Foto inexistente → `404`.

### `DeleteConsultationPhotoUseCase`
- PROFESSIONAL próprio → soft-delete + `storageAdapter.remove` chamado com o `filePath` correto.
- Erro no `storageAdapter.remove` → não impede a exclusão (soft-delete já commitado), apenas loga warning.
- Foto inexistente → `404`; PROFESSIONAL alheio → `403`.

### Integração (`consultation-photos.integration.spec.ts`)
- `POST /consultation-photos/appointments/:id` PROFESSIONAL próprio, multipart com 2 arquivos → `201`, array com 2 itens.
- `POST` com arquivo inválido → `422`; `POST` sem arquivo → `422`; `POST` ADMIN/USER → `403`; `POST` PROFESSIONAL alheio → `403`.
- `GET /consultation-photos?appointmentId=` ADMIN vê todas, PROFESSIONAL só as próprias, PROFESSIONAL alheio → `403`, USER → `403`.
- `GET /consultation-photos/:id/file` retorna o binário com `Content-Type` correto; PROFESSIONAL alheio → `403`.
- `DELETE /consultation-photos/:id` PROFESSIONAL próprio → `204`, GET subsequente não lista mais a foto; ADMIN/USER conforme tabela de permissões.

---

## Definition of Done
- [ ] `ConsultationPhoto` (entidade + migration) criado, com `patientId`/`professionalId` denormalizados
- [ ] `ConsultationPhotoResponseDto` no `@app/shared`, exportado via `index.ts`, sem expor `filePath`
- [ ] `POST /consultation-photos/appointments/:appointmentId` com `FilesInterceptor`, validação de tipo (só imagem)/tamanho (8MB), upload via `IStorageAdapter`
- [ ] `GET /consultation-photos?appointmentId=` ordenado por `createdAt DESC`, com cache
- [ ] `GET /consultation-photos/:id/file` faz stream autenticado, nunca URL pública
- [ ] `DELETE /consultation-photos/:id` soft-delete + remoção do storage best-effort
- [ ] Own-resource validado em todos os use-cases (via `appointment.professionalId` no upload/list, via `photo.professionalId` denormalizado no download/delete)
- [ ] `ConsultationPhotosModule` registrado em `app.module.ts`, exportando `FindConsultationPhotosByAppointmentUseCase` e `IConsultationPhotosRepository` (uso interno da task seguinte)
- [ ] Testes unitários (100%) e integração cobrindo os cenários
- [ ] Naming convention e estrutura seguidas
