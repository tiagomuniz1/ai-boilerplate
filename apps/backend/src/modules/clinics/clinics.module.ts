import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { IStorageAdapter } from '../../common/adapters/storage.adapter.interface'
import { StorageAdapter } from '../../common/adapters/storage.adapter'
import { LocalStorageAdapter } from '../../common/adapters/local-storage.adapter'
import { ClinicAssetUrlService } from '../../common/services/clinic-asset-url.service'
import { UsersModule } from '../users/users.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { Clinic } from './entities/clinic.entity'
import { ClinicsController } from './controllers/clinics.controller'
import { ClinicResponseMapper } from './mappers/clinic-response.mapper'
import { CreateClinicUseCase } from './use-cases/create-clinic.use-case'
import { FindAllClinicsUseCase } from './use-cases/find-all-clinics.use-case'
import { FindClinicByIdUseCase } from './use-cases/find-clinic-by-id.use-case'
import { FindClinicBySlugUseCase } from './use-cases/find-clinic-by-slug.use-case'
import { UpdateClinicUseCase } from './use-cases/update-clinic.use-case'
import { UploadClinicLogoUseCase } from './use-cases/upload-clinic-logo.use-case'
import { UploadClinicLogoDarkUseCase } from './use-cases/upload-clinic-logo-dark.use-case'
import { UploadClinicFaviconUseCase } from './use-cases/upload-clinic-favicon.use-case'
import { StreamClinicAssetUseCase } from './use-cases/stream-clinic-asset.use-case'
import { IClinicsRepository } from './repositories/clinics.repository.interface'
import { ClinicsRepository } from './repositories/clinics.repository'

@Module({
  // Circular by business rule: plan-cap enforcement needs the professional count
  // (update-clinic, find-by-id) while create-professional needs the clinic's plan.
  imports: [TypeOrmModule.forFeature([Clinic]), CacheModule, UsersModule, forwardRef(() => ProfessionalsModule)],
  controllers: [ClinicsController],
  providers: [
    CreateClinicUseCase,
    FindAllClinicsUseCase,
    FindClinicByIdUseCase,
    FindClinicBySlugUseCase,
    UpdateClinicUseCase,
    UploadClinicLogoUseCase,
    UploadClinicLogoDarkUseCase,
    UploadClinicFaviconUseCase,
    StreamClinicAssetUseCase,
    ClinicResponseMapper,
    ClinicAssetUrlService,
    { provide: IClinicsRepository, useClass: ClinicsRepository },
    {
      provide: IStorageAdapter,
      useFactory: () =>
        process.env.AWS_S3_BUCKET && process.env.AWS_REGION
          ? new StorageAdapter()
          : new LocalStorageAdapter(),
    },
  ],
  exports: [FindClinicByIdUseCase, FindClinicBySlugUseCase, IClinicsRepository],
})
export class ClinicsModule {}
