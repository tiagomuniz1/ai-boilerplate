import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { CouncilType } from '@app/shared'
import { Professional } from './professional.entity'

@Entity('professional_registrations')
export class ProfessionalRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string

  @ManyToOne(() => Professional, (professional) => professional.registrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professional_id' })
  professional: Professional

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @Column({ name: 'council_type', type: 'varchar', length: 20 })
  councilType: CouncilType

  @Column({ name: 'number', type: 'varchar', length: 20 })
  number: string

  @Column({ name: 'state', type: 'varchar', length: 2 })
  state: string

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
