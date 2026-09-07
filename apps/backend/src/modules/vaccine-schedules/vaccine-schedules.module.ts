import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { PatientsModule } from '../patients/patients.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { VaccinationsModule } from '../vaccinations/vaccinations.module'
import { VaccinesModule } from '../vaccines/vaccines.module'
import { VaccineSchedulesController } from './controllers/vaccine-schedules.controller'
import { VaccineDecisionRecord } from './entities/vaccine-decision.entity'
import { VaccineScheduleRule } from './entities/vaccine-schedule-rule.entity'
import { IVaccineDecisionsRepository } from './repositories/vaccine-decisions.repository.interface'
import { VaccineDecisionsRepository } from './repositories/vaccine-decisions.repository'
import { IVaccineScheduleRulesRepository } from './repositories/vaccine-schedule-rules.repository.interface'
import { VaccineScheduleRulesRepository } from './repositories/vaccine-schedule-rules.repository'
import { CreateScheduleRuleUseCase } from './use-cases/create-schedule-rule.use-case'
import { DeleteScheduleRuleUseCase } from './use-cases/delete-schedule-rule.use-case'
import { FindScheduleRulesUseCase } from './use-cases/find-schedule-rules.use-case'
import { GetPatientVaccineStatusUseCase } from './use-cases/get-patient-vaccine-status.use-case'
import { RecordVaccineDecisionUseCase } from './use-cases/record-vaccine-decision.use-case'
import { UpdateScheduleRuleUseCase } from './use-cases/update-schedule-rule.use-case'

@Module({
  imports: [
    TypeOrmModule.forFeature([VaccineScheduleRule, VaccineDecisionRecord]),
    CacheModule,
    VaccinesModule,
    VaccinationsModule,
    PatientsModule,
    ProfessionalsModule,
  ],
  controllers: [VaccineSchedulesController],
  providers: [
    FindScheduleRulesUseCase,
    CreateScheduleRuleUseCase,
    UpdateScheduleRuleUseCase,
    DeleteScheduleRuleUseCase,
    GetPatientVaccineStatusUseCase,
    RecordVaccineDecisionUseCase,
    { provide: IVaccineScheduleRulesRepository, useClass: VaccineScheduleRulesRepository },
    { provide: IVaccineDecisionsRepository, useClass: VaccineDecisionsRepository },
  ],
})
export class VaccineSchedulesModule {}
