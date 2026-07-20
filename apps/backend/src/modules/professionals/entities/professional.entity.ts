import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { ProfessionalRegistration } from './professional-registration.entity'
import { ProfessionalSpecialty } from './professional-specialty.entity'

@Entity('professionals')
export class Professional {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ name: 'user_id' })
  userId: string

  @ManyToOne(() => Clinic, { eager: false })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic

  @Column({ name: 'clinic_id' })
  clinicId: string

  @OneToMany(() => ProfessionalRegistration, (registration) => registration.professional, { cascade: true })
  registrations: ProfessionalRegistration[]

  @OneToMany(() => ProfessionalSpecialty, (professionalSpecialty) => professionalSpecialty.professional, { cascade: true })
  professionalSpecialties: ProfessionalSpecialty[]

  @Column({ nullable: true, type: 'text' })
  bio: string | null

  @VersionColumn()
  version: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
