# Exemplos de Código — Módulo Completo

Referência de implementação usando o domínio `users`. Todos os arquivos seguem a arquitetura, naming convention e padrões definidos no projeto.

---

# BACKEND

## DTOs (packages/shared)

```ts
// packages/shared/src/dtos/create-user.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator'

export class CreateUserDto {
  @IsString()
  fullName: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string
}
```

```ts
// packages/shared/src/dtos/user-response.dto.ts
export class UserResponseDto {
  id: string
  fullName: string
  email: string
  createdAt: Date
}
```

---

## Entity

```ts
// apps/backend/src/modules/users/entities/user.entity.ts
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'full_name' })
  fullName: string

  @Column({ unique: true })
  email: string

  @Column()
  password: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
```

---

## Repository interface

```ts
// apps/backend/src/modules/users/repositories/users.repository.interface.ts
import { QueryRunner } from 'typeorm'
import { CreateUserDto } from '@app/shared'
import { User } from '../entities/user.entity'

export abstract class IUsersRepository {
  abstract findAll(page: number, limit: number): Promise<[User[], number]>
  abstract findById(id: string): Promise<User | null>
  abstract findByEmail(email: string): Promise<User | null>
  abstract create(data: CreateUserDto, queryRunner?: QueryRunner): Promise<User>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
```

---

## Repository implementação

```ts
// apps/backend/src/modules/users/repositories/users.repository.ts
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { CreateUserDto } from '@app/shared'
import { User } from '../entities/user.entity'
import { IUsersRepository } from './users.repository.interface'

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findAll(page: number, limit: number): Promise<[User[], number]> {
    return this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOneBy({ id })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email })
  }

  async create(data: CreateUserDto, queryRunner?: QueryRunner): Promise<User> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(User)
      : this.repository
    return repo.save(repo.create(data))
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(User)
      : this.repository
    await repo.softDelete(id)
  }
}
```

---

## Use-case simples (sem transação)

```ts
// apps/backend/src/modules/users/use-cases/create-user.use-case.ts
import { ConflictException, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateUserDto, UserResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { PasswordHasherService } from '../services/password-hasher.service'

@Injectable()
export class CreateUserUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    private readonly passwordHasherService: PasswordHasherService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findByEmail(dto.email)
    if (existing) throw new ConflictException('Email already in use')

    const password = await this.passwordHasherService.hash(dto.password)
    const user = await this.usersRepository.create({ ...dto, password })

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
    }
  }
}
```

---

## Use-case com transação

```ts
// apps/backend/src/modules/users/use-cases/delete-user.use-case.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { IAuditRepository } from '../../audit/repositories/audit.repository.interface'

@Injectable()
export class DeleteUserUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    private readonly auditRepository: IAuditRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<void> {
    const user = await this.usersRepository.findById(id)
    if (!user) throw new NotFoundException('User not found')

    await this.runInTransaction(async (queryRunner) => {
      await this.usersRepository.delete(id, queryRunner)
      await this.auditRepository.create({ action: 'user.deleted', targetId: id }, queryRunner)
    })
  }
}
```

---

## Controller

```ts
// apps/backend/src/modules/users/controllers/users.controller.ts
import { Body, Controller, Delete, HttpCode, Param, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CreateUserDto, UserResponseDto } from '@app/shared'
import { CreateUserUseCase } from '../use-cases/create-user.use-case'
import { DeleteUserUseCase } from '../use-cases/delete-user.use-case'

@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.createUserUseCase.execute(dto)
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string): Promise<void> {
    return this.deleteUserUseCase.execute(id)
  }
}
```

---

## Module

```ts
// apps/backend/src/modules/users/users.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './entities/user.entity'
import { UsersController } from './controllers/users.controller'
import { CreateUserUseCase } from './use-cases/create-user.use-case'
import { DeleteUserUseCase } from './use-cases/delete-user.use-case'
import { IUsersRepository } from './repositories/users.repository.interface'
import { UsersRepository } from './repositories/users.repository'
import { PasswordHasherService } from './services/password-hasher.service'

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    CreateUserUseCase,
    DeleteUserUseCase,
    PasswordHasherService,
    { provide: IUsersRepository, useClass: UsersRepository },
  ],
})
export class UsersModule {}
```

---

## Teste unitário

```ts
// apps/backend/src/modules/users/tests/create-user.use-case.spec.ts
import { ConflictException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CreateUserUseCase } from '../use-cases/create-user.use-case'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { PasswordHasherService } from '../services/password-hasher.service'

const mockUsersRepository: jest.Mocked<IUsersRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}

const mockPasswordHasherService = {
  hash: jest.fn(),
  compare: jest.fn(),
} as jest.Mocked<PasswordHasherService>

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateUserUseCase(
      {} as DataSource,
      mockUsersRepository,
      mockPasswordHasherService,
    )
  })

  it('creates user and returns response', async () => {
    const dto = {
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 }),
    }
    const hashedPassword = 'hashed_password'
    const createdUser = {
      id: faker.string.uuid(),
      fullName: dto.fullName,
      email: dto.email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }

    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockPasswordHasherService.hash.mockResolvedValue(hashedPassword)
    mockUsersRepository.create.mockResolvedValue(createdUser)

    const result = await useCase.execute(dto)

    expect(result.id).toBe(createdUser.id)
    expect(result.email).toBe(dto.email)
    expect(result).not.toHaveProperty('password')
    expect(mockUsersRepository.create).toHaveBeenCalledWith({ ...dto, password: hashedPassword })
  })

  it('throws ConflictException when email already in use', async () => {
    mockUsersRepository.findByEmail.mockResolvedValue({ id: faker.string.uuid() } as any)

    await expect(
      useCase.execute({
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password({ length: 10 }),
      }),
    ).rejects.toThrow(ConflictException)

    expect(mockUsersRepository.create).not.toHaveBeenCalled()
  })
})
```

---

## Teste de integração

> Requer `supertest` em devDependencies: `yarn workspace @app/backend add -D supertest @types/supertest`

```ts
// apps/backend/src/modules/users/tests/users.integration.spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { AppModule } from '../../../app.module'
import { User } from '../entities/user.entity'

describe('UsersController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    await app.init()

    userRepository = module.get(getRepositoryToken(User))
  })

  afterEach(async () => {
    await userRepository.query('DELETE FROM test.users')
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /users → 201 with created user', async () => {
    const payload = {
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 }),
    }

    const { body } = await request(app.getHttpServer()).post('/users').send(payload).expect(201)

    expect(body.id).toBeDefined()
    expect(body.email).toBe(payload.email)
    expect(body.password).toBeUndefined()
  })

  it('POST /users → 409 when email already in use', async () => {
    const payload = {
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 }),
    }

    await request(app.getHttpServer()).post('/users').send(payload).expect(201)
    await request(app.getHttpServer()).post('/users').send(payload).expect(409)
  })

  it('POST /users → 400 when unknown field is sent', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ fullName: faker.person.fullName(), email: faker.internet.email(), password: 'password123', role: 'admin' })
      .expect(400)
  })

  it('DELETE /users/:id → 204 on success', async () => {
    const { body: created } = await request(app.getHttpServer())
      .post('/users')
      .send({ fullName: faker.person.fullName(), email: faker.internet.email(), password: faker.internet.password({ length: 10 }) })
      .expect(201)

    await request(app.getHttpServer()).delete(`/users/${created.id}`).expect(204)

    const user = await userRepository.findOneBy({ id: created.id })
    expect(user).toBeNull()
  })
})
```

---

---

# FRONTEND

## Types (locais da feature)

```ts
// apps/frontend/components/features/users/types/user.types.ts
export interface IUserModel {
  id: string
  fullName: string
  email: string
  createdAt: Date
}

export interface ICreateUserInput {
  fullName: string
  email: string
  password: string
}
```

---

## Service

```ts
// apps/frontend/components/features/users/services/users.service.ts
import { apiClient } from '@/lib/api-client'
import { UserResponseDto, CreateUserDto } from '@app/shared'

export const usersService = {
  getAll: () => apiClient.get<UserResponseDto[]>('/users'),
  getById: (id: string) => apiClient.get<UserResponseDto>(`/users/${id}`),
  create: (data: CreateUserDto) => apiClient.post<UserResponseDto>('/users', data),
  remove: (id: string) => apiClient.delete<void>(`/users/${id}`),
}
```

---

## Mapper

```ts
// apps/frontend/components/features/users/mappers/user.mapper.ts
import { UserResponseDto } from '@app/shared'
import { IUserModel } from '../types/user.types'

export function toUserModel(dto: UserResponseDto): IUserModel {
  return {
    id: dto.id,
    fullName: dto.fullName,
    email: dto.email,
    createdAt: new Date(dto.createdAt),
  }
}
```

---

## Use-cases

```ts
// apps/frontend/components/features/users/use-cases/get-users.use-case.ts
import { IUserModel } from '../types/user.types'
import { usersService } from '../services/users.service'
import { toUserModel } from '../mappers/user.mapper'

export async function getUsersUseCase(): Promise<IUserModel[]> {
  const dtos = await usersService.getAll()
  return dtos.map(toUserModel)
}
```

```ts
// apps/frontend/components/features/users/use-cases/create-user.use-case.ts
import { ICreateUserInput, IUserModel } from '../types/user.types'
import { usersService } from '../services/users.service'
import { toUserModel } from '../mappers/user.mapper'

export async function createUserUseCase(data: ICreateUserInput): Promise<IUserModel> {
  const dto = await usersService.create(data)
  return toUserModel(dto)
}
```

---

## Hooks

```ts
// apps/frontend/components/features/users/hooks/use-users.hook.ts
import { useQuery } from '@tanstack/react-query'
import { getUsersUseCase } from '../use-cases/get-users.use-case'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: getUsersUseCase,
  })
}
```

```ts
// apps/frontend/components/features/users/hooks/use-create-user.hook.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createUserUseCase } from '../use-cases/create-user.use-case'

export function useCreateUser() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: createUserUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.push('/users')
    },
  })
}
```

---

## Componente com estados loading / error / success

```tsx
// apps/frontend/components/features/users/components/UserList.tsx
import { useUsers } from '../hooks/use-users.hook'
import { UserCard } from './UserCard'

export function UserList() {
  const { data: users, isLoading, isError } = useUsers()

  if (isLoading) return <div data-testid="users-loading">Carregando...</div>
  if (isError) return <div data-testid="users-error">Erro ao carregar usuários.</div>

  return (
    <ul data-testid="users-list">
      {users?.map((user) => (
        <li key={user.id}>
          <UserCard user={user} />
        </li>
      ))}
    </ul>
  )
}
```

---

## Formulário (react-hook-form + zod)

```tsx
// apps/frontend/components/features/users/components/CreateUserForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { IApiError } from '@/types/api.types'
import { useCreateUser } from '../hooks/use-create-user.hook'

const schema = z.object({
  fullName: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function CreateUserForm() {
  const { mutate, isPending } = useCreateUser()
  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function onSubmit(data: FormValues) {
    mutate(data, {
      onError: (error) => {
        const apiError = error as IApiError
        apiError.errors?.forEach(({ field, message }) => {
          setError(field as keyof FormValues, { message })
        })
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} data-testid="create-user-form">
      <div>
        <label htmlFor="fullName">Nome</label>
        <input id="fullName" {...register('fullName')} />
        {errors.fullName && <span>{errors.fullName.message}</span>}
      </div>
      <div>
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" {...register('email')} />
        {errors.email && <span>{errors.email.message}</span>}
      </div>
      <div>
        <label htmlFor="password">Senha</label>
        <input id="password" type="password" {...register('password')} />
        {errors.password && <span>{errors.password.message}</span>}
      </div>
      <button type="submit" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Criar usuário'}
      </button>
    </form>
  )
}
```

---

## Teste de integração

```tsx
// apps/frontend/components/features/users/components/UserList.integration.tsx
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { UserList } from './UserList'
import { usersService } from '../services/users.service'

jest.mock('../services/users.service')

const mockUsersService = usersService as jest.Mocked<typeof usersService>

describe('UserList', () => {
  it('renders loading state initially', () => {
    mockUsersService.getAll.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<UserList />)
    expect(screen.getByTestId('users-loading')).toBeInTheDocument()
  })

  it('renders list of users on success', async () => {
    mockUsersService.getAll.mockResolvedValue([
      { id: '1', fullName: 'Ana Costa', email: 'ana@example.com', createdAt: new Date('2024-01-01') },
    ])

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('users-list')).toBeInTheDocument()
    })

    expect(screen.getAllByTestId('user-card')).toHaveLength(1)
    expect(screen.getByText('Ana Costa')).toBeInTheDocument()
  })

  it('renders error state on failure', async () => {
    mockUsersService.getAll.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<UserList />)
    await waitFor(() => {
      expect(screen.getByTestId('users-error')).toBeInTheDocument()
    })
  })
})
```
