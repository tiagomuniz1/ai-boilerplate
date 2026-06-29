# Task — Definição de Senha por E-mail (Backend)

## Descrição

Quando o ADMIN cadastra um médico novo (sem vincular a usuário existente), o backend gera um token de definição de senha, persiste o hash na tabela `password_set_tokens` e envia um e-mail com o link. O médico clica, define a senha e pode fazer login. Dois endpoints públicos são adicionados ao módulo `auth`: validar o token e definir a senha.

---

## Contexto

- `CreateDoctorUseCase` já cria o usuário com senha aleatória (`randomUUID` hasheado) quando `dto.userId` não é informado. O comportamento de criação permanece inalterado — apenas adiciona a geração do token e o envio do e-mail após a transação.
- O módulo `auth` já possui `IRefreshTokensRepository` + `RefreshToken` como referência de padrão para tokens.
- Nenhum adapter de e-mail existe atualmente no projeto — será criado agora.
- O link enviado no e-mail aponta para o frontend: `{FRONTEND_URL}/{clinicSlug}/set-password?token={plaintextToken}`. O `clinicSlug` é obtido a partir do `clinicId` do usuário.

---

## Modelo de dados

### Tabela `password_set_tokens`

| Coluna | Tipo | Observações |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | indexado |
| `clinic_id` | uuid FK → clinics | isolamento multi-tenant |
| `token_hash` | varchar(64) unique | SHA-256 hex do token plaintext |
| `expires_at` | timestamptz | `now() + 72h` |
| `used_at` | timestamptz null | preenchido na utilização; null = disponível |
| `created_at` | timestamptz | |

- Sem `deleted_at` — tokens são marcados como usados, não deletados.
- Sem `@VersionColumn` — sem edição concorrente.

---

## Contratos

### DTOs (packages/shared)

```ts
// ValidateSetPasswordTokenQueryDto
export class ValidateSetPasswordTokenQueryDto {
  @IsString() @IsNotEmpty()
  token: string
}

// SetPasswordDto
export class SetPasswordDto {
  @IsString() @IsNotEmpty()
  token: string

  @IsString() @MinLength(8)
  password: string
}

// ValidateSetPasswordTokenResponseDto
export class ValidateSetPasswordTokenResponseDto {
  valid: boolean
  email: string | null
}
```

---

## Assinaturas esperadas

### Use-cases

```ts
SendSetPasswordEmailUseCase.execute(userId: string, clinicId: string): Promise<void>
// Cria o token, persiste e envia o e-mail. Chamado pelo CreateDoctorUseCase após a transação.

ValidateSetPasswordTokenUseCase.execute(token: string): Promise<ValidateSetPasswordTokenResponseDto>
// Retorna { valid: true, email } se válido; { valid: false, email: null } se inválido/expirado/usado.

SetPasswordUseCase.execute(dto: SetPasswordDto): Promise<void>
// Valida o token, atualiza a senha do usuário, marca used_at.
```

### Repository

```ts
export abstract class IPasswordSetTokensRepository {
  abstract create(data: {
    userId: string
    clinicId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<PasswordSetToken>
  abstract findByTokenHash(tokenHash: string): Promise<PasswordSetToken | null>
  abstract markAsUsed(id: string): Promise<void>
}
```

### Email Adapter

```ts
export abstract class IEmailAdapter {
  abstract sendSetPasswordEmail(params: {
    to: string
    recipientName: string
    link: string
  }): Promise<void>
}
```

---

## Fluxo principal

### SendSetPasswordEmailUseCase

1. Gera `token = crypto.randomBytes(32).toString('hex')`.
2. Calcula `tokenHash = createHash('sha256').update(token).digest('hex')`.
3. `expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)`.
4. Persiste via `IPasswordSetTokensRepository.create()`.
5. Busca usuário (email + fullName) via `IUsersRepository.findById()`.
6. Busca slug da clínica via `IClinicsRepository.findById()`.
7. Monta link: `${FRONTEND_URL}/${clinic.slug}/set-password?token=${token}`.
8. Chama `IEmailAdapter.sendSetPasswordEmail({ to: user.email, recipientName: user.fullName, link })`.
9. Falha no e-mail **nunca** lança exceção para o chamador — loga `logger.warn` e retorna.

### ValidateSetPasswordTokenUseCase

1. Calcula `tokenHash = sha256(token)`.
2. Busca via `IPasswordSetTokensRepository.findByTokenHash(tokenHash)`.
3. Se não encontrado ou `used_at != null` ou `expires_at < now()` → retorna `{ valid: false, email: null }`.
4. Busca email do usuário via `IUsersRepository.findById(record.userId)`.
5. Retorna `{ valid: true, email: user.email }`.

### SetPasswordUseCase

1. Calcula `tokenHash = sha256(dto.token)`.
2. Busca via `IPasswordSetTokensRepository.findByTokenHash(tokenHash)`.
3. Se não encontrado → `NotFoundException('Token not found')`.
4. Se `used_at != null` → `UnprocessableEntityException('Token already used')`.
5. Se `expires_at < now()` → `UnprocessableEntityException('Token expired')`.
6. Dentro de `runInTransaction()`:
   - `bcrypt.hash(dto.password, 10)`.
   - `IUsersRepository.update(record.userId, { password: hashedPassword }, queryRunner)`.
   - `IPasswordSetTokensRepository.markAsUsed(record.id)` (dentro da mesma transação).
7. Retorna `void` (controller responde `204`).

### Integração em CreateDoctorUseCase

Após o bloco `try { doctor = await this.runInTransaction(...) }` do fluxo `isNewUser`, adicionar (fora da transação e do try/catch do cadastro):

```ts
// envio do e-mail — falha silenciosa
try {
  await this.sendSetPasswordEmailUseCase.execute(doctor.user.id, clinicId)
} catch {
  this.logger.warn('Failed to send set-password email', { context: CreateDoctorUseCase.name })
}
```

---

## Fluxos alternativos

- Token inexistente no banco → `SetPasswordUseCase` lança `NotFoundException`.
- Token já utilizado → `UnprocessableEntityException('Token already used')`.
- Token expirado → `UnprocessableEntityException('Token expired')`.
- Falha no envio de e-mail → log + retorno silencioso (médico é criado; admin pode reenviar futuramente).
- Validação de token inválido/expirado/usado → retorna `{ valid: false, email: null }` (sem erro HTTP).

---

## Regras de negócio

- Token plaintext **nunca** armazenado — apenas o SHA-256 hex.
- Token de uso único: `markAsUsed` ocorre dentro da transação de `SetPasswordUseCase`.
- TTL: 72 horas.
- Apenas `isNewUser = true` no `CreateDoctorUseCase` dispara o envio (não quando `dto.userId` é informado).
- `ValidateSetPasswordTokenUseCase` não lança exceção — retorna `{ valid: false }` para estados inválidos (o frontend decide a UX).

---

## Email Adapter

Implementação com **Nodemailer + SMTP** (configurável para SES via SMTP relay em produção):

```ts
@Injectable()
export class SmtpEmailAdapter implements IEmailAdapter {
  async sendSetPasswordEmail({ to, recipientName, link }): Promise<void> {
    // nodemailer transporter com timeout + retry (axiosRetry não se aplica a Nodemailer;
    // retry manual: até 3 tentativas com backoff)
    // Circuit breaker com opossum (errorThresholdPercentage: 50, resetTimeout: 30s)
    // Fallback: loga warn e retorna (não lança)
  }
}
```

Variáveis novas em `env.config.ts` (opcionais — sem envio em dev/test se ausentes):

| Variável | Descrição |
|---|---|
| `SMTP_HOST` | Host do servidor SMTP |
| `SMTP_PORT` | Porta (ex: `587`) |
| `SMTP_USER` | Usuário SMTP |
| `SMTP_PASS` | Senha SMTP |
| `SMTP_FROM` | Endereço de origem (ex: `noreply@umi.com.br`) |

Em desenvolvimento, se `SMTP_HOST` não estiver definido, o adapter loga um aviso e retorna sem enviar.

---

## Dependências

- `nodemailer` + `@types/nodemailer` (`yarn workspace @app/backend add nodemailer @types/nodemailer`)
- `opossum` (já no projeto)
- `IUsersRepository` (do módulo `users`)
- `IClinicsRepository` (do módulo `clinics`)
- `IPasswordSetTokensRepository` (novo)

---

## Permissões

| Endpoint | Auth |
|---|---|
| `GET /auth/set-password/validate` | `@Public()` |
| `POST /auth/set-password` | `@Public()` |

Ambos marcados com `@Public()` e sem rate limiting específico além do global (300 req/60s).

---

## Decisões técnicas

- **Transação:** `SetPasswordUseCase` usa `runInTransaction()` (update senha + markAsUsed devem ser atômicos).
- **Transação:** `SendSetPasswordEmailUseCase` não usa transação (somente 1 insert + leituras + envio externo).
- **Distributed lock:** não aplicado — token é exclusivo por usuário/emissão.
- **Cache:** não aplicado — endpoints públicos de definição de senha não são cacheados.
- **Idempotência:** não aplicada — `POST /auth/set-password` muda estado; reenvio com mesmo token retorna erro semântico.

---

## Restrições

- Nunca logar `token` plaintext, `tokenHash` ou `password` em nenhum nível.
- Nunca retornar mensagens que diferenciem estados do token no validate (retornar `{ valid: false }` uniformemente).
- Nunca usar `process.env` fora de `env.config.ts`.
- Nunca enviar e-mail dentro da transação de criação do médico.

---

## Estrutura esperada

```
modules/auth/
  entities/
    password-set-token.entity.ts          ← novo
  repositories/
    password-set-tokens.repository.interface.ts  ← novo
    password-set-tokens.repository.ts            ← novo
  use-cases/
    send-set-password-email.use-case.ts   ← novo
    validate-set-password-token.use-case.ts  ← novo
    set-password.use-case.ts              ← novo
  adapters/
    email.adapter.interface.ts            ← novo
    smtp-email.adapter.ts                 ← novo
  dto/
    validate-set-password-token.dto.ts    ← novo (query)
    set-password.dto.ts                   ← novo
  tests/
    set-password.integration.spec.ts      ← novo

modules/doctors/
  use-cases/
    create-doctor.use-case.ts             ← modificado (chama SendSetPasswordEmailUseCase)

database/migrations/
  1752100000000-create-password-set-tokens-table.ts  ← novo
```

---

## Cenários de teste

### SendSetPasswordEmailUseCase (unitário)
- Gera token, persiste no repo e chama o adapter de e-mail com os parâmetros corretos.
- Falha no adapter não propaga exceção — loga warn.
- Usa `sha256(token)` no repo (não o plaintext).

### ValidateSetPasswordTokenUseCase (unitário)
- Token válido → retorna `{ valid: true, email }`.
- Token não encontrado → retorna `{ valid: false, email: null }`.
- Token com `used_at != null` → retorna `{ valid: false, email: null }`.
- Token com `expires_at < now()` → retorna `{ valid: false, email: null }`.

### SetPasswordUseCase (unitário)
- Token válido → chama `update` com hash da nova senha e `markAsUsed` dentro de transação.
- Token não encontrado → lança `NotFoundException`.
- Token usado → lança `UnprocessableEntityException`.
- Token expirado → lança `UnprocessableEntityException`.

### CreateDoctorUseCase (unitário — modificado)
- Quando `isNewUser = true`, chama `SendSetPasswordEmailUseCase.execute` após a transação.
- Quando `isNewUser = false` (userId fornecido), não chama `SendSetPasswordEmailUseCase`.
- Falha no `SendSetPasswordEmailUseCase` não reverte a criação do médico.

### Integração (set-password.integration.spec.ts)
- `GET /auth/set-password/validate?token=<válido>` → `200 { valid: true, email }`.
- `GET /auth/set-password/validate?token=<inexistente>` → `200 { valid: false, email: null }`.
- `GET /auth/set-password/validate?token=<expirado>` → `200 { valid: false, email: null }`.
- `POST /auth/set-password` com token válido → `204`; senha atualizada no banco; token marcado como usado.
- `POST /auth/set-password` com token já usado → `422`.
- `POST /auth/set-password` com token expirado → `422`.
- `POST /auth/set-password` com token inexistente → `404`.
- `POST /auth/set-password` com senha < 8 chars → `400`.
- Após `POST /auth/set-password` com sucesso, é possível fazer login com a nova senha.

---

## Definition of Done

- [ ] Entidade `PasswordSetToken` + migration criados.
- [ ] `IPasswordSetTokensRepository` + implementação + registro no módulo.
- [ ] `IEmailAdapter` + `SmtpEmailAdapter` com circuit breaker e fallback silencioso.
- [ ] `SendSetPasswordEmailUseCase`, `ValidateSetPasswordTokenUseCase`, `SetPasswordUseCase` implementados.
- [ ] `CreateDoctorUseCase` integrado (chama `SendSetPasswordEmailUseCase` pós-transação).
- [ ] Endpoints `GET /auth/set-password/validate` e `POST /auth/set-password` com `@Public()`.
- [ ] Variáveis SMTP adicionadas ao `env.config.ts` como opcionais.
- [ ] Testes unitários 100% cobertura em todos os use-cases novos/modificados.
- [ ] Testes de integração cobrindo todos os cenários listados.
- [ ] Nenhum token, hash ou senha em logs.
- [ ] Naming convention e estrutura de pastas seguidas.
