import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { getEnvConfig } from '../../../config/env.config'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
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
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
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

    const clinic = await this.findClinicByIdUseCase.execute(prescription!.clinicId)
    const { FRONTEND_URL } = getEnvConfig()
    const verificationUrl = `${FRONTEND_URL}/${clinic.slug}/verify/prescriptions/${prescription!.verificationToken}`

    return this.prescriptionPdfBuilderService.build(snapshot, logoBase64, verificationUrl)
  }
}
