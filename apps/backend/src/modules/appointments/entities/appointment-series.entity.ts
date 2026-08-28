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
import { DayOfWeek, RecurrenceInterval } from '@app/shared'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { Professional } from '../../professionals/entities/professional.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { User } from '../../users/entities/user.entity'

/**
 * A booking rule shared by a set of appointments created together. It stores the
 * rule the user chose so the series can be described ("every two weeks until
 * 30/09") without denormalising it onto every occurrence.
 *
 * Deliberately without an @OneToMany to Appointment: every query goes through
 * seriesId, and the inverse side would create a circular import between the two
 * entity files.
 */
@Entity('appointment_series')
export class AppointmentSeries {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Clinic, { eager: false })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic

  @Column({ name: 'clinic_id' })
  clinicId: string

  @ManyToOne(() => Professional, { eager: false })
  @JoinColumn({ name: 'professional_id' })
  professional: Professional

  @Column({ name: 'professional_id' })
  professionalId: string

  @ManyToOne(() => Patient, { eager: false })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient

  @Column({ name: 'patient_id' })
  patientId: string

  @ManyToOne(() => Specialty, { eager: false })
  @JoinColumn({ name: 'specialty_id' })
  specialty: Specialty | null

  @Column({ name: 'specialty_id', type: 'uuid', nullable: true })
  specialtyId: string | null

  @Column({ name: 'recurrence_interval', type: 'varchar' })
  recurrenceInterval: RecurrenceInterval

  @Column({ name: 'day_of_week', type: 'varchar' })
  dayOfWeek: DayOfWeek

  @Column({ name: 'start_time', type: 'varchar' })
  startTime: string

  /** The first requested occurrence — the date every other one is derived from. */
  @Column({ name: 'anchor_date', type: 'date' })
  anchorDate: string

  @Column({ name: 'requested_occurrence_count', type: 'int', nullable: true })
  requestedOccurrenceCount: number | null

  @Column({ name: 'requested_until_date', type: 'date', nullable: true })
  requestedUntilDate: string | null

  /** How many occurrences were actually created — the "10" in "session 3 of 10". */
  @Column({ name: 'created_occurrence_count', type: 'int' })
  createdOccurrenceCount: number

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User

  @Column({ name: 'created_by_user_id' })
  createdByUserId: string

  @VersionColumn()
  version: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null
}
