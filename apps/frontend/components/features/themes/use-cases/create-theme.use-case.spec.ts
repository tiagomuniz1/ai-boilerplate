jest.mock('../services/themes.service')
jest.mock('../mappers/to-theme-model')

import { ThemeBorderRadius } from '@app/shared'
import { themesService } from '../services/themes.service'
import { toThemeModel } from '../mappers/to-theme-model'
import { createThemeUseCase } from './create-theme.use-case'
import type { IThemeModel } from '../types/theme-model.types'

describe('createThemeUseCase', () => {
  const input = {
    name: 'Azul Clínico',
    accentColor: '#2563EB',
    accentSoftColor: '#DBEAFE',
    isDefault: false,
    borderRadius: ThemeBorderRadius.DEFAULT,
  }

  const returnedDto = {
    id: 'uuid-1',
    name: 'Azul Clínico',
    slug: 'azul-clinico',
    isDefault: false,
    accentColor: '#2563EB',
    accentSoftColor: '#DBEAFE',
    borderRadius: ThemeBorderRadius.DEFAULT,
    bgColor: null,
    bgDarkColor: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }

  const model: IThemeModel = {
    id: 'uuid-1',
    name: 'Azul Clínico',
    slug: 'azul-clinico',
    isDefault: false,
    accentColor: '#2563EB',
    accentSoftColor: '#DBEAFE',
    borderRadius: ThemeBorderRadius.DEFAULT,
    bgColor: null,
    bgDarkColor: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  }

  beforeEach(() => jest.clearAllMocks())

  it('calls themesService.create with input and returns mapped model', async () => {
    ;(themesService.create as jest.Mock).mockResolvedValue(returnedDto)
    ;(toThemeModel as jest.Mock).mockReturnValue(model)

    const result = await createThemeUseCase(input)

    expect(themesService.create).toHaveBeenCalledWith(input)
    expect(toThemeModel).toHaveBeenCalledWith(returnedDto)
    expect(result).toBe(model)
  })

  it('propagates errors from themesService.create', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Slug already in use' }
    ;(themesService.create as jest.Mock).mockRejectedValue(error)

    await expect(createThemeUseCase(input)).rejects.toEqual(error)
    expect(toThemeModel).not.toHaveBeenCalled()
  })
})
