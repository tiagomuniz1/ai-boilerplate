import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AccessRequest } from './entities/access-request.entity'
import { AccessRequestsController } from './controllers/access-requests.controller'
import { CreateAccessRequestUseCase } from './use-cases/create-access-request.use-case'
import { IAccessRequestEmailAdapter } from './adapters/access-request-email.adapter.interface'
import { AccessRequestEmailAdapter } from './adapters/access-request-email.adapter'
import { IAccessRequestsRepository } from './repositories/access-requests.repository.interface'
import { AccessRequestsRepository } from './repositories/access-requests.repository'

@Module({
  imports: [TypeOrmModule.forFeature([AccessRequest])],
  controllers: [AccessRequestsController],
  providers: [
    CreateAccessRequestUseCase,
    { provide: IAccessRequestEmailAdapter, useClass: AccessRequestEmailAdapter },
    { provide: IAccessRequestsRepository, useClass: AccessRequestsRepository },
  ],
})
export class AccessRequestsModule {}
