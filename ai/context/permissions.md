# Perfis de Usuário e Permissões

## Visão Geral

O sistema possui quatro perfis de usuário (`UserRole`). Cada perfil reflete um papel real dentro da clínica e determina o que o usuário pode ver e fazer.

| Role | Valor | Quem é |
|---|---|---|
| `ADMIN` | `admin` | Gestor da plataforma — acesso total |
| `PROFESSIONAL` | `professional` | Profissional de saúde — gerencia a própria agenda e dados |
| `USER` | `user` | Recepcionista — consulta dados, edita o próprio cadastro |
| `PATIENT` | `patient` | Paciente — **não acessa o sistema** |

> `PROFESSIONAL` é um único role genérico — a profissão em si (médico, nutricionista, fisioterapeuta, psicólogo etc.) não é um role separado, é um atributo do cadastro de profissional (`councilType`, ex.: `CRM`, `CRN`, `CREFITO`, `CRP`). Ver `ai/context/architecture.md` para o catálogo completo de conselhos suportados.

---

## Regras Globais

- **PATIENT não pode fazer login.** O backend bloqueia na autenticação com a mesma mensagem de "credenciais inválidas" (sem revelar o motivo).
- **Primeiro usuário** criado via seed (a plataforma é fechada — `POST /users` não é público).
- **Backend é a fonte de verdade** — o frontend esconde elementos de UX, mas o backend rejeita toda requisição não autorizada com `403 Forbidden`.
- **Own-resource** — PROFESSIONAL e USER só acessam os próprios dados. O controle é feito na camada de use-case, não no controller.

---

## Cargo e Ofício — dois eixos, não um

O `role` responde **o que a pessoa administra**. A **ficha de profissional** (`professionals`, ligada ao usuário por `user_id`) responde **se ela exerce**. São perguntas diferentes e o sistema as separa:

| | Vem de | Decide |
|---|---|---|
| **Escopo** | `role` | Vê tudo (ADMIN) ou só o próprio (PROFESSIONAL) |
| **Exercício** | ficha de profissional | Pode emitir receita, atestado e pedido de exame, e enviar foto |

Isso existe porque quem é dono da clínica com frequência também atende. Um único `role` obrigava a escolher: como ADMIN ela administrava mas não emitia nada; como PROFESSIONAL ela atendia mas não cadastrava paciente nem usuário.

- **ADMIN com ficha** — administra a clínica **e** atende. É o caso do consultório de um profissional só.
- **ADMIN sem ficha** — administra, não emite. Gestor que não é clínico.
- **PROFESSIONAL** — inalterado: atende, escopo restrito ao próprio.
- **USER** — recepção, somente leitura.

**Ter um modelo de receita também é exercício**, e segue o mesmo eixo: quem cadastra um modelo é quem tem ficha, não quem tem cargo (ver "Modelos de Receita").

**Emitir exige ser o profissional da consulta, para qualquer role** — inclusive ADMIN. O documento carrega um snapshot de assinatura (nome, conselho, registro) e um `verification_token` que a farmácia confere num endpoint público; emitir sobre consulta alheia produziria documento verificável atestando registro de outra pessoa. **Ver e excluir** documento continuam administrativos: ADMIN irrestrito na clínica.

---

## Autenticação

| Ação | ADMIN | PROFESSIONAL | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Login | ✓ | ✓ | ✓ | ✗ bloqueado |
| Logout | ✓ | ✓ | ✓ | — |
| Refresh token | ✓ | ✓ | ✓ | — |
| `GET /auth/me` | ✓ | ✓ | ✓ | — |

---

## Usuários (`/users`)

| Ação | ADMIN | PROFESSIONAL | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar usuário | ✓ | ✗ | ✗ | ✗ |
| Listar usuários | ✓ | ✗ | ✗ | ✗ |
| Ver por ID | ✓ qualquer | só o próprio | só o próprio | ✗ |
| Editar | ✓ qualquer | só o próprio | só o próprio | ✗ |
| Alterar perfil de acesso / ativação | ✓ de outros | ✗ | ✗ | ✗ |
| Ativar / Desativar | ✓ | ✗ | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ |

> PROFESSIONAL e USER chegam à tela de edição pelo link **"Meu perfil"** no header. Não têm acesso à listagem.

> **Editar o próprio perfil não promove.** `role` e `isActive` só mudam por ação de um ADMIN, e nem ele muda o próprio `role` — numa clínica com um administrador só, isso a deixaria sem ninguém capaz de gerir usuários. É por aqui que uma profissional já cadastrada se torna administradora (ver "Cargo e Ofício"): a ficha permanece, só o nível administrativo muda.

---

## Profissionais (`/professionals`)

| Ação | ADMIN | PROFESSIONAL | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar profissional | ✓ | ✗ | ✗ | ✗ |
| Listar profissionais | ✓ todos | só o próprio | ✓ todos (leitura) | ✗ |
| Ver por ID | ✓ | só o próprio | ✓ (leitura) | ✗ |
| Editar | ✓ qualquer | só o próprio | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ |

> PROFESSIONAL que chama `GET /professionals` recebe apenas o próprio perfil. USER e ADMIN recebem a lista completa.

---

## Pacientes (`/patients`)

| Ação | ADMIN | PROFESSIONAL | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar paciente | ✓ | ✗ | ✗ | ✗ |
| Listar pacientes | ✓ | ✓ (leitura) | ✓ (leitura) | ✗ |
| Ver por ID | ✓ | ✓ (leitura) | ✓ (leitura) | ✗ |
| Editar | ✓ | ✗ | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ |

> PROFESSIONAL tem leitura em `/patients` para selecionar o paciente ao agendar o próprio atendimento — sem acesso a criar, editar ou excluir.

> Um paciente pode ser vinculado como **dependente** de outro paciente (o **titular**) da mesma clínica, com um grau de parentesco (`KinshipType`). Nesse caso o CPF (`documentNumber`) deixa de ser obrigatório — cobre recém-nascidos e menores sem documento ainda emitido. Criar, alterar ou remover esse vínculo segue a mesma regra de acesso acima: exclusivo de ADMIN, dentro de criar/editar paciente — nenhuma permissão nova foi introduzida.

---

## Agendas (`/schedules`)

| Ação | ADMIN | PROFESSIONAL | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar agenda | ✓ | só a própria | ✗ | ✗ |
| Listar agendas | ✓ todas | só as próprias | ✗ | ✗ |
| Ver por ID | ✓ | só a própria | ✗ | ✗ |
| Editar | ✓ qualquer | só a própria | ✗ | ✗ |
| Excluir | ✓ qualquer | só a própria | ✗ | ✗ |

> PROFESSIONAL identifica a própria agenda via `userId` — não precisa saber o `professionalId` previamente.

---

## Consultas (`/appointments`)

| Ação | ADMIN | PROFESSIONAL | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar consulta | ✓ | só as próprias | ✗ | ✗ |
| Listar consultas | ✓ todas | só as próprias | ✓ (leitura) | ✗ |
| Ver por ID | ✓ | só a própria | ✓ (leitura) | ✗ |
| Cancelar | ✓ qualquer | só a própria | ✗ | ✗ |
| Concluir | ✓ qualquer | só a própria | ✗ | ✗ |
| Ver disponibilidade | ✓ | ✓ própria | ✓ | ✗ |

> PROFESSIONAL que cria uma consulta usa o próprio `professionalId` (via `userId`). ADMIN deve informar `professionalId` no body. Slot é derivado da configuração de agenda — cliente envia apenas `date` + `startTime`. Concluir rejeita consultas futuras.

---

## Catálogo de Campos Canônicos (`/medical-record-canonical-fields`)

> Gerenciado exclusivamente no **backoffice** pelo PLATFORM_ADMIN. ADMIN e PROFESSIONAL podem listar para selecionar campos ao construir templates.

| Ação | PLATFORM_ADMIN | ADMIN | PROFESSIONAL | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|:---:|
| Criar campo | ✓ | ✗ | ✗ | ✗ | ✗ |
| Listar campos | ✓ | ✓ (leitura) | ✓ (leitura) | ✗ | ✗ |
| Editar / Ativar-Desativar | ✓ | ✗ | ✗ | ✗ | ✗ |

> ADMIN e PROFESSIONAL acessam a listagem apenas para compor templates — sem criar ou editar entradas do catálogo.

> **O catálogo é global — não há segmentação.** Todo campo canônico vale para qualquer profissional, de qualquer profissão ou especialidade, e o seletor do construtor de templates mostra o catálogo inteiro. O campo já teve escopo por especialidade, o que só limitava: template é escopado por especialidade **ou** por `councilType`, enquanto o campo só podia sê-lo por especialidade — então as entradas escritas para profissões não-médicas não tinham como existir.

---

## Medicamentos (`/medications`)

> Base canônica da plataforma (sem `clinicId`), origem das futuras receitas. Gerenciada exclusivamente no **backoffice** pelo PLATFORM_ADMIN — a maior parte dos registros vem da importação da base de Dados Abertos da ANVISA. ADMIN e PROFESSIONAL podem listar/ver para prescrever.

| Ação | PLATFORM_ADMIN | ADMIN | PROFESSIONAL | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|:---:|
| Listar (paginado + busca) | ✓ | ✓ (leitura) | ✓ (leitura) | ✗ | ✗ |
| Ver por ID | ✓ | ✓ (leitura) | ✓ (leitura) | ✗ | ✗ |
| Criar | ✓ | ✗ | ✗ | ✗ | ✗ |
| Editar / Ativar-Desativar | ✓ | ✗ | ✗ | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ | ✗ |

> Entradas criadas manualmente têm `source = manual`; as importadas, `source = anvisa`. "Desativar" (`isActive=false`) some das listas de leitura; "Excluir" é soft delete. ADMIN e PROFESSIONAL acessam a base apenas para selecionar medicamentos ao prescrever.

---

## Templates de Prontuário (`/medical-record-templates`)

| Ação | ADMIN | PROFESSIONAL | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar template | ✓ qualquer | ✓ só o próprio escopo | ✗ | ✗ |
| Listar templates | ✓ | ✓ (leitura) | ✗ | ✗ |
| Ver por ID | ✓ | ✓ (leitura) | ✗ | ✗ |
| Editar / Ativar-Desativar | ✓ qualquer | ✓ só o próprio escopo | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ |

> Templates são escopados por `clinicId + specialtyId` **ou**, para o template generalista (sem especialidade), por `clinicId + councilType` — no máximo um por profissão por clínica. Todo profissional pode criar e editar o próprio modelo: médico (CRM) através de uma das próprias especialidades (ou sem especialidade, gerando o generalista do CRM); as demais profissões (CRN, CREFITO, CRP, CRO, CRFA) direto para a profissão, sem passar por especialidade. "Próprio escopo" = especialidade que o profissional possui, ou `councilType` que bate com o próprio registro principal. ADMIN pode criar/editar qualquer template, inclusive um generalista de profissão não-médica. Excluir continua exclusivo do ADMIN.

---


## Modelos de Receita (`/prescription-templates`)

Receituário pré-montado do profissional — a lista de medicamentos que ele repete no dia a dia. Não é documento emitido: é rascunho reutilizável, sem paciente, sem consulta e sem assinatura.

| Ação | ADMIN | PROFESSIONAL | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar modelo | ✓ **se tiver ficha** | ✓ (o próprio) | ✗ | ✗ |
| Listar modelos | ✓ todos | só os próprios | ✗ | ✗ |
| Ver por ID | ✓ qualquer | só o próprio | ✗ | ✗ |
| Editar | ✓ qualquer | só o próprio | ✗ | ✗ |
| Excluir | ✓ qualquer | só o próprio | ✗ | ✗ |

> **Criar depende da ficha, não do cargo** (ver "Cargo e Ofício"). Um ADMIN com ficha cria o modelo sob a própria ficha sem informar `professionalId`; informando um, cria em nome daquele profissional. Um ADMIN **sem** ficha só cria informando `professionalId` — omitir devolve `422`.

> **Editar e excluir são escopo, não exercício:** o ADMIN é zelador dos modelos da clínica e mexe em qualquer um, inclusive sem ter ficha. O profissional só nos próprios — e, como a listagem já lhe devolve apenas esses, ele nunca chega a ver os alheios.

---

## Prontuários (`/medical-records`)

| Ação | ADMIN | PROFESSIONAL | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar prontuário | ✓ qualquer | só das próprias consultas | ✗ | ✗ |
| Listar prontuários (paginado) | ✓ todos | só os próprios | ✗ | ✗ |
| Ver por consulta (`by-appointment`) | ✓ | só das próprias | ✗ | ✗ |
| Ver por ID | ✓ | só o próprio | ✗ | ✗ |
| Editar | ✓ qualquer | só o próprio | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ |

> Prontuário é 1:1 com a consulta — não existe sem consulta vinculada. A especialidade é herdada da consulta e não pode ser alterada. Edição é bloqueada pelo backend após a consulta ser concluída (`422`). O histórico do paciente (`GET /medical-records?patientId=`) é acessível apenas por ADMIN e PROFESSIONAL.

---

## Fotos da Consulta (`/consultation-photos`)

| Ação | ADMIN | PROFESSIONAL | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Enviar foto | ✓ com ficha, só na própria consulta | ✓ só na própria consulta | ✗ | ✗ |
| Listar por consulta | ✓ todas | ✓ só as próprias | ✗ | ✗ |
| Ver/baixar arquivo | ✓ qualquer | ✓ só as próprias | ✗ | ✗ |
| Excluir | ✓ qualquer | ✓ só as próprias | ✗ | ✗ |
| Ver galeria por paciente (`by-patient/:patientId`) | ✓ todos os profissionais | ✓ só as próprias consultas | ✗ | ✗ |

> Fotos são organizadas por data de envio (`createdAt`), não pela data da consulta. A galeria por paciente (`GET /consultation-photos/by-patient/:patientId`) agrega fotos de todas as consultas daquele paciente, mas restringe PROFESSIONAL às fotos das próprias consultas — sem parâmetro de query para sobrepor esse filtro, é 100% servidor. Um profissional nunca vê fotos que outro profissional anexou em consultas diferentes com o mesmo paciente, mesmo sendo o mesmo paciente/clínica.

---

## Sidebar — Itens visíveis por role

| Item | ADMIN | PROFESSIONAL | USER |
|---|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ |
| Usuários | ✓ | ✗ | ✗ |
| Pacientes | ✓ | ✗ | ✓ |
| Profissionais | ✓ | ✓ | ✓ |
| Agendas | ✓ | ✓ | ✗ |
| Modelos de prontuário | ✓ | ✗ | ✗ |
| Consultas | ✓ | ✓ | ✓ |

> Prontuários não têm item próprio na sidebar — são acessados a partir do diálogo de detalhes da consulta e do histórico na página do paciente.

---

## Verificação Pública de Receita (`GET /prescriptions/verify/:token`)

Endpoint **público** (sem autenticação, `@Public`) consumido ao bipar o QR Code do rodapé do PDF da receita. Serve para a farmácia confirmar a autenticidade contra a fonte, evitando PDFs adulterados.

| Ação | Público (sem login) |
|---|:---:|
| Verificar receita por token | ✓ (leitura, dados mascarados) |

> O token (`verification_token`) é opaco e único, gerado na emissão. A resposta traz clínica, profissional (nome/registro profissional/especialidade), **nome e CPF do paciente mascarados** e as medicações (sem posologia, sem observações, sem IDs internos). O registro profissional exibido reflete o `councilType` de quem assinou (CRM, CRN, CREFITO etc.), não só CRM. Receita soft-deleted retorna `404`. Nenhum outro dado clínico é exposto.

---

## Resumo por perfil

### ADMIN
Acesso administrativo irrestrito. Gerencia usuários, profissionais, pacientes, agendas e todas as consultas. Único perfil que pode criar usuários, ativar/desativar contas e excluir registros. Cria e edita templates de prontuário da clínica. Pode criar, editar e excluir qualquer prontuário. **Não emite receita, atestado nem pedido de exame, e não envia foto — a menos que também tenha ficha de profissional**, e nesse caso apenas nas próprias consultas (ver "Cargo e Ofício").

### PROFESSIONAL
Acessa o sistema para gerenciar a própria agenda, criar e acompanhar as próprias consultas. Pode editar os próprios dados de usuário e de profissional. Não vê dados de outros profissionais, agendas de outros ou consultas de outros profissionais. Cria e edita prontuários das próprias consultas (bloqueado após conclusão). Cria e edita o próprio template de prontuário — médico (CRM) através de uma das próprias especialidades, demais profissões direto para a profissão — sem acesso aos templates de outros profissionais nem à exclusão.

### USER (Recepcionista)
Acessa o sistema para consultar dados operacionais. Pode ver a lista de pacientes, profissionais e consultas (somente leitura). Pode ver a disponibilidade de qualquer profissional. Pode editar o próprio cadastro de usuário. Não cria, cancela ou conclui consultas. Não acessa prontuários nem templates.

### PATIENT
Não acessa o sistema. O registro existe no banco para vincular ao módulo de consultas. Tentativas de login são bloqueadas silenciosamente.
