import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm'
import { SubscriptionPlan } from '@app/shared'

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

  @Column({ type: 'varchar', length: 20, default: SubscriptionPlan.FREE })
  plan: SubscriptionPlan

  @Column({ name: 'address_street', type: 'varchar', length: 255, nullable: true })
  addressStreet: string | null

  @Column({ name: 'address_number', type: 'varchar', length: 20, nullable: true })
  addressNumber: string | null

  @Column({ name: 'address_complement', type: 'varchar', length: 100, nullable: true })
  addressComplement: string | null

  @Column({ name: 'address_neighborhood', type: 'varchar', length: 100, nullable: true })
  addressNeighborhood: string | null

  @Column({ name: 'address_city', type: 'varchar', length: 100, nullable: true })
  addressCity: string | null

  @Column({ name: 'address_state', type: 'varchar', length: 2, nullable: true })
  addressState: string | null

  @Column({ name: 'address_zip_code', type: 'varchar', length: 9, nullable: true })
  addressZipCode: string | null

  @Column({ name: 'address_country', type: 'varchar', length: 2, nullable: true })
  addressCountry: string | null

  @Column({ name: 'theme_id', type: 'uuid', nullable: true })
  themeId: string | null

  // Object keys in the private S3 bucket (e.g. `clinics/{id}/logo.png`). Delivery URLs are built
  // on read and streamed by the backend — see ClinicAssetUrlService.
  @Column({ name: 'logo_path', type: 'varchar', length: 500, nullable: true, default: null })
  logoPath: string | null

  @Column({ name: 'logo_dark_path', type: 'varchar', length: 500, nullable: true, default: null })
  logoDarkPath: string | null

  @Column({ name: 'favicon_path', type: 'varchar', length: 500, nullable: true, default: null })
  faviconPath: string | null

  @VersionColumn()
  version: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
