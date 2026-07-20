import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PrescriptionResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { toPrescriptionResponse } from './create-prescription.use-case'

@Injectable()
export class FindPrescriptionByIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly prescriptionsRepository: IPrescriptionsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<PrescriptionResponseDto> {
    const clinicId = currentUser.clinicId!

    const prescription = await this.prescriptionsRepository.findById(id, clinicId)
    if (!prescription) throw new NotFoundException('Prescription not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== prescription.doctorId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    return toPrescriptionResponse(prescription)
  }
}
