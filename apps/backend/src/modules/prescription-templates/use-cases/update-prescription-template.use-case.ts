import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PrescriptionTemplateResponseDto, UpdatePrescriptionTemplateDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IMedicationsRepository } from '../../medications/repositories/medications.repository.interface'
import { IPrescriptionTemplatesRepository } from '../repositories/prescription-templates.repository.interface'
import { PrescriptionTemplateItem } from '../entities/prescription-template.entity'
import { toPrescriptionTemplateResponse } from './create-prescription-template.use-case'

@Injectable()
export class UpdatePrescriptionTemplateUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly prescriptionTemplatesRepository: IPrescriptionTemplatesRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly medicationsRepository: IMedicationsRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdatePrescriptionTemplateDto, currentUser: ICurrentUser): Promise<PrescriptionTemplateResponseDto> {
    const clinicId = currentUser.clinicId!

    const template = await this.prescriptionTemplatesRepository.findById(id, clinicId)
    if (!template) throw new NotFoundException('Prescription template not found')

    const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
    if (!doctor || doctor.id !== template.doctorId) throw new ForbiddenException('Insufficient permissions')

    let resolvedItems: PrescriptionTemplateItem[] | undefined
    if (dto.items) {
      resolvedItems = []
      for (const item of dto.items) {
        if (item.medicationId) {
          const medication = await this.medicationsRepository.findById(item.medicationId)
          if (!medication) throw new UnprocessableEntityException(`Medication not found: ${item.medicationId}`)
          resolvedItems.push({
            medicationId: medication.id,
            name: medication.name,
            activeIngredient: medication.activeIngredient,
            dosage: item.dosage ?? null,
            quantity: item.quantity ?? null,
            instructions: item.instructions,
          })
        } else if (item.activeIngredientName) {
          resolvedItems.push({
            medicationId: null,
            name: item.activeIngredientName,
            activeIngredient: null,
            dosage: item.dosage ?? null,
            quantity: item.quantity ?? null,
            instructions: item.instructions,
          })
        } else {
          throw new UnprocessableEntityException('Each item must have a medicationId or activeIngredientName')
        }
      }
    }

    const updated = await this.prescriptionTemplatesRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(resolvedItems !== undefined && { items: resolvedItems }),
      ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    })

    return toPrescriptionTemplateResponse(updated)
  }
}
