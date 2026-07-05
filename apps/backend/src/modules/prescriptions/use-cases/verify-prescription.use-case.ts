import { Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { VerifyPrescriptionResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { maskCpf, maskName } from '../services/prescription-mask.util'

@Injectable()
export class VerifyPrescriptionUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly prescriptionsRepository: IPrescriptionsRepository,
  ) {
    super(dataSource)
  }

  async execute(token: string): Promise<VerifyPrescriptionResponseDto> {
    const prescription = await this.prescriptionsRepository.findByVerificationToken(token)
    if (!prescription) throw new NotFoundException('Prescription not found')

    const { snapshot } = prescription

    return {
      clinicName: snapshot.clinic.name,
      doctorName: snapshot.doctor.name,
      doctorCrmNumber: snapshot.doctor.crmNumber,
      specialtyName: snapshot.doctor.specialtyName,
      patientNameMasked: maskName(snapshot.patient.name),
      patientDocumentMasked: maskCpf(snapshot.patient.documentNumber),
      issuedAt: snapshot.issuedAt,
      items: snapshot.items.map((item) => ({
        name: item.name,
        activeIngredient: item.activeIngredient,
        dosage: item.dosage ?? null,
        quantity: item.quantity ?? null,
      })),
    }
  }
}
