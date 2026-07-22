import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm'
import { CouncilType, MedicalRecordFieldOptionDto, MedicalRecordFieldType } from '@app/shared'

export interface MedicalRecordTemplateSection {
  key: string
  title: string
  order: number
}

export interface MedicalRecordTemplateField {
  key: string
  label: string
  type: MedicalRecordFieldType
  required: boolean
  order: number
  options: MedicalRecordFieldOptionDto[] | null
  placeholder: string | null
  helpText: string | null
  canonical: boolean
  canonicalKey: string | null
  sectionKey: string | null
}

@Entity('medical_record_templates')
export class MedicalRecordTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @Column({ name: 'specialty_id', type: 'uuid', nullable: true })
  specialtyId: string | null

  // Set exclusively when specialtyId is null — scopes a "generalist" template to a profession
  // (e.g. every CRN nutritionist in the clinic shares one) instead of one shared row per clinic.
  @Column({ name: 'council_type', type: 'varchar', length: 20, nullable: true })
  councilType: CouncilType | null

  @Column()
  name: string

  @Column({ type: 'jsonb', default: () => "'[]'" })
  fields: MedicalRecordTemplateField[]

  @Column({ type: 'jsonb', default: () => "'[]'" })
  sections: MedicalRecordTemplateSection[]

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @VersionColumn()
  version: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
