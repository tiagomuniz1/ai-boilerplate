import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { PatientsModule } from '../patients/patients.module'
import { User } from './entities/user.entity'
import { INotificationAdapter } from './adapters/notification.adapter.interface'
import { NotificationAdapter } from './adapters/notification.adapter'
import { UsersController } from './controllers/users.controller'
import { ActivateUserUseCase } from './use-cases/activate-user.use-case'
import { CreateUserUseCase } from './use-cases/create-user.use-case'
import { FindAllUsersUseCase } from './use-cases/find-all-users.use-case'
import { FindUserByIdUseCase } from './use-cases/find-user-by-id.use-case'
import { UpdateUserUseCase } from './use-cases/update-user.use-case'
import { DeleteUserUseCase } from './use-cases/delete-user.use-case'
import { IUsersRepository } from './repositories/users.repository.interface'
import { UsersRepository } from './repositories/users.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    CacheModule,
    forwardRef(() => ProfessionalsModule),
    forwardRef(() => PatientsModule),
  ],
  controllers: [UsersController],
  providers: [
    ActivateUserUseCase,
    CreateUserUseCase,
    FindAllUsersUseCase,
    FindUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    { provide: IUsersRepository, useClass: UsersRepository },
    { provide: INotificationAdapter, useClass: NotificationAdapter },
  ],
  exports: [IUsersRepository],
})
export class UsersModule {}
