import { ForbiddenException, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PrescriptionTemplateResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPrescriptionTemplatesRepository } from '../repositories/prescription-templates.repository.interface'
import { toPrescriptionTemplateResponse } from './create-prescription-template.use-case'

@Injectable()
export class FindAllPrescriptionTemplatesUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly prescriptionTemplatesRepository: IPrescriptionTemplatesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
  ) {
    super(dataSource)
  }

  async execute(currentUser: ICurrentUser, filterDoctorId?: string): Promise<PrescriptionTemplateResponseDto[]> {
    const clinicId = currentUser.clinicId!

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional) throw new ForbiddenException('Insufficient permissions')
      const templates = await this.prescriptionTemplatesRepository.findAll(clinicId, professional.id)
      return templates.map(toPrescriptionTemplateResponse)
    }

    const templates = await this.prescriptionTemplatesRepository.findAll(clinicId, filterDoctorId)
    return templates.map(toPrescriptionTemplateResponse)
  }
}
