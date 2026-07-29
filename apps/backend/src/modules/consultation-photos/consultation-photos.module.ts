import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { IStorageAdapter } from '../../common/adapters/storage.adapter.interface'
import { StorageAdapter } from '../../common/adapters/storage.adapter'
import { LocalStorageAdapter } from '../../common/adapters/local-storage.adapter'
import { AppointmentsModule } from '../appointments/appointments.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { ConsultationPhoto } from './entities/consultation-photo.entity'
import { IConsultationPhotosRepository } from './repositories/consultation-photos.repository.interface'
import { ConsultationPhotosRepository } from './repositories/consultation-photos.repository'
import { ConsultationPhotosController } from './controllers/consultation-photos.controller'
import { UploadConsultationPhotosUseCase } from './use-cases/upload-consultation-photos.use-case'
import { FindConsultationPhotosByAppointmentUseCase } from './use-cases/find-consultation-photos-by-appointment.use-case'
import { FindConsultationPhotosByPatientUseCase } from './use-cases/find-consultation-photos-by-patient.use-case'
import { DownloadConsultationPhotoFileUseCase } from './use-cases/download-consultation-photo-file.use-case'
import { DeleteConsultationPhotoUseCase } from './use-cases/delete-consultation-photo.use-case'

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsultationPhoto]),
    CacheModule,
    AppointmentsModule,
    ProfessionalsModule,
  ],
  controllers: [ConsultationPhotosController],
  providers: [
    UploadConsultationPhotosUseCase,
    FindConsultationPhotosByAppointmentUseCase,
    FindConsultationPhotosByPatientUseCase,
    DownloadConsultationPhotoFileUseCase,
    DeleteConsultationPhotoUseCase,
    { provide: IConsultationPhotosRepository, useClass: ConsultationPhotosRepository },
    {
      provide: IStorageAdapter,
      useFactory: () =>
        process.env.AWS_S3_BUCKET && process.env.AWS_REGION
          ? new StorageAdapter()
          : new LocalStorageAdapter(),
    },
  ],
  exports: [FindConsultationPhotosByAppointmentUseCase, IConsultationPhotosRepository],
})
export class ConsultationPhotosModule {}
