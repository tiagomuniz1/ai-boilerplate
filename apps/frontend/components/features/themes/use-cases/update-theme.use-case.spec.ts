jest.mock('../services/themes.service')
jest.mock('../mappers/to-theme-model')

import { ThemeBorderRadius } from '@app/shared'
import { themesService } from '../services/themes.service'
import { toThemeModel } from '../mappers/to-theme-model'
import { updateThemeUseCase } from './update-theme.use-case'
import type { IThemeModel } from '../types/theme-model.types'

describe('updateThemeUseCase', () => {
  const id = 'uuid-1'

  const input = {
    name: 'Azul Clínico Atualizado',
    accentColor: '#1D4ED8',
    accentSoftColor: '#BFDBFE',
    isDefault: true,
    borderRadius: ThemeBorderRadius.ROUND,
  }

  const returnedDto = {
    id,
    name: 'Azul Clínico Atualizado',
    slug: 'azul-clinico',
    isDefault: true,
    accentColor: '#1D4ED8',
    accentSoftColor: '#BFDBFE',
    borderRadius: ThemeBorderRadius.ROUND,
    bgColor: null,
    bgDarkColor: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  }

  const model: IThemeModel = {
    id,
    name: 'Azul Clínico Atualizado',
    slug: 'azul-clinico',
    isDefault: true,
    accentColor: '#1D4ED8',
    accentSoftColor: '#BFDBFE',
    borderRadius: ThemeBorderRadius.ROUND,
    bgColor: null,
    bgDarkColor: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  }

  beforeEach(() => jest.clearAllMocks())

  it('calls themesService.update with id and input and returns mapped model', async () => {
    ;(themesService.update as jest.Mock).mockResolvedValue(returnedDto)
    ;(toThemeModel as jest.Mock).mockReturnValue(model)

    const result = await updateThemeUseCase(id, input)

    expect(themesService.update).toHaveBeenCalledWith(id, input)
    expect(toThemeModel).toHaveBeenCalledWith(returnedDto)
    expect(result).toBe(model)
  })

  it('propagates errors from themesService.update', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Theme not found' }
    ;(themesService.update as jest.Mock).mockRejectedValue(error)

    await expect(updateThemeUseCase(id, input)).rejects.toEqual(error)
    expect(toThemeModel).not.toHaveBeenCalled()
  })
})
