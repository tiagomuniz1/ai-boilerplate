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
import { DayOfWeek } from '@app/shared'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { Professional } from '../../professionals/entities/professional.entity'

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Professional, { eager: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Professional

  @Column({ name: 'doctor_id' })
  doctorId: string

  @ManyToOne(() => Clinic, { eager: false })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic

  @Column({ name: 'clinic_id' })
  clinicId: string

  @Column({ name: 'day_of_week', type: 'varchar' })
  dayOfWeek: DayOfWeek

  @Column({ name: 'start_time', type: 'varchar' })
  startTime: string

  @Column({ name: 'end_time', type: 'varchar' })
  endTime: string

  @Column({ name: 'slot_duration_in_minutes' })
  slotDurationInMinutes: number

  @Column({ name: 'valid_from', type: 'varchar', nullable: true })
  validFrom: string | null

  @Column({ name: 'valid_until', type: 'varchar', nullable: true })
  validUntil: string | null

  @VersionColumn()
  version: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
