import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole, VaccineIndicationResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IVaccineIndicationsRepository } from '../repositories/vaccine-indications.repository.interface'
import { toVaccineIndicationResponse } from './create-vaccine-indication.use-case'

@Injectable()
export class FindVaccineIndicationByIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly vaccineIndicationsRepository: IVaccineIndicationsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<VaccineIndicationResponseDto> {
    const clinicId = currentUser.clinicId!

    const indication = await this.vaccineIndicationsRepository.findById(id, clinicId)
    if (!indication) throw new NotFoundException('Vaccine indication not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || professional.id !== indication.professionalId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    return toVaccineIndicationResponse(indication)
  }
}
