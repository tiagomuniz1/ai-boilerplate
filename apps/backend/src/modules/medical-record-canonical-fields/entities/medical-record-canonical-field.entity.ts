import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { MedicalRecordFieldOptionDto, MedicalRecordFieldType } from '@app/shared'

@Entity('medical_record_canonical_fields')
export class MedicalRecordCanonicalField {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'canonical_key' })
  canonicalKey: string

  @Column()
  label: string

  @Column({ type: 'varchar' })
  type: MedicalRecordFieldType

  @Column({ type: 'jsonb', nullable: true })
  options: MedicalRecordFieldOptionDto[] | null

  @Column({ type: 'varchar', nullable: true })
  unit: string | null

  @Column({ type: 'varchar', nullable: true })
  description: string | null

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
