import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalRecordResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { toMedicalRecordResponse } from './create-medical-record.use-case'

@Injectable()
export class FindMedicalRecordByIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly medicalRecordsRepository: IMedicalRecordsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<MedicalRecordResponseDto> {
    const clinicId = currentUser.clinicId!

    const record = await this.medicalRecordsRepository.findById(id, clinicId)
    if (!record) throw new NotFoundException('Medical record not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || professional.id !== record.professionalId) {
        throw new NotFoundException('Medical record not found')
      }
    }

    return toMedicalRecordResponse(record)
  }
}
