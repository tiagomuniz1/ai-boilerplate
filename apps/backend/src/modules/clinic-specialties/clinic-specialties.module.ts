import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { ClinicsModule } from '../clinics/clinics.module'
import { SpecialtiesModule } from '../specialties/specialties.module'
import { ClinicSpecialty } from './entities/clinic-specialty.entity'
import { ClinicSpecialtiesController } from './controllers/clinic-specialties.controller'
import { LinkSpecialtyToClinicUseCase } from './use-cases/link-specialty-to-clinic.use-case'
import { UnlinkSpecialtyFromClinicUseCase } from './use-cases/unlink-specialty-from-clinic.use-case'
import { FindClinicSpecialtiesUseCase } from './use-cases/find-clinic-specialties.use-case'
import { IClinicSpecialtiesRepository } from './repositories/clinic-specialties.repository.interface'
import { ClinicSpecialtiesRepository } from './repositories/clinic-specialties.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicSpecialty]),
    CacheModule,
    ClinicsModule,
    SpecialtiesModule,
  ],
  controllers: [ClinicSpecialtiesController],
  providers: [
    LinkSpecialtyToClinicUseCase,
    UnlinkSpecialtyFromClinicUseCase,
    FindClinicSpecialtiesUseCase,
    { provide: IClinicSpecialtiesRepository, useClass: ClinicSpecialtiesRepository },
  ],
})
export class ClinicSpecialtiesModule {}
