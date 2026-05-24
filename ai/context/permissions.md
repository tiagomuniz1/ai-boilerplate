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

> Acesso de DOCTOR a dados de pacientes será implementado no módulo de consultas (com vínculo à consulta, não acesso irrestrito à lista).

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

## Sidebar — Itens visíveis por role

| Item | ADMIN | DOCTOR | USER |
|---|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ |
| Usuários | ✓ | ✗ | ✗ |
| Pacientes | ✓ | ✗ | ✓ |
| Médicos | ✓ | ✓ | ✓ |
| Agendas | ✓ | ✓ | ✗ |

---

## Resumo por perfil

### ADMIN
Acesso irrestrito. Gerencia usuários, médicos, pacientes e todas as agendas. Único perfil que pode criar usuários, ativar/desativar contas e excluir registros.

### DOCTOR
Acessa o sistema para gerenciar a própria agenda e visualizar o próprio perfil de médico. Pode editar os próprios dados de usuário e de médico. Não vê dados de outros médicos, pacientes ou usuários.

### USER (Recepcionista)
Acessa o sistema para consultar dados operacionais. Pode ver a lista de pacientes e médicos (somente leitura). Pode editar o próprio cadastro de usuário. Não opera nenhum módulo de negócio — não cria, edita ou exclui registros de terceiros.

### PATIENT
Não acessa o sistema. O registro existe no banco para vincular ao módulo de consultas (implementação futura). Tentativas de login são bloqueadas silenciosamente.
