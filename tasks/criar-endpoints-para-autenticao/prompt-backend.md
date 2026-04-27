Você é um engenheiro de software sênior especialista na arquitetura deste projeto.

Sua tarefa é implementar exatamente o que está descrito abaixo.

Siga TODAS as regras e contexto definidos na task.

---
## INSTRUCTIONS
- Não inventar padrões
- Não ignorar regras
- Não simplificar a solução
- Código deve ser production-ready
- Seguir estritamente a arquitetura definida
- Se faltar informação, não inventar

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Autenticação (Backend)

## Descrição
Implementar os endpoints de autenticação da aplicação, permitindo que usuários façam login com email e senha, renovem o access token via refresh token e realizem logout invalidando o refresh token ativo. O resultado final é um módulo `auth` funcional com JWT (access + refresh) integrado ao guard global da aplicação.

---

## Contexto

- A entidade `User` já existe no módulo `users` e possui ao menos os campos `id`, `email` e `password` (hash com bcrypt).
- Autenticação via JWT usando Passport.js, com:
  - Access token: TTL `15min` (`JWT_EXPIRATION`)
  - Refresh token: TTL `7d` (`JWT_REFRESH_EXPIRATION`)
- Refresh tokens são persistidos no banco (tabela `refresh_tokens`) para permitir revogação no logout.
- `JwtAuthGuard` aplicado globalmente — endpoints de login e refresh devem ser marcados com `@Public()`.
- Tokens nunca podem ser logados.
- Rate limiting específico:
  - `POST /auth/login` → `10 req/60s`
  - `POST /auth/refresh` → `20 req/60s`

---

## Contratos

### Input (DTO)

`LoginDto`:
- email: string (IsEmail)
- password: string (IsString, MinLength(8))

`RefreshTokenDto`:
- refreshToken: string (IsString, IsNotEmpty)

`LogoutDto`:
- refreshToken: string (IsString, IsNotEmpty)

### Output

`AuthResponseDto`:
- accessToken: string
- refreshToken: string
- expiresIn: number (segundos até expirar o access token)

`RefreshResponseDto`:
- accessToken: string
- refreshToken: string
- expiresIn: number

`LogoutResponse`: `204 No Content` (sem body)

---

## Assinaturas esperadas

**Use-cases**

`LoginUseCase.execute(dto: LoginDto): Promise<AuthResponseDto>`
`RefreshTokenUseCase.execute(dto: RefreshTokenDto): Promise<RefreshResponseDto>`
`LogoutUseCase.execute(dto: LogoutDto): Promise<void>`

**Repositories**

`IRefreshTokensRepository`:
- create(userId: string, token: string, expiresAt: Date, queryRunner?: QueryRunner): Promise\<RefreshToken\>
- findByToken(token: string): Promise\<RefreshToken | null\>
- revokeByToken(token: string, queryRunner?: QueryRunner): Promise\<void\>
- revokeAllByUserId(userId: string, queryRunner?: QueryRunner): Promise\<void\>

**Dependências externas**

- `IUsersRepository.findByEmail(email: string)` — já existente no módulo `users`
- `JwtService` — `@nestjs/jwt`

---

## Fluxo principal

### Login

1. Controller recebe `LoginDto`, valida via `ValidationPipe`.
2. `LoginUseCase.execute()` busca usuário pelo email via `IUsersRepository.findByEmail()`.
3. Se usuário não existe ou senha inválida (bcrypt.compare), lançar `UnauthorizedException` com mensagem genérica.
4. Dentro de `runInTransaction()`:
   - Gerar access token (JWT assinado com `JWT_SECRET`, payload `{ sub: userId, email }`).
   - Gerar refresh token (JWT assinado com `JWT_SECRET`, payload `{ sub: userId, type: 'refresh' }`).
   - Persistir refresh token via `IRefreshTokensRepository.create()`.
5. Retornar `AuthResponseDto`.

### Refresh

1. Controller recebe `RefreshTokenDto`.
2. `RefreshTokenUseCase.execute()` valida o JWT do refresh token (`JwtService.verifyAsync`).
3. Buscar refresh token persistido via `IRefreshTokensRepository.findByToken()`.
4. Se não existir, estiver revogado ou expirado → `UnauthorizedException`.
5. Dentro de `runInTransaction()`:
   - Revogar refresh token atual (rotation).
   - Gerar novo par (access + refresh).
   - Persistir novo refresh token.
6. Retornar `RefreshResponseDto`.

### Logout

1. Controller recebe `LogoutDto`.
2. `LogoutUseCase.execute()` busca refresh token via `IRefreshTokensRepository.findByToken()`.
3. Se existir e estiver ativo, revogar via `revokeByToken()`.
4. Retornar `void` (controller responde `204 No Content`).
5. Logout é idempotente — token inexistente/já revogado não retorna erro.

---

## Fluxos alternativos

- Email não cadastrado no login → `UnauthorizedException('Invalid credentials')` (mensagem genérica para não vazar existência de usuário).
- Senha incorreta → `UnauthorizedException('Invalid credentials')`.
- Refresh token inválido / malformado / assinatura inválida → `UnauthorizedException('Invalid refresh token')`.
- Refresh token revogado ou inexistente no banco → `UnauthorizedException('Invalid refresh token')`.
- Refresh token expirado → `UnauthorizedException('Refresh token expired')`.
- Logout com token inexistente ou já revogado → retornar `204` normalmente (idempotente).

---

## Regras de negócio

- Mensagem de erro de credenciais inválidas deve ser **genérica** — nunca diferenciar "email não existe" de "senha incorreta".
- Refresh token rotation é obrigatório — todo refresh gera um novo refresh token e revoga o anterior.
- Refresh tokens são armazenados como **hash** (SHA-256) na tabela — nunca em plaintext.
- Tokens nunca aparecem em logs ou mensagens de erro.
- Access token TTL fixo via `JWT_EXPIRATION`; refresh token TTL via `JWT_REFRESH_EXPIRATION`.
- O campo `expiresIn` retornado é o TTL do access token em segundos.

---

## Dependências

- `IUsersRepository` (do módulo `users`)
- `IRefreshTokensRepository` (novo, dentro do módulo `auth`)
- `JwtService` (`@nestjs/jwt`)
- `bcrypt`

---

## Decisões técnicas da task

- **Usar transação:** SIM — login, refresh e logout envolvem persistência/revogação de refresh token + outras operações que devem ser atômicas.
- **Usar distributed lock:** NÃO — refresh tokens são exclusivos por usuário/sessão; conflito é improvável.
- **Usar cache:** NÃO — endpoints de autenticação **nunca** devem ser cacheados (regra do projeto).
- **Estratégia de concorrência:** Nenhuma — refresh token é dado exclusivo da sessão; uma tentativa de reuso já é tratada pela revogação no banco.
- **Idempotência (`Idempotency-Key`):** NÃO aplicar — endpoints de auth não devem ser cacheados.

---

## Restrições

- NÃO logar tokens (access ou refresh), senhas ou hashes em nenhum nível de log.
- NÃO retornar mensagens que diferenciem "usuário não existe" de "senha incorreta".
- NÃO usar `process.env` fora de `env.config.ts`.
- NÃO armazenar refresh tokens em plaintext — sempre hash SHA-256.
- NÃO aplicar `IdempotencyInterceptor` nesses endpoints.
- NÃO instanciar `JwtService` manualmente — sempre via injeção.
- NÃO acoplar `LoginUseCase` à implementação concreta de `UsersRepository` — usar interface.

---

## Estrutura esperada

```
modules/auth/
  controllers/
    auth.controller.ts
  use-cases/
    login.use-case.ts
    refresh-token.use-case.ts
    logout.use-case.ts
  repositories/
    refresh-tokens.repository.interface.ts
    refresh-tokens.repository.ts
  entities/
    refresh-token.entity.ts
  dto/
    login.dto.ts
    refresh-token.dto.ts
    logout.dto.ts
    auth-response.dto.ts
  strategies/
    jwt.strategy.ts
  guards/
    jwt-auth.guard.ts
  decorators/
    public.decorator.ts
    current-user.decorator.ts
  tests/
    auth.integration.spec.ts
  auth.module.ts
```

**Migration nova:** `create_refresh_tokens_table` em `database/migrations/`
- Colunas: `id` (uuid, pk), `user_id` (uuid, fk → users), `token_hash` (varchar, unique), `expires_at` (timestamp), `revoked_at` (timestamp, nullable), `created_at`, `deleted_at`.

---

## Cenários de teste adicionais

**Login:**
- Login com credenciais válidas retorna access + refresh + expiresIn.
- Login com email inexistente retorna `401` com mensagem genérica.
- Login com senha incorreta retorna `401` com mensagem genérica.
- Login persiste refresh token hasheado no banco (verificar que plaintext não é armazenado).
- DTO inválido (email malformado, senha curta) retorna `400`.

**Refresh:**
- Refresh com token válido retorna novo par e revoga o anterior.
- Tentativa de reuso do refresh token antigo retorna `401`.
- Refresh com token expirado retorna `401`.
- Refresh com token assinado com chave inválida retorna `401`.
- Refresh com token revogado retorna `401`.

**Logout:**
- Logout com token válido revoga o refresh token e retorna `204`.
- Logout com token já revogado retorna `204` (idempotente).
- Logout com token inexistente retorna `204` (idempotente).
- Após logout, tentativa de refresh com aquele token retorna `401`.

**Guard / Public:**
- Endpoint protegido sem token retorna `401`.
- Endpoint protegido com access token válido retorna `200` e popula `req.user`.
- Endpoint marcado com `@Public()` é acessível sem token.

**Segurança:**
- Logs de erro não contêm tokens nem senhas (verificar via spy no logger).
- Rate limiting bloqueia após exceder o limite configurado em login e refresh.

---

## Definition of Done

- [ ] Fluxo principal implementado (login, refresh, logout)
- [ ] Fluxos alternativos tratados (credenciais inválidas, token expirado, revogado, malformado)
- [ ] `JwtAuthGuard` aplicado globalmente + decorator `@Public()` funcional
- [ ] `CurrentUser` decorator funcional
- [ ] Refresh token rotation implementado
- [ ] Refresh tokens armazenados como hash SHA-256
- [ ] Migration `create_refresh_tokens_table` criada e versionada
- [ ] Rate limiting configurado nos endpoints de login e refresh
- [ ] Testes unitários (100% cobertura) para os 3 use-cases
- [ ] Testes de integração cobrindo todos os cenários listados
- [ ] Nenhum token, senha ou dado sensível em logs
- [ ] Naming convention e estrutura de pastas seguidas