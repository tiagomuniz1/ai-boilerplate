import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { LogoFetcherService } from '../../common/services/logo-fetcher.service'
import { AppointmentsModule } from '../appointments/appointments.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { PatientsModule } from '../patients/patients.module'
import { ClinicsModule } from '../clinics/clinics.module'
import { VaccinesModule } from '../vaccines/vaccines.module'
import { VaccineIndication } from './entities/vaccine-indication.entity'
import { VaccineIndicationsController } from './controllers/vaccine-indications.controller'
import { CreateVaccineIndicationUseCase } from './use-cases/create-vaccine-indication.use-case'
import { FindVaccineIndicationsByAppointmentUseCase } from './use-cases/find-vaccine-indications-by-appointment.use-case'
import { FindVaccineIndicationByIdUseCase } from './use-cases/find-vaccine-indication-by-id.use-case'
import { DeleteVaccineIndicationUseCase } from './use-cases/delete-vaccine-indication.use-case'
import { GenerateVaccineIndicationPdfUseCase } from './use-cases/generate-vaccine-indication-pdf.use-case'
import { IVaccineIndicationsRepository } from './repositories/vaccine-indications.repository.interface'
import { VaccineIndicationsRepository } from './repositories/vaccine-indications.repository'
import { VaccineIndicationPdfBuilderService } from './services/vaccine-indication-pdf-builder.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([VaccineIndication]),
    CacheModule,
    AppointmentsModule,
    ProfessionalsModule,
    PatientsModule,
    ClinicsModule,
    VaccinesModule,
  ],
  controllers: [VaccineIndicationsController],
  providers: [
    CreateVaccineIndicationUseCase,
    FindVaccineIndicationsByAppointmentUseCase,
    FindVaccineIndicationByIdUseCase,
    DeleteVaccineIndicationUseCase,
    GenerateVaccineIndicationPdfUseCase,
    LogoFetcherService,
    VaccineIndicationPdfBuilderService,
    { provide: IVaccineIndicationsRepository, useClass: VaccineIndicationsRepository },
  ],
})
export class VaccineIndicationsModule {}
