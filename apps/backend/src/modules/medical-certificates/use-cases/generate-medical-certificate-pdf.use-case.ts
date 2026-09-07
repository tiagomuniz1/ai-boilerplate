import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IMedicalCertificatesRepository } from '../repositories/medical-certificates.repository.interface'
import { FindMedicalCertificateByIdUseCase } from './find-medical-certificate-by-id.use-case'
import { LogoFetcherService } from '../../../common/services/logo-fetcher.service'
import { MedicalCertificatePdfBuilderService } from '../services/medical-certificate-pdf-builder.service'

@Injectable()
export class GenerateMedicalCertificatePdfUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly findMedicalCertificateByIdUseCase: FindMedicalCertificateByIdUseCase,
    private readonly medicalCertificatesRepository: IMedicalCertificatesRepository,
    private readonly logoFetcherService: LogoFetcherService,
    private readonly medicalCertificatePdfBuilderService: MedicalCertificatePdfBuilderService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<Buffer> {
    await this.findMedicalCertificateByIdUseCase.execute(id, currentUser)

    const certificate = await this.medicalCertificatesRepository.findById(id, currentUser.clinicId!)
    const { snapshot } = certificate!

    const logoBase64 = snapshot.clinic.logoUrl
      ? await this.logoFetcherService.fetchAsBase64(snapshot.clinic.logoUrl)
      : null

    return this.medicalCertificatePdfBuilderService.build(snapshot, logoBase64)
  }
}
