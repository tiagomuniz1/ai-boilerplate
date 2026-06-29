import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { FindPrescriptionByIdUseCase } from './find-prescription-by-id.use-case'
import { LogoFetcherService } from '../services/logo-fetcher.service'
import { PrescriptionPdfBuilderService } from '../services/prescription-pdf-builder.service'

@Injectable()
export class GeneratePrescriptionPdfUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly findPrescriptionByIdUseCase: FindPrescriptionByIdUseCase,
    private readonly prescriptionsRepository: IPrescriptionsRepository,
    private readonly logoFetcherService: LogoFetcherService,
    private readonly prescriptionPdfBuilderService: PrescriptionPdfBuilderService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<Buffer> {
    await this.findPrescriptionByIdUseCase.execute(id, currentUser)

    const prescription = await this.prescriptionsRepository.findById(id, currentUser.clinicId!)
    const { snapshot } = prescription!

    const logoBase64 = snapshot.clinic.logoUrl
      ? await this.logoFetcherService.fetchAsBase64(snapshot.clinic.logoUrl)
      : null

    return this.prescriptionPdfBuilderService.build(snapshot, logoBase64)
  }
}
