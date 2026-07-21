import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { Appointment } from '../appointments/entities/appointment.entity'
import { MedicalCertificate } from '../medical-certificates/entities/medical-certificate.entity'
import { DashboardController } from './controllers/dashboard.controller'
import { GetDashboardStatsUseCase } from './use-cases/get-dashboard-stats.use-case'
import { IDashboardRepository } from './repositories/dashboard.repository.interface'
import { DashboardRepository } from './repositories/dashboard.repository'

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, MedicalCertificate]), CacheModule, ProfessionalsModule],
  controllers: [DashboardController],
  providers: [
    GetDashboardStatsUseCase,
    { provide: IDashboardRepository, useClass: DashboardRepository },
  ],
})
export class DashboardModule {}
