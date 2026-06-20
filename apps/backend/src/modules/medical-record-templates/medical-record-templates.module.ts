import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { SpecialtiesModule } from '../specialties/specialties.module'
import { ClinicSpecialtiesModule } from '../clinic-specialties/clinic-specialties.module'
import { MedicalRecordCanonicalFieldsModule } from '../medical-record-canonical-fields/medical-record-canonical-fields.module'
import { MedicalRecordTemplate } from './entities/medical-record-template.entity'
import { MedicalRecordTemplatesController } from './controllers/medical-record-templates.controller'
import { CreateMedicalRecordTemplateUseCase } from './use-cases/create-medical-record-template.use-case'
import { UpdateMedicalRecordTemplateUseCase } from './use-cases/update-medical-record-template.use-case'
import { FindAllMedicalRecordTemplatesUseCase } from './use-cases/find-all-medical-record-templates.use-case'
import { FindMedicalRecordTemplateByIdUseCase } from './use-cases/find-medical-record-template-by-id.use-case'
import { FindTemplateByClinicAndSpecialtyUseCase } from './use-cases/find-template-by-clinic-and-specialty.use-case'
import { DeleteMedicalRecordTemplateUseCase } from './use-cases/delete-medical-record-template.use-case'
import { IMedicalRecordTemplatesRepository } from './repositories/medical-record-templates.repository.interface'
import { MedicalRecordTemplatesRepository } from './repositories/medical-record-templates.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalRecordTemplate]),
    CacheModule,
    SpecialtiesModule,
    ClinicSpecialtiesModule,
    MedicalRecordCanonicalFieldsModule,
  ],
  controllers: [MedicalRecordTemplatesController],
  providers: [
    CreateMedicalRecordTemplateUseCase,
    UpdateMedicalRecordTemplateUseCase,
    FindAllMedicalRecordTemplatesUseCase,
    FindMedicalRecordTemplateByIdUseCase,
    FindTemplateByClinicAndSpecialtyUseCase,
    DeleteMedicalRecordTemplateUseCase,
    { provide: IMedicalRecordTemplatesRepository, useClass: MedicalRecordTemplatesRepository },
  ],
  exports: [FindTemplateByClinicAndSpecialtyUseCase],
})
export class MedicalRecordTemplatesModule {}
