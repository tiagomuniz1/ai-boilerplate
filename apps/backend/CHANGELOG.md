# Changelog — Backend

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
