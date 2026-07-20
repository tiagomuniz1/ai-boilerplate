import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

export interface PrescriptionTemplateItem {
  medicationId: string | null
  name: string
  activeIngredient: string | null
  dosage: string | null
  quantity: string | null
  instructions: string
}

@Entity('prescription_templates')
export class PrescriptionTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string

  @Column({ name: 'professional_name' })
  professionalName: string

  @Column()
  name: string

  @Column({ type: 'jsonb' })
  items: PrescriptionTemplateItem[]

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null
}
