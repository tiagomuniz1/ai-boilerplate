import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreatePrescriptionTemplateDto, PrescriptionTemplateResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IMedicationsRepository } from '../../medications/repositories/medications.repository.interface'
import { IPrescriptionTemplatesRepository } from '../repositories/prescription-templates.repository.interface'
import { PrescriptionTemplate, PrescriptionTemplateItem } from '../entities/prescription-template.entity'

export function toPrescriptionTemplateResponse(template: PrescriptionTemplate): PrescriptionTemplateResponseDto {
  return {
    id: template.id,
    professionalId: template.professionalId,
    professionalName: template.professionalName,
    name: template.name,
    items: template.items.map((item) => ({
      medicationId: item.medicationId,
      name: item.name,
      activeIngredient: item.activeIngredient,
      dosage: item.dosage,
      quantity: item.quantity,
      instructions: item.instructions,
    })),
    notes: template.notes,
    isActive: template.isActive,
    createdAt: template.createdAt,
  }
}

@Injectable()
export class CreatePrescriptionTemplateUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly prescriptionTemplatesRepository: IPrescriptionTemplatesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly medicationsRepository: IMedicationsRepository,
  ) {
    super(dataSource)
  }

  async execute(dto: CreatePrescriptionTemplateDto, currentUser: ICurrentUser): Promise<PrescriptionTemplateResponseDto> {
    const clinicId = currentUser.clinicId!

    let professionalId: string
    let professionalName: string

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional) throw new ForbiddenException('Insufficient permissions')
      professionalId = professional.id
      professionalName = professional.user.fullName
    } else {
      if (!dto.professionalId) throw new UnprocessableEntityException('professionalId is required for ADMIN')
      const professional = await this.professionalsRepository.findById(dto.professionalId, clinicId)
      if (!professional) throw new NotFoundException('Professional not found')
      professionalId = professional.id
      professionalName = professional.user.fullName
    }

    const items: PrescriptionTemplateItem[] = []
    for (const item of dto.items) {
      if (item.medicationId) {
        const medication = await this.medicationsRepository.findById(item.medicationId)
        if (!medication) throw new UnprocessableEntityException(`Medication not found: ${item.medicationId}`)
        items.push({
          medicationId: medication.id,
          name: medication.name,
          activeIngredient: medication.activeIngredient,
          dosage: item.dosage ?? null,
          quantity: item.quantity ?? null,
          instructions: item.instructions,
        })
      } else if (item.activeIngredientName) {
        items.push({
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

    const template = await this.prescriptionTemplatesRepository.create({
      clinicId,
      professionalId,
      professionalName,
      name: dto.name,
      items,
      notes: dto.notes ?? null,
    })

    return toPrescriptionTemplateResponse(template)
  }
}
