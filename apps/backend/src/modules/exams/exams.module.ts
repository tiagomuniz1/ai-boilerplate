import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { IStorageAdapter } from '../../common/adapters/storage.adapter.interface'
import { StorageAdapter } from '../../common/adapters/storage.adapter'
import { LocalStorageAdapter } from '../../common/adapters/local-storage.adapter'
import { AppointmentsModule } from '../appointments/appointments.module'
import { DoctorsModule } from '../doctors/doctors.module'
import { PatientsModule } from '../patients/patients.module'
import { ClinicsModule } from '../clinics/clinics.module'
import { ExamRequest } from './entities/exam-request.entity'
import { ExamResult } from './entities/exam-result.entity'
import { ExamRequestsController } from './controllers/exam-requests.controller'
import { ExamResultsController } from './controllers/exam-results.controller'
import { CreateExamRequestUseCase } from './use-cases/create-exam-request.use-case'
import { FindExamRequestsByAppointmentUseCase } from './use-cases/find-exam-requests-by-appointment.use-case'
import { FindExamRequestByIdUseCase } from './use-cases/find-exam-request-by-id.use-case'
import { DeleteExamRequestUseCase } from './use-cases/delete-exam-request.use-case'
import { GenerateExamRequestPdfUseCase } from './use-cases/generate-exam-request-pdf.use-case'
import { AddExamResultUseCase } from './use-cases/add-exam-result.use-case'
import { DeleteExamResultUseCase } from './use-cases/delete-exam-result.use-case'
import { DownloadExamResultFileUseCase } from './use-cases/download-exam-result-file.use-case'
import { IExamRequestsRepository } from './repositories/exam-requests.repository.interface'
import { ExamRequestsRepository } from './repositories/exam-requests.repository'
import { IExamResultsRepository } from './repositories/exam-results.repository.interface'
import { ExamResultsRepository } from './repositories/exam-results.repository'
import { LogoFetcherService } from './services/logo-fetcher.service'
import { ExamRequestPdfBuilderService } from './services/exam-request-pdf-builder.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamRequest, ExamResult]),
    CacheModule,
    AppointmentsModule,
    DoctorsModule,
    PatientsModule,
    ClinicsModule,
  ],
  controllers: [ExamRequestsController, ExamResultsController],
  providers: [
    CreateExamRequestUseCase,
    FindExamRequestsByAppointmentUseCase,
    FindExamRequestByIdUseCase,
    DeleteExamRequestUseCase,
    GenerateExamRequestPdfUseCase,
    AddExamResultUseCase,
    DeleteExamResultUseCase,
    DownloadExamResultFileUseCase,
    LogoFetcherService,
    ExamRequestPdfBuilderService,
    { provide: IExamRequestsRepository, useClass: ExamRequestsRepository },
    { provide: IExamResultsRepository, useClass: ExamResultsRepository },
    {
      provide: IStorageAdapter,
      useFactory: () =>
        process.env.AWS_S3_BUCKET && process.env.AWS_REGION
          ? new StorageAdapter()
          : new LocalStorageAdapter(),
    },
  ],
  exports: [FindExamRequestByIdUseCase],
})
export class ExamsModule {}
