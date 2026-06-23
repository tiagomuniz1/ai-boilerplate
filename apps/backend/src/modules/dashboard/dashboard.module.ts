import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { DoctorsModule } from '../doctors/doctors.module'
import { Appointment } from '../appointments/entities/appointment.entity'
import { DashboardController } from './controllers/dashboard.controller'
import { GetDashboardStatsUseCase } from './use-cases/get-dashboard-stats.use-case'
import { IDashboardRepository } from './repositories/dashboard.repository.interface'
import { DashboardRepository } from './repositories/dashboard.repository'

@Module({
  imports: [TypeOrmModule.forFeature([Appointment]), CacheModule, DoctorsModule],
  controllers: [DashboardController],
  providers: [
    GetDashboardStatsUseCase,
    { provide: IDashboardRepository, useClass: DashboardRepository },
  ],
})
export class DashboardModule {}
