import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { Theme } from '../entities/theme.entity'
import { IThemesRepository, IThemeCreateData } from './themes.repository.interface'

@Injectable()
export class ThemesRepository implements IThemesRepository {
  constructor(
    @InjectRepository(Theme)
    private readonly repository: Repository<Theme>,
    @InjectRepository(Clinic)
    private readonly clinicRepository: Repository<Clinic>,
  ) {}

  async findAll(page: number, limit: number): Promise<[Theme[], number]> {
    return this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { isDefault: 'DESC', name: 'ASC' },
    })
  }

  async findById(id: string): Promise<Theme | null> {
    return this.repository.findOneBy({ id })
  }

  async findBySlug(slug: string): Promise<Theme | null> {
    return this.repository.findOneBy({ slug })
  }

  async findDefault(): Promise<Theme | null> {
    return this.repository.findOneBy({ isDefault: true })
  }

  async findByClinicId(clinicId: string): Promise<Theme | null> {
    const clinic = await this.clinicRepository.findOneBy({ id: clinicId })
    if (!clinic?.themeId) return null
    return this.repository.findOneBy({ id: clinic.themeId })
  }

  async countClinicsByThemeId(themeId: string): Promise<number> {
    return this.clinicRepository.countBy({ themeId })
  }

  async clearDefaultExcept(excludeId: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Theme) : this.repository
    await repo
      .createQueryBuilder()
      .update(Theme)
      .set({ isDefault: false })
      .where('id != :excludeId AND is_default = true', { excludeId })
      .execute()
  }

  async create(data: IThemeCreateData, queryRunner?: QueryRunner): Promise<Theme> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Theme) : this.repository
    return repo.save(repo.create(data))
  }

  async update(id: string, data: Partial<IThemeCreateData>, queryRunner?: QueryRunner): Promise<Theme> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Theme) : this.repository
    const theme = await repo.findOneByOrFail({ id })
    Object.assign(theme, data)
    return repo.save(theme)
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Theme) : this.repository
    await repo.softDelete(id)
  }
}
