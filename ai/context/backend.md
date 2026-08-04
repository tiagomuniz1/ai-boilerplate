# Backend

## Stack

* Node.js / NestJS / PostgreSQL / TypeORM / Redis

---

## Arquitetura

Clean Architecture com separação clara de responsabilidades:

**Controllers**
* Recebem e validam requisições HTTP
* Chamam use-cases e retornam a resposta
* ❌ Sem regra de negócio, sem acesso direto a repositories, sem transformação além do DTO de entrada

**Use-cases**
* Contêm toda a regra de negócio
* Orquestram repositories e adapters
* Implementados como **classes** que estendem `BaseUseCase` com `@Injectable()`
* Método principal sempre chamado `execute()`
* ❌ Sem acesso direto ao banco, sem chamadas HTTP, sem lógica de apresentação

**Repositories**
* Responsáveis exclusivamente por acesso ao banco
* Retornam entidades internas
* Toda repository tem `abstract class` (interface) + implementação concreta
* Use-cases dependem sempre da interface
* Aceitam `QueryRunner` opcional para transações
* ❌ Sem regra de negócio, sem chamadas externas, sem conhecimento de outros repositories

**Adapters**
* Consomem APIs externas e convertem para entidades internas
* Toda adapter tem `abstract class` + implementação concreta
* Devem implementar timeout, retry e circuit breaker
* ❌ Sem regra de negócio, sem acesso ao banco

**Cache Layer**
* Provê interface de cache desacoplada da implementação
* ❌ Sem regra de negócio, sem acesso ao banco, nunca chamado por controllers

---

## Estrutura de Diretórios

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
      interceptors/
        request-id.interceptor.ts
        idempotency.interceptor.ts
```

---

## Validação de DTOs

```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}))
```

* `whitelist: true` obrigatório — nunca confiar em campos extras
* Todo DTO usa decorators do `class-validator`
* Nunca validar manualmente em controllers ou use-cases

---

## Injeção de Dependência

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

* Todo use-case deve ter `@Injectable()` e estender `BaseUseCase`
* Interfaces registradas via `{ provide: IToken, useClass: Implementation }`
* Controllers recebem use-cases via injeção — nunca instanciam diretamente

---

## Módulos — Exports e Dependências Circulares

**Regra:** módulos exportam **use-cases**, nunca repositories.

Repositories são implementação interna do módulo. Quando outro módulo precisa de um comportamento, ele importa o módulo e usa o use-case exportado.

```ts
// ✅ correto — exporta use-case
@Module({
  providers: [DeleteDoctorUseCase, { provide: IDoctorsRepository, useClass: DoctorsRepository }],
  exports: [DeleteDoctorUseCase],
})
export class DoctorsModule {}

// ❌ errado — expõe implementação interna
exports: [IDoctorsRepository]
```

**Dependências circulares** ocorrem quando dois módulos se importam mutuamente (ex: `UsersModule` ↔ `DoctorsModule`). Resolver com `forwardRef`:

```ts
// users.module.ts
@Module({
  imports: [forwardRef(() => DoctorsModule), forwardRef(() => PatientsModule)],
  exports: [IUsersRepository],
})
export class UsersModule {}

// doctors.module.ts
@Module({
  imports: [forwardRef(() => UsersModule), SpecialtiesModule],
  exports: [DeleteDoctorUseCase],
})
export class DoctorsModule {}
```

* Usar `forwardRef` apenas quando a dependência circular é inevitável por regra de negócio
* Nunca usar `forwardRef` como atalho para esconder acoplamento desnecessário

---

## Transações

| Situação | Transação |
|---|---|
| Criar um registro simples | ❌ Não precisa |
| Criar registro + atualizar outro | ✅ Obrigatório |
| Deletar registro + registrar auditoria | ✅ Obrigatório |
| Deletar entidade com cascade em outros módulos | ✅ Obrigatório |
| Buscar dados (read-only) | ❌ Nunca |

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

* `BaseUseCase` nunca deve crescer além de `runInTransaction()` — não é uma god class
* `runInTransaction()` apenas quando há duas ou mais operações atômicas
* O use-case abre e fecha a transação — nunca o repository

**Cascade soft-delete entre módulos:**

Quando deletar uma entidade que possui dependentes em outros módulos, o use-case orquestra o cascade chamando os use-cases exportados dos módulos dependentes dentro da mesma transação. Os use-cases de delete expostos para cascade aceitam `QueryRunner` opcional para participar da transação do chamador.

```ts
// delete-user.use-case.ts
async execute(id: string): Promise<void> {
  const user = await this.usersRepository.findById(id)
  if (!user) throw new NotFoundException('User not found')

  await this.runInTransaction(async (queryRunner) => {
    await this.deleteDoctorUseCase.deleteByUserId(id, queryRunner)   // cascade
    await this.deletePatientUseCase.deleteByUserId(id, queryRunner)  // cascade
    await this.usersRepository.delete(id, queryRunner)
  })

  // cache invalidation fora da transação
  try {
    await this.cacheService.del(`user:${id}`)
    await this.cacheService.delByPattern('users:list*')
  } catch { ... }
}

// delete-doctor.use-case.ts — método para cascade
async deleteByUserId(userId: string, queryRunner?: QueryRunner): Promise<void> {
  const doctor = await this.doctorsRepository.findByUserId(userId)
  if (!doctor) return  // silencioso — usuário pode não ter perfil de médico

  await this.doctorsRepository.delete(doctor.id, queryRunner)

  try {
    await this.cacheService.del(`doctor:${doctor.id}`)
    await this.cacheService.delByPattern('doctors:list*')
  } catch { ... }
}
```

* O método `deleteByUserId` é silencioso quando não encontra — ao contrário de `execute()` que lança `NotFoundException`
* A busca (`findByUserId`) ocorre antes do user ser deletado, então o INNER JOIN funciona
* Cache invalidation dos dependentes fica no próprio use-case de cascade

---

## Idempotência

| Situação | Idempotência |
|---|---|
| GET | Naturalmente idempotente |
| POST (pode gerar duplicata por reenvio) | ✅ Aplicar |
| Operações financeiras ou críticas | ✅ Sempre |
| PUT/PATCH/DELETE | Naturalmente idempotente |

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

* `Idempotency-Key` gerado pelo cliente (UUID v4), TTL 24h
* Não aplicar globalmente — usar `@UseInterceptors` por endpoint
* Mesmo erro retornado em reenvios com a mesma chave — não reprocessar

---

## Concorrência

| Critério | Estratégia |
|---|---|
| Dado compartilhado + custo alto de conflito | Pessimistic Lock + Distributed Lock |
| Dado compartilhado + custo baixo de conflito | Optimistic Lock |
| Dado exclusivo do usuário | Nenhuma |

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

* Pessimistic Lock **sempre** dentro de `runInTransaction()`
* Distributed Lock **sempre** combinado com Pessimistic Lock — nunca isolado
* TTL do Distributed Lock padrão: `10s`
* Chave no formato `<entidade>:<id>` — ex: `product:123`
* `OptimisticLockVersionMismatchError` convertido para `ConflictException` no use-case

---

## Repositories

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

* Interface usa `abstract class` — não `interface` TypeScript
* Use-cases dependem sempre da interface, nunca da implementação concreta
* Métodos que participam de transações aceitam `QueryRunner` opcional

**JOIN em relações obrigatórias:**

Usar `innerJoinAndSelect` (não `leftJoinAndSelect`) para relações que sempre devem existir. O TypeORM aplica automaticamente `WHERE deleted_at IS NULL` no JOIN — se a entidade relacionada estiver soft-deleted, `INNER JOIN` exclui o registro do resultado em vez de retornar `null` na propriedade, evitando crash ao acessar `relation.property`.

```ts
// ✅ correto — doctor sem user ativo é excluído do resultado
async findAll(page: number, limit: number): Promise<[Doctor[], number]> {
  return this.repository
    .createQueryBuilder('doctor')
    .innerJoinAndSelect('doctor.user', 'user')       // obrigatório
    .leftJoinAndSelect('doctor.specialties', 'spec') // opcional
    .orderBy('doctor.createdAt', 'DESC')
    .take(limit)
    .skip((page - 1) * limit)
    .getManyAndCount()
}

// ❌ errado — retorna doctor com user = null quando user está soft-deleted
return this.repository.findAndCount({ relations: ['user', 'specialties'] })
```

* `innerJoinAndSelect` para relações ManyToOne/OneToOne obrigatórias (ex: `doctor.user`)
* `leftJoinAndSelect` para relações opcionais ou ManyToMany (ex: `doctor.specialties`)
* `findAndCount` com `relations:` e `findOne` com `relations:` usam LEFT JOIN — evitar quando a relação é obrigatória

---

## Tratamento de Erros nos Use-cases

| Situação | Exceção NestJS |
|---|---|
| Recurso não encontrado | `NotFoundException` |
| Conflito (ex: email duplicado) | `ConflictException` |
| Ação não permitida | `ForbiddenException` |
| Dados inválidos por regra de negócio | `UnprocessableEntityException` |
| Conflito de concorrência (optimistic lock) | `ConflictException` |
| Erro inesperado | deixar propagar — `ExceptionFilter` captura |

* Usar sempre exceções nativas do NestJS
* O `ExceptionFilter` global converte para Problem Details (RFC 9457)

---

## Paginação

```ts
export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20
}
```

* `PaginationDto` em `common/dto/` — reutilizado por todos os módulos
* `@Type(() => Number)` obrigatório — query params chegam como string

---

## Entidades — Tipos de Coluna

TypeORM infere o tipo da coluna a partir do tipo TypeScript da propriedade. A inferência funciona para `string`, `number`, `boolean` e `Date`, mas **falha silenciosamente para union types** — o resultado é `"Object"`, que não é suportado pelo PostgreSQL e derruba o backend na inicialização.

**Regra:** sempre declarar `type` explicitamente em colunas cujo tipo TypeScript seja uma union (`string | null`, `number | null`, etc.).

```ts
// ✅ correto — type explícito, TypeORM sabe o que mapear
@Column({ name: 'bg_color', type: 'varchar', length: 7, nullable: true, default: null })
bgColor: string | null

@Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
deletedAt: Date | null

// ❌ errado — TypeORM infere "Object" e lança DataTypeNotSupportedError ao subir
@Column({ name: 'bg_color', length: 7, nullable: true })
bgColor: string | null
```

Tipos TypeORM mais usados no projeto:

| TypeScript | `type` a declarar |
|---|---|
| `string` | inferido — ok sem `type` |
| `string \| null` | `'varchar'` (ou `'text'`, `'uuid'`, etc.) |
| `number` | inferido — ok sem `type` |
| `number \| null` | `'int'` / `'float4'` / `'numeric'` conforme o caso |
| `boolean` | inferido — ok sem `type` |
| `Date \| null` | `'timestamptz'` |
| enum `string \| null` | `'varchar'` + `nullable: true` |

> **`@DeleteDateColumn`** e **`@CreateDateColumn`** são exceções — esses decorators já definem o tipo internamente, mesmo que a propriedade seja `Date | null`.

---

## Soft Delete

* **Soft delete é o padrão** — nunca hard delete em entidades de negócio

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
```

* `@DeleteDateColumn` obrigatório em todas as entities deletáveis
* TypeORM filtra `deletedAt != null` automaticamente em todas as queries
* Hard delete permitido apenas em dados temporários ou logs
* Método no repository chamado `delete()` — internamente usa `softDelete()`
* Entidades com dependentes em outros módulos exigem cascade soft-delete — ver seção **Transações**

---

## Health Checks

* Biblioteca: **`@nestjs/terminus`**
* Endpoint: `GET /health` — sempre público, sem autenticação
* Usado pelo EC2/nginx (via `docker compose` healthcheck) para verificar se a instância está saudável

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

* Verificar obrigatoriamente: banco de dados e Redis
* Retorna `200` quando tudo ok — `503` quando qualquer dependência está down
* Nunca expor detalhes sensíveis de infraestrutura na resposta

---

## Resiliência em Adapters

Todo adapter que consome uma API externa deve implementar as três camadas:

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

* Todo adapter deve definir `timeout` explícito — nunca sem timeout
* Retry apenas em erros `5xx`, timeout e erros de rede — nunca em `4xx`
* Operações não idempotentes devem usar `Idempotency-Key` antes de aplicar retry
* Circuit breaker em integrações críticas ou com histórico de instabilidade
* Fallback deve ser definido — logar o erro e seguir o fluxo quando possível

---

## Variáveis de Ambiente

* Todos os ambientes buscam variáveis do **AWS Parameter Store**
* Nunca acessar `process.env` diretamente fora de `env.config.ts`
* Variáveis sensíveis nunca logadas

| Variável | Descrição |
|---|---|
| `DB_HOST/PORT/USER/PASS/NAME/SCHEMA` | PostgreSQL |
| `REDIS_HOST/PORT` | Redis |
| `JWT_SECRET` | Chave de assinatura do JWT |
| `JWT_EXPIRATION` | TTL do access token (ex: `900s`) |
| `JWT_REFRESH_EXPIRATION` | TTL do refresh token (ex: `7d`) |
| `FRONTEND_URL` | URL do frontend (para CORS) |

---

## Banco de Dados e Migrations

* `synchronize` **sempre desligado** — inclusive em desenvolvimento
* Migrations em `src/database/migrations/` — nomenclatura `snake_case` com timestamp
* Seeds de dev em `src/database/seeds/dev/` — seeds de teste em `src/database/seeds/test/`
* Nunca rodar seeds em produção

---

## Autenticação

* JWT com access token (15min) + refresh token (7 dias) via Passport.js
* Guard global `JwtAuthGuard` — rotas públicas com `@Public()`
* Tokens nunca logados — refresh token inválido retorna `401`

---

## Padrão de Resposta da API

| Situação | Status Code |
|---|---|
| Recurso criado | `201 Created` |
| Leitura / atualização | `200 OK` |
| Deleção | `204 No Content` |

Erros seguem **Problem Details (RFC 9457)** — `ExceptionFilter` global normaliza tudo.

---

## Cache (Redis)

Interface padrão: `get`, `set`, `del`, `setIfNotExists`

Estratégia **Cache-Aside**: tentar cache → se miss, buscar origem, salvar, retornar.

| Critério | Cache |
|---|---|
| Leitura de recurso individual frequente | ✅ |
| Listagem que muda pouco | ✅ |
| Dados de adapter externo | ✅ |
| Escrita (POST/PUT/PATCH/DELETE) | ❌ |
| Dados sensíveis | ❌ |
| Endpoints de autenticação | ❌ |

TTL padrão: `user` → 300s / `list` → 60s / integrações → 30–120s

**Padrão de chaves:**
```ts
`user:${id}`                  // recurso individual
`users:list`                  // listagem
`users:list:${page}:${limit}` // listagem paginada
```

**Invalidação no use-case:**
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

* Invalidação explícita após mutations — não esperar TTL
* Invalidação é responsabilidade do **use-case**
* POST → invalida listagem; PUT/PATCH/DELETE → invalida individual + listagem
* Falha na invalidação **nunca** quebra o fluxo — sempre em `try/catch` isolado

---

## Segurança

* **Helmet** — `app.use(helmet())`
* **CORS** — apenas origens autorizadas
* **Rate Limiting**: login `10 req/60s`, refresh `20 req/60s`, demais `300 req/60s`
* **Validação** — `ValidationPipe` com `whitelist: true`
* **Queries parametrizadas** — TypeORM usa por padrão — nunca concatenar SQL manualmente

---

## Observabilidade

* Logger: **Winston** / Logs estruturados em **JSON**
* Nível: `debug` em dev/test — `warn` em produção
* `requestId` obrigatório em todos os logs de erro

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

* Nunca logar dados sensíveis — senhas, tokens, CPF, dados de cartão
* Todo erro inesperado logado com contexto suficiente para reproduzir o problema

---

## Naming Convention

| Elemento | Convenção | Exemplo |
|---|---|---|
| Módulos | PascalCase + sufixo | `UsersModule` |
| Controllers | PascalCase + sufixo | `UsersController` |
| Use-cases (classe) | PascalCase + sufixo | `CreateUserUseCase` |
| Repositories | PascalCase + sufixo | `UsersRepository` |
| Interfaces | PascalCase + `I` | `IUsersRepository` |
| Entities | PascalCase | `User` |
| DTOs | PascalCase + sufixo | `CreateUserDto` |
| Arquivos | kebab-case + sufixo | `create-user.use-case.ts` |
| Tabelas (banco) | snake_case plural | `refresh_tokens` |
| Colunas (banco) | snake_case | `full_name`, `created_at` |

Sufixos obrigatórios: `.module.ts`, `.controller.ts`, `.use-case.ts`, `.repository.interface.ts`, `.repository.ts`, `.adapter.interface.ts`, `.adapter.ts`, `.entity.ts`, `.dto.ts`, `.spec.ts`, `.integration.spec.ts`

**Nunca abreviar** — nomes completos e autoexplicativos

---

## Testes

**Unitários:**
* 100% de cobertura obrigatória
* Todas as dependências mockadas
* NÃO acessar banco, APIs externas ou cache real

**Integração:**
* Testam endpoints HTTP via `Test.createTestingModule`
* Schema `test` isolado do `dev`
* Tabelas limpas via `afterEach` — migrations via `beforeAll`
* Dados gerados com `@faker-js/faker`

---

## Definition of Done

* [ ] Implementação completa conforme requisitos
* [ ] Sem erros de build / warnings de lint / `console.log` ou código comentado
* [ ] Testes unitários com 100% de cobertura
* [ ] Testes de integração
* [ ] Segue arquitetura e naming convention
* [ ] Sem mistura de camadas
* [ ] Nenhum `process.env` fora de `env.config.ts`
* [ ] Nenhum dado sensível em logs
* [ ] Nenhum secret em código-fonte

---

## Code Review — Bloqueantes

* Violação de arquitetura (camadas misturadas, `process.env` fora de `env.config.ts`)
* Falta de testes ou cobertura incompleta
* Dados sensíveis em logs ou código
* Bug óbvio ou comportamento incorreto
* Violação de naming convention
