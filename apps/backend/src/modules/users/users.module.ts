import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { User } from './entities/user.entity'
import { UsersController } from './controllers/users.controller'
import { CreateUserUseCase } from './use-cases/create-user.use-case'
import { FindAllUsersUseCase } from './use-cases/find-all-users.use-case'
import { FindUserByIdUseCase } from './use-cases/find-user-by-id.use-case'
import { UpdateUserUseCase } from './use-cases/update-user.use-case'
import { DeleteUserUseCase } from './use-cases/delete-user.use-case'
import { IUsersRepository } from './repositories/users.repository.interface'
import { UsersRepository } from './repositories/users.repository'

@Module({
  imports: [TypeOrmModule.forFeature([User]), CacheModule],
  controllers: [UsersController],
  providers: [
    CreateUserUseCase,
    FindAllUsersUseCase,
    FindUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    { provide: IUsersRepository, useClass: UsersRepository },
  ],
  exports: [IUsersRepository],
})
export class UsersModule {}
