# Changelog — Backend

## [Unreleased]

### Added

#### Consultas recorrentes
- Nova tabela `appointment_series` guardando a regra escolhida (intervalo, dia da semana, horário, data âncora e o terminador: nº de ocorrências e/ou data-limite) e quantas ocorrências foram criadas; `appointments` ganha `series_id` + `series_sequence` (posição 1..N, imutável — cancelar a #3 não renumera as demais)
- `GET /appointments/recurring/preview` (ADMIN, PROFESSIONAL) devolve as datas candidatas com o motivo de cada indisponibilidade — `available`, `already_booked`, `outside_schedule`, `blocked_by_exception`, `in_the_past` — em vez de um simples "não dá"
- `POST /appointments/recurring` (ADMIN, PROFESSIONAL) cria a série inteira ou nenhuma consulta. O cliente envia as datas que confirmou na tela; o servidor revalida que todas caem no mesmo dia da semana, na grade do intervalo, dentro do horizonte e no futuro. Se algo mudou desde a prévia, responde `409` listando **todas** as datas problemáticas de uma vez, em `conflictingOccurrences`
- Primeiro endpoint do projeto a usar o `IdempotencyInterceptor` (que existia e nunca fora aplicado): um reenvio com o mesmo `Idempotency-Key` não duplica a série. Ressalvas conhecidas do interceptor: só cacheia sucesso e não tem guarda de in-flight — o lock e o índice único cobrem o resto
- `PATCH /appointments/:id/cancel` aceita `scope`: `single_occurrence` (padrão, retrocompatível) ou `this_and_future_occurrences`, que cancela a ocorrência e todas as posteriores da série numa transação. A resposta ganha `cancelledOccurrenceCount` e `cancelledAppointmentIds`
- `GET /appointments/series/:seriesId` (ADMIN, PROFESSIONAL, USER) devolve a série com suas ocorrências ordenadas
- `AppointmentResponseDto` ganha `seriesId`, `seriesSequence` e `seriesTotalOccurrences`; `AppointmentDetailResponseDto` ganha `seriesFutureCount` (contado, não derivado de `total - sequence`, que ignoraria ocorrências já canceladas ou concluídas)
- Limites: **26 ocorrências e 365 dias**, o que vier primeiro (`packages/shared/src/config/recurrence.config.ts`, consumido também pelo frontend)

### Changed

#### Concorrência da criação em lote
- Um único lock distribuído por `(clínica, profissional)` — 26 locks aninhados por slot seriam lentos e impossíveis de liberar numa aquisição parcial. Os INSERTs saem em ordem de data crescente dentro de uma transação, o que torna deadlock entre duas séries impossível
- O **índice único parcial continua sendo o árbitro real** da corrida contra o `POST /appointments` avulso, que tranca um espaço de chave diferente — por isso o tratamento de `23505` é obrigatório, não decorativo

#### Trocar profissional bloqueado em consulta de série
- `PATCH /appointments/:id/reassign` passa a recusar (`422`) uma consulta com `seriesId`: trocar o profissional de uma ocorrência deixaria a série heterogênea e quebraria a checagem de posse usada no cancelamento em escopo. Reatribuir a série inteira é feature futura

### Fixed

#### Agendamento avulso ignorava bloqueios da agenda
- `create-appointment` derivava o slot na mão e **não consultava `schedule_exceptions`** — dava para agendar em cima de um bloqueio. Agora delega ao `ResolveProfessionalSlotUseCase`, que já validava grade + exceção + ocupação, corrigindo o furo e eliminando a duplicação. Sem isso, a prévia recorrente marcaria a data como "Bloqueado" e o usuário contornaria agendando avulso

#### Consulta confirmada não segurava o slot
- O índice único parcial e o `findActiveBySlot` cobriam apenas `status = 'scheduled'`, então uma consulta **confirmada** reaparecia como horário livre na disponibilidade e podia ser duplo-agendada sem violar o índice. Raro numa consulta avulsa; quase certo ao longo de uma série recorrente longa
- `UQ_appointment_slot_scheduled` vira `UQ_appointment_slot_active`, cobrindo `scheduled` e `confirmed`; `cancelled`/`completed`/`no_show` seguem liberando o slot. **Antes de rodar em produção**, checar duplicatas com a query documentada no cabeçalho da migration — a criação do índice falha se existir alguma

#### `GET /appointments` quebrava ao ordenar por coluna com JOIN
- O `ORDER BY` usava `appointment.start_time` (nome de coluna) em vez de `appointment.startTime` (nome da propriedade). Sem JOIN o TypeORM não precisava resolver isso; com o JOIN da série, a paginação passa pela metadata da entidade e estourava `Cannot read properties of undefined (reading 'databaseName')`

### Added

#### Lembretes de consulta por SMS (AWS End User Messaging) — Fase 1
- Novo módulo `reminders`: um cron in-app (`@nestjs/schedule`, a cada 10 min, dentro do container `backend`) que envia lembretes de consulta por **SMS via AWS End User Messaging (Pinpoint SMS Voice v2)** — credenciais pela instance role da EC2, sem chaves estáticas (igual ao S3)
- **Dois lembretes por consulta: 24h e 3h antes** (offsets sobrescrevíveis por `REMINDER_OFFSETS_HOURS`), com janela de 15 min por offset para não sobrepor. Envia para consultas `scheduled`/`confirmed` de clínicas ativas, cross-clinic
- **Dedup à prova de corrida**: nova tabela `appointment_reminders` (append-only) com unique `(appointment_id, offset_label)`; o slot é reivindicado via `INSERT ... ON CONFLICT DO NOTHING` antes do envio, então duas instâncias nunca mandam duplicado. `DistributedLockService` garante um tick por vez. A tabela também é o tracking (status `pending`/`sent`/`failed`/`skipped` + `provider_message_id`/erro)
- Telefone normalizado para **E.164 (+55)** (`toE164BrazilPhone`); telefone inválido vira `skipped` sem quebrar o tick. Nada de PII em log (só `appointmentId`)
- Adapter `AwsSmsAdapter` com circuit breaker (opossum) e **skip gracioso** quando `AWS_SMS_ORIGINATION_IDENTITY` não está configurado — permite subir antes do remetente do Brasil ser aprovado na AWS. Nesse caso o claim provisório é **liberado** (`release`) em vez de marcado permanentemente como `skipped`, então o lembrete se auto-cura e reenvia num tick posterior assim que o remetente existir (telefone inválido continua `skipped` permanente)
- Gate por `REMINDERS_ENABLED` (default `false`) — dev/teste nunca enviam
- **Infra**: policy IAM `sms-send` (`sms-voice:SendTextMessage`) na role da EC2; `aws_pinpointsmsvoicev2_configuration_set` + `opt_out_list` no ambiente de produção; novas vars no `seed-ssm.sh` (`REMINDERS_ENABLED`, `AWS_SMS_ORIGINATION_IDENTITY`, `AWS_SMS_CONFIG_SET`). WhatsApp (End User Messaging Social) fica plugável para a Fase 2
- Migration `create-appointment-reminders-table`; cobertura 100% nos arquivos novos (unit) + integração da tabela (dedup real)

### Fixed

#### Dashboard não atualizava após concluir/cancelar/criar consulta ou marcar falta
- `CompleteAppointmentUseCase`, `CancelAppointmentUseCase`, `CreateAppointmentUseCase` e `MarkAppointmentNoShowUseCase` não invalidavam o cache `dashboard:${clinicId}:*` (TTL de 60s) — qualquer mudança de status de consulta ficava invisível no dashboard até o cache expirar sozinho
- Os 4 use-cases agora chamam `cacheService.delByPrefix(\`dashboard:${clinicId}:\`)` junto com as invalidações de `appointments:*` já existentes
- Novo teste de integração em `dashboard.integration.spec.ts` cobrindo o cenário fim a fim (completar consulta → GET /dashboard sem esperar o TTL → KPI atualizado)

### Added

#### Trocar o profissional de uma consulta (reassign)
- Novo `PATCH /appointments/:id/reassign` (**somente ADMIN**) troca o profissional de uma consulta **agendada** mantendo a mesma data/horário — não é uma troca crua de `professional_id`: revalida que o profissional-alvo tem o slot válido na própria agenda (dentro do expediente, na grade, sem exceção de agenda e livre de outra consulta) e atualiza `professional_id`/`schedule_id`/`end_time` de acordo com a grade do alvo (`specialty_id`/data/horário inalterados)
- Elegibilidade: mesma **especialidade** (consultas com `specialtyId`) ou mesma **profissão/`councilType`** (consultas generalistas) — mantém coerente o template de prontuário e a identidade de assinatura de documentos, que derivam do profissional atual + `specialtyId` no momento da criação
- Novo `GET /appointments/:id/reassign-candidates` (ADMIN) devolve só os profissionais elegíveis **e** disponíveis naquele slot — a UI só mostra opções que funcionam; o `PATCH` só falha por indisponibilidade numa corrida de concorrência (`409`)
- Novos use-cases `ResolveProfessionalSlotUseCase` (composição reutilizável de agenda + exceções + colisão), `ReassignAppointmentUseCase` (lock distribuído + transação, mesmo padrão do create) e `GetReassignCandidatesUseCase`; lógica de slot duplicada em create/availability extraída para `utils/slot.util.ts`
- Erros: `422` (consulta não agendada / alvo inelegível / alvo indisponível / no passado), `404` (consulta ou profissional inexistente), `409` (corrida de slot ou optimistic lock). Cache de disponibilidade invalidado para os **dois** profissionais (origem e destino). Sem migration — as colunas já existiam

#### Planos de assinatura por clínica (cobrança por nº de profissionais)
- Nova coluna `plan` em `clinics` (migration `add-plan-to-clinics`, default `'free'` mantido no banco — clínica nova/seed/raw nasce Grátis). Enum `SubscriptionPlan` (`free`, `solo`, `clinica`, `grupo`, `rede`) e config `SUBSCRIPTION_PLANS` no `@app/shared` — **fonte única de rótulo, teto de profissionais e preço** (editar um plano é uma linha nessa config)
- Planos: Grátis (ilimitado, R$ 0), Solo (1, R$ 99/mês), Clínica (5, R$ 79/prof/mês), Grupo (15, R$ 59/prof/mês), Rede (ilimitado, sob consulta)
- `CreateProfessionalUseCase` bloqueia o cadastro de profissional quando a clínica atinge o teto do plano (`422`); Grátis/Rede (teto nulo) nunca bloqueiam
- `UpdateClinicUseCase` bloqueia rebaixar o plano quando a clínica já tem mais profissionais que o novo teto permite (`422`, mensagem com a contagem atual)
- `plan` em `CreateClinicDto`/`UpdateClinicDto`/`ClinicResponseDto` (só PLATFORM_ADMIN cria/edita, via `POST`/`PATCH /clinics` já existentes); `GET /clinics/:id` passa a trazer `professionalCount` (para o indicador "X / Y" do backoffice)
- Novo `countByClinic` no repositório de profissionais; `forwardRef` entre `ClinicsModule` e `ProfessionalsModule` (acoplamento inevitável: profissional precisa do plano da clínica, clínica precisa da contagem de profissionais)
- Escopo: só atribuição de plano + enforcement do teto + exibição no backoffice. **Não** inclui pagamento/cobrança/fatura — os preços são informativos (prontos para uma futura integração de billing)

#### Excluir profissional com consultas futuras é bloqueado
- `DeleteProfessionalUseCase` passa a bloquear (`409 Conflict`) a exclusão de um profissional que ainda tem **consultas futuras agendadas** (status agendado, data ≥ hoje) — antes as consultas ficavam órfãs (sem cancelar, apontando para um profissional soft-deleted, com o nome exibido em branco). O admin precisa cancelar essas consultas antes de excluir (não há fluxo de remarcar/reatribuir consulta a outro profissional)
- Novo `hasFutureByProfessionalId` no repositório de consultas (espelha o `hasFutureByScheduleId` existente); `forwardRef` entre `ProfessionalsModule` e `AppointmentsModule`

#### Catálogo canônico de especialidades (CRM)
- Novo importador `run-import-specialties.ts` (mesmo padrão de `run-import-themes.ts`/`run-import-medications.ts`) — publica o catálogo canônico de especialidades médicas (CRM) definido em `canonical-specialties.ts`, idempotente por `name` (case-insensitive)
- Lista inicial curada com foco em atendimento de consultório: Cardiologia, Clínica Médica, Dermatologia, Endocrinologia e Metabologia, Geriatria, Ginecologia e Obstetrícia, Hematologia e Hemoterapia, Mastologia, Nutrologia, Oftalmologia, Oncologia Clínica, Ortopedia e Traumatologia, Otorrinolaringologia, Pediatria, Psiquiatria, Reumatologia, Urologia
- `Specialty` é um conceito exclusivo de CRM neste sistema (demais conselhos usam `councilType` direto, sem especialidade) — lista não inclui especialidades hospitalares/laboratoriais sem fluxo de consultório (Anestesiologia, Patologia, Radiologia, etc.)
- Novo dataset `specialties` em `infra/scripts/publish-canonical-data.sh`

#### CAPTCHA no login a partir da 3ª tentativa (backoffice + clínicas)
- `POST /auth/login` passa a exigir a resolução de um captcha (Cloudflare Turnstile) a partir da 3ª tentativa de login (2 falhas já registradas) para o mesmo e-mail — cobre tanto o login do backoffice quanto o de cada clínica, já que os dois passam pelo mesmo `LoginUseCase`
- Contador de tentativas falhas em Redis, chave `login-attempts:<backoffice|slug>:<email>` (TTL de 15 min, `CacheService.increment` novo — `INCR` + `EXPIRE ... NX`), escopado por e-mail + ambiente (backoffice e cada clínica têm contadores independentes para o mesmo e-mail); limpo automaticamente no login bem-sucedido
- Toda falha de credencial permanece com a mesma mensagem genérica `Invalid credentials` (sem enumeração de conta); a resposta ganha `requiresCaptcha: true` (extensão RFC 9457) assim que o contador cruza o limiar — o frontend já sabe mostrar o widget antes da próxima tentativa
- Novo `TurnstileCaptchaAdapter` (`ICaptchaAdapter`) — `axios` com timeout, `axios-retry` (só rede/5xx) e circuit breaker (`opossum`) **fail-closed**: se o Turnstile ficar indisponível, o login é negado em vez de pular a verificação (o raio de impacto fica restrito a contas que já erraram 2x)
- `TURNSTILE_SECRET_KEY` (opcional) em `env.config.ts` — sem configurar, cai na secret-key de teste oficial da Cloudflare (sempre aprova), segura para dev local
- `LoginDto` ganha `captchaToken` opcional

#### Relacionar pacientes por grau de parentesco — dependente sem CPF
- Um paciente pode ser cadastrado como **dependente** de outro paciente da mesma clínica (o **titular**), com um grau de parentesco (`KinshipType`: filho, cônjuge, pai, mãe, neto, tutelado, outro) — cobre recém-nascidos e menores que ainda não têm CPF emitido
- CPF (`documentNumber`) continua obrigatório por padrão; passa a ser opcional só quando o paciente tem `responsiblePatientId` setado. Paciente independente sem CPF continua rejeitado (400)
- Novas colunas em `patients`: `responsible_patient_id` (self-FK nullable, `ON DELETE RESTRICT`), `kinship_type`, `document_number` agora nullable; `CHECK` constraint garantindo que os dois campos do vínculo vêm sempre juntos (migration `add-kinship-to-patients`)
- Regras de negócio nos use-cases: titular precisa existir na mesma clínica e não pode ele mesmo ser dependente (`422`); paciente não pode ser titular de si mesmo (`422`); paciente com dependentes próprios não pode virar dependente de outro (`409`); remover o vínculo exige `documentNumber` resultante preenchido (`422`); excluir um titular com dependentes ativos é bloqueado (`409`)
- `PatientResponseDto` ganha `responsiblePatientId`, `kinshipType`, `responsiblePatient` (ref do titular, quando o paciente é dependente) e `dependents` (lista, quando o paciente é titular) — populados via batch-load no repository, sem N+1
- Novo filtro `excludeDependents`/`excludeId` em `GET /patients`, usado pelo frontend para restringir a busca de titular a pacientes elegíveis
- Correção de null-safety: `maskCpf`/`formatCpf` (receitas, atestados, pedidos de exame) e o endpoint público `GET /prescriptions/verify/:token` agora tratam CPF ausente sem lançar erro, mostrando "Não informado"/`***` em vez de quebrar a emissão de documentos para um dependente sem CPF
- Nova nota em `ai/context/permissions.md` — o vínculo segue a mesma regra ADMIN-only já existente em `/patients`

#### Acervo de fotos da consulta (`/consultation-photos`)
- Novo módulo `consultation-photos`: upload (`POST /consultation-photos/appointments/:appointmentId`, multipart, `FilesInterceptor`, só imagens JPEG/PNG/WebP, até 8MB/arquivo), listagem por consulta (`GET ?appointmentId=`), download autenticado do arquivo (`GET /:id/file`, nunca URL pública) e exclusão (`DELETE /:id`)
- Galeria agregada por paciente (`GET /consultation-photos/by-patient/:patientId`, paginada) — um PROFESSIONAL só vê fotos das **próprias** consultas, mesmo paciente/clínica; sem parâmetro de query para sobrepor esse filtro, é 100% servidor. ADMIN vê de todos os profissionais
- `IStorageAdapter.remove(path)` — novo método (S3 `DeleteObjectCommand` / `fs.unlinkSync` local, idempotente), primeira exclusão real de arquivo do storage do projeto (`exams`/`clinics` continuam sem remover o arquivo ao excluir o registro — fica registrado como gap conhecido, fora de escopo aqui)
- `ConsultationPhotoResponseDto`, `ConsultationPhotoGalleryItemResponseDto`, `PaginatedConsultationPhotosResponseDto` no `@app/shared`
- Nova seção `Fotos da Consulta` em `ai/context/permissions.md`
- Fotos organizadas por data de envio (`createdAt`), não pela data da consulta

#### `GET /users` retorna o `councilType` do registro profissional principal
- `UserResponseDto.councilType` (opcional) — `councilType` da `ProfessionalRegistration` primária do usuário, ou `null` quando não é profissional ou não tem registro primário
- `FindAllUsersUseCase` faz uma query batelada (`professionals` + `professional_registrations`, `is_primary = true`) para popular o campo sem N+1, no mesmo padrão das queries existentes de `isProfessional`/`isPatient`
- Usado pelo frontend para exibir a profissão real (Médico, Nutricionista etc.) na listagem de usuários, em vez do rótulo genérico "Profissional"

#### Qualquer profissional pode criar o próprio template de prontuário
- `POST`/`PATCH /medical-record-templates` liberados para `PROFESSIONAL` (antes exclusivo de `ADMIN`); `DELETE` continua só `ADMIN`
- Nova coluna `council_type` em `medical_record_templates` — o template generalista (sem `specialty_id`) passa a ser escopado por `clinicId + councilType` (no máximo um por profissão por clínica), em vez de um único generalista por clínica (migration `add-council-type-to-medical-record-templates`, com backfill `council_type = 'crm'` nos generalistas existentes)
- `CreateMedicalRecordTemplateUseCase`/`UpdateMedicalRecordTemplateUseCase`: PROFESSIONAL com CRM só cria/edita templates das próprias especialidades (ou o generalista do CRM, sem especialidade); demais profissões (CRN, CREFITO, CRP, CRO, COREN, CREF, CRFA) criam/editam direto para a própria profissão, sem especialidade. ADMIN mantém acesso irrestrito, incluindo criar um generalista de profissão não-médica
- `CreateMedicalRecordUseCase` resolve o template generalista pelo `councilType` do profissional da consulta (via `getPrimaryCouncilType`), não mais só por especialidade nula

### Changed

#### BREAKING: generalização do modelo de profissional além de médico (CRM)
- `UserRole.DOCTOR` renomeado para `UserRole.PROFESSIONAL` — role único e genérico para qualquer profissional de saúde, não mais exclusivo de médicos
- Módulo `doctors` renomeado para `professionals`; rota `/doctors` deixa de existir, substituída por `/professionals` (sem redirect — clientes devem migrar)
- Entidades `Doctor`/`DoctorCrm`/`DoctorSpecialty` renomeadas para `Professional`/`ProfessionalRegistration`/`ProfessionalSpecialty`; tabelas e colunas renomeadas via migrations reversíveis (`doctor_id` → `professional_id` em `appointments`, `schedules`, `schedule_exceptions`, `exam_requests`, `medical_certificates`, `medical_records`, `prescription_templates`, `prescriptions`)
- Novo enum `CouncilType` (`CRM`, `CRN`, `CREFITO`, `CRP`, `CRO`, `COREN`, `CREF`, `CRFA`) substitui o campo fixo de CRM — cada registro de profissional (`ProfessionalRegistration`) tem seu próprio `councilType` + `number`, com validação de formato por conselho (`COUNCIL_REGISTRATION_FORMATS`) e rótulo de exibição (`COUNCIL_TYPE_LABELS`) no `@app/shared`
- Assinatura de documentos generalizada: `resolveDoctorSigningIdentity` renomeado para `resolveProfessionalSigningIdentity`; snapshots de receita/atestado/pedido de exame trocam a chave `doctor` por `professional` e `crmNumber`/`rqe` por `registrationNumber`/`registryNumber` + `councilType`; PDFs renderizam o rótulo de conselho dinamicamente (`CRM 12345`, `CRN 9876543` etc.) em vez do texto fixo `"CRM"`
- Título do atestado generalizado de `"Atestado Médico"` para `"Atestado"`
- Verificação pública de receita (`GET /prescriptions/verify/:token`) expõe `professionalCouncilType`/`professionalRegistrationNumber` no lugar de `doctorCrmNumber`
- Seeds de `dev`/`carga` passam a semear profissionais com `councilType` variado (não só CRM) — seed de carga com mix ~70% CRM / ~30% CRN·CREFITO·CRP; seed de dev com um profissional CRN (nutricionista) fixo
- `ai/context/permissions.md` reescrito para refletir o role `PROFESSIONAL` genérico

### Added

#### Preparação para deploy em produção (AWS EC2 + RDS + CloudFront)
- **CORS dinâmico** refletindo qualquer origem `*.pulso.center` (e `*.staging.pulso.center`) com `credentials: true` — valida via allowlist/regex e ecoa a origem exata, cobrindo o preflight `OPTIONS`; substitui a origem única `FRONTEND_URL` (`main.ts`)
- **Cookies de auth com `Domain` configurável** (`COOKIE_DOMAIN`), preservando os nomes por-slug (`access_token_${slug}` / `refresh_token_${slug}`) para o `middleware.ts` do frontend enxergar o cookie em `slug.<dominio>` mesmo com a API em host dedicado (`api.<dominio>`)
- **Migrations em produção**: `migration:run:prod` (dataSource compilado) + `bootstrap-schema` (`CREATE SCHEMA` — o `init.sql` não roda no RDS) + `migrate.sh`, orquestrados pelo serviço `migrate` do `docker-compose.prod.yml` antes do backend subir
- **Imagens Docker endurecidas**: `.dockerignore` (fecha vazamento de `.env`/`.git`/`node_modules` de dev), `USER node`, e entrypoint que carrega as variáveis do **AWS Parameter Store** no boot (`load-env.js` / `docker-entrypoint.sh`)
- `env.config`: novas variáveis lidas do Parameter Store — `COOKIE_DOMAIN` e `PUBLIC_API_URL` (URL absoluta da API); continuam acessadas apenas em `env.config.ts`

#### Assinatura configurável em receitas, atestados e exames
- Campos opcionais `crmId` e `specialtyId` nos DTOs de criação de receita, atestado e exame — permitem assinar o documento com um **CRM** e uma **especialidade/RQE** diferentes dos principais. Default preservado: CRM primário + especialidade da consulta
- Helper puro `resolveDoctorSigningIdentity` (módulo doctors) resolve CRM, RQE e título da especialidade; rejeita com `422` quando o `crmId`/`specialtyId` informado não pertence ao médico
- `rqe` incluído no snapshot dos três documentos e renderizado ao lado do CRM no PDF (`CRM 12345/SP · RQE 222`)

#### Título do especialista na especialidade (`/specialties`)
- Coluna `title_name` (opcional) em `specialties` — nome da profissão exibido nos documentos (ex.: "mastologista" para a especialidade "Mastologia"); migration `add_title_name_to_specialties`
- Quando preenchido, substitui o nome da especialidade em receitas/atestados/exames; quando vazio, mantém o nome da especialidade
- `titleName` exposto em `SpecialtyResponseDto` e aceito em `CreateSpecialtyDto`/`UpdateSpecialtyDto`

#### Validação de Receita com QR Code (`/prescriptions`)
- Coluna `verification_token` (aleatória/opaca, `randomBytes(32).toString('hex')`) em `prescriptions`, gerada na emissão; migration `add-verification-token-to-prescriptions` com backfill dos registros existentes + índice único
- Endpoint **público** `GET /prescriptions/verify/:token` (`@Public`, rate limit 60/60s) que retorna os dados autoritativos da receita com **nome e CPF do paciente mascarados** — sem `instructions`, `notes` nem IDs internos; receita soft-deleted retorna `404`
- QR Code no rodapé de todo PDF (nó nativo do pdfmake — sem novas dependências) apontando para `${FRONTEND_URL}/{clinicSlug}/verify/prescriptions/{token}`
- `VerifyPrescriptionResponseDto` no `@app/shared`; util de máscara (`maskCpf`, `maskName`); testes unitários (100%) e de integração

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

## [1.3.2] - 2026-08-28

### Fixed

#### Um logo inválido derrubava a geração de PDF inteira
- `LogoFetcherService` confiava no `content-type` e devolvia os bytes em base64 **sem verificar se eram uma imagem**. O upload valida apenas o `mimetype` declarado pelo cliente, então um arquivo que só se diz PNG chegava intacto ao pdfmake, que lançava exceção e levava o documento junto — uma clínica com um logo corrompido perderia **receita, atestado e exame de uma vez**
- Os bytes passam a ser lidos pelo `sharp` antes de virarem data URI; se não forem uma imagem, o PDF é gerado sem logo, que é o que o serviço já dizia fazer nos outros caminhos de falha
- O serviço tem **três cópias idênticas** (receitas, atestados e exames); a correção foi aplicada nas três

#### Consulta confirmada não segurava o slot
- O índice único parcial e as consultas de disponibilidade olhavam só `status = 'scheduled'`, então **confirmar** uma consulta soltava o horário: ele reaparecia como livre na disponibilidade e podia ser agendado por cima sem violar o índice. Raro numa marcação avulsa, quase certo ao longo de uma série recorrente
- `UQ_appointment_slot_scheduled` vira `UQ_appointment_slot_active`, cobrindo `scheduled` **e** `confirmed`. A constante do repositório passa a se chamar `ACTIVE_STATUSES` e é a fonte única com que o índice precisa ficar em sincronia
- Os guardas de "tem consulta futura?" que bloqueiam excluir **agenda** e **profissional** também olhavam só `scheduled` — dava para excluir um profissional cujas consultas futuras estivessem todas confirmadas. Uma consulta confirmada é mais motivo para bloquear a exclusão, não menos
- Verificado antes de aplicar: a query de detecção não encontrou **nenhuma** linha duplicada em produção, e não existe hoje nenhuma consulta `confirmed` — a migração é preventiva e não pode falhar com os dados atuais

## [1.3.1] - 2026-08-28

### Fixed

#### QR Code da receita levava a farmácia para uma tela de login
- A URL do QR era montada como `${FRONTEND_URL}/${slug}/verify/prescriptions/...`, mas em produção `FRONTEND_URL` aponta para `backoffice.pulso.center` e cada clínica é servida no próprio subdomínio. O middleware do frontend lia o slug do host (`backoffice`), o que sobrava do caminho virava `/pulso/verify/...`, a rota deixava de ser pública e o visitante era mandado para o login do backoffice — uma conta que a farmácia não tem
- Novo `common/utils/clinic-url.utils.ts` monta a URL do mesmo jeito que o app resolve a clínica em runtime: subdomínio quando `COOKIE_DOMAIN` está definido (produção e stack local completa), slug no caminho quando não está (dev local)
- **O link do e-mail de definir senha tinha exatamente o mesmo defeito** e caía no mesmo login errado — corrigido junto
- Os specs do gerador de PDF só exercitavam path-mode, por isso passavam com a URL errada; o caso de subdomínio agora está coberto

#### Upload de foto da consulta falhava com `500` em produção
- A policy IAM `clinic-assets-write-production` listava só os prefixos `clinics/*` e `exam-results/*` do bucket; `consultation-photos/*` nunca foi incluído, então todo upload de foto batia em `AccessDenied` na AWS. Corrigido em `infra/terraform/modules/s3-clinic-assets`, que agora documenta que um prefixo faltando não falha no deploy — falha como `500` no primeiro upload daquele tipo

#### Erro do S3 vazava detalhes da infraestrutura para o cliente
- `StorageAdapter` deixava a exceção do SDK subir, e o `ExceptionFilter` a devolvia no corpo da resposta: a mensagem da AWS nomeia o id da conta, o role IAM, o id da instância e o ARN do bucket. Agora as três operações (upload, download, remove) registram a causa no log do servidor e devolvem uma mensagem genérica

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
