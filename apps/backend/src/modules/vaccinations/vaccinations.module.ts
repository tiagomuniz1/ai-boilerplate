import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { AppointmentsModule } from '../appointments/appointments.module'
import { PatientsModule } from '../patients/patients.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { VaccinesModule } from '../vaccines/vaccines.module'
import { VaccinationsController } from './controllers/vaccinations.controller'
import { Vaccination } from './entities/vaccination.entity'
import { IVaccinationsRepository } from './repositories/vaccinations.repository.interface'
import { VaccinationsRepository } from './repositories/vaccinations.repository'
import { CreateVaccinationUseCase } from './use-cases/create-vaccination.use-case'
import { DeleteVaccinationUseCase } from './use-cases/delete-vaccination.use-case'
import { FindVaccinationsUseCase } from './use-cases/find-vaccinations.use-case'
import { UpdateVaccinationUseCase } from './use-cases/update-vaccination.use-case'

@Module({
  imports: [
    TypeOrmModule.forFeature([Vaccination]),
    CacheModule,
    VaccinesModule,
    PatientsModule,
    ProfessionalsModule,
    AppointmentsModule,
  ],
  controllers: [VaccinationsController],
  providers: [
    FindVaccinationsUseCase,
    CreateVaccinationUseCase,
    UpdateVaccinationUseCase,
    DeleteVaccinationUseCase,
    { provide: IVaccinationsRepository, useClass: VaccinationsRepository },
  ],
})
export class VaccinationsModule {}
