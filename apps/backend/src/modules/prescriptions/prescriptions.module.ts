import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { AppointmentsModule } from '../appointments/appointments.module'
import { DoctorsModule } from '../doctors/doctors.module'
import { PatientsModule } from '../patients/patients.module'
import { ClinicsModule } from '../clinics/clinics.module'
import { MedicationsModule } from '../medications/medications.module'
import { Prescription } from './entities/prescription.entity'
import { PrescriptionsController } from './controllers/prescriptions.controller'
import { CreatePrescriptionUseCase } from './use-cases/create-prescription.use-case'
import { FindPrescriptionsByAppointmentUseCase } from './use-cases/find-prescriptions-by-appointment.use-case'
import { FindPrescriptionByIdUseCase } from './use-cases/find-prescription-by-id.use-case'
import { DeletePrescriptionUseCase } from './use-cases/delete-prescription.use-case'
import { GeneratePrescriptionPdfUseCase } from './use-cases/generate-prescription-pdf.use-case'
import { VerifyPrescriptionUseCase } from './use-cases/verify-prescription.use-case'
import { IPrescriptionsRepository } from './repositories/prescriptions.repository.interface'
import { PrescriptionsRepository } from './repositories/prescriptions.repository'
import { LogoFetcherService } from './services/logo-fetcher.service'
import { PrescriptionPdfBuilderService } from './services/prescription-pdf-builder.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Prescription]),
    CacheModule,
    AppointmentsModule,
    DoctorsModule,
    PatientsModule,
    ClinicsModule,
    MedicationsModule,
  ],
  controllers: [PrescriptionsController],
  providers: [
    CreatePrescriptionUseCase,
    FindPrescriptionsByAppointmentUseCase,
    FindPrescriptionByIdUseCase,
    DeletePrescriptionUseCase,
    GeneratePrescriptionPdfUseCase,
    VerifyPrescriptionUseCase,
    LogoFetcherService,
    PrescriptionPdfBuilderService,
    { provide: IPrescriptionsRepository, useClass: PrescriptionsRepository },
  ],
  exports: [FindPrescriptionByIdUseCase],
})
export class PrescriptionsModule {}
