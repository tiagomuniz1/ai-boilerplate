import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { LogoFetcherService } from '../../../common/services/logo-fetcher.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IVaccineIndicationsRepository } from '../repositories/vaccine-indications.repository.interface'
import { FindVaccineIndicationByIdUseCase } from './find-vaccine-indication-by-id.use-case'
import { VaccineIndicationPdfBuilderService } from '../services/vaccine-indication-pdf-builder.service'

@Injectable()
export class GenerateVaccineIndicationPdfUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly findVaccineIndicationByIdUseCase: FindVaccineIndicationByIdUseCase,
    private readonly vaccineIndicationsRepository: IVaccineIndicationsRepository,
    private readonly logoFetcherService: LogoFetcherService,
    private readonly vaccineIndicationPdfBuilderService: VaccineIndicationPdfBuilderService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<Buffer> {
    await this.findVaccineIndicationByIdUseCase.execute(id, currentUser)

    const indication = await this.vaccineIndicationsRepository.findById(id, currentUser.clinicId!)
    const { snapshot } = indication!

    const logoBase64 = snapshot.clinic.logoUrl
      ? await this.logoFetcherService.fetchAsBase64(snapshot.clinic.logoUrl)
      : null

    return this.vaccineIndicationPdfBuilderService.build(snapshot, logoBase64)
  }
}
