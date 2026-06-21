# Changelog — Frontend

## [1.1.0] - 2026-06-20

### Added

#### Telas de Prontuários
- Componente `DynamicField`: renderiza qualquer campo do schema (`text`, `textarea`, `number`, `boolean`, `date`, `select`, `multiselect`) com suporte a `placeholder`, `helpText` e validação
- `MedicalRecordForm`: formulário dinâmico gerado a partir do `templateSchemaSnapshot`, com schema Zod construído em runtime, coerção de tipos e campo de notas livre
- `MedicalRecordView`: visualização read-only com formatação por tipo (`boolean` → Sim/Não, `multiselect` → vírgula separada)
- `PatientMedicalHistory`: histórico paginado de prontuários do paciente com abertura em modal de detalhe
- `MedicalRecordFormSkeleton`: loading state para o formulário
- Integração no `AppointmentDetailsDialog`: seção de prontuário com botões "Preencher", "Ver" e "Editar" conforme role e status da consulta
  - ADMIN e DOCTOR (da própria consulta) podem criar e editar prontuários
  - Edição bloqueada para consultas concluídas
  - 409 e 422 com mensagens específicas (incluindo erro de especialidade)
- Histórico de prontuários na página do paciente (ADMIN e DOCTOR)
- Testes de integração: `DynamicField`, `MedicalRecordForm`, `MedicalRecordView`, `PatientMedicalHistory`
- Testes E2E Cypress: preenchimento, visualização e histórico

#### Telas de Modelos de Prontuário (Template Builder)
- Listagem de templates com filtro por especialidade e status ativo/inativo
- Formulário de criação/edição com `CanonicalFieldPicker`: seleciona campos do catálogo canônico ou cria campos livres
- Editor de opções para campos `select`/`multiselect` (`CanonicalFieldOptionsEditor`)
- Ativação/desativação de template
- Testes de integração: `TemplateList`, `TemplateForm`, `CanonicalFieldPicker`, `CanonicalFieldOptionsEditor`

#### Telas do Catálogo de Campos Canônicos (Backoffice)
- Listagem paginada de campos canônicos com indicador de tipo e status
- Formulário de criação/edição com suporte a `defaultOptions`
- Ativação/desativação de campo
- Acesso restrito a PLATFORM_ADMIN no backoffice (`/backoffice/canonical-fields`)
- Testes de integração: `CanonicalFieldList`, `CanonicalFieldForm`

#### Seleção de Especialidade no Agendamento
- `BookAppointmentDialog` carrega as especialidades do médico via `useDoctor`
- Auto-seleção quando o médico tem exatamente 1 especialidade (campo read-only, sem fricção)
- `<select>` obrigatório quando o médico tem 2+ especialidades (validação Zod dinâmica)
- Alerta e submit bloqueado quando o médico não tem nenhuma especialidade cadastrada
- `specialtyId` incluído no payload de criação da consulta
- Tratamento distinto de 422 para erro de especialidade vs. horário inválido
- Testes de integração: 0/1/2+ especialidades e erros 409/422
- Testes E2E Cypress: agendamento com especialidade única e múltipla

### Changed
- `IAppointmentModel`: adicionados `specialtyId: string | null` e `specialtyName: string | null`
- `IBookAppointmentInput`: adicionado `specialtyId?: string`
- `toBookAppointmentDto`: mapeia `specialtyId` para o DTO
- `toAppointmentModel`: mapeia `specialtyId` e `specialtyName`
- `useDoctor`: aceita `options?: { enabled?: boolean }` para controle de fetch condicional
- `ITemplateListParams`: adicionado `specialtyId?: string` para filtro
- Sidebar: item "Modelos de prontuário" visível para ADMIN e DOCTOR

---

## [1.0.0] - 2025-01-01

### Added
- Design system completo com tokens de cor, tipografia e dark mode
- Autenticação com login, logout e refresh token via cookies `httpOnly`
- Layout multi-tenant: roteamento por `[slug]` (dev) e subdomínio (prod); backoffice em `/backoffice`
- Sidebar com navegação por role, logo da clínica e avatar do usuário
- Módulo de usuários: CRUD, ativação/desativação, "Meu perfil" no header
- Módulo de clínicas: onboarding, upload de logomarca (claro/escuro), configuração de tema visual
- Módulo de médicos: CRUD com especialidades (many-to-many), edição do próprio perfil
- Módulo de pacientes: CRUD com ADMIN e USER
- Módulo de especialidades médicas
- Módulo de agendas: configuração de horários, exceções (bloqueios de período)
- Módulo de consultas: agenda semanal/diária, agendamento por slot, cancelamento, conclusão
- Testes E2E com Cypress em todos os fluxos críticos
- React Query para estado de servidor; Zustand para estado global de UI/auth
- API Client centralizado (`lib/api-client.ts`) como única fronteira com o axios
