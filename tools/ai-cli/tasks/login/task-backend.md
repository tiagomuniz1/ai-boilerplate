Você é um engenheiro de software sênior.

Siga estritamente o contexto e as regras.

---
## CONTEXT
# PROJECT CONTEXT

## Arquitetura Geral

* Monorepo com **Yarn Workspaces** — um repositório, três packages
* Estrutura:
  * `apps/frontend` → aplicação Next.js
  * `apps/backend` → API NestJS
  * `packages/shared` → código compartilhado (types, DTOs, utils)
  * `docker-compose.yml` → infraestrutura local (PostgreSQL, Redis)

### Regras de dependência

* `frontend` e `backend` consomem `shared`
* `frontend` e `backend` nunca se importam diretamente entre si
* `shared` não pode conter lógica de negócio — apenas types, DTOs e utils puros

### O que pertence ao `packages/shared`

✅ Permitido:
* Types e interfaces compartilhadas
* DTOs de request/response
* Enums compartilhados
* Funções utilitárias puras (sem side effects)

❌ Não permitido:
* Lógica de negócio
* Dependências de framework (NestJS, React, etc.)
* Acesso a banco, cache ou APIs externas

### Importando do shared

```ts
import { CreateUserDto } from '@app/shared'
import { UserRole } from '@app/shared'
```

### Build

Cada projeto usa a CLI do seu próprio framework. O `@app/shared` é resolvido via alias webpack em ambos — o código do shared entra diretamente no bundle de cada projeto, sem publicar pacote.

| | Frontend | Backend |
|---|---|---|
| CLI | `next build` | `nest build --webpack` |
| Config | `next.config.js` | `webpack.config.js` + `nest-cli.json` |
| Artefato | `.next/` | `dist/main.js` (bundle único) |
| `@app/shared` | alias no `next.config.js` | alias no `webpack.config.js` |
| Dockerfile | `apps/frontend/Dockerfile` | `apps/backend/Dockerfile` |

* Cada projeto tem seu próprio `Dockerfile` usado tanto no desenvolvimento local quanto no pipeline de CI/CD para gerar a imagem que roda no ECS
* O `docker-compose.yml` na raiz referencia os `Dockerfile` de cada app e sobe a infraestrutura local (PostgreSQL, Redis)

**Frontend** — resolução do shared via `next.config.js`:
```js
// apps/frontend/next.config.js
const path = require('path')

module.exports = {
  webpack: (config) => {
    config.resolve.alias['@app/shared'] = path.resolve(__dirname, '../../packages/shared/src')
    return config
  }
}
```

**Backend** — resolução do shared via `webpack.config.js`:
```js
// apps/backend/webpack.config.js
const path = require('path')
const { merge } = require('webpack-merge')

module.exports = (options) => {
  return merge(options, {
    resolve: {
      alias: {
        '@app/shared': path.resolve(__dirname, '../../packages/shared/src')
      }
    }
  })
}
```

```json
// apps/backend/nest-cli.json
{
  "compilerOptions": {
    "webpack": true,
    "webpackConfigPath": "webpack.config.js"
  }
}
```

---

## Comandos

### Setup inicial

```bash
# Clonar o repositório
git clone <repo-url>
cd <repo>

# Instalar dependências
yarn install

# Configurar credenciais AWS (necessário para buscar variáveis do Parameter Store)
aws configure
# Informar: AWS Access Key ID, Secret Access Key, região (ex: us-east-1)
```

### Infraestrutura local (Docker)

```bash
# Subir PostgreSQL e Redis
docker compose up -d

# Derrubar containers
docker compose down

# Derrubar containers e remover volumes (reset completo do banco)
docker compose down -v
```

### Banco de dados

```bash
# Rodar migrations (desenvolvimento)
yarn workspace apps/backend typeorm migration:run

# Gerar nova migration a partir do diff das entities
yarn workspace apps/backend typeorm migration:generate src/database/migrations/nome_da_migration

# Reverter última migration
yarn workspace apps/backend typeorm migration:revert

# Rodar seeds de desenvolvimento
yarn workspace apps/backend seed:run

# Rodar seeds de teste
NODE_ENV=test yarn workspace apps/backend seed:run
```

### Desenvolvimento

```bash
# Rodar frontend (carrega variáveis do Parameter Store automaticamente antes de subir)
yarn workspace apps/frontend dev

# Rodar backend
yarn workspace apps/backend dev

# Rodar frontend e backend em paralelo
yarn dev
```

### Build

```bash
# Build do frontend
yarn workspace apps/frontend build

# Build do backend
yarn workspace apps/backend build

# Build de todos os projetos
yarn build
```

### Testes

```bash
# Frontend — testes unitários
yarn workspace apps/frontend test:unit

# Frontend — testes de integração
yarn workspace apps/frontend test:integration

# Frontend — todos os testes
yarn workspace apps/frontend test

# Frontend — com coverage
yarn workspace apps/frontend test:unit --coverage

# Backend — testes unitários
yarn workspace apps/backend test:unit

# Backend — testes de integração
yarn workspace apps/backend test:integration

# Backend — todos os testes
yarn workspace apps/backend test

# Backend — com coverage
yarn workspace apps/backend test:unit --coverage

# Todos os testes do monorepo
yarn test
```

### Testes E2E

```bash
# Rodar E2E localmente (abre interface do Cypress)
yarn workspace apps/frontend cypress:open

# Rodar E2E headless (CI/CD)
yarn workspace apps/frontend cypress:run
```

### Deploy

* Deploy realizado via **GitHub Actions** com **acionamento manual** pelo console do GitHub
* Artefatos enviados para **AWS ECS**
* Deploy nunca deve ser feito diretamente na máquina local

```
GitHub Actions → Actions → selecionar workflow → Run workflow → escolher branch/ambiente
```

| Branch | Ambiente |
|---|---|
| `develop` | staging |
| `main` | production |

### Versionamento

* Padrão: **Semantic Versioning** — `vMAJOR.MINOR.PATCH`
* Frontend e backend versionados de forma **independente**
* Versão registrada em dois lugares: **tag git** + **`package.json`** de cada app

#### Regras do Semantic Versioning

| Tipo | Quando incrementar | Exemplo |
|---|---|---|
| `MAJOR` | Mudança incompatível com versão anterior (breaking change) | `v1.0.0` → `v2.0.0` |
| `MINOR` | Nova funcionalidade compatível com versão anterior | `v1.0.0` → `v1.1.0` |
| `PATCH` | Correção de bug compatível com versão anterior | `v1.0.0` → `v1.0.1` |

#### Tags git

* Tags nomeadas com prefixo do projeto para diferenciar frontend de backend
* Formato: `frontend/vMAJOR.MINOR.PATCH` e `backend/vMAJOR.MINOR.PATCH`
* Exemplos: `frontend/v1.2.0`, `backend/v2.0.1`
* Tags criadas manualmente antes de acionar o deploy no GitHub Actions
* Tag sempre deve apontar para a branch `main`

```bash
git tag frontend/v1.2.0
git push origin frontend/v1.2.0

git tag backend/v2.0.1
git push origin backend/v2.0.1
```

#### Fluxo de release

```
1. Desenvolver na branch feature/*
2. Abrir PR para develop
3. Testar em staging (deploy manual via GitHub Actions → develop)
4. Abrir PR de develop para main
5. Atualizar version no package.json do app correspondente
6. Criar tag git com o formato correto
7. Acionar deploy manual via GitHub Actions → main
```

#### Regras

* Nunca fazer deploy sem criar a tag correspondente
* A versão no `package.json` deve sempre estar sincronizada com a tag git
* Breaking changes no backend devem ser comunicados ao time de frontend antes do deploy
* Manter um `CHANGELOG.md` por app registrando o que mudou em cada versão

---

## Branches

### Estratégia

| Branch | Finalidade |
|---|---|
| `main` | Código em produção — sempre estável |
| `develop` | Integração contínua — base para features |
| `feature/*` | Nova funcionalidade |
| `fix/*` | Correção de bug em desenvolvimento |
| `hotfix/*` | Correção urgente diretamente em produção |

### Nomenclatura

```bash
feature/user-authentication
feature/payment-integration
fix/login-redirect-loop
hotfix/token-expiration-crash
```

* Sempre em kebab-case
* Nunca abreviar — nome deve descrever o que a branch faz
* Nunca commitar diretamente em `main` ou `develop`

### Fluxo padrão

```
feature/* → develop → main
fix/*     → develop → main
hotfix/*  → main (PR direto) + cherry-pick em develop
```

### Regras

* Branch sempre criada a partir de `develop` — exceto `hotfix/*` que parte de `main`
* `hotfix/*` deve ser aplicado em `main` e imediatamente propagado para `develop` via cherry-pick
* Branches devem ser deletadas após o merge
* Nome da branch deve referenciar o contexto da tarefa — não o nome do desenvolvedor

---

## Backend

### Stack

* Node.js
* NestJS
* PostgreSQL
* ORM: TypeORM
* Cache: Redis

---

### Arquitetura

Clean Architecture com separação clara de responsabilidades:

**Controllers**
* Recebem e validam requisições HTTP
* Chamam use-cases e retornam a resposta

❌ Não permitido:
* Regra de negócio
* Acesso direto a repositories ou adapters
* Transformação de dados além do DTO de entrada

---

**Use-cases**
* Contêm toda a regra de negócio
* Orquestram chamadas para repositories e adapters
* Implementados como **classes** que estendem `BaseUseCase` com decorator `@Injectable()`
* Método principal sempre chamado `execute()`

❌ Não permitido:
* Acesso direto ao banco (isso é responsabilidade do repository)
* Chamadas HTTP diretas (isso é responsabilidade do adapter)
* Lógica de apresentação ou formatação de resposta

---

**Repositories**
* Responsáveis exclusivamente por acesso ao banco
* Retornam entidades internas
* Toda repository tem uma `abstract class` (interface) e uma implementação concreta
* Use-cases dependem sempre da interface — nunca da implementação concreta
* Aceitam `QueryRunner` opcional para suporte a transações

❌ Não permitido:
* Regra de negócio
* Chamadas a APIs externas
* Conhecimento de outros repositories
* Abrir ou fechar transações

---

**Adapters**
* Consomem APIs externas
* Convertem a resposta para entidades internas
* Toda adapter tem uma `abstract class` (interface) e uma implementação concreta
* Devem implementar timeout, retry e circuit breaker

❌ Não permitido:
* Regra de negócio
* Acesso ao banco
* Conhecimento de outros adapters ou use-cases

---

**Cache Layer**
* Provê interface de cache desacoplada da implementação

❌ Não permitido:
* Regra de negócio
* Acesso ao banco
* Ser chamado diretamente por controllers

---

### Estrutura de Diretórios

```
apps/backend/
  Dockerfile
  nest-cli.json
  webpack.config.js
  src/
    app.module.ts
    main.ts
    modules/
      users/
        controllers/
          users.controller.ts
        use-cases/
          create-user.use-case.ts
          update-user.use-case.ts
        repositories/
          users.repository.interface.ts
          users.repository.ts
        adapters/
          notification.adapter.interface.ts
          notification.adapter.ts
        entities/
          user.entity.ts
        dto/
          create-user.dto.ts
          update-user.dto.ts
        tests/
          users.integration.spec.ts
        users.module.ts
      auth/
        controllers/
          auth.controller.ts
        use-cases/
          login.use-case.ts
          refresh-token.use-case.ts
          logout.use-case.ts
        strategies/
          jwt.strategy.ts
        guards/
          jwt-auth.guard.ts
        decorators/
          public.decorator.ts
          current-user.decorator.ts
        auth.module.ts
    health/
      health.controller.ts
      health.module.ts
    database/
      migrations/
      seeds/
        dev/
        test/
          test.seed.ts
      database.module.ts
      database.config.ts
    cache/
      cache.module.ts
      cache.service.ts
      distributed-lock.service.ts
    config/
      env.config.ts
    common/
      base.use-case.ts
      dto/
        pagination.dto.ts
      filters/
      guards/
      interceptors/
        request-id.interceptor.ts
        idempotency.interceptor.ts
      decorators/
      pipes/
```

---

### Validação de DTOs

```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}))
```

#### Regras

* `whitelist: true` obrigatório — nunca confiar em campos extras
* `transform: true` obrigatório
* Todo DTO deve usar decorators do `class-validator`
* Nunca validar manualmente dentro de controllers ou use-cases

---

### Injeção de Dependência

```ts
@Injectable()
export class CreateUserUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    private readonly notificationAdapter: INotificationAdapter,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateUserDto): Promise<User> {
    // regra de negócio
  }
}
```

```ts
@Module({
  controllers: [UsersController],
  providers: [
    CreateUserUseCase,
    { provide: IUsersRepository, useClass: UsersRepository },
    { provide: INotificationAdapter, useClass: NotificationAdapter },
  ],
})
export class UsersModule {}
```

#### Regras

* Todo use-case deve ter `@Injectable()` e estender `BaseUseCase`
* Interfaces registradas via `{ provide: IToken, useClass: Implementation }`
* Controllers recebem use-cases via injeção — nunca instanciam diretamente

---

### Transações

#### Quando usar

| Situação | Transação |
|---|---|
| Criar um registro simples | ❌ Não precisa |
| Criar registro + atualizar outro | ✅ Obrigatório |
| Deletar registro + registrar auditoria | ✅ Obrigatório |
| Buscar dados (read-only) | ❌ Nunca |

#### BaseUseCase

```ts
export abstract class BaseUseCase {
  constructor(protected readonly dataSource: DataSource) {}

  protected async runInTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const result = await operation(queryRunner)
      await queryRunner.commitTransaction()
      return result
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }
}
```

#### Regras

* `BaseUseCase` nunca deve crescer além de `runInTransaction()` — não é uma god class
* `runInTransaction()` apenas quando há duas ou mais operações atômicas
* Operações de leitura nunca usam transação
* O use-case é responsável por abrir e fechar a transação — nunca o repository

---

### Idempotência

#### Quando aplicar

| Situação | Idempotência |
|---|---|
| Operações de leitura (GET) | Naturalmente idempotente — nenhuma ação necessária |
| Criação de recurso (POST) | ✅ Aplicar quando reenvio pode gerar duplicata |
| Atualização (PUT/PATCH) | Naturalmente idempotente se o resultado final é o mesmo |
| Deleção (DELETE) | Naturalmente idempotente |
| Operações financeiras ou críticas | ✅ Sempre aplicar |

#### Estratégia — Idempotency Key

```ts
// common/interceptors/idempotency.interceptor.ts
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest()
    const idempotencyKey = request.headers['idempotency-key']

    if (!idempotencyKey) return next.handle()

    const cacheKey = `idempotency:${idempotencyKey}`
    const cached = await this.cacheService.get(cacheKey)

    if (cached) return of(cached)

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheService.set(cacheKey, response, 86400) // 24h
      })
    )
  }
}
```

```ts
// aplicar por endpoint quando necessário
@UseInterceptors(IdempotencyInterceptor)
@Post('payments')
createPayment(@Body() dto: CreatePaymentDto) {
  return this.createPaymentUseCase.execute(dto)
}
```

#### Regras

* `Idempotency-Key` deve ser gerado pelo cliente — recomendado UUID v4
* TTL da chave de idempotência: **24 horas**
* Aplicar obrigatoriamente em operações financeiras e críticas
* Aplicar em qualquer POST onde reenvio por falha de rede pode gerar duplicata
* Não aplicar globalmente — usar `@UseInterceptors(IdempotencyInterceptor)` por endpoint
* Mesmo erro deve ser retornado em reenvios com a mesma chave — não reprocessar

---

### Concorrência

#### Quando aplicar cada estratégia

| Critério | Estratégia |
|---|---|
| Dado compartilhado + custo alto de conflito | Pessimistic Lock + Distributed Lock |
| Dado compartilhado + custo baixo de conflito | Optimistic Lock |
| Dado exclusivo do usuário | Nenhuma |
| Operação idempotente | Nenhuma |

**Exemplos:**

| Operação | Estratégia |
|---|---|
| Decrementar estoque | Pessimistic + Distributed |
| Reservar assento | Pessimistic + Distributed |
| Editar perfil do usuário | Optimistic |
| Atualizar preferências | Nenhuma |

#### Pessimistic Locking

```ts
async findByIdWithLock(id: string, queryRunner: QueryRunner): Promise<Product | null> {
  return queryRunner.manager.getRepository(Product).findOne({
    where: { id },
    lock: { mode: 'pessimistic_write' },
  })
}
```

#### Optimistic Locking

```ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string
  @VersionColumn() version: number
}

async execute(id: string, dto: UpdateUserDto): Promise<User> {
  try {
    const user = await this.usersRepository.findById(id)
    if (!user) throw new NotFoundException('User not found')
    return await this.usersRepository.update(id, dto)
  } catch (error) {
    if (error instanceof OptimisticLockVersionMismatchError) {
      throw new ConflictException('Record was modified by another process. Please try again.')
    }
    throw error
  }
}
```

#### Distributed Lock (Redis)

```ts
@Injectable()
export class DistributedLockService {
  constructor(private readonly cacheService: CacheService) {}

  async runWithLock<T>(
    key: string,
    ttlInSeconds: number,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockKey = `lock:${key}`
    const acquired = await this.cacheService.setIfNotExists(lockKey, '1', ttlInSeconds)

    if (!acquired) {
      throw new ConflictException('Resource is temporarily locked. Please try again.')
    }

    try {
      return await operation()
    } finally {
      await this.cacheService.del(lockKey)
    }
  }
}
```

#### Regras

* Pessimistic Lock **sempre** dentro de `runInTransaction()`
* Distributed Lock **sempre** combinado com Pessimistic Lock — nunca isolado
* TTL do Distributed Lock padrão: `10s`
* `OptimisticLockVersionMismatchError` convertido para `ConflictException` no use-case
* Chave do Distributed Lock no formato `<entidade>:<id>` — ex: `product:123`

---

### Repositories

```ts
export abstract class IUsersRepository {
  abstract findAll(page: number, limit: number): Promise<[User[], number]>
  abstract findById(id: string): Promise<User | null>
  abstract findByEmail(email: string): Promise<User | null>
  abstract create(data: CreateUserDto, queryRunner?: QueryRunner): Promise<User>
  abstract update(id: string, data: UpdateUserDto, queryRunner?: QueryRunner): Promise<User>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
```

#### Regras

* Interface usa `abstract class` — não `interface` TypeScript
* Use-cases dependem sempre da interface, nunca da implementação concreta
* Métodos que podem participar de transações aceitam `QueryRunner` opcional

---

### Tratamento de Erros nos Use-cases

| Situação | Exceção NestJS |
|---|---|
| Recurso não encontrado | `NotFoundException` |
| Conflito (ex: email duplicado) | `ConflictException` |
| Ação não permitida | `ForbiddenException` |
| Dados inválidos por regra de negócio | `UnprocessableEntityException` |
| Conflito de concorrência (optimistic lock) | `ConflictException` |
| Erro inesperado | deixar propagar — o `ExceptionFilter` captura |

#### Regras

* Usar sempre exceções nativas do NestJS
* Nunca capturar e relançar erros desnecessariamente
* O `ExceptionFilter` global converte todas as exceções para Problem Details

---

### Paginação

```ts
export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20
}
```

#### Regras

* `PaginationDto` em `common/dto/` — reutilizado por todos os módulos
* Padrão: `page=1`, `limit=20`, máximo `limit=100`
* `@Type(() => Number)` obrigatório — query params chegam como string

---

### Soft Delete

* **Soft delete é o padrão** — nunca usar hard delete em entidades de negócio

```ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null
}
```

```ts
async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
  const repository = queryRunner
    ? queryRunner.manager.getRepository(User)
    : this.repository
  await repository.softDelete(id)
}

async findAllWithDeleted(): Promise<User[]> {
  return this.repository.find({ withDeleted: true })
}
```

#### Regras

* `@DeleteDateColumn` obrigatório em todas as entities que podem ser deletadas
* TypeORM filtra `deletedAt != null` automaticamente em todas as queries
* Hard delete permitido apenas em dados temporários ou logs
* Método no repository chamado `delete()` — internamente usa `softDelete()`

---

### Health Checks

* Biblioteca: **`@nestjs/terminus`**
* Endpoint: `GET /health` — sempre público, sem autenticação
* Usado pelo ECS para verificar se a instância está saudável

```ts
// health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly redis: MicroserviceHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @Public()
  check() {
    return this.health.check([
      () => this.database.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ])
  }
}
```

**Resposta de sucesso (`200`):**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

**Resposta de falha (`503`):**
```json
{
  "status": "error",
  "error": {
    "database": { "status": "down", "message": "Connection refused" }
  }
}
```

#### Regras

* Verificar obrigatoriamente: banco de dados e Redis
* ECS deve configurar health check apontando para `GET /health`
* Retorna `200` quando tudo está ok — `503` quando qualquer dependência está down
* Nunca expor detalhes sensíveis de infraestrutura na resposta

---

### Resiliência em Adapters

Todo adapter que consome uma API externa deve implementar as três camadas de resiliência.

#### Timeout

```ts
const response = await axios.post(url, payload, {
  timeout: 5000, // nunca sem timeout
})
```

| Tipo de integração | Timeout sugerido |
|---|---|
| APIs síncronas críticas | 3–5s |
| APIs de notificação | 5–10s |
| APIs de relatório / processamento | 15–30s |

#### Retry

```ts
import axiosRetry from 'axios-retry'

axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay, // 1s, 2s, 4s
  retryCondition: (error) =>
    axiosRetry.isNetworkError(error) ||
    axiosRetry.isRetryableError(error), // apenas 5xx
})
```

#### Circuit Breaker

```ts
import CircuitBreaker from 'opossum'

const breaker = new CircuitBreaker(callExternalApi, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
})

breaker.fallback(() => {
  this.logger.warn('External service unavailable — skipping')
  return null
})
```

| Estado | Comportamento |
|---|---|
| Fechado (normal) | Chamadas passam normalmente |
| Aberto (falhas acima do threshold) | Chamadas bloqueadas — fallback executado |
| Meio-aberto (após resetTimeout) | Uma chamada de teste — se passar, fecha o circuito |

#### Regras

* Todo adapter deve definir `timeout` explícito — nunca sem timeout
* Retry aplicado em todos os adapters para erros transitórios
* Retry apenas em erros `5xx`, timeout e erros de rede — nunca em `4xx`
* Operações não idempotentes devem usar `Idempotency-Key` antes de aplicar retry
* Circuit breaker aplicado em integrações críticas ou com histórico de instabilidade
* Fallback deve ser definido — logar o erro e seguir o fluxo quando possível

---

### Variáveis de Ambiente

* Todos os ambientes buscam variáveis exclusivamente do **AWS Parameter Store**
* Path: `/myapp/<ambiente>/<chave>`
* `NODE_ENV` e `AWS_REGION` configurados no ambiente de execução
* Nunca acessar `process.env` diretamente fora de `env.config.ts`
* Variáveis sensíveis nunca devem ser logadas

#### Variáveis obrigatórias

| Variável | Descrição |
|---|---|
| `DB_HOST` | Host do PostgreSQL |
| `DB_PORT` | Porta do PostgreSQL |
| `DB_USER` | Usuário do PostgreSQL |
| `DB_PASS` | Senha do PostgreSQL |
| `DB_NAME` | Nome do banco |
| `DB_SCHEMA` | Schema ativo (`dev` ou `test`) |
| `REDIS_HOST` | Host do Redis |
| `REDIS_PORT` | Porta do Redis |
| `JWT_SECRET` | Chave de assinatura do JWT |
| `JWT_EXPIRATION` | TTL do access token (ex: `900s`) |
| `JWT_REFRESH_EXPIRATION` | TTL do refresh token (ex: `7d`) |
| `FRONTEND_URL` | URL do frontend (para CORS) |

---

### Banco de Dados e Migrations

* `synchronize` **sempre desligado** — inclusive em desenvolvimento
* Migrations em `src/database/migrations/` — nomenclatura `snake_case` com timestamp
* Seeds de dev em `src/database/seeds/dev/` — seeds de teste em `src/database/seeds/test/`
* Nunca rodar seeds em produção

---

### Autenticação

* JWT com access token (15min) + refresh token (7 dias) via Passport.js
* Guard global `JwtAuthGuard` — rotas públicas com `@Public()`
* Tokens nunca logados — refresh token inválido retorna `401`

---

### Padrão de Resposta da API

| Situação | Status Code |
|---|---|
| Recurso criado | `201 Created` |
| Leitura / atualização | `200 OK` |
| Deleção | `204 No Content` |

Erros seguem **Problem Details (RFC 9457)** — `ExceptionFilter` global normaliza tudo.

---

### Cache (Redis)

#### Interface padrão

* `get<T>(key: string): Promise<T | null>`
* `set<T>(key: string, value: T, ttlInSeconds: number): Promise<void>`
* `del(key: string): Promise<void>`
* `setIfNotExists(key: string, value: string, ttlInSeconds: number): Promise<boolean>`

#### Estratégia: Cache-Aside

1. Tentar obter do cache
2. Se existir → retornar
3. Se não existir → buscar origem, salvar, retornar

#### Quando usar cache

| Critério | Cache |
|---|---|
| Leitura de recurso individual frequentemente acessado | ✅ Aplicar |
| Listagem com dados que mudam pouco | ✅ Aplicar |
| Dados de integração externa (adapters) | ✅ Aplicar |
| Operações de escrita (POST, PUT, PATCH, DELETE) | ❌ Nunca |
| Dados sensíveis (senhas, tokens, dados financeiros) | ❌ Nunca |
| Dados que precisam ser sempre em tempo real | ❌ Não aplicar |
| Endpoints de autenticação | ❌ Nunca |

**Exemplos concretos:**

| Endpoint | Cache | TTL |
|---|---|---|
| `GET /users/:id` | ✅ | 300s |
| `GET /users` | ✅ | 60s |
| `GET /products/:id` | ✅ | 300s |
| `GET /dashboard/metrics` | ✅ | 60s |
| `POST /auth/login` | ❌ | — |
| `GET /orders/:id` | ❌ | — |
| `GET /notifications` | ❌ | — |

**Regra de decisão — antes de cachear um endpoint, responder:**
1. Os dados mudam com frequência? — Se sim, não cachear ou usar TTL curto
2. É tolerável servir dados levemente desatualizados? — Se não, não cachear
3. O custo de buscar sem cache é alto? — Se não, o cache pode não valer a complexidade

#### TTL padrão

* `user` → 300s / `list` → 60s / integrações → 30–120s

#### Cache Invalidação

Cache invalidado explicitamente após mutations — o dado não espera o TTL expirar.

| Operação | Ação de cache |
|---|---|
| `GET` | Popula o cache se vazio (Cache-Aside) |
| `POST` | Invalida cache da listagem do recurso |
| `PUT` / `PATCH` | Invalida cache do recurso individual e da listagem |
| `DELETE` | Invalida cache do recurso individual e da listagem |

**Padrão de chaves:**
```ts
`user:${id}`                  // recurso individual
`users:list`                  // listagem sem filtro
`users:list:${page}:${limit}` // listagem paginada
```

**Exemplo no use-case:**
```ts
async execute(id: string, dto: UpdateUserDto): Promise<User> {
  const user = await this.usersRepository.update(id, dto)

  try {
    await this.cacheService.del(`user:${id}`)
    await this.cacheService.del('users:list')
  } catch (error) {
    this.logger.warn('Cache invalidation failed', { context: 'UpdateUserUseCase', userId: id })
  }

  return user
}
```

#### Regras

* Invalidação é responsabilidade do **use-case** — não do repository nem do controller
* Sempre invalidar recurso individual e listagem após mutations
* Falha na invalidação **nunca** quebra o fluxo principal — sempre em `try/catch` isolado
* Cache não pode quebrar fluxo
* Não armazenar dados sensíveis

---

### Naming Convention

> Todo código deve estar em inglês.

| Elemento | Convenção | Exemplos |
|---|---|---|
| Módulos | PascalCase + sufixo | `UsersModule`, `AuthModule` |
| Controllers | PascalCase + sufixo | `UsersController` |
| Use-cases | PascalCase + sufixo (classe) | `CreateUserUseCase` |
| Repositories | PascalCase + sufixo | `UsersRepository` |
| Adapters | PascalCase + sufixo | `PaymentAdapter` |
| Entities | PascalCase | `User`, `RefreshToken` |
| DTOs | PascalCase + sufixo | `CreateUserDto` |
| Interfaces | PascalCase + prefixo `I` | `IUsersRepository` |
| Arquivos | kebab-case + sufixo | `create-user.use-case.ts` |
| Variáveis | camelCase | `accessToken` |
| Constantes | UPPER_SNAKE_CASE | `JWT_SECRET` |
| Tabelas (banco) | snake_case plural | `users`, `refresh_tokens` |
| Colunas (banco) | snake_case | `full_name`, `created_at` |

#### Sufixos obrigatórios

| Tipo | Sufixo |
|---|---|
| Módulo | `.module.ts` |
| Controller | `.controller.ts` |
| Use-case | `.use-case.ts` |
| Repository (interface) | `.repository.interface.ts` |
| Repository (implementação) | `.repository.ts` |
| Adapter (interface) | `.adapter.interface.ts` |
| Adapter (implementação) | `.adapter.ts` |
| Entity | `.entity.ts` |
| DTO | `.dto.ts` |
| Teste unitário | `.spec.ts` |
| Teste integração | `.integration.spec.ts` |

#### Regras

* **Nunca abreviar** — nomes devem ser completos e autoexplicativos
* Use-cases implementados como **classes** que estendem `BaseUseCase`
* Consistência > preferência pessoal

---

### Testes Unitários

* 100% de cobertura obrigatória
* NÃO acessar banco, APIs externas ou cache real
* Todas as dependências devem ser mockadas

---

### Testes de Integração

* Testam endpoints HTTP via `Test.createTestingModule`
* Schema `test` isolado do schema `dev`
* Tabelas limpas via `afterEach` — migrations rodadas via `beforeAll`
* Dados gerados com `@faker-js/faker`
* Adapters de APIs externas podem ser mockados

---

## Frontend

### Stack

* Next.js (App Router) / React / React Query / Tailwind CSS / Zustand

---

### Arquitetura

```
UI (Components)
→ Hooks (React Query / estado)
→ Use Cases (Application Layer)
→ Services (API Layer)
→ API Client
```

---

### Estrutura de Diretórios

```
apps/frontend/
  Dockerfile
  next.config.js
  middleware.ts
  jest.config.ts
  jest.setup.ts
  app/
    layout.tsx
    providers.tsx
  components/
    ui/
      atoms/
      molecules/
      organisms/
    features/
      auth/
        components/
        hooks/
        services/
        use-cases/
      users/
        components/
        hooks/
        services/
        use-cases/
        mappers/
        types/
  hooks/
  lib/
    api-client.ts
    react-query.config.ts
    constants.ts
  scripts/
    load-env.js
  stores/
  tests/
    utils/
      render-with-providers.tsx
  types/
    api.types.ts
  utils/
  cypress/
    e2e/
    fixtures/
    support/
      commands.ts
      e2e.ts
```

---

### API Client

O API Client é a única fronteira com o axios — nada de axios fora de `lib/api-client.ts`.

```ts
// lib/api-client.ts
import axios from 'axios'

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
})

client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      try {
        await authService.refresh()
        return client(error.config)
      } catch {
        window.location.href = '/login'
      }
    }
    return Promise.reject(normalizeProblemDetails(error))
  }
)

export const apiClient = {
  get: <T>(url: string): Promise<T> => client.get(url),
  post: <T>(url: string, data?: unknown): Promise<T> => client.post(url, data),
  put: <T>(url: string, data?: unknown): Promise<T> => client.put(url, data),
  patch: <T>(url: string, data?: unknown): Promise<T> => client.patch(url, data),
  delete: <T>(url: string): Promise<T> => client.delete(url),
}
```

```ts
// types/api.types.ts
export interface IApiError {
  status: number
  title: string
  detail: string
  errors?: Array<{ field: string; message: string }>
}
```

#### Regras

* **Nunca importar `axios` ou seus tipos fora de `lib/api-client.ts`**
* `withCredentials: true` obrigatório
* Todo erro normalizado para `IApiError` antes de propagar
* Trocar axios exige mudança apenas em `lib/api-client.ts`

---

### Services

```ts
export const userService = {
  getAll: () => apiClient.get<IUserDto[]>('/users'),
  getById: (id: string) => apiClient.get<IUserDto>(`/users/${id}`),
  create: (data: ICreateUserInput) => apiClient.post<IUserDto>('/users', data),
  update: (id: string, data: IUpdateUserInput) => apiClient.put<IUserDto>(`/users/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/users/${id}`),
}
```

#### Regras

* NÃO utilizar classes
* NÃO importar `axios` — usar apenas `apiClient`
* Services retornam DTOs — mappers fazem a transformação

---

### Mappers

```ts
export function toUserModel(dto: IUserDto): IUserModel {
  return {
    id: dto.id,
    fullName: dto.full_name,
    email: dto.email,
    createdAt: new Date(dto.created_at),
  }
}
```

#### Regras

* Funções puras — sem side effects
* Sempre converter tipos — `string → Date`, `snake_case → camelCase`
* Nunca mapear dentro de componentes ou hooks

---

### Use Cases

```ts
export async function createUserUseCase(data: ICreateUserInput) {
  const dto = await userService.create(data)
  return toUserModel(dto)
}
```

---

### Hooks

```ts
export function useCreateUser() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: createUserUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      router.push('/users')
    },
  })
}
```

---

### React Query

```ts
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60, retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  })
}
```

* `Providers` em `app/providers.tsx` — nunca no `layout.tsx` diretamente
* `retry: 0` em mutations — nunca repetir automaticamente

---

### Estado Global

#### Divisão de responsabilidades

| Tipo de estado | Solução |
|---|---|
| Estado de servidor (dados da API) | React Query — sempre |
| Estado local de componente | `useState` / `useReducer` |
| Estado global (simples ou complexo) | Zustand |

* **Nunca usar Zustand para dados que vêm da API** — isso é responsabilidade do React Query

#### Exemplo — store de autenticação

```ts
// stores/auth.store.ts
import { create } from 'zustand'

interface IAuthStore {
  user: IUserModel | null
  isAuthenticated: boolean
  setUser: (user: IUserModel | null) => void
}

export const useAuthStore = create<IAuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}))
```

#### Regras

* Stores ficam em `stores/` — um arquivo por domínio (`auth.store.ts`, `theme.store.ts`)
* Nunca armazenar dados da API no Zustand — usar React Query
* Nunca usar Zustand dentro de services, use-cases ou mappers

---

### Formulários

* Sempre `react-hook-form` — nunca `useState` para campos
* Erros `422` do backend mapeados para campos via `setError()`
* Botão desabilitado enquanto `isPending`
* Tipos do formulário como interface local — não reutilizar DTOs do backend

---

### Tratamento de Erros e Loading

* Sempre tratar os três estados: `loading`, `error`, `success`
* Loading → skeleton correspondente
* Erro → `ErrorMessage` com mensagem amigável — nunca exibir `detail` técnico ao usuário

---

### Internacionalização (i18n)

* O projeto **não suporta múltiplos idiomas** na versão atual — toda a interface é em português brasileiro
* Caso i18n seja necessário no futuro, a biblioteca adotada será **next-intl**
* Mensagens de erro da API são em inglês — mapeamento para português é responsabilidade do frontend
* Datas e números formatados conforme locale `pt-BR`

---

### Autenticação

| Cookie | Flags |
|---|---|
| `access_token` | `httpOnly`, `Secure`, `SameSite=Strict` |
| `refresh_token` | `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/auth/refresh` |

* Nunca armazenar tokens em `localStorage` ou `sessionStorage`
* Rotas públicas explicitamente listadas no `middleware.ts`

---

### Variáveis de Ambiente

* Variáveis injetadas pelo **GitHub Actions no momento do build**
* `.env.local` gerado automaticamente pelo `predev` via AWS Parameter Store
* Nunca colocar secrets em `NEXT_PUBLIC_*`

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API do backend |

---

### Testes Unitários

* 100% de cobertura obrigatória
* Todas as dependências mockadas

---

### Testes de Integração

* React Testing Library + Jest
* Services mockados via `jest.mock()`
* `renderWithProviders()` usa `createQueryClient()` — mesma factory da aplicação
* Testar sempre loading, error e success
* Buscar por texto, role, label — nunca por classe ou id interno

---

### Naming Convention

> Todo código deve estar em inglês.

| Elemento | Convenção | Exemplos |
|---|---|---|
| Componentes | PascalCase | `UserList`, `UserCard` |
| Hooks | `use` + PascalCase | `useUsers`, `useCreateUser` |
| Use-cases | camelCase (função) | `createUserUseCase` |
| Services | kebab-case + sufixo | `users.service.ts` |
| Mappers | camelCase | `toUserModel` |
| Interfaces | PascalCase + prefixo `I` | `IUserModel` |
| Arquivos de hook | kebab-case + `.hook.ts` | `use-create-user.hook.ts` |
| Stores | kebab-case + `.store.ts` | `auth.store.ts` |
| Variáveis | camelCase | — |
| Constantes | UPPER_SNAKE_CASE | — |

#### Diferenças intencionais em relação ao backend

* Use-cases são **funções** no frontend e **classes** no backend
* Interfaces usam prefixo `I` nos dois projetos

#### Regras

* **Nunca abreviar**
* Componentes como substantivos — `UserList`, não `ListUsers`
* Hooks com verbo — `useCreateUser`, não `useUserCreation`
* Mappers com `to` + modelo destino — `toUserModel`

---

## Shared (`packages/shared`)

### Estrutura de diretórios

```
packages/shared/
  src/
    dtos/
    types/
    enums/
    utils/
    index.ts
```

### O que pertence a cada pasta

| Pasta | Conteúdo | Exemplo |
|---|---|---|
| `dtos/` | Contratos de request/response da API | `CreateUserDto`, `UserResponseDto` |
| `types/` | Interfaces e types compartilhados | `IPaginatedResponse`, `IUserBase` |
| `enums/` | Enums usados nos dois projetos | `UserRole`, `OrderStatus` |
| `utils/` | Funções puras sem dependência de framework | `formatDate`, `slugify` |

### Regras

* Tudo exportado via `index.ts` — nunca importar de subpastas diretamente
* DTOs do shared são o contrato entre frontend e backend — mudanças breaking precisam ser coordenadas
* Ao adicionar um campo obrigatório em um DTO, atualizar frontend e backend antes de fazer deploy
* Nunca importar tipos do `frontend` ou `backend` dentro do `shared`
* Funções em `utils/` devem ser puras e testadas

---

## Testes E2E

* Biblioteca: **Cypress**
* Simulam fluxos reais do usuário — sem mockar comportamento crítico
* Rodam contra o ambiente de staging antes de cada deploy para produção

### Autenticação nos testes

```ts
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request('POST', `${Cypress.env('API_URL')}/auth/login`, { email, password })
})
```

### Regras

* Sempre usar `data-testid` — nunca classes CSS ou texto
* Cada teste deve ser independente — sem depender do estado de outro teste
* Cobrir apenas fluxos críticos: login, navegação principal, CRUD completo
* Credenciais de teste via `cypress.env.json` — no `.gitignore`
* Rodar no pipeline antes de cada deploy para `main`

---

## Segurança

### Backend

* **Helmet** — `app.use(helmet())`
* **CORS** — apenas origens autorizadas — CORS é validado pelo browser, Postman não é afetado
* **Rate Limiting** — limites por endpoint:

| Endpoint | Limite | Janela |
|---|---|---|
| `POST /auth/login` | 10 requisições | 60s |
| `POST /auth/refresh` | 20 requisições | 60s |
| Demais endpoints | 300 requisições | 60s |

* **Validação** — `ValidationPipe` com `whitelist: true`
* **Queries parametrizadas** — TypeORM usa por padrão — nunca concatenar SQL manualmente

### Frontend

* Nunca armazenar tokens em `localStorage`
* Nunca exibir detalhes técnicos de erro ao usuário
* Nunca colocar secrets em `NEXT_PUBLIC_*`

### Regras gerais

* Nunca confiar em dados vindos do cliente — sempre validar no backend
* Nunca logar dados sensíveis em nenhum ambiente
* Secrets sempre no Parameter Store — nunca em código-fonte
* Em caso de dúvida sobre expor um dado, não expor

---

## Observabilidade

* Biblioteca de log: **Winston** (backend)
* Logs estruturados em **JSON** em todos os ambientes

### Nível de log por ambiente

| Ambiente | Nível |
|---|---|
| `development` | `debug` |
| `test` | `debug` |
| `production` | `warn` |

### requestId

```ts
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    request.requestId = randomUUID()
    return next.handle()
  }
}
```

### Formato do log

```json
{
  "timestamp": "2024-04-15T10:30:00.000Z",
  "level": "error",
  "message": "User not found",
  "context": "FindUserUseCase",
  "requestId": "uuid",
  "userId": "uuid"
}
```

### Regras

* Nunca logar dados sensíveis — senhas, tokens, CPF, dados de cartão
* Todo erro inesperado logado com contexto suficiente para reproduzir o problema
* `requestId` obrigatório em todos os logs de erro
* Frontend reporta erros críticos via `console.error` — integração com serviço externo a definir

---

## Convenções Gerais

* Código em inglês
* Commits semânticos — Conventional Commits (https://www.conventionalcommits.org/en/v1.0.0/)
* Arquivos em kebab-case
* **Nunca abreviar** — nomes devem ser completos e autoexplicativos

---

## Regras Importantes

* Não misturar camadas
* Não criar lógica dentro de componentes UI
* Sempre reutilizar antes de criar
* Seguir estrutura definida

---

## Definition of Done

Uma tarefa está concluída quando **todos** os itens abaixo estão satisfeitos:

### Código

* [ ] Implementação completa conforme requisitos
* [ ] Sem erros de build
* [ ] Sem warnings de lint
* [ ] Sem `console.log` ou código comentado

### Testes

* [ ] Testes unitários com 100% de cobertura
* [ ] Testes de integração para endpoints novos ou alterados
* [ ] Testes E2E para fluxos críticos novos

### Padrões

* [ ] Segue a arquitetura e naming convention definidos neste documento
* [ ] Sem mistura de camadas
* [ ] Nenhum tipo do axios fora de `lib/api-client.ts` (frontend)
* [ ] Nenhum `process.env` fora de `env.config.ts` (backend)
* [ ] Dados da API gerenciados via React Query — nunca via Zustand

### Segurança

* [ ] Nenhum dado sensível em logs
* [ ] Nenhum secret em código-fonte ou variável `NEXT_PUBLIC_*`
* [ ] Novos campos sensíveis marcados com `@Exclude()` na entity (backend)

### Processo

* [ ] PR aberto com descrição clara do que foi feito
* [ ] PR aprovado por pelo menos um revisor
* [ ] Branch atualizada com `develop` antes do merge
* [ ] `CHANGELOG.md` atualizado se for uma mudança relevante

---

## Code Review

### O que é bloqueante

* Violação de arquitetura — camadas misturadas, axios fora do API Client, `process.env` fora de `env.config.ts`
* Falta de testes ou cobertura incompleta
* Dados sensíveis em logs ou código
* Bug óbvio ou comportamento incorreto
* Violação de naming convention
* Dados da API armazenados em Zustand em vez de React Query

### O que é sugestão

* Preferência de estilo dentro das regras definidas
* Refatorações que não afetam comportamento
* Melhorias de legibilidade

### Regras

* Todo PR deve ter no mínimo **1 aprovação** antes do merge
* Reviewer tem até **1 dia útil** para responder
* Autor do PR é responsável por resolver ou rebater cada comentário antes do merge
* Comentários bloqueantes marcados com `[bloqueante]`
* Sugestões marcadas com `[sugestão]`


---
## RULES
* Sempre escrever código limpo
* Criar testes unitários
* Não quebrar código existente
* Seguir estrutura de pastas


---
# Task — Login (Backend)

## Descrição
Implementar endpoints que serão usado para o login do usuário na plataforma

---

## Contexto
O login deve ser feito usando o email e senha do usuário. O usuário deve ser autenticado usando o JWT.

---

## Contratos

### Input (DTO)
<LoginInputDto>:
- email: string
- password: string

### Output
<LoginResponseDto>:
- accessToken: string
- refreshToken: string
- user: UserDto

---

## Fluxo principal

1. Request recebe email e password via body
2. Valida se o usuário existe no banco de dados
3. Valida se a senha está correta
4. Gera um JWT token
5. Retorna o JWT token no campo accessToken, refreshToken e user

---

## Fluxos alternativos

- Caso o usuário não exista → lançar <UnauthorizedException>
- Caso a senha esteja incorreta → lançar <UnauthorizedException>

---

## Decisões técnicas da task

- Usar transação: não
- Usar distributed lock: não
- Usar cache: não
- Estratégia de concorrência: não

---

## Cenários de teste adicionais

- Usuário com email inválido
- Usuário com senha inválida
- Usuário encontrado mas inativo
- Usuário encontrado mas excluído logicamente

---

## Definition of Done

- [ ] Fluxo principal implementado
- [ ] Fluxos alternativos tratados
- [ ] Testes unitários (100%)
- [ ] Testes de integração

---
## INPUT
login