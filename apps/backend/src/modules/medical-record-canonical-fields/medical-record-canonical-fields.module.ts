import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { SpecialtiesModule } from '../specialties/specialties.module'
import { MedicalRecordCanonicalField } from './entities/medical-record-canonical-field.entity'
import { MedicalRecordCanonicalFieldsController } from './controllers/medical-record-canonical-fields.controller'
import { FindCanonicalFieldsUseCase } from './use-cases/find-canonical-fields.use-case'
import { CreateCanonicalFieldUseCase } from './use-cases/create-canonical-field.use-case'
import { UpdateCanonicalFieldUseCase } from './use-cases/update-canonical-field.use-case'
import { IMedicalRecordCanonicalFieldsRepository } from './repositories/medical-record-canonical-fields.repository.interface'
import { MedicalRecordCanonicalFieldsRepository } from './repositories/medical-record-canonical-fields.repository'

@Module({
  imports: [TypeOrmModule.forFeature([MedicalRecordCanonicalField]), CacheModule, SpecialtiesModule],
  controllers: [MedicalRecordCanonicalFieldsController],
  providers: [
    FindCanonicalFieldsUseCase,
    CreateCanonicalFieldUseCase,
    UpdateCanonicalFieldUseCase,
    {
      provide: IMedicalRecordCanonicalFieldsRepository,
      useClass: MedicalRecordCanonicalFieldsRepository,
    },
  ],
  exports: [IMedicalRecordCanonicalFieldsRepository, FindCanonicalFieldsUseCase],
})
export class MedicalRecordCanonicalFieldsModule {}
