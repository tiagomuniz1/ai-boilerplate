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
# Task — Setar Access Token e Refresh Token como Cookies HttpOnly no Login (Backend)

## Descrição
Ajustar o endpoint de login para retornar `access_token` e `refresh_token` como cookies `httpOnly` na response, mantendo no body apenas os dados públicos do usuário (`id`, `fullName`, `email`). O objetivo é mitigar exposição de tokens a scripts no client.

---

## Contexto

- O fluxo de autenticação atual emite `access_token` (15min) e `refresh_token` (7 dias) via Passport.js / JWT.
- Atualmente os tokens são retornados no body da response — esta task altera o contrato para usar cookies `httpOnly`.
- Mudança breaking no contrato HTTP: o frontend precisará ler o usuário do body e parar de armazenar tokens manualmente (cookies passam a ser gerenciados pelo browser).
- Afeta também o fluxo de `refresh-token` que precisa ler o `refresh_token` a partir do cookie ao invés do body (escopo desta task: ajustar o login; refresh deve ser ajustado em task subsequente caso ainda não esteja).
- Entidade base: `User` (já existente em `modules/users/entities/user.entity.ts`).

---

## Contratos

### Input (DTO)

`LoginDto`:
- email: string (IsEmail)
- password: string (IsString, MinLength)

### Output

**Body (`LoginResponseDto`):**
- id: string (uuid)
- fullName: string
- email: string

**Cookies (response headers):**
- `access_token`: JWT — `httpOnly`, `secure`, `sameSite=strict`, `path=/`, `maxAge=JWT_EXPIRATION`
- `refresh_token`: JWT — `httpOnly`, `secure`, `sameSite=strict`, `path=/`, `maxAge=JWT_REFRESH_EXPIRATION`

**Status:** `200 OK`

---

## Assinaturas esperadas

```ts
// Controller
AuthController.login(
  dto: LoginDto,
  response: Response,
): Promise<LoginResponseDto>

// Use-case (mantém retorno completo — controller decide o que vai pro body vs cookie)
LoginUseCase.execute(dto: LoginDto): Promise<{
  user: { id: string; fullName: string; email: string }
  accessToken: string
  refreshToken: string
}>

// Repositories
IUsersRepository:
- findByEmail(email: string): Promise<User | null>

// Sem novos adapters
```

---

## Fluxo principal

1. Controller recebe `LoginDto` validado pelo `ValidationPipe`.
2. Controller chama `LoginUseCase.execute(dto)`.
3. Use-case busca usuário por email via `IUsersRepository.findByEmail`.
4. Use-case valida senha (bcrypt compare).
5. Use-case gera `accessToken` (TTL = `JWT_EXPIRATION`) e `refreshToken` (TTL = `JWT_REFRESH_EXPIRATION`).
6. Use-case persiste o `refreshToken` (conforme estratégia já existente de refresh tokens).
7. Use-case retorna `{ user, accessToken, refreshToken }`.
8. Controller seta `access_token` e `refresh_token` em cookies `httpOnly` via `response.cookie(...)`.
9. Controller retorna no body apenas `{ id, fullName, email }`.

---

## Fluxos alternativos

- Email não encontrado → `UnauthorizedException('Invalid credentials')`
- Senha inválida → `UnauthorizedException('Invalid credentials')` (mesma mensagem para evitar user enumeration)
- Usuário com `deletedAt != null` → tratado pelo soft delete do TypeORM (não retorna) → `UnauthorizedException`
- Falha ao persistir refresh token → propaga erro (capturado pelo `ExceptionFilter` global)

---

## Regras de negócio

- Mensagem de erro de credenciais inválidas deve ser idêntica para email inexistente e senha incorreta.
- Cookies obrigatoriamente com flags: `httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `path: '/'`.
- `maxAge` dos cookies derivado de `JWT_EXPIRATION` e `JWT_REFRESH_EXPIRATION` (`env.config.ts`) — converter para milissegundos.
- Tokens **nunca** retornados no body da response.
- Tokens **nunca** logados (já é regra geral, reforçar).
- Endpoint continua público (`@Public()`).
- Rate limiting de login mantido em `10 req/60s`.

---

## Dependências

- `IUsersRepository` (existente)
- `JwtService` (`@nestjs/jwt`)
- Repositório de refresh tokens (existente, conforme estratégia atual)
- `EnvConfigService` para ler TTLs e flags de ambiente
- `cookie-parser` middleware (registrado em `main.ts` se ainda não estiver)

---

## Decisões técnicas da task

- **Transação:** Não — login envolve uma única persistência (refresh token); não há duas operações atômicas que justifiquem `runInTransaction()`.
- **Distributed lock:** Não — não há recurso compartilhado com risco de concorrência.
- **Cache:** Não — endpoint de autenticação **nunca** cacheado (regra explícita do projeto).
- **Estratégia de concorrência:** Nenhuma — operação por usuário individual.
- **Cookies via Express `Response`:** Controller injeta `@Res({ passthrough: true }) response: Response` para setar cookies sem quebrar o pipeline de retorno do Nest.
- **`cookie-parser`:** registrar em `main.ts` (`app.use(cookieParser())`) caso ainda não esteja, para suportar leitura no fluxo de refresh.

---

## Restrições

- NÃO retornar `access_token` ou `refresh_token` no body.
- NÃO usar `sameSite: 'none'` ou `secure: false` em produção.
- NÃO logar tokens em nenhuma circunstância.
- NÃO acessar `process.env` fora de `env.config.ts`.
- NÃO setar cookies sem `httpOnly`.
- NÃO mover lógica de geração de token para o controller — permanece no use-case.

---

## Estrutura esperada

```
modules/auth/
  controllers/
    auth.controller.ts            (alterado)
  use-cases/
    login.use-case.ts             (alterado — retorno passa a expor user separado de tokens)
  dto/
    login.dto.ts                  (existente)
    login-response.dto.ts         (novo — { id, fullName, email })
  tests/
    auth.integration.spec.ts      (alterado)
```

---

## Cenários de teste adicionais

**Unitários (`login.use-case.spec.ts`):**
- Retorna `{ user, accessToken, refreshToken }` com credenciais válidas.
- Lança `UnauthorizedException` quando email não existe.
- Lança `UnauthorizedException` quando senha é inválida.
- Mensagem de erro idêntica nos dois casos acima.
- Persiste refresh token no repositório correspondente.

**Unitários (`auth.controller.spec.ts`):**
- Chama `response.cookie('access_token', ...)` com flags `httpOnly`, `secure`, `sameSite: 'strict'`.
- Chama `response.cookie('refresh_token', ...)` com flags corretas.
- `maxAge` do cookie de access token = `JWT_EXPIRATION` em ms.
- `maxAge` do cookie de refresh token = `JWT_REFRESH_EXPIRATION` em ms.
- Body da response contém apenas `{ id, fullName, email }` — sem nenhum token.

**Integração (`auth.integration.spec.ts`):**
- `POST /auth/login` com credenciais válidas → `200`, body `{ id, fullName, email }`, headers `Set-Cookie` contendo `access_token` e `refresh_token` com `HttpOnly`, `Secure`, `SameSite=Strict`.
- `POST /auth/login` com email inexistente → `401`.
- `POST /auth/login` com senha errada → `401` com mesma mensagem do caso anterior.
- Body da response não contém as strings `access_token` nem `refresh_token`.
- Cookies retornados não são acessíveis sem `HttpOnly` (verificar atributo no header).

---

## Definition of Done

- [ ] Fluxo principal implementado
- [ ] Fluxos alternativos tratados
- [ ] `LoginResponseDto` criado em `dto/`
- [ ] `LoginUseCase` retorna `{ user, accessToken, refreshToken }`
- [ ] Controller seta cookies `httpOnly` e retorna apenas dados públicos no body
- [ ] `cookie-parser` registrado em `main.ts` (se ainda não estiver)
- [ ] Nenhum token no body ou em logs
- [ ] Testes unitários (100%)
- [ ] Testes de integração validando `Set-Cookie` e body
- [ ] Naming convention e estrutura de camadas respeitadas