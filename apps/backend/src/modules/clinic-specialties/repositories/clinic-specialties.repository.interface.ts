import { QueryRunner } from 'typeorm'
import { ClinicSpecialty } from '../entities/clinic-specialty.entity'

export abstract class IClinicSpecialtiesRepository {
  abstract findByClinicId(
    clinicId: string,
    page: number,
    limit: number,
    search?: string,
  ): Promise<[ClinicSpecialty[], number]>
  abstract findByClinicAndSpecialty(
    clinicId: string,
    specialtyId: string,
  ): Promise<ClinicSpecialty | null>
  abstract link(
    clinicId: string,
    specialtyId: string,
    queryRunner?: QueryRunner,
  ): Promise<ClinicSpecialty>
  abstract unlink(id: string, queryRunner?: QueryRunner): Promise<void>
}
