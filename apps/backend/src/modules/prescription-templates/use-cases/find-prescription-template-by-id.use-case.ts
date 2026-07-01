import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PrescriptionTemplateResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IPrescriptionTemplatesRepository } from '../repositories/prescription-templates.repository.interface'
import { toPrescriptionTemplateResponse } from './create-prescription-template.use-case'

@Injectable()
export class FindPrescriptionTemplateByIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly prescriptionTemplatesRepository: IPrescriptionTemplatesRepository,
    private readonly doctorsRepository: IDoctorsRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<PrescriptionTemplateResponseDto> {
    const clinicId = currentUser.clinicId!

    const template = await this.prescriptionTemplatesRepository.findById(id, clinicId)
    if (!template) throw new NotFoundException('Prescription template not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== template.doctorId) throw new ForbiddenException('Insufficient permissions')
    }

    return toPrescriptionTemplateResponse(template)
  }
}
