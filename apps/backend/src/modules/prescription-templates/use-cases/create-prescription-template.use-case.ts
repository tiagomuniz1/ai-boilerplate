import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreatePrescriptionTemplateDto, PrescriptionTemplateResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IMedicationsRepository } from '../../medications/repositories/medications.repository.interface'
import { IPrescriptionTemplatesRepository } from '../repositories/prescription-templates.repository.interface'
import { PrescriptionTemplate, PrescriptionTemplateItem } from '../entities/prescription-template.entity'

export function toPrescriptionTemplateResponse(template: PrescriptionTemplate): PrescriptionTemplateResponseDto {
  return {
    id: template.id,
    doctorId: template.doctorId,
    doctorName: template.doctorName,
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
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly medicationsRepository: IMedicationsRepository,
  ) {
    super(dataSource)
  }

  async execute(dto: CreatePrescriptionTemplateDto, currentUser: ICurrentUser): Promise<PrescriptionTemplateResponseDto> {
    const clinicId = currentUser.clinicId!

    let doctorId: string
    let doctorName: string

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor) throw new ForbiddenException('Insufficient permissions')
      doctorId = doctor.id
      doctorName = doctor.user.fullName
    } else {
      if (!dto.doctorId) throw new UnprocessableEntityException('doctorId is required for ADMIN')
      const doctor = await this.doctorsRepository.findById(dto.doctorId, clinicId)
      if (!doctor) throw new NotFoundException('Doctor not found')
      doctorId = doctor.id
      doctorName = doctor.user.fullName
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
      doctorId,
      doctorName,
      name: dto.name,
      items,
      notes: dto.notes ?? null,
    })

    return toPrescriptionTemplateResponse(template)
  }
}
