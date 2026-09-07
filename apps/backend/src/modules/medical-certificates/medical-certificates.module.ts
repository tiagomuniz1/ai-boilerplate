import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { AppointmentsModule } from '../appointments/appointments.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { PatientsModule } from '../patients/patients.module'
import { ClinicsModule } from '../clinics/clinics.module'
import { MedicalCertificate } from './entities/medical-certificate.entity'
import { MedicalCertificatesController } from './controllers/medical-certificates.controller'
import { CreateMedicalCertificateUseCase } from './use-cases/create-medical-certificate.use-case'
import { FindMedicalCertificatesByAppointmentUseCase } from './use-cases/find-medical-certificates-by-appointment.use-case'
import { FindMedicalCertificateByIdUseCase } from './use-cases/find-medical-certificate-by-id.use-case'
import { DeleteMedicalCertificateUseCase } from './use-cases/delete-medical-certificate.use-case'
import { GenerateMedicalCertificatePdfUseCase } from './use-cases/generate-medical-certificate-pdf.use-case'
import { IMedicalCertificatesRepository } from './repositories/medical-certificates.repository.interface'
import { MedicalCertificatesRepository } from './repositories/medical-certificates.repository'
import { LogoFetcherService } from '../../common/services/logo-fetcher.service'
import { MedicalCertificatePdfBuilderService } from './services/medical-certificate-pdf-builder.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalCertificate]),
    CacheModule,
    AppointmentsModule,
    ProfessionalsModule,
    PatientsModule,
    ClinicsModule,
  ],
  controllers: [MedicalCertificatesController],
  providers: [
    CreateMedicalCertificateUseCase,
    FindMedicalCertificatesByAppointmentUseCase,
    FindMedicalCertificateByIdUseCase,
    DeleteMedicalCertificateUseCase,
    GenerateMedicalCertificatePdfUseCase,
    LogoFetcherService,
    MedicalCertificatePdfBuilderService,
    { provide: IMedicalCertificatesRepository, useClass: MedicalCertificatesRepository },
  ],
  exports: [FindMedicalCertificateByIdUseCase],
})
export class MedicalCertificatesModule {}
