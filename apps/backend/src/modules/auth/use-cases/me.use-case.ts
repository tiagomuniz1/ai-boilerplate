import { Injectable, UnauthorizedException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { MeResponseDto } from '../dto/me-response.dto'

@Injectable()
export class MeUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
  ) {
    super(dataSource)
  }

  async execute(userId: string): Promise<MeResponseDto> {
    const user = await this.usersRepository.findById(userId)

    if (!user) {
      throw new UnauthorizedException()
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    }
  }
}
