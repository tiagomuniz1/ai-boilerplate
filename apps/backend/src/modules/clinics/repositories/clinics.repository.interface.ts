import { QueryRunner } from 'typeorm'
import { UpdateClinicDto } from '@app/shared'
import { Clinic } from '../entities/clinic.entity'

export interface IClinicCreateData {
  name: string
  slug: string
  themeId?: string | null
  address?: {
    street: string
    number: string
    complement?: string | null
    neighborhood: string
    city: string
    state: string
    zipCode: string
    country: string
  }
}

export abstract class IClinicsRepository {
  abstract findAll(page: number, limit: number, search?: string): Promise<[Clinic[], number]>
  abstract findById(id: string): Promise<Clinic | null>
  abstract findBySlug(slug: string): Promise<Clinic | null>
  abstract create(data: IClinicCreateData, queryRunner?: QueryRunner): Promise<Clinic>
  abstract update(id: string, data: UpdateClinicDto): Promise<Clinic>
  abstract updateLogo(id: string, logoPath: string, queryRunner?: QueryRunner): Promise<void>
  abstract updateLogoDark(id: string, logoDarkPath: string, queryRunner?: QueryRunner): Promise<void>
  abstract updateFavicon(id: string, faviconPath: string, queryRunner?: QueryRunner): Promise<void>
}
