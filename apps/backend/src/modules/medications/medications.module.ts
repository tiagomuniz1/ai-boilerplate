import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { Medication } from './entities/medication.entity'
import { MedicationsController } from './controllers/medications.controller'
import { FindMedicationsUseCase } from './use-cases/find-medications.use-case'
import { GetMedicationUseCase } from './use-cases/get-medication.use-case'
import { CreateMedicationUseCase } from './use-cases/create-medication.use-case'
import { UpdateMedicationUseCase } from './use-cases/update-medication.use-case'
import { DeleteMedicationUseCase } from './use-cases/delete-medication.use-case'
import { IMedicationsRepository } from './repositories/medications.repository.interface'
import { MedicationsRepository } from './repositories/medications.repository'

@Module({
  imports: [TypeOrmModule.forFeature([Medication]), CacheModule],
  controllers: [MedicationsController],
  providers: [
    FindMedicationsUseCase,
    GetMedicationUseCase,
    CreateMedicationUseCase,
    UpdateMedicationUseCase,
    DeleteMedicationUseCase,
    { provide: IMedicationsRepository, useClass: MedicationsRepository },
  ],
  exports: [IMedicationsRepository],
})
export class MedicationsModule {}
