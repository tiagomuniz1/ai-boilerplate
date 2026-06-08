import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm'

@Entity('clinics')
export class Clinic {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 120 })
  name: string

  @Column({ length: 80, unique: true })
  slug: string

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @VersionColumn()
  version: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
