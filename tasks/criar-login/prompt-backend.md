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
# Task — Login de Usuário (Backend)

## Descrição
Implementar endpoint de autenticação que recebe email e senha, valida as credenciais e retorna um par de tokens JWT (access token e refresh token). O refresh token deve ser persistido para permitir rotação e revogação posterior.

---

## Contexto
- O sistema já possui a entidade `User` com campos de email e senha (hash).
- A autenticação é baseada em JWT com **access token (15min)** e **refresh token (7 dias)**, conforme estratégia definida em `auth/strategies/jwt.strategy.ts`.
- O endpoint deve ser **público** (decorador `@Public()`), pois o `JwtAuthGuard` é global.
- Senhas são armazenadas com hash (bcrypt) — nunca comparar em texto plano.
- O refresh token gerado deve ser persistido em uma tabela `refresh_tokens` para suportar revogação e rotação.
- Rate limiting específico do endpoint de login: **10 req/60s**.

---

## Contratos

### Input (DTO)
`LoginDto`:
- email: string (válido, obrigatório)
- password: string (mínimo 8 caracteres, obrigatório)

### Output
`LoginResponse`:
- accessToken: string
- refreshToken: string
- expiresIn: number (segundos do access token)
- tokenType: string (`"Bearer"`)

---

## Assinaturas esperadas

**Use-cases**
- `LoginUseCase.execute(dto: LoginDto): Promise<LoginResponse>`

**Repositories**
- `IUsersRepository`:
  - `findByEmail(email: string): Promise<User | null>` *(já existente)*
- `IRefreshTokensRepository`:
  - `create(data: { userId: string; token: string; expiresAt: Date }, queryRunner?: QueryRunner): Promise<RefreshToken>`
  - `findByToken(token: string): Promise<RefreshToken | null>`
  - `revokeAllByUserId(userId: string, queryRunner?: QueryRunner): Promise<void>`

**Adapters**
- N/A

**Serviços auxiliares**
- `PasswordHasherService.compare(plain: string, hash: string): Promise<boolean>`
- `TokenService.generateAccessToken(payload: JwtPayload): string`
- `TokenService.generateRefreshToken(payload: JwtPayload): string`

---

## Fluxo principal

1. Controller recebe `POST /auth/login` com `LoginDto` validado pelo `ValidationPipe`.
2. `LoginUseCase.execute()` busca o usuário pelo email via `IUsersRepository.findByEmail()`.
3. Compara a senha enviada com o hash armazenado via `PasswordHasherService.compare()`.
4. Gera `accessToken` (TTL `JWT_EXPIRATION`) e `refreshToken` (TTL `JWT_REFRESH_EXPIRATION`) com payload `{ sub: user.id, email: user.email }`.
5. Persiste o `refreshToken` na tabela `refresh_tokens` com `expiresAt` calculado.
6. Retorna `LoginResponse` com status `200 OK`.

---

## Fluxos alternativos

- Email não encontrado → lançar `UnauthorizedException` com mensagem genérica `"Invalid credentials"`.
- Senha inválida → lançar `UnauthorizedException` com mesma mensagem genérica `"Invalid credentials"`.
- Usuário com `deletedAt != null` → tratado pelo soft delete do TypeORM (não retornado em `findByEmail`), cai no caso acima.
- Falha ao persistir refresh token → propagar erro (capturado pelo `ExceptionFilter`).

---

## Regras de negócio

- Mensagem de erro **deve ser genérica** para email e senha inválidos — não revelar se o email existe.
- Senha **nunca** logada, nem em caso de erro.
- Tokens **nunca** logados.
- Cada login gera um novo refresh token persistido — não reusar tokens existentes.
- Payload do JWT contém apenas `sub` (userId) e `email` — nunca dados sensíveis.

---

## Dependências

- `IUsersRepository`
- `IRefreshTokensRepository` (novo)
- `PasswordHasherService`
- `TokenService` (wrapper sobre `JwtService` do `@nestjs/jwt`)

---

## Decisões técnicas da task

- **Usar transação:** não — apenas uma operação de escrita (criação do refresh token). Leitura do usuário e geração de tokens são read-only / em memória.
- **Usar distributed lock:** não — não há recurso compartilhado com risco de conflito.
- **Usar cache:** não — endpoint de autenticação **não deve** ser cacheado (regra de cache).
- **Estratégia de concorrência:** nenhuma.
- **Idempotência:** não aplicar — login não é operação idempotente por natureza (cada chamada gera novos tokens).
- **Rate limiting:** `10 req/60s` aplicado especificamente neste endpoint.

---

## Restrições

- NÃO retornar mensagens de erro distintas para email inexistente vs. senha incorreta.
- NÃO logar senhas, tokens ou hashes em nenhuma circunstância.
- NÃO comparar senhas em texto plano — sempre via `PasswordHasherService`.
- NÃO acessar `process.env` fora de `env.config.ts`.
- NÃO incluir dados sensíveis no payload do JWT.
- NÃO aplicar cache neste endpoint.
- NÃO instanciar `JwtService` diretamente nos use-cases — usar via `TokenService`.

---

## Estrutura esperada

```
modules/auth/
  controllers/
    auth.controller.ts
  use-cases/
    login.use-case.ts
  repositories/
    refresh-tokens.repository.interface.ts
    refresh-tokens.repository.ts
  services/
    password-hasher.service.ts
    token.service.ts
  strategies/
    jwt.strategy.ts
  guards/
    jwt-auth.guard.ts
  decorators/
    public.decorator.ts
    current-user.decorator.ts
  dto/
    login.dto.ts
    login-response.dto.ts
  entities/
    refresh-token.entity.ts
  tests/
    auth.integration.spec.ts
  auth.module.ts
```

Compartilhado em `packages/shared`:
- `LoginDto` e `LoginResponse` exportados via `index.ts`.

Migration:
- `database/migrations/<timestamp>_create_refresh_tokens_table.ts`

---

## Cenários de teste adicionais

- Login com email válido e senha correta → retorna `accessToken`, `refreshToken`, `expiresIn` e `tokenType: "Bearer"`.
- Login com email inexistente → `401 Unauthorized` com mensagem genérica.
- Login com senha incorreta → `401 Unauthorized` com mensagem genérica.
- Login com email inválido (formato) → `400 Bad Request` (validation pipe).
- Login com senha menor que 8 caracteres → `400 Bad Request`.
- Login com payload contendo campos extras → `400 Bad Request` (whitelist).
- Login bem-sucedido → registro inserido em `refresh_tokens` com `expiresAt` correto.
- Dois logins consecutivos do mesmo usuário → dois refresh tokens distintos persistidos.
- Login com usuário soft-deletado → `401 Unauthorized`.
- Verificar que senhas/tokens **não aparecem em logs** durante falha ou sucesso.

---

## Definition of Done

- [ ] Fluxo principal implementado
- [ ] Fluxos alternativos tratados
- [ ] Testes unitários (100%)
- [ ] Testes de integração
- [ ] Migration da tabela `refresh_tokens` criada
- [ ] DTOs adicionados em `packages/shared`
- [ ] Rate limiting de `10 req/60s` aplicado ao endpoint
- [ ] `@Public()` aplicado no controller
- [ ] Nenhum dado sensível em logs
- [ ] Naming convention respeitada