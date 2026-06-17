import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'

@Entity('clinic_specialties')
export class ClinicSpecialty {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic

  @Column({ name: 'specialty_id', type: 'uuid' })
  specialtyId: string

  @ManyToOne(() => Specialty, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'specialty_id' })
  specialty: Specialty

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
