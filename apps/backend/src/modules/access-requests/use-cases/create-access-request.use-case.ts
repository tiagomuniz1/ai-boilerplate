import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateAccessRequestDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IAccessRequestEmailAdapter } from '../adapters/access-request-email.adapter.interface'

@Injectable()
export class CreateAccessRequestUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly accessRequestEmailAdapter: IAccessRequestEmailAdapter,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateAccessRequestDto): Promise<void> {
    await this.accessRequestEmailAdapter.sendAccessRequestEmail(dto)
  }
}
