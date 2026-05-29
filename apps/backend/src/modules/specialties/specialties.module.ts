import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { Specialty } from './entities/specialty.entity'
import { SpecialtiesController } from './controllers/specialties.controller'
import { CreateSpecialtyUseCase } from './use-cases/create-specialty.use-case'
import { FindAllSpecialtiesUseCase } from './use-cases/find-all-specialties.use-case'
import { FindSpecialtyByIdUseCase } from './use-cases/find-specialty-by-id.use-case'
import { UpdateSpecialtyUseCase } from './use-cases/update-specialty.use-case'
import { DeleteSpecialtyUseCase } from './use-cases/delete-specialty.use-case'
import { ISpecialtiesRepository } from './repositories/specialties.repository.interface'
import { SpecialtiesRepository } from './repositories/specialties.repository'

@Module({
  imports: [TypeOrmModule.forFeature([Specialty]), CacheModule],
  controllers: [SpecialtiesController],
  providers: [
    CreateSpecialtyUseCase,
    FindAllSpecialtiesUseCase,
    FindSpecialtyByIdUseCase,
    UpdateSpecialtyUseCase,
    DeleteSpecialtyUseCase,
    { provide: ISpecialtiesRepository, useClass: SpecialtiesRepository },
  ],
  exports: [ISpecialtiesRepository],
})
export class SpecialtiesModule {}
