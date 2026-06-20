import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm'
import { MedicalRecordFieldOptionDto, MedicalRecordFieldType } from '@app/shared'

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
}

@Entity('medical_record_templates')
export class MedicalRecordTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @Column({ name: 'specialty_id', type: 'uuid' })
  specialtyId: string

  @Column()
  name: string

  @Column({ type: 'jsonb', default: () => "'[]'" })
  fields: MedicalRecordTemplateField[]

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
