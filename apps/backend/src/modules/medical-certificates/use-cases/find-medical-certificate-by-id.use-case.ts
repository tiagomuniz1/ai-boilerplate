import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalCertificateResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IMedicalCertificatesRepository } from '../repositories/medical-certificates.repository.interface'
import { toMedicalCertificateResponse } from './create-medical-certificate.use-case'

@Injectable()
export class FindMedicalCertificateByIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly medicalCertificatesRepository: IMedicalCertificatesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<MedicalCertificateResponseDto> {
    const clinicId = currentUser.clinicId!

    const certificate = await this.medicalCertificatesRepository.findById(id, clinicId)
    if (!certificate) throw new NotFoundException('Medical certificate not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== certificate.doctorId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    return toMedicalCertificateResponse(certificate)
  }
}
