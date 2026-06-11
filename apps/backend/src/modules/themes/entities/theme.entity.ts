import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('themes')
export class Theme {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 120 })
  name: string

  @Column({ length: 80, unique: true })
  slug: string

  @Column({ name: 'is_default', default: false })
  isDefault: boolean

  @Column({ name: 'accent_color', length: 7 })
  accentColor: string

  @Column({ name: 'accent_soft_color', length: 7 })
  accentSoftColor: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
