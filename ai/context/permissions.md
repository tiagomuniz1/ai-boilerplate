# Perfis de Usuário e Permissões

## Visão Geral

O sistema possui quatro perfis de usuário (`UserRole`). Cada perfil reflete um papel real dentro da clínica e determina o que o usuário pode ver e fazer.

| Role | Valor | Quem é |
|---|---|---|
| `ADMIN` | `admin` | Gestor da plataforma — acesso total |
| `DOCTOR` | `doctor` | Médico — gerencia a própria agenda e dados |
| `USER` | `user` | Recepcionista — consulta dados, edita o próprio cadastro |
| `PATIENT` | `patient` | Paciente — **não acessa o sistema** |

---

## Regras Globais

- **PATIENT não pode fazer login.** O backend bloqueia na autenticação com a mesma mensagem de "credenciais inválidas" (sem revelar o motivo).
- **Primeiro usuário** criado via seed (a plataforma é fechada — `POST /users` não é público).
- **Backend é a fonte de verdade** — o frontend esconde elementos de UX, mas o backend rejeita toda requisição não autorizada com `403 Forbidden`.
- **Own-resource** — DOCTOR e USER só acessam os próprios dados. O controle é feito na camada de use-case, não no controller.

---

## Autenticação

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Login | ✓ | ✓ | ✓ | ✗ bloqueado |
| Logout | ✓ | ✓ | ✓ | — |
| Refresh token | ✓ | ✓ | ✓ | — |
| `GET /auth/me` | ✓ | ✓ | ✓ | — |

---

## Usuários (`/users`)

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar usuário | ✓ | ✗ | ✗ | ✗ |
| Listar usuários | ✓ | ✗ | ✗ | ✗ |
| Ver por ID | ✓ qualquer | só o próprio | só o próprio | ✗ |
| Editar | ✓ qualquer | só o próprio | só o próprio | ✗ |
| Ativar / Desativar | ✓ | ✗ | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ |

> DOCTOR e USER chegam à tela de edição pelo link **"Meu perfil"** no header. Não têm acesso à listagem.

---

## Médicos (`/doctors`)

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar médico | ✓ | ✗ | ✗ | ✗ |
| Listar médicos | ✓ todos | só o próprio | ✓ todos (leitura) | ✗ |
| Ver por ID | ✓ | só o próprio | ✓ (leitura) | ✗ |
| Editar | ✓ qualquer | só o próprio | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ |

> DOCTOR que chama `GET /doctors` recebe apenas o próprio perfil. USER e ADMIN recebem a lista completa.

---

## Pacientes (`/patients`)

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar paciente | ✓ | ✗ | ✗ | ✗ |
| Listar pacientes | ✓ | ✗ | ✓ (leitura) | ✗ |
| Ver por ID | ✓ | ✗ | ✓ (leitura) | ✗ |
| Editar | ✓ | ✗ | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ |

> DOCTOR não acessa `/patients` diretamente. Dados do paciente são acessados via vínculo com a consulta no módulo de agendamentos.

---

## Agendas (`/schedules`)

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar agenda | ✓ | só a própria | ✗ | ✗ |
| Listar agendas | ✓ todas | só as próprias | ✗ | ✗ |
| Ver por ID | ✓ | só a própria | ✗ | ✗ |
| Editar | ✓ qualquer | só a própria | ✗ | ✗ |
| Excluir | ✓ qualquer | só a própria | ✗ | ✗ |

> DOCTOR identifica a própria agenda via `userId` — não precisa saber o `doctorId` previamente.

---

## Consultas (`/appointments`)

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar consulta | ✓ | só as próprias | ✗ | ✗ |
| Listar consultas | ✓ todas | só as próprias | ✓ (leitura) | ✗ |
| Ver por ID | ✓ | só a própria | ✓ (leitura) | ✗ |
| Cancelar | ✓ qualquer | só a própria | ✗ | ✗ |
| Concluir | ✓ qualquer | só a própria | ✗ | ✗ |
| Ver disponibilidade | ✓ | ✓ própria | ✓ | ✗ |

> DOCTOR que cria uma consulta usa o próprio `doctorId` (via `userId`). ADMIN deve informar `doctorId` no body. Slot é derivado da configuração de agenda — cliente envia apenas `date` + `startTime`. Concluir rejeita consultas futuras.

---

## Catálogo de Campos Canônicos (`/medical-record-canonical-fields`)

> Gerenciado exclusivamente no **backoffice** pelo PLATFORM_ADMIN. ADMIN e DOCTOR podem listar para selecionar campos ao construir templates.

| Ação | PLATFORM_ADMIN | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|:---:|
| Criar campo | ✓ | ✗ | ✗ | ✗ | ✗ |
| Listar campos | ✓ | ✓ (leitura) | ✓ (leitura) | ✗ | ✗ |
| Editar / Ativar-Desativar | ✓ | ✗ | ✗ | ✗ | ✗ |

> ADMIN e DOCTOR acessam a listagem apenas para compor templates — sem criar ou editar entradas do catálogo.

---

## Medicamentos (`/medications`)

> Base canônica da plataforma (sem `clinicId`), origem das futuras receitas médicas. Gerenciada exclusivamente no **backoffice** pelo PLATFORM_ADMIN — a maior parte dos registros vem da importação da base de Dados Abertos da ANVISA. ADMIN e DOCTOR podem listar/ver para prescrever.

| Ação | PLATFORM_ADMIN | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|:---:|
| Listar (paginado + busca) | ✓ | ✓ (leitura) | ✓ (leitura) | ✗ | ✗ |
| Ver por ID | ✓ | ✓ (leitura) | ✓ (leitura) | ✗ | ✗ |
| Criar | ✓ | ✗ | ✗ | ✗ | ✗ |
| Editar / Ativar-Desativar | ✓ | ✗ | ✗ | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ | ✗ |

> Entradas criadas manualmente têm `source = manual`; as importadas, `source = anvisa`. "Desativar" (`isActive=false`) some das listas de leitura; "Excluir" é soft delete. ADMIN e DOCTOR acessam a base apenas para selecionar medicamentos ao prescrever.

---

## Templates de Prontuário (`/medical-record-templates`)

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar template | ✓ | ✗ | ✗ | ✗ |
| Listar templates | ✓ | ✗ | ✗ | ✗ |
| Ver por ID | ✓ | ✗ | ✗ | ✗ |
| Editar / Ativar-Desativar | ✓ | ✗ | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ |

> Templates são escopados por `clinicId + specialtyId` — cada clínica gerencia os próprios. Acesso exclusivo de ADMIN.

---

## Prontuários (`/medical-records`)

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Criar prontuário | ✓ qualquer | só das próprias consultas | ✗ | ✗ |
| Listar prontuários (paginado) | ✓ todos | só os próprios | ✗ | ✗ |
| Ver por consulta (`by-appointment`) | ✓ | só das próprias | ✗ | ✗ |
| Ver por ID | ✓ | só o próprio | ✗ | ✗ |
| Editar | ✓ qualquer | só o próprio | ✗ | ✗ |
| Excluir | ✓ | ✗ | ✗ | ✗ |

> Prontuário é 1:1 com a consulta — não existe sem consulta vinculada. A especialidade é herdada da consulta e não pode ser alterada. Edição é bloqueada pelo backend após a consulta ser concluída (`422`). O histórico do paciente (`GET /medical-records?patientId=`) é acessível apenas por ADMIN e DOCTOR.

---

## Sidebar — Itens visíveis por role

| Item | ADMIN | DOCTOR | USER |
|---|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ |
| Usuários | ✓ | ✗ | ✗ |
| Pacientes | ✓ | ✗ | ✓ |
| Médicos | ✓ | ✓ | ✓ |
| Agendas | ✓ | ✓ | ✗ |
| Modelos de prontuário | ✓ | ✗ | ✗ |
| Consultas | ✓ | ✓ | ✓ |

> Prontuários não têm item próprio na sidebar — são acessados a partir do diálogo de detalhes da consulta e do histórico na página do paciente.

---

## Resumo por perfil

### ADMIN
Acesso irrestrito. Gerencia usuários, médicos, pacientes, agendas e todas as consultas. Único perfil que pode criar usuários, ativar/desativar contas e excluir registros. Cria e edita templates de prontuário da clínica. Pode criar, editar e excluir qualquer prontuário.

### DOCTOR
Acessa o sistema para gerenciar a própria agenda, criar e acompanhar as próprias consultas. Pode editar os próprios dados de usuário e de médico. Não vê dados de outros médicos, agendas de outros ou consultas de outros médicos. Cria e edita prontuários das próprias consultas (bloqueado após conclusão). Não acessa templates de prontuário.

### USER (Recepcionista)
Acessa o sistema para consultar dados operacionais. Pode ver a lista de pacientes, médicos e consultas (somente leitura). Pode ver a disponibilidade de qualquer médico. Pode editar o próprio cadastro de usuário. Não cria, cancela ou conclui consultas. Não acessa prontuários nem templates.

### PATIENT
Não acessa o sistema. O registro existe no banco para vincular ao módulo de consultas. Tentativas de login são bloqueadas silenciosamente.
