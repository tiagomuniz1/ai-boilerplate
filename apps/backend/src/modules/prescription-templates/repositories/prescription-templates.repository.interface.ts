import { QueryRunner } from 'typeorm'
import { PrescriptionTemplateItem } from '../entities/prescription-template.entity'
import { PrescriptionTemplate } from '../entities/prescription-template.entity'

export interface CreatePrescriptionTemplateData {
  clinicId: string
  professionalId: string
  professionalName: string
  name: string
  items: PrescriptionTemplateItem[]
  notes: string | null
}

export interface UpdatePrescriptionTemplateData {
  name?: string
  items?: PrescriptionTemplateItem[]
  notes?: string | null
  isActive?: boolean
}

export abstract class IPrescriptionTemplatesRepository {
  abstract findAll(clinicId: string, professionalId?: string): Promise<PrescriptionTemplate[]>
  abstract findById(id: string, clinicId: string): Promise<PrescriptionTemplate | null>
  abstract create(data: CreatePrescriptionTemplateData, queryRunner?: QueryRunner): Promise<PrescriptionTemplate>
  abstract update(id: string, data: UpdatePrescriptionTemplateData, queryRunner?: QueryRunner): Promise<PrescriptionTemplate>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
