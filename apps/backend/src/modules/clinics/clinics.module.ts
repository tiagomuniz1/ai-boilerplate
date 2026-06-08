import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { UsersModule } from '../users/users.module'
import { Clinic } from './entities/clinic.entity'
import { ClinicsController } from './controllers/clinics.controller'
import { CreateClinicUseCase } from './use-cases/create-clinic.use-case'
import { FindAllClinicsUseCase } from './use-cases/find-all-clinics.use-case'
import { FindClinicByIdUseCase } from './use-cases/find-clinic-by-id.use-case'
import { RegisterClinicUseCase } from './use-cases/register-clinic.use-case'
import { UpdateClinicUseCase } from './use-cases/update-clinic.use-case'
import { IClinicsRepository } from './repositories/clinics.repository.interface'
import { ClinicsRepository } from './repositories/clinics.repository'

@Module({
  imports: [TypeOrmModule.forFeature([Clinic]), CacheModule, UsersModule],
  controllers: [ClinicsController],
  providers: [
    CreateClinicUseCase,
    FindAllClinicsUseCase,
    FindClinicByIdUseCase,
    RegisterClinicUseCase,
    UpdateClinicUseCase,
    { provide: IClinicsRepository, useClass: ClinicsRepository },
  ],
})
export class ClinicsModule {}
