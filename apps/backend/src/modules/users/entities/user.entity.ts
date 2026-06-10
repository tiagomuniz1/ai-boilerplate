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
import { UserRole } from '@app/shared'
import { Clinic } from '../../clinics/entities/clinic.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'full_name' })
  fullName: string

  @Column()
  email: string

  @Column()
  password: string

  @Column({ type: 'varchar', default: UserRole.USER })
  role: UserRole

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @ManyToOne(() => Clinic, { eager: false })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic

  @Column({ name: 'clinic_id', nullable: true })
  clinicId: string | null

  @VersionColumn()
  version: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
