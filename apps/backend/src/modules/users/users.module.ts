import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './entities/user.entity'
import { IUsersRepository } from './repositories/users.repository.interface'
import { UsersRepository } from './repositories/users.repository'

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    { provide: IUsersRepository, useClass: UsersRepository },
  ],
  exports: [IUsersRepository],
})
export class UsersModule {}
