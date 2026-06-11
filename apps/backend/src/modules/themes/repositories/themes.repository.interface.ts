import { QueryRunner } from 'typeorm'
import { Theme } from '../entities/theme.entity'

export interface IThemeCreateData {
  name: string
  slug: string
  accentColor: string
  accentSoftColor: string
  isDefault?: boolean
}

export abstract class IThemesRepository {
  abstract findAll(page: number, limit: number): Promise<[Theme[], number]>
  abstract findById(id: string): Promise<Theme | null>
  abstract findBySlug(slug: string): Promise<Theme | null>
  abstract findDefault(): Promise<Theme | null>
  abstract findByClinicId(clinicId: string): Promise<Theme | null>
  abstract countClinicsByThemeId(themeId: string): Promise<number>
  abstract clearDefaultExcept(excludeId: string, queryRunner?: QueryRunner): Promise<void>
  abstract create(data: IThemeCreateData, queryRunner?: QueryRunner): Promise<Theme>
  abstract update(id: string, data: Partial<IThemeCreateData>, queryRunner?: QueryRunner): Promise<Theme>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
