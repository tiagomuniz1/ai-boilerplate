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
import { Clinic } from '../../clinics/entities/clinic.entity'
import { Professional } from '../../professionals/entities/professional.entity'

@Entity('schedule_exceptions')
export class ScheduleException {
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

  @Column({ type: 'varchar' })
  date: string

  @Column({ name: 'start_time', type: 'varchar', nullable: true })
  startTime: string | null

  @Column({ name: 'end_time', type: 'varchar', nullable: true })
  endTime: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null

  @VersionColumn()
  version: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
