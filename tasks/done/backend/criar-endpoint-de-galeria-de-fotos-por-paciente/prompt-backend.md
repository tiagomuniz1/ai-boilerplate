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
- Clonar a lógica de autorização de `FindMedicalRecordsByPatientUseCase` (linhas 33-38) quase literalmente
- Modificar os arquivos indicados da task `criar-modulo-de-fotos-da-consulta` — não recriá-los do zero
- A restrição por profissional é 100% server-side — o DTO de query NÃO tem campo `professionalId`

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Galeria de Fotos por Paciente (Backend / Listagem Cross-Consulta)

## Descrição
Listagem paginada de fotos de um paciente agregando todas as consultas. PROFESSIONAL só vê fotos de consultas em que ele próprio foi o responsável — nunca fotos que outro profissional anexou em consultas diferentes com o mesmo paciente. ADMIN vê todas. Continuação de `criar-modulo-de-fotos-da-consulta`, que já criou `ConsultationPhoto`/migration/repository/módulo.

## Contexto
Clonar a autorização de `FindMedicalRecordsByPatientUseCase` (`apps/backend/src/modules/medical-records/use-cases/find-medical-records-by-patient.use-case.ts:33-38`): se `role === PROFESSIONAL`, `professionalIdFilter` é sempre sobrescrito para `professional.id` do usuário logado. O DTO de query desta task nem expõe `professionalId` — filtragem 100% server-side. `patientId`/`professionalId` já denormalizados em `consultation_photos` (task anterior) — query filtra direto, sem join com `appointments` para o filtro (mas precisa de join para exibir `appointmentDate`).

## Input (query)
`ListConsultationPhotosByPatientQueryDto extends PaginationDto` — sem campos extras. `patientId` vem do path param.

## Output
`ConsultationPhotoGalleryItemResponseDto` (novo, `@app/shared`) — estende `ConsultationPhotoResponseDto` (`id`, `appointmentId`, `fileName`, `mimeType`, `fileSizeBytes`, `createdAt`) + `professionalName: string` (join em tempo de leitura, não denormalizar) + `appointmentDate: Date` (join com appointments).

`PaginatedConsultationPhotosResponseDto` (novo): `{ data: ConsultationPhotoGalleryItemResponseDto[], total, page, limit }`.

## Assinaturas esperadas
- `FindConsultationPhotosByPatientUseCase.execute(patientId, query: ListConsultationPhotosByPatientQueryDto, currentUser): Promise<PaginatedConsultationPhotosResponseDto>`
- `IConsultationPhotosRepository` (MODIFICAR, adicionar): `findByPatient(clinicId, patientId, page, limit, professionalId?): Promise<[ConsultationPhotoWithProfessionalName[], number]>` (resultado do query builder com `professionalName` via join, não uma nova entidade TypeORM).

## Fluxo principal

**GET /consultation-photos/by-patient/:patientId** (ADMIN, PROFESSIONAL)
1. `clinicId = currentUser.clinicId`.
2. Se `role === PROFESSIONAL`: `professionalsRepository.findByUserId(currentUser.id, clinicId)`, força `professionalIdFilter = professional?.id`. Se ADMIN: `undefined` (sem filtro).
3. Cache `consultation-photos:patient:${patientId}:${page}:${limit}:${professionalIdFilter ?? 'all'}`, TTL 60s.
4. `repository.findByPatient(...)`: join com `professionals`/`users` (`professionalName`) e `appointments` (`appointmentDate`); `WHERE patient_id = :patientId AND clinic_id = :clinicId [AND professional_id = :professionalIdFilter]`; `ORDER BY created_at DESC`; `skip`/`take`; `getManyAndCount`.
5. Mapeia, monta paginado, cacheia, retorna.

## Regras de negócio
Restrição por profissional é 100% backend, ignora qualquer tentativa do cliente de influenciar (não existe esse campo no DTO). ADMIN sem filtro. Ordenação sempre por `createdAt` (data de envio), nunca `appointmentDate`.

## Permissões
`@Roles(ADMIN, PROFESSIONAL)`. Filtro sempre server-side.

## Dependências
`IConsultationPhotosRepository`, `ConsultationPhoto` (já existentes). `IProfessionalsRepository`. `PaginationDto`. `CacheService`.

## Decisões técnicas
Join em leitura para `professionalName` (não denormalizar). Join com `appointments` só para a coluna `date`. Sem transação (leitura). Cache com chave incluindo o filtro de profissional (nunca vaza entre profissionais diferentes).

## Restrições
NÃO aceitar `professionalId` como parâmetro de query. NÃO denormalizar `professionalName`. NÃO permitir ADMIN filtrar por profissional nesta task. NÃO ordenar por `appointmentDate`. NÃO validar existência do paciente à parte (lista vazia é resposta válida).

## Estrutura esperada
```
apps/backend/src/modules/consultation-photos/
  repositories/ consultation-photos.repository.interface.ts → MODIFICAR
  repositories/ consultation-photos.repository.ts → MODIFICAR (+ .spec MODIFICAR)
  use-cases/ find-consultation-photos-by-patient.use-case.ts (+ .spec)
  controllers/ consultation-photos.controller.ts → MODIFICAR (+ .spec MODIFICAR)
  dto/ list-consultation-photos-by-patient-query.dto.ts
  consultation-photos.module.ts → MODIFICAR
  tests/ consultation-photos.integration.spec.ts → MODIFICAR
packages/shared/src/dtos/ consultation-photo-gallery-item-response.dto.ts (novo),
                          paginated-consultation-photos-response.dto.ts (novo), index.ts → MODIFICAR
```

## Cenários de teste
- **Crítico:** PROFESSIONAL A e PROFESSIONAL B têm consultas separadas com o mesmo paciente X, cada um anexa fotos. A chama o endpoint e vê só as próprias; B vê só as próprias; ADMIN vê as duas.
- Paginação correta (`total`, `page`, `limit`, `data.length <= limit`).
- Paciente sem foto → `{ data: [], total: 0 }`.
- `professionalName`/`appointmentDate` corretos por item.
- Ordenação `createdAt DESC`.
- Cache não vaza entre profissionais diferentes (chave inclui o filtro).
- Integração: PROFESSIONAL A só fotos de A; PROFESSIONAL B só fotos de B; ADMIN vê ambos; USER `403`; paginação via query params funciona.

## Definition of Done
- [ ] `findByPatient` no repository com join para `professionalName`/`appointmentDate`
- [ ] Use-case força `professionalIdFilter` para PROFESSIONAL, sem depender do cliente
- [ ] `GET /consultation-photos/by-patient/:patientId` paginado, `@Roles(ADMIN, PROFESSIONAL)`
- [ ] DTOs no `@app/shared`, exportados
- [ ] Cache por paciente+página+limite+profissional
- [ ] Teste cobrindo explicitamente o isolamento entre dois profissionais no mesmo paciente
- [ ] Testes unitários (100%) e integração
- [ ] Naming convention e estrutura seguidas
