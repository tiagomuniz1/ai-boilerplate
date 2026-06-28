# Changelog — Backend

## [Unreleased]

### Added

#### Módulo de Medicamentos (`/medications`)
- Entidade `Medication` — base canônica de plataforma (sem `clinicId`), origem das futuras receitas médicas; soft delete + flag `isActive`
- CRUD completo: listar (paginado + busca por nome/princípio ativo), ver por ID, criar (`source = manual`), editar/ativar-desativar, excluir (soft)
- Roles: escrita restrita a PLATFORM_ADMIN; leitura para ADMIN e DOCTOR (futuras prescrições)
- Cache de leitura (`medication:{id}` 300s, `medications:list*` 60s) com invalidação após mutations
- Importação idempotente da base de Dados Abertos da ANVISA (`yarn import:medications`): download, conversão Windows-1252→UTF-8, decodificação de entidades HTML (`&#193;`→`Á`), parse de CSV, dedup por `import_hash` (sha256) e upsert em lote (`ON CONFLICT`), com suporte a `--file`
- DTOs/enum compartilhados: `MedicationSource`, `CreateMedicationDto`, `UpdateMedicationDto`, `MedicationResponseDto`, `PaginatedMedicationsResponseDto`
- Migration `create_medications_table` com índice único parcial em `import_hash` e índices de busca

### Performance

#### Medicamentos — índices de busca
- Migration `add_medications_trigram_indexes`: índices GIN `gin_trgm_ops` em `name` e `active_ingredient` (parciais, `WHERE deleted_at IS NULL`) para acelerar a busca `ILIKE '%termo%'` — elimina o Seq Scan na listagem e no `COUNT` (medido: count ~16ms→1ms, página de termo raro ~31ms→2ms na base com ~36k registros)
- Removido o btree `IDX_medications_active_ingredient` (não utilizável por `ILIKE` nem ordenação)

## [1.1.0] - 2026-06-20

### Added

#### Módulo de Prontuários (`/medical-records`)
- Entidade `MedicalRecord` com relação 1:1 à consulta e snapshot imutável do template (`templateSchemaSnapshot`)
- CRUD completo: criar, listar (paginado), buscar por consulta (`by-appointment`), buscar por ID, editar, excluir (soft)
- Validação de `data` × `schema` do template: campos obrigatórios, tipos (`text`, `textarea`, `number`, `boolean`, `date`, `select`, `multiselect`) e opções válidas para `select`/`multiselect`
- Herança automática de `specialtyId` a partir da consulta vinculada
- Guard: prontuário não pode ser editado após a consulta ser concluída (`422`)
- FK composta `(appointmentId, specialtyId)` → invariante `template.specialty == record.specialty` reforçada em duas camadas (use-case + banco)
- Histórico paginado por paciente (`GET /medical-records?patientId=`)
- Roles: ADMIN (acesso total), DOCTOR (próprias consultas), excluir restrito a ADMIN

#### Módulo de Templates de Prontuário (`/medical-record-templates`)
- Entidade `MedicalRecordTemplate` escopada por `clinicId + specialtyId`
- CRUD completo com ativação/desativação; apenas um template ativo por `clinic + specialty`
- Campos em JSONB (`fields`): `key` gerada automaticamente pelo backend (imutável após criação), suporte a `canonicalKey` para rastreabilidade cross-clínica
- Validação de `canonicalKey` contra o catálogo de campos canônicos
- Suporte a `options` (`{ value, label }`) para campos `select`/`multiselect`
- Bloqueio de exclusão quando há prontuários vinculados ao template
- Roles: criar/editar/excluir restrito a ADMIN; listar/ver por ID acessível a ADMIN e DOCTOR

#### Módulo de Campos Canônicos (`/medical-record-canonical-fields`)
- Catálogo de campos padronizados da plataforma com `key`, `label`, `type`, `defaultOptions` e flag `isActive`
- CRUD (criar, listar, editar/ativar-desativar) restrito a PLATFORM_ADMIN
- Listagem acessível a ADMIN e DOCTOR para uso no builder de templates
- Sugere campos sem travar — templates podem usar campos livres (sem `canonicalKey`)

#### Especialidade vinculada à consulta
- Campo `specialty_id` adicionado à tabela `appointments` (nullable, FK para `specialties`)
- Auto-resolução: quando o médico tem exatamente uma especialidade, a consulta é criada com ela automaticamente
- `AppointmentResponseDto` expõe `specialtyId` e `specialtyName`
- Regra de exclusão: `DELETE /specialties/:id` bloqueado (`409`) quando a especialidade está vinculada a consultas ou a clínicas

### Changed
- `CreateAppointmentDto`: novo campo opcional `specialtyId?`
- Migration `1750800000000-add-specialty-id-to-appointments`
- Migration `1750900000000-create-medical-records-table`
- Migration `1750700000000-create-medical-record-templates-table`
- Migration `1750600000000-create-medical-record-canonical-fields-table`

---

## [1.0.0] - 2025-01-01

### Added
- Autenticação JWT com access token (15 min) + refresh token (7 dias) via cookies `httpOnly`
- Módulo de usuários com CRUD completo e controle de roles (`ADMIN`, `DOCTOR`, `USER`, `PATIENT`)
- Módulo de clínicas com onboarding, upload de logomarca (S3), temas visuais e endereço completo
- Módulo de médicos com relação many-to-many com especialidades
- Módulo de pacientes vinculados a usuário
- Módulo de especialidades médicas
- Módulo de agendas com configuração de horários e bloqueios de período
- Módulo de consultas com agendamento por slot, cancelamento, conclusão e verificação de disponibilidade
- Isolamento multi-tenant por `clinicId` em todas as queries
- PLATFORM_ADMIN com acesso irrestrito ao backoffice (sem `clinicId`)
- Health check (`GET /health`) com verificação de banco e Redis
- Rate limiting, Helmet, CORS configurados
- Cache Redis (Cache-Aside) para recursos frequentes
- Distributed lock para operações concorrentes críticas
- Logs estruturados (Winston/JSON) com `requestId`
