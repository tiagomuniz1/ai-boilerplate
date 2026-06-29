import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { Clinic } from '../clinics/entities/clinic.entity'
import { Theme } from './entities/theme.entity'
import { ThemesController } from './controllers/themes.controller'
import { CreateThemeUseCase } from './use-cases/create-theme.use-case'
import { UpdateThemeUseCase } from './use-cases/update-theme.use-case'
import { DeleteThemeUseCase } from './use-cases/delete-theme.use-case'
import { FindAllThemesUseCase } from './use-cases/find-all-themes.use-case'
import { FindThemeByIdUseCase } from './use-cases/find-theme-by-id.use-case'
import { FindActiveThemeUseCase } from './use-cases/find-active-theme.use-case'
import { IThemesRepository } from './repositories/themes.repository.interface'
import { ThemesRepository } from './repositories/themes.repository'

@Module({
  imports: [TypeOrmModule.forFeature([Theme, Clinic]), CacheModule],
  controllers: [ThemesController],
  providers: [
    CreateThemeUseCase,
    UpdateThemeUseCase,
    DeleteThemeUseCase,
    FindAllThemesUseCase,
    FindThemeByIdUseCase,
    FindActiveThemeUseCase,
    { provide: IThemesRepository, useClass: ThemesRepository },
  ],
  exports: [FindThemeByIdUseCase],
})
export class ThemesModule {}
