import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { Doctor } from './doctor.entity'

@Entity('doctor_specialties')
export class DoctorSpecialty {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string

  @ManyToOne(() => Doctor, (doctor) => doctor.doctorSpecialties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor

  @Column({ name: 'specialty_id', type: 'uuid' })
  specialtyId: string

  @ManyToOne(() => Specialty, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'specialty_id' })
  specialty: Specialty

  @Column({ name: 'rqe', type: 'varchar', length: 10, nullable: true, default: null })
  rqe: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
