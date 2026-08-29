# Changelog — Frontend

## [Unreleased]

### Fixed

#### Consulta sem prontuário exibia estado de erro e escondia o botão de preencher
- `GET /medical-records/by-appointment/:id` responde **404** quando ainda não existe prontuário — o caso normal, não uma falha. O estado de erro introduzido junto com a correção de cache tratava esse 404 como erro e escondia o botão "Preencher prontuário"
- O 404 passa a ser traduzido para "não há prontuário" no use-case, e o estado de erro fica reservado a falhas de verdade

### Changed

#### Testes: 406 erros de tipo corrigidos e o `typecheck` passa a cobri-los
- O `tsconfig.json` do app exclui `cypress` **e** `**/*.spec.ts(x)`, então nem os 114 arquivos de E2E nem os 427 de Jest eram compilados — 406 erros acumularam sem ninguém ver. `yarn typecheck` agora roda as três árvores, via os novos `typecheck:test` e `typecheck:e2e`, cada uma com seu tsconfig para não misturar os tipos do app com os globais de Jest e Cypress
- **236 nos testes Jest**, quase todos a mesma coisa: fixtures que envelheceram junto com o produto. Profissional ainda com `crmNumber` (virou `registrations` na generalização para profissional de saúde), especialidade com `rqe` em vez de `registryNumber`, consulta sem `insuranceType` nem os campos de série, paciente sem os campos de parentesco, clínica sem `themeId`/`logoDarkUrl`, template sem `sectionKey`/`sections`, e um `ThemeBorderRadius.MD` que nunca existiu no enum
- **170 no Cypress**: dois helpers cujo tipo mentia (`visitBackoffice` inferia o tipo do valor padrão, tornando `clinicId` obrigatório; `visitClinic` e `stubClinicLayout` exigiam um `MockAuthUser` completo — daí o `{} as MockAuthUser`) e nove specs sem `import`/`export`, tratadas como scripts e dividindo o escopo global
- É a mesma classe de defeito que deixou a fixture de paciente sem `dependents` e derrubou o app durante a validação: cada entrega deixava mocks para trás e nada avisava

#### Cypress: stubs das páginas de detalhe centralizados
- Novos `cy.stubAppointmentDetailWidgets()` e `cy.stubPatientDetailWidgets()`. As páginas de detalhe disparam um GET por widget assim que montam, inclusive de abas que o teste nunca abre; um deles sem stub responde `401`, o api-client tenta refresh, falha e manda o app para `/login` — a spec morre num loop de redirect com um erro que não menciona o stub faltante
- Antes cada spec repetia os stubs (um deles escondido dentro de uma função chamada `stubExamRequests`), então todo widget novo quebrava a suíte de novo. Agora é uma linha num lugar só

### Added

#### Consultas recorrentes
- `BookAppointmentDialog` ganha a seção **Recorrência**: um checkbox "Repetir esta consulta" que revela intervalo (1, 2 ou 4 semanas) e término (após N consultas **ou** até uma data). Com a recorrência desligada o diálogo é idêntico ao de antes — mesmo layout, mesmo botão, mesmo fluxo de um passo
- Com a recorrência ligada, o botão passa a "Revisar datas" e o corpo do diálogo troca para um **passo de pré-visualização**: cada data candidata aparece com seu status (Disponível, Ocupado, Fora da agenda, Bloqueado, No passado). Datas indisponíveis vêm desmarcadas e desabilitadas — seriam recusadas pelo backend de qualquer forma. O usuário desmarca o que quiser e confirma só as escolhidas
- Se alguma data deixar de estar disponível entre a prévia e o envio, o diálogo permanece aberto listando exatamente quais mudaram (o backend é tudo-ou-nada: nenhuma consulta é criada)
- Diálogo de cancelamento ganha o escopo **"Apenas esta consulta"** / **"Esta e todas as futuras da série"**, com a contagem no texto e no botão ("Cancelar 6 consultas"). A escolha só aparece quando existe ocorrência futura cancelável; o escopo destrutivo nunca vem pré-selecionado
- Consulta de uma série é sinalizada como **"Sessão 3 de 10"** — ícone na célula da agenda, linha no diálogo de detalhes e célula na página de detalhe, onde um link **"Ver série"** abre o novo `SeriesOccurrencesDialog` com todas as ocorrências, seus status e navegação entre elas
- Novos service (`previewRecurrence`/`bookRecurring`/`getSeries`), use-cases, hooks (`useRecurrencePreview`, `useBookRecurringAppointments`, `useAppointmentSeries`), mappers, `lib/recurrence-status.ts` e `getWeekdayNamePtBR`
- Novos testes E2E `appointments-recurrence-book.cy.ts`, `appointments-recurrence-series.cy.ts` e `appointments-recurrence-real.cy.ts`

### Fixed

#### Semana da agenda podia deslocar um dia em fuso positivo
- `getWeekDates` em `agenda-week-grid.tsx` usava `toISOString()` (que converte para UTC) enquanto o resto do código usa `toLocalDateString` justamente para evitar esse deslocamento — agora usa o mesmo helper

#### Escopo de cancelamento vazava entre aberturas do diálogo
- `CancelAppointmentDialog` não tinha `defaultValues` nem reset ao fechar, e o componente fica montado (é o `Modal` que retorna `null`) — o motivo digitado e o escopo escolhido sobreviviam até a próxima abertura

### Fixed

#### Cypress local sempre roda contra o dev correto (guard-rails de E2E)
- `load-env.js` **nunca** puxa env do Parameter Store em desenvolvimento local (`PARAMETER_STORE_ENV=development`) — não existe ambiente `development` na AWS (validação é local via Docker), e um `NEXT_PUBLIC_API_URL` remoto silenciosamente quebrava o Cypress (o app respondia na API errada e toda rota `/:slug` dava 404). Mantém o `.env.local` como está (default `http://localhost:3001`). Produção (`PARAMETER_STORE_ENV=production`) segue igual
- Novo `scripts/check-e2e-env.js` rodado no início do `cypress:run` — falha rápido com mensagem acionável em vez do 404 críptico quando (1) o backend do Pulso não está no ar / o banco de dev não foi seedado com a clínica `pulso`, ou (2) o app que responde na `baseUrl` não é o Pulso (porta tomada por outro projeto, ou frontend fora do ar). Portas espelham `cypress.config.ts` (3000/3001), com override via `E2E_BASE_URL`/`E2E_API_URL`

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

## [1.3.1] - 2026-08-28

### Fixed

#### Agenda mostrava o mesmo horário duas vezes
- A disponibilidade só retém um slot enquanto a consulta está `scheduled`, então consulta **cancelada, confirmada, concluída ou faltou** voltava como slot livre **e** como consulta — e a grade concatenava as duas listas, renderizando o mesmo horário duas vezes ("15:00 Livre" logo acima de "15:00 Cancelada"). Parecia dupla marcação
- `useDayAgenda` agora entrega uma linha por horário: a consulta vence, exceto quando é só uma cancelada e o slot de fato voltou a ficar livre — aí a linha útil é a agendável, e o cancelamento segue visível na lista de consultas e no histórico do paciente. Cancelada sem slot livre correspondente continua sendo exibida, para nada sumir sem rastro

#### Prontuário salvo não aparecia até recarregar a página
- Ao **criar**, o registro era gravado mas a aba continuava em "Prontuário ainda não preenchido" e o cabeçalho seguia oferecendo "Preencher prontuário" — levando o profissional a achar que não salvou e preencher de novo
- Criar e editar agora escrevem no cache o prontuário que a própria API devolveu (`setQueryData`), em vez de invalidar e esperar uma nova leitura. A resposta do POST/PUT já é a representação autoritativa; descartá-la para perguntar de novo é o que abria a janela
- A seção também deixava de distinguir **leitura que falhou** de **prontuário inexistente**: um erro na busca renderizava o estado vazio, convidando a duplicar um registro que podia existir. Agora informa a falha

#### Data de nascimento do paciente aparecia um dia antes da cadastrada
- Mesmo defeito do atestado, em outro módulo: `toPatientModel` fazia `new Date('1987-05-01')` e a lista e a página do paciente mostravam 30/04/1987, contradizendo o próprio formulário de edição e a tela da consulta — que já usava `+ 'T00:00:00'` e acertava
- Corrigidos junto os mesmos parses em `to-consultation-photo-gallery-item-model` (data da consulta na galeria) e `to-dashboard-model` (período), que ainda não são renderizados mas herdariam o erro na primeira tela que os usasse
- Os testes de `to-patient-model` e da galeria afirmavam com `toISOString()`, que reintroduz a mesma conversão para UTC do bug; agora afirmam o dia no calendário local

#### Data do atestado aparecia um dia antes da informada
- `toAtestadoModel` fazia `new Date('2026-08-28')` numa data de calendário, que o JS interpreta como meia-noite **UTC**; formatada em UTC-3 voltava para 27/08. Num atestado de afastamento a data tem peso legal, e o PDF (gerado no backend, que já tratava isso) imprimia a data certa enquanto a tela mostrava a errada
- `startDate` e `attendanceDate` passam a ser mantidos como a string `YYYY-MM-DD` que a API envia e formatados com o `formatDateToBR` que já existia — data de calendário não é instante
- O teste da listagem derivava o valor esperado com a mesma expressão bugada da implementação, então concordava com a saída errada e nunca poderia falhar; agora afirma o literal

#### Botão de excluir profissional aparecia para quem não pode excluir
- Excluir profissional é exclusivo de ADMIN (`ai/context/permissions.md`), mas a lista mostrava o botão para PROFESSIONAL e USER — o backend respondia `403` e o usuário só via um erro. O botão agora é gated por role na tabela e no card mobile

#### "Trocar profissional" aparecia em ocorrência de série
- O backend recusa reatribuir uma ocorrência de série com `422` (trocar o profissional de uma ocorrência deixaria a série heterogênea). O botão agora só aparece em consulta avulsa

#### Nome do paciente ficava truncado na visão de semana
- A célula da agenda mostrava `hora | nome | status` nas 7 colunas espremidas da semana, e o nome sobrava em "T…". Na visão de semana a célula entra em modo denso: o rótulo de status sai (a cor da célula já o comunica) e o espaço vai para o nome, que ganha `title` com o nome completo

#### Login dizia "Email ou senha inválidos" para conta desativada
- Um `401` por conta desativada, conta sem clínica vinculada ou captcha inválido exibia a mesma mensagem de credencial errada, mandando o usuário tentar de novo uma senha que estava certa. Cada caso agora tem sua própria mensagem; a de credencial segue sendo o fallback (e continua sem revelar se o e-mail existe)

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
