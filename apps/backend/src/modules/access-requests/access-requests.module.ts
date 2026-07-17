import { Module } from '@nestjs/common'
import { AccessRequestsController } from './controllers/access-requests.controller'
import { CreateAccessRequestUseCase } from './use-cases/create-access-request.use-case'
import { IAccessRequestEmailAdapter } from './adapters/access-request-email.adapter.interface'
import { AccessRequestEmailAdapter } from './adapters/access-request-email.adapter'

@Module({
  controllers: [AccessRequestsController],
  providers: [
    CreateAccessRequestUseCase,
    { provide: IAccessRequestEmailAdapter, useClass: AccessRequestEmailAdapter },
  ],
})
export class AccessRequestsModule {}
