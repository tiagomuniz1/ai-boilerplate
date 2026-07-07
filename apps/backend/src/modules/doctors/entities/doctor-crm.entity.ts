import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Doctor } from './doctor.entity'

@Entity('doctor_crms')
export class DoctorCrm {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string

  @ManyToOne(() => Doctor, (doctor) => doctor.crms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @Column({ name: 'number', type: 'varchar', length: 6 })
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
