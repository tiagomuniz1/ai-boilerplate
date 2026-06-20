import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalRecordResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { toMedicalRecordResponse } from './create-medical-record.use-case'

@Injectable()
export class FindMedicalRecordByIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly medicalRecordsRepository: IMedicalRecordsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<MedicalRecordResponseDto> {
    const clinicId = currentUser.clinicId!

    const record = await this.medicalRecordsRepository.findById(id, clinicId)
    if (!record) throw new NotFoundException('Medical record not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== record.doctorId) {
        throw new NotFoundException('Medical record not found')
      }
    }

    return toMedicalRecordResponse(record)
  }
}
