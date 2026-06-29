import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { SpecialtiesModule } from '../specialties/specialties.module'
import { SchedulesModule } from '../schedules/schedules.module'
import { Doctor } from './entities/doctor.entity'
import { DoctorsController } from './controllers/doctors.controller'
import { CreateDoctorUseCase } from './use-cases/create-doctor.use-case'
import { FindAllDoctorsUseCase } from './use-cases/find-all-doctors.use-case'
import { FindDoctorByIdUseCase } from './use-cases/find-doctor-by-id.use-case'
import { UpdateDoctorUseCase } from './use-cases/update-doctor.use-case'
import { DeleteDoctorUseCase } from './use-cases/delete-doctor.use-case'
import { IDoctorsRepository } from './repositories/doctors.repository.interface'
import { DoctorsRepository } from './repositories/doctors.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([Doctor]),
    CacheModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => SchedulesModule),
    SpecialtiesModule,
  ],
  controllers: [DoctorsController],
  providers: [
    CreateDoctorUseCase,
    FindAllDoctorsUseCase,
    FindDoctorByIdUseCase,
    UpdateDoctorUseCase,
    DeleteDoctorUseCase,
    { provide: IDoctorsRepository, useClass: DoctorsRepository },
  ],
  exports: [IDoctorsRepository, DeleteDoctorUseCase],
})
export class DoctorsModule {}
