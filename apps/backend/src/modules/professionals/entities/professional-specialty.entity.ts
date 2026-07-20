import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { Professional } from './professional.entity'

@Entity('professional_specialties')
export class ProfessionalSpecialty {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string

  @ManyToOne(() => Professional, (professional) => professional.professionalSpecialties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professional_id' })
  professional: Professional

  @Column({ name: 'specialty_id', type: 'uuid' })
  specialtyId: string

  @ManyToOne(() => Specialty, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'specialty_id' })
  specialty: Specialty

  @Column({ name: 'registry_number', type: 'varchar', length: 10, nullable: true, default: null })
  registryNumber: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
