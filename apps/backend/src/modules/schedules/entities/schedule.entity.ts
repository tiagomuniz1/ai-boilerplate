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
import { Doctor } from '../../doctors/entities/doctor.entity'

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Doctor, { eager: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor

  @Column({ name: 'doctor_id' })
  doctorId: string

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
