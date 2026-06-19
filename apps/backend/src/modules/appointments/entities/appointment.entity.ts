import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm'
import { AppointmentStatus } from '@app/shared'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { Doctor } from '../../doctors/entities/doctor.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { Schedule } from '../../schedules/entities/schedule.entity'

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Clinic, { eager: false })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic

  @Column({ name: 'clinic_id' })
  clinicId: string

  @ManyToOne(() => Doctor, { eager: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor

  @Column({ name: 'doctor_id' })
  doctorId: string

  @ManyToOne(() => Patient, { eager: false })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient

  @Column({ name: 'patient_id' })
  patientId: string

  @ManyToOne(() => Schedule, { eager: false })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule

  @Column({ name: 'schedule_id' })
  scheduleId: string

  @Column({ type: 'date' })
  date: string

  @Column({ name: 'start_time', type: 'varchar' })
  startTime: string

  @Column({ name: 'end_time', type: 'varchar' })
  endTime: string

  @Column({ type: 'varchar', default: AppointmentStatus.SCHEDULED })
  status: AppointmentStatus

  @Column({ type: 'text', nullable: true })
  reason: string | null

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null

  @VersionColumn()
  version: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null
}
