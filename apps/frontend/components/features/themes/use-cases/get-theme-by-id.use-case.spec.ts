jest.mock('../services/themes.service')
jest.mock('../mappers/to-theme-model')

import { themesService } from '../services/themes.service'
import { toThemeModel } from '../mappers/to-theme-model'
import { getThemeByIdUseCase } from './get-theme-by-id.use-case'

const mockThemesService = themesService as jest.Mocked<typeof themesService>
const mockToThemeModel = toThemeModel as jest.Mock

describe('getThemeByIdUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls getById and returns mapped model', async () => {
    const dto = { id: 'uuid-1', name: 'Salvia' }
    const model = { id: 'uuid-1', name: 'Salvia' }
    mockThemesService.getById.mockResolvedValue(dto as any)
    mockToThemeModel.mockReturnValue(model)

    const result = await getThemeByIdUseCase('uuid-1')

    expect(mockThemesService.getById).toHaveBeenCalledWith('uuid-1')
    expect(mockToThemeModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from getById', async () => {
    mockThemesService.getById.mockRejectedValue(new Error('Not found'))

    await expect(getThemeByIdUseCase('uuid-1')).rejects.toThrow('Not found')
    expect(mockToThemeModel).not.toHaveBeenCalled()
  })
})
