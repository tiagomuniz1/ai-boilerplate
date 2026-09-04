import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { VaccinesController } from './controllers/vaccines.controller'
import { Vaccine } from './entities/vaccine.entity'
import { IVaccinesRepository } from './repositories/vaccines.repository.interface'
import { VaccinesRepository } from './repositories/vaccines.repository'
import { CreateVaccineUseCase } from './use-cases/create-vaccine.use-case'
import { DeleteVaccineUseCase } from './use-cases/delete-vaccine.use-case'
import { FindVaccinesUseCase } from './use-cases/find-vaccines.use-case'
import { GetVaccineUseCase } from './use-cases/get-vaccine.use-case'
import { UpdateVaccineUseCase } from './use-cases/update-vaccine.use-case'

@Module({
  imports: [TypeOrmModule.forFeature([Vaccine]), CacheModule],
  controllers: [VaccinesController],
  providers: [
    FindVaccinesUseCase,
    GetVaccineUseCase,
    CreateVaccineUseCase,
    UpdateVaccineUseCase,
    DeleteVaccineUseCase,
    { provide: IVaccinesRepository, useClass: VaccinesRepository },
  ],
  // O registro de vacinação valida o `vaccineId` contra este catálogo, como
  // prescrições fazem com medicamentos.
  exports: [IVaccinesRepository],
})
export class VaccinesModule {}
