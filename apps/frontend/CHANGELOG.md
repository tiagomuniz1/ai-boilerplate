# Changelog — Frontend

## [Unreleased]

### Fixed

#### Dashboard não atualizava após concluir/cancelar/criar consulta
- `useCompleteAppointment`, `useCancelAppointment` e `useBookAppointment` não invalidavam a query `['dashboard']` no `onSuccess` — mesmo depois do backend atualizar, quem navegava de volta ao dashboard dentro do `staleTime` (60s) via SPA continuava vendo os números antigos
- Os 3 hooks agora também invalidam `['dashboard']` junto com `['appointments']`/`['availability']`

### Added

#### Trocar o profissional de uma consulta
- Página de detalhe da consulta ganha o botão **"Trocar profissional"** (só ADMIN, só em consulta agendada) no header e na barra de ação mobile
- Novo `ReassignProfessionalDialog` — busca só os profissionais elegíveis e disponíveis naquele horário (mesma especialidade/profissão, slot livre), com estados de carregando/erro/vazio ("Nenhum profissional disponível para este horário") e mensagens amigáveis para `422`/`409`; mantém data e horário da consulta
- Novos service (`getReassignCandidates`/`reassign`), use-cases, hooks (`useReassignCandidates`, `useReassignAppointment`), mapper e tipos (`IReassignCandidateModel`); `onSuccess` invalida `['appointments']`/`['availability']`/`['dashboard']`
- Novo teste E2E `appointments-reassign.cy.ts` cobrindo abrir o diálogo, listar candidatos, trocar, estado vazio e a visibilidade só-ADMIN do botão

#### Planos de assinatura no backoffice de clínicas
- Formulário de clínica (criar e editar) ganha um seletor de **Plano** (Grátis, Solo, Clínica, Grupo, Rede) — nova clínica nasce no Grátis; rótulos vêm de `SUBSCRIPTION_PLANS` do `@app/shared`
- Listagem de clínicas ganha uma coluna/badge de **Plano** (desktop e card mobile)
- Ficha da clínica mostra o plano com o preço formatado ("Grátis" | "R$ 99/mês" | "R$ 79/profissional/mês" | "Sob consulta") e o uso "**X / Y profissionais**" (Y = teto do plano ou "ilimitado")
- Tipos (`IClinicModel`, `ICreate/UpdateClinicInput`) e o mapper `toClinicModel` passam `plan` e `professionalCount` adiante

#### CAPTCHA no login a partir da 3ª tentativa (backoffice + clínicas)
- `LoginForm` (compartilhado entre o login do backoffice e o de cada clínica) passa a mostrar um captcha Cloudflare Turnstile assim que o backend sinaliza `requiresCaptcha: true` (a partir da 2ª tentativa falha) — botão de login fica desabilitado até o captcha ser resolvido
- Novo componente `TurnstileWidget` (`components/features/auth/components/turnstile-widget.tsx`) — sem lib nova, carrega o script oficial da Cloudflare via `next/script` e renderiza o widget num container
- `IApiError` ganha `requiresCaptcha?: boolean`, repassado pelo `normalizeProblemDetails` do `api-client.ts`; `ILoginInput` ganha `captchaToken?: string`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — nova env var pública (build-time), com a site-key de teste oficial da Cloudflare como padrão local (sempre aprova)
- Novos testes E2E: `login.cy.ts` estendido e `backoffice-login.cy.ts` (novo — não existia cobertura E2E do login do backoffice antes)

#### Relacionar pacientes por grau de parentesco — dependente sem CPF
- Novo toggle "Este paciente é dependente de outro paciente (titular)" no formulário de paciente (criar e editar): ao marcar, o CPF deixa de ser obrigatório e aparecem os campos de busca do titular e grau de parentesco
- Novo componente `TitularSearch` (`components/features/patients/components/titular-search.tsx`), adaptado do `UserSearch` já existente — autocomplete com debounce buscando pacientes elegíveis a titular (exclui dependentes e, em edição, o próprio paciente)
- Ficha do paciente ganha duas novas seções: "Vinculado a" (quando o paciente é dependente, com nome do titular, grau de parentesco e link para a ficha dele) e "Dependentes" (quando o paciente é titular, listando cada dependente); CPF ausente agora mostra "Não informado" em vez de uma linha em branco
- Corrigido bug no formulário de edição: o campo de CPF era exibido mas nunca era enviado no submit — agora é enviado normalmente, viabilizando adicionar o CPF depois (promoção de dependente a independente)
- Editar um dependente permite remover o vínculo (exige CPF preenchido) ou trocar de titular/grau de parentesco

#### Acervo de fotos da consulta
- Nova aba "Fotos" na tela da consulta: upload múltiplo (JPEG/PNG/WebP, até 8MB/arquivo), grade de miniaturas ordenada por data de envio, preview ampliado e exclusão (PROFESSIONAL da própria consulta / ADMIN qualquer uma) — `components/features/consultation-photos/`
- Nova seção "Fotos de Evolução" na página do paciente: galeria paginada agregando fotos de todas as consultas daquele paciente, sem ação de excluir; a restrição de PROFESSIONAL às próprias consultas é inteira do backend, o frontend só exibe o que a API retorna
- `PhotoPreviewModal` ganha navegação entre fotos (setinhas anterior/próxima sobrepostas à imagem + teclas de seta), reaproveitada tanto na aba da consulta quanto na galeria do paciente; navegação fica restrita à página atualmente carregada na galeria paginada
- Novo padrão `usePhotoThumbnail`: imagem exibida via `apiClient.getBlob` + `URL.createObjectURL` (nunca `<img src>` direto pra API, já que o endpoint é autenticado), com revogação da URL no unmount/troca de foto — primeiro componente do projeto a renderizar imagem autenticada inline
- Nova linha "Fotos" no resumo da consulta (`ResumoTab`), com contador real

#### Coluna "Especialidade" na listagem de profissionais mostra a profissão para não-médicos
- Quando o profissional não tem especialidade (todo não-CRM, e o CRM generalista sem especialidade), a célula deixa de ficar vazia e passa a mostrar a profissão (Nutricionista, Fisioterapeuta, Psicólogo, Dentista, Fonoaudiólogo, ou Médico no caso do generalista) — tabela e card mobile
- Novo `primaryOccupationLabel` em `professionals/utils/profession-label.ts`, reaproveitando `COUNCIL_TYPE_OCCUPATION_LABELS` do `@app/shared`

#### Coluna "Tipo" na listagem de usuários mostra a profissão, não mais "Perfis"
- Coluna renomeada de "Perfis" para "Tipo" na tabela e no card mobile — o nome antigo era confuso por soar sinônimo da coluna "Role"
- Profissional passa a exibir a profissão real (Médico, Nutricionista, Fisioterapeuta, Psicólogo, Dentista, Fonoaudiólogo) em vez do rótulo genérico "Profissional"; paciente continua exibindo "Paciente"
- Novo `COUNCIL_TYPE_OCCUPATION_LABELS` em `packages/shared` (councilType → substantivo de ocupação), consumido via `IUserModel.councilType` (novo campo, populado pelo backend a partir do registro profissional principal)

#### Qualquer profissional pode criar o próprio template de prontuário
- Item "Modelos de prontuário" liberado na sidebar para `PROFESSIONAL` (antes exclusivo de `ADMIN`)
- Novo hook `useMyProfessional` — resolve o próprio registro de profissional do usuário logado
- `TemplateForm`: profissional CRM vê o seletor de especialidade restrito às próprias especialidades; profissional não-CRM não vê seletor de especialidade (profissão derivada do próprio registro); ADMIN ganha um novo seletor de "Profissão" ao criar um generalista
- `TemplateList`/`TemplateDetails`: botão de criar visível para `PROFESSIONAL`; edição visível quando o profissional é dono do escopo do template (própria especialidade ou própria profissão); exclusão continua exclusiva de `ADMIN`
- Guard de role explícito nas 4 páginas de `medical-record-templates` (antes só a sidebar escondia o link)
- `MedicalRecordSection` resolve o template pelo `councilType` do profissional da consulta (nova prop `professionalId`) quando a consulta não tem especialidade, em vez de um único generalista por clínica

#### Preparação para deploy em produção (subdomain-mode multi-tenant)
- **`api-client` deriva o `x-clinic-slug` do subdomínio** (`clinica.pulso.center` → `clinica`) em vez do path, com fallback path-mode em dev e redirect de 401 subdomain-aware — corrige o slug errado que quebrava a auth em produção
- Helper puro `extractSlugFromSubdomain` compartilhado pelo `middleware.ts` e pelo `api-client` (`lib/subdomain.ts`), suportando base domain de múltiplos níveis (ex.: `staging.pulso.center`)
- `middleware.ts` monta `${NEXT_PUBLIC_API_URL}/auth/refresh` absoluto, com a API em host dedicado (`api.<dominio>`)
- **Build args de produção** `NEXT_PUBLIC_BASE_DOMAIN` e `NEXT_PUBLIC_API_URL` (inlined no build, por ambiente); `load-env.js` para carregar variáveis no boot
- Imagem Docker de produção endurecida (`.dockerignore`, standalone output do Next)

#### Seleção de CRM/especialidade ao emitir receita, atestado e exame
- Componente reutilizável `DoctorSignatureSelect` nos formulários de receita, atestado e exame — seletor de **CRM** (default "CRM principal") e de **especialidade** ("assinar como", trazendo o RQE de cada uma); só aparece quando o médico tem mais de uma opção
- Envia `crmId`/`specialtyId` ao backend apenas quando alterados; default mantém CRM primário + especialidade da consulta

#### Título do especialista no cadastro de especialidade
- Campo opcional "Título do especialista" no formulário de especialidade (ex.: "mastologista") — usado nos documentos; exibido nos detalhes quando preenchido
- `titleName` propagado em tipos, mappers e no modelo de especialidade
- Cobertura de testes de integração 100% nos componentes novos/alterados

#### Página Pública de Verificação de Receita
- Rota pública `/[slug]/verify/prescriptions/[token]` (grupo `(public)`, sem autenticação) aberta ao bipar o QR Code do PDF da receita
- Exibe os dados autoritativos da receita — clínica, médico (nome/CRM/especialidade), paciente mascarado e as medicações (nome/princípio ativo/dosagem/quantidade); **não** exibe posologia nem observações
- Estados de loading (skeleton), receita inválida/não encontrada e sucesso; layout responsivo mobile-first
- Camadas service/mapper/use-case/hook (dados via React Query); `/verify` liberado no `middleware.ts`; testes de integração com 100% de cobertura

#### Telas de Gestão de Medicamentos (Backoffice / PLATFORM_ADMIN)
- Listagem com busca (debounced) por nome/princípio ativo, paginação server-side, filtro "incluir inativos" e exibição da origem (ANVISA/Manual)
- Criação, edição, ativar/desativar (com confirmação) e exclusão (soft delete, com confirmação)
- `MedicationForm` com validação Zod; `source` exibido como readonly na edição
- Estados loading/error/empty/success com skeletons
- Item "Medicamentos" na navegação do backoffice (restrito a PLATFORM_ADMIN)
- Camadas service/mappers/use-cases/hooks (dados via React Query); testes unitários e de integração com 100% de cobertura
- Testes E2E Cypress: listagem, criação, edição e exclusão

### Changed

#### BREAKING: generalização de "médico" para "profissional de saúde"
- Feature `doctors` renomeada para `professionals` (rotas, componentes, hooks, services, use-cases, mappers, types); rota `/doctors` não existe mais — não há redirect, URLs antigas retornam 404
- `ProfessionalForm` reformulado com múltiplos registros profissionais dinâmicos (`councilType` por registro — CRM, CRN, CREFITO, CRP, CRO, COREN, CREF, CRFA), com máscara e validação de número específicas por conselho; RQE segue exclusivo de especialidades assinadas por CRM
- `DoctorSignatureSelect` renomeado para `ProfessionalSignatureSelect`; exibe o conselho de cada registro (não mais fixo em "CRM")
- Campo `isDoctor` de `IUserModel` renomeado para `isProfessional`; badges e labels de perfil trocam "Médico" por "Profissional" em toda a aplicação (usuários, agenda, consultas, prontuários, atestados, exames, receitas, templates)
- Campos `doctorId`/`doctorName` renomeados para `professionalId`/`professionalName` em todas as features consumidoras (consultas, agendas, exceções de agenda, exames, atestados, receitas, templates de receita, prontuários, dashboard)
- Página pública de verificação de receita exibe o conselho e número de registro do profissional (`professionalCouncilType`/`professionalRegistrationNumber`) em vez de CRM fixo
- Suíte E2E (Cypress) migrada por completo para o novo modelo: specs de `doctors/*` renomeadas para `professionals/*` e reescritas para o formulário multi-registro; demais specs (consultas, agendas, exames, prontuários, usuários, mobile) atualizadas para os novos testids e payloads (`registrations` em vez de `crmNumber`)

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
