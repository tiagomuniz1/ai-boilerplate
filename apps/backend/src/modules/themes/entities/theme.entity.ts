import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { ThemeBorderRadius } from '@app/shared'

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

  @Column({ name: 'border_radius', type: 'varchar', length: 10, default: ThemeBorderRadius.DEFAULT })
  borderRadius: ThemeBorderRadius

  @Column({ name: 'bg_color', type: 'varchar', length: 7, nullable: true, default: null })
  bgColor: string | null

  @Column({ name: 'bg_dark_color', type: 'varchar', length: 7, nullable: true, default: null })
  bgDarkColor: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
