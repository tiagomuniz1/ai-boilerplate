import { Controller, Get, Query } from '@nestjs/common'
import { DashboardResponseDto, UserRole } from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { DashboardQueryDto } from '../dto/dashboard-query.dto'
import { GetDashboardStatsUseCase } from '../use-cases/get-dashboard-stats.use-case'

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getDashboardStatsUseCase: GetDashboardStatsUseCase) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER)
  getStats(
    @Query() query: DashboardQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<DashboardResponseDto> {
    return this.getDashboardStatsUseCase.execute(query, currentUser)
  }
}
