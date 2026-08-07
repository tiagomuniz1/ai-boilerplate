import { QueryRunner } from 'typeorm'
import { CouncilType, UpdateProfessionalDto } from '@app/shared'
import { Professional } from '../entities/professional.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'

export type ProfessionalRegistrationAssignment = { councilType: CouncilType; number: string; state: string; isPrimary: boolean }
export type ProfessionalSpecialtyAssignment = { specialty: Specialty; registryNumber: string | null }

export type CreateProfessionalData = { userId: string; bio?: string | null }

export abstract class IProfessionalsRepository {
  abstract findAll(page: number, limit: number, clinicId: string, search?: string): Promise<[Professional[], number]>
  abstract findById(id: string, clinicId: string): Promise<Professional | null>
  abstract findByUserId(userId: string, clinicId: string): Promise<Professional | null>
  abstract findByRegistration(councilType: CouncilType, number: string, state: string, clinicId: string): Promise<Professional | null>
  abstract countByClinic(clinicId: string): Promise<number>
  abstract create(
    data: CreateProfessionalData,
    clinicId: string,
    registrations: ProfessionalRegistrationAssignment[],
    specialties: ProfessionalSpecialtyAssignment[],
    queryRunner?: QueryRunner,
  ): Promise<Professional>
  abstract update(
    id: string,
    data: UpdateProfessionalDto,
    registrations: ProfessionalRegistrationAssignment[] | null,
    specialties: ProfessionalSpecialtyAssignment[] | null,
    queryRunner?: QueryRunner,
  ): Promise<Professional>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
