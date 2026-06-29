# Plano — Definição de Senha por E-mail (Onboarding do Médico)

## Problema

Quando um ADMIN cadastra um médico novo (sem vincular a usuário existente), o backend gera uma senha aleatória com `randomUUID()` que ninguém conhece. O médico não tem como acessar a plataforma.

---

## Solução

Ao criar um médico, o backend gera um **token de definição de senha** (válido por 72 h), armazena o hash na tabela `password_set_tokens` e envia um e-mail com o link de acesso. O médico clica no link, define sua senha e é redirecionado para o login.

---

## Decisões fechadas

1. **Token único, de uso único**: gerado com `crypto.randomBytes(32)`, armazenado como `sha256(token)` na tabela. Invalidado na primeira utilização (campo `used_at`). TTL: 72 h.
2. **E-mail via AWS SES**: novo `IEmailAdapter` seguindo o padrão de adapter do projeto (timeout, retry, circuit breaker via `opossum`). Variáveis `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` adicionadas ao `env.config.ts`. Sender definido: `noreply@pulso.center`.
3. **Falha no envio não reverte o cadastro**: o token é persistido em banco — se o e-mail falhar, o ADMIN pode reenviar futuramente (fora do escopo desta task). O use-case loga o erro e segue.
4. **Rota pública no frontend**: `/{slug}/set-password?token=...` — lê e valida o token ao montar; exibe formulário de nova senha + confirmação; após sucesso redireciona para `/{slug}/login`.
5. **Sem alterar o comportamento de criação de médico via `userId`**: o token/e-mail só é enviado quando um novo usuário é criado junto com o perfil de médico.

---

## Fluxo end-to-end

```
ADMIN cria médico (fullName + email + CRM)
  └─> backend cria usuário (senha = randomUUID hasheado)
       ├─> backend cria doctor
       ├─> backend persiste password_set_token (hash, expires_at = +72h)
       └─> backend envia e-mail → link: /{slug}/set-password?token=<plaintext>

MÉDICO abre o link
  └─> frontend valida token (GET /auth/set-password/validate?token=)
       ├─> token válido → exibe formulário (senha + confirmar)
       └─> token inválido/expirado → exibe mensagem de erro

MÉDICO define a senha → POST /auth/set-password { token, password }
  └─> backend valida token, atualiza senha, marca token como usado
       └─> frontend redireciona para /{slug}/login com mensagem de sucesso
```

---

## Modelo de dados

### Tabela `password_set_tokens`

| Coluna | Tipo | Observações |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | indexado |
| `clinic_id` | uuid FK → clinics | isolamento multi-tenant |
| `token_hash` | varchar unique | SHA-256 do token plaintext |
| `expires_at` | timestamptz | agora + 72 h |
| `used_at` | timestamptz null | preenchido ao usar; null = disponível |
| `created_at` | timestamptz | |

---

## Endpoints novos

| Método | Path | Auth | Descrição |
|---|---|---|---|
| `GET` | `/auth/set-password/validate` | público | Valida se token é válido e não expirado |
| `POST` | `/auth/set-password` | público | Define a senha e invalida o token |

---

## Ordem de execução

| # | Área | Task | Depende de | Resumo |
|---|---|---|---|---|
| 1 | backend | `definir-senha-do-medico-por-email` | — | Tabela `password_set_tokens`, `IEmailAdapter` (SES/SMTP), endpoints de validação e definição de senha, integração no `CreateDoctorUseCase`. |
| 2 | frontend | `tela-de-definicao-de-senha` | #1 | Rota pública `/{slug}/set-password`, formulário de nova senha com validação e feedback. |

---

## Definition of Done (transversal)

- Testes unitários 100% + integração nos endpoints novos.
- Sem dado sensível (token plaintext, senha) em logs.
- `process.env` apenas em `env.config.ts`; axios apenas em `lib/api-client.ts`.
- Ao finalizar cada task, mover para `tasks/done/<area>/`.
