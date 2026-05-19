import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { UsersModule } from '../users/users.module'
import { Patient } from './entities/patient.entity'
import { PatientsController } from './controllers/patients.controller'
import { CreatePatientUseCase } from './use-cases/create-patient.use-case'
import { ListPatientsUseCase } from './use-cases/list-patients.use-case'
import { FindPatientByIdUseCase } from './use-cases/find-patient-by-id.use-case'
import { UpdatePatientUseCase } from './use-cases/update-patient.use-case'
import { DeletePatientUseCase } from './use-cases/delete-patient.use-case'
import { IPatientsRepository } from './repositories/patients.repository.interface'
import { PatientsRepository } from './repositories/patients.repository'

@Module({
  imports: [TypeOrmModule.forFeature([Patient]), CacheModule, UsersModule],
  controllers: [PatientsController],
  providers: [
    CreatePatientUseCase,
    ListPatientsUseCase,
    FindPatientByIdUseCase,
    UpdatePatientUseCase,
    DeletePatientUseCase,
    { provide: IPatientsRepository, useClass: PatientsRepository },
  ],
  exports: [IPatientsRepository],
})
export class PatientsModule {}
