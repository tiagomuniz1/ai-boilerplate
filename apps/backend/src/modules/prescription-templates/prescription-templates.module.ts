import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { MedicationsModule } from '../medications/medications.module'
import { PrescriptionTemplate } from './entities/prescription-template.entity'
import { PrescriptionTemplatesController } from './controllers/prescription-templates.controller'
import { CreatePrescriptionTemplateUseCase } from './use-cases/create-prescription-template.use-case'
import { FindAllPrescriptionTemplatesUseCase } from './use-cases/find-all-prescription-templates.use-case'
import { FindPrescriptionTemplateByIdUseCase } from './use-cases/find-prescription-template-by-id.use-case'
import { UpdatePrescriptionTemplateUseCase } from './use-cases/update-prescription-template.use-case'
import { DeletePrescriptionTemplateUseCase } from './use-cases/delete-prescription-template.use-case'
import { IPrescriptionTemplatesRepository } from './repositories/prescription-templates.repository.interface'
import { PrescriptionTemplatesRepository } from './repositories/prescription-templates.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([PrescriptionTemplate]),
    ProfessionalsModule,
    MedicationsModule,
  ],
  controllers: [PrescriptionTemplatesController],
  providers: [
    CreatePrescriptionTemplateUseCase,
    FindAllPrescriptionTemplatesUseCase,
    FindPrescriptionTemplateByIdUseCase,
    UpdatePrescriptionTemplateUseCase,
    DeletePrescriptionTemplateUseCase,
    { provide: IPrescriptionTemplatesRepository, useClass: PrescriptionTemplatesRepository },
  ],
})
export class PrescriptionTemplatesModule {}
