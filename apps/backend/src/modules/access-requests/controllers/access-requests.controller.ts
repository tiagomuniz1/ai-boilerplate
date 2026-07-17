import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CreateAccessRequestDto } from '@app/shared'
import { Public } from '../../auth/decorators/public.decorator'
import { CreateAccessRequestUseCase } from '../use-cases/create-access-request.use-case'

@Controller('access-requests')
export class AccessRequestsController {
  constructor(private readonly createAccessRequestUseCase: CreateAccessRequestUseCase) {}

  @Post()
  @Public()
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(@Body() dto: CreateAccessRequestDto): Promise<void> {
    return this.createAccessRequestUseCase.execute(dto)
  }
}
