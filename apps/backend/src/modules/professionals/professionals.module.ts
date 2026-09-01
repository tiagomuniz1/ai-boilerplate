import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { SpecialtiesModule } from '../specialties/specialties.module'
import { SchedulesModule } from '../schedules/schedules.module'
import { ClinicsModule } from '../clinics/clinics.module'
import { AppointmentsModule } from '../appointments/appointments.module'
import { Professional } from './entities/professional.entity'
import { ProfessionalRegistration } from './entities/professional-registration.entity'
import { ProfessionalSpecialty } from './entities/professional-specialty.entity'
import { ProfessionalsController } from './controllers/professionals.controller'
import { CreateProfessionalUseCase } from './use-cases/create-professional.use-case'
import { FindAllProfessionalsUseCase } from './use-cases/find-all-professionals.use-case'
import { FindProfessionalByIdUseCase } from './use-cases/find-professional-by-id.use-case'
import { FindMyProfessionalUseCase } from './use-cases/find-my-professional.use-case'
import { UpdateProfessionalUseCase } from './use-cases/update-professional.use-case'
import { DeleteProfessionalUseCase } from './use-cases/delete-professional.use-case'
import { IProfessionalsRepository } from './repositories/professionals.repository.interface'
import { ProfessionalsRepository } from './repositories/professionals.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([Professional, ProfessionalRegistration, ProfessionalSpecialty]),
    CacheModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => SchedulesModule),
    forwardRef(() => ClinicsModule),
    forwardRef(() => AppointmentsModule),
    SpecialtiesModule,
  ],
  controllers: [ProfessionalsController],
  providers: [
    CreateProfessionalUseCase,
    FindAllProfessionalsUseCase,
    FindProfessionalByIdUseCase,
    FindMyProfessionalUseCase,
    UpdateProfessionalUseCase,
    DeleteProfessionalUseCase,
    { provide: IProfessionalsRepository, useClass: ProfessionalsRepository },
  ],
  exports: [IProfessionalsRepository, DeleteProfessionalUseCase],
})
export class ProfessionalsModule {}
