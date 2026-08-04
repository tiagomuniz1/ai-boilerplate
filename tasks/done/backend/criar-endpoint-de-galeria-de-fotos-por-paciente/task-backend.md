# Task — Galeria de Fotos por Paciente (Backend / Listagem Cross-Consulta)

## Descrição
Implementar a listagem paginada de fotos de um paciente **agregando todas as consultas**, para o profissional acompanhar a evolução do tratamento ao longo do tempo. A regra central: um PROFESSIONAL só vê fotos de consultas em que **ele próprio** foi o profissional responsável — nunca fotos que outro profissional anexou em consultas diferentes com o mesmo paciente, mesmo sendo o mesmo paciente/clínica. ADMIN vê todas as fotos do paciente, de qualquer profissional. Continuação da task `criar-modulo-de-fotos-da-consulta`, que já criou a entidade `ConsultationPhoto`, a migration e o esqueleto do repository/módulo.

---

## Contexto
- Depende da task `criar-modulo-de-fotos-da-consulta` — reaproveita `ConsultationPhoto`, `IConsultationPhotosRepository`, `ConsultationPhotosModule` e a migration já existentes. **Não recriar nada disso.**
- O padrão de autorização a clonar é `FindMedicalRecordsByPatientUseCase` (`apps/backend/src/modules/medical-records/use-cases/find-medical-records-by-patient.use-case.ts`, linhas 33-38): quando `currentUser.role === PROFESSIONAL`, o `professionalIdFilter` é **sempre sobrescrito** para `professional.id` do usuário logado — mesmo que o DTO de query aceitasse um `professionalId` diferente, ele seria ignorado. Nesta task, o DTO de query **nem expõe** `professionalId` como parâmetro (ver Contratos) — a restrição é 100% server-side, não depende do cliente se comportar bem.
- `patientId`/`professionalId` já estão denormalizados em `consultation_photos` (feito na task anterior) — a query desta task filtra direto na tabela, sem join com `appointments`.
- Paginação segue o padrão de `MedicalRecordsRepository.findByPatient` (query-builder, `skip`/`take`/`getManyAndCount`).

---

## Contratos

### Input (query params)
**ListConsultationPhotosByPatientQueryDto** (`modules/consultation-photos/dto/`, `extends PaginationDto`):
- Nenhum campo além dos herdados de `PaginationDto` (`page`, `limit`) — `patientId` vem do path param da rota, não da query. **Não adicionar** um campo `professionalId` neste DTO — a filtragem por profissional é inteira server-side (ver Contexto).

### Output
**ConsultationPhotoGalleryItemResponseDto** (`packages/shared/src/dtos/consultation-photo-gallery-item-response.dto.ts`), estende os campos de `ConsultationPhotoResponseDto` (`id`, `appointmentId`, `fileName`, `mimeType`, `fileSizeBytes`, `createdAt`) e adiciona:
- `professionalName: string` — nome do profissional que anexou a foto (join em tempo de leitura, **não denormalizar no banco**, para não ficar com nome desatualizado se o profissional trocar o nome depois).
- `appointmentDate: Date` — data da consulta em que a foto foi anexada (contexto clínico; a ordenação da lista continua sendo por `createdAt`, a data de envio).

**PaginatedConsultationPhotosResponseDto** (`packages/shared/src/dtos/paginated-consultation-photos-response.dto.ts`): `{ data: ConsultationPhotoGalleryItemResponseDto[], total: number, page: number, limit: number }` — mesmo formato de `PaginatedMedicalRecordsResponseDto`.

Exportar os dois DTOs via `packages/shared/src/dtos/index.ts`.

---

## Assinaturas esperadas

**Use-case:**
- `FindConsultationPhotosByPatientUseCase.execute(patientId: string, query: ListConsultationPhotosByPatientQueryDto, currentUser): Promise<PaginatedConsultationPhotosResponseDto>`

**IConsultationPhotosRepository** (`repositories/consultation-photos.repository.interface.ts` → **MODIFICAR**, adicionar ao contrato já existente):
```ts
abstract findByPatient(
  clinicId: string,
  patientId: string,
  page: number,
  limit: number,
  professionalId?: string,
): Promise<[ConsultationPhotoWithProfessionalName[], number]>
```
Onde `ConsultationPhotoWithProfessionalName` é o resultado da entidade `ConsultationPhoto` com o campo adicional `professionalName` vindo do join (não é uma nova entidade TypeORM, é o shape de retorno do query builder — usar `.select`/`.addSelect` ou mapear o resultado bruto).

---

## Fluxo principal

**GET /consultation-photos/by-patient/:patientId** (ADMIN, PROFESSIONAL)
1. `clinicId = currentUser.clinicId`.
2. `professionalIdFilter`: se `currentUser.role === PROFESSIONAL`, buscar `professionalsRepository.findByUserId(currentUser.id, clinicId)` e forçar `professionalIdFilter = professional?.id` (clone exato de `FindMedicalRecordsByPatientUseCase`, linhas 33-38). Se ADMIN, `professionalIdFilter = undefined` (sem filtro, vê tudo).
3. Cache: `consultation-photos:patient:${patientId}:${page}:${limit}:${professionalIdFilter ?? 'all'}` — mesmo padrão de chave de `FindMedicalRecordsByPatientUseCase`, TTL 60s.
4. `repository.findByPatient(clinicId, patientId, page, limit, professionalIdFilter)` — query-builder com join em `professionals`/`users` para resolver `professionalName`, e em `appointments` para `appointmentDate`; `WHERE patient_id = :patientId AND clinic_id = :clinicId [AND professional_id = :professionalIdFilter]`, `ORDER BY created_at DESC`, `skip`/`take`, `getManyAndCount`.
5. Mapeia para `ConsultationPhotoGalleryItemResponseDto[]`, monta `PaginatedConsultationPhotosResponseDto`, cacheia, retorna.

---

## Fluxos alternativos
- Paciente inexistente → a lista simplesmente vem vazia (`data: [], total: 0`) — este endpoint não precisa validar a existência do paciente à parte, mesma postura de `FindMedicalRecordsByPatientUseCase` (não lança `404` por paciente inexistente, só por falta de resultados).
- `page`/`limit` fora do range de `PaginationDto` → `400` (validação do `PaginationDto` já herdado, nada novo aqui).
- Falha de cache (leitura ou escrita) → `warn` + segue sem cache.

---

## Regras de negócio
- **Crítico:** a restrição "PROFESSIONAL só vê as próprias" é aplicada **inteiramente no backend**, ignorando qualquer tentativa do cliente de influenciar o filtro (não existe `professionalId` no DTO de query — a única fonte é o `currentUser` resolvido no servidor).
- ADMIN não tem filtro nenhum — vê fotos de todos os profissionais da clínica para aquele paciente.
- A ordenação é sempre por `createdAt` (data de envio), não por `appointmentDate` (data da consulta) — mesmo que a consulta seja antiga, o que importa para "acompanhar evolução" é quando a foto foi enviada.

---

## Permissões

| Ação | ADMIN | PROFESSIONAL | USER |
|---|:---:|:---:|:---:|
| Listar galeria do paciente | ✓ todos os profissionais | ✓ só as próprias consultas | ✗ |

`@Roles(ADMIN, PROFESSIONAL)`. Filtro por profissional é sempre server-side, nunca dependente de parâmetro do cliente.

---

## Dependências
- `IConsultationPhotosRepository`, `ConsultationPhoto` (da task anterior).
- `IProfessionalsRepository` (resolver o profissional do usuário logado).
- `PaginationDto` (`common/dto/pagination.dto.ts`).
- `CacheService`.

---

## Decisões técnicas
- Join em tempo de leitura para `professionalName` (via `professionals` → `users`, mesmo caminho que `medical-records` já percorre para resolver nome de profissional) — não denormalizar, evita nome desatualizado.
- `appointmentDate` via join com `appointments` (só a coluna `date`, não a entidade inteira).
- Sem transação (é leitura).
- Cache com TTL curto (60s) e chave incluindo o filtro de profissional, para nunca vazar cache entre profissionais diferentes do mesmo paciente.

---

## Restrições
- NÃO adicionar `professionalId` como parâmetro de query aceito pelo cliente.
- NÃO denormalizar `professionalName` na tabela `consultation_photos` (buscar via join sempre).
- NÃO permitir que ADMIN restrinja a consulta por profissional nesta task (fora de escopo — ADMIN sempre vê tudo aqui; um filtro opcional para ADMIN pode ser uma evolução futura, não implementar agora).
- NÃO alterar a ordenação para `appointmentDate` — continua sendo `createdAt`.
- NÃO validar existência do paciente separadamente (lista vazia é resposta válida).

---

## Estrutura esperada
```
apps/backend/src/modules/consultation-photos/
  repositories/ consultation-photos.repository.interface.ts → MODIFICAR (+ findByPatient)
  repositories/ consultation-photos.repository.ts → MODIFICAR (+ .spec MODIFICAR)
  use-cases/ find-consultation-photos-by-patient.use-case.ts (+ .spec)
  controllers/ consultation-photos.controller.ts → MODIFICAR (+ GET /by-patient/:patientId) (+ .spec MODIFICAR)
  dto/ list-consultation-photos-by-patient-query.dto.ts
  consultation-photos.module.ts → MODIFICAR (+ novo use-case nos providers)
  tests/ consultation-photos.integration.spec.ts → MODIFICAR (+ cenários da galeria)
packages/shared/src/dtos/ consultation-photo-gallery-item-response.dto.ts (novo),
                          paginated-consultation-photos-response.dto.ts (novo),
                          index.ts → MODIFICAR
```

---

## Cenários de teste

### `FindConsultationPhotosByPatientUseCase`
- **Cenário crítico de isolamento:** PROFESSIONAL A tem consulta com o paciente X e anexa fotos; PROFESSIONAL B (mesma clínica) também tem consulta com o paciente X, em outra data, e anexa outras fotos. PROFESSIONAL A chama o endpoint e recebe **apenas** as próprias fotos — zero fotos de B. PROFESSIONAL B recebe apenas as próprias.
- ADMIN chama o mesmo endpoint e recebe as fotos de A **e** de B.
- Paginação: `total` correto, `page`/`limit` respeitados, `data.length <= limit`.
- Paciente sem nenhuma foto → `{ data: [], total: 0 }`.
- Cada item inclui `professionalName` e `appointmentDate` corretos.
- Ordenação por `createdAt DESC`.
- Cache: chave inclui o filtro de profissional (hit não vaza entre A e B).

### Integração
- `GET /consultation-photos/by-patient/:patientId` PROFESSIONAL A → só fotos de A.
- Mesmo endpoint, PROFESSIONAL B → só fotos de B.
- Mesmo endpoint, ADMIN → fotos de A e B.
- `GET` USER → `403`.
- Paginação via query params (`?page=2&limit=10`) reflete corretamente no resultado.

---

## Definition of Done
- [ ] `IConsultationPhotosRepository.findByPatient` implementado com join para `professionalName`/`appointmentDate`
- [ ] `FindConsultationPhotosByPatientUseCase` força `professionalIdFilter` para o próprio profissional quando `role === PROFESSIONAL`, sem depender de input do cliente
- [ ] `GET /consultation-photos/by-patient/:patientId` paginado, `@Roles(ADMIN, PROFESSIONAL)`
- [ ] `ConsultationPhotoGalleryItemResponseDto`/`PaginatedConsultationPhotosResponseDto` no `@app/shared`, exportados
- [ ] Cache por combinação de paciente+página+limite+profissional, TTL 60s
- [ ] **Teste cobrindo explicitamente o isolamento entre dois profissionais no mesmo paciente** (unitário e integração)
- [ ] Testes unitários (100%) e integração cobrindo os demais cenários
- [ ] Naming convention e estrutura seguidas
