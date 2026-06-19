jest.mock('../services/themes.service')
jest.mock('../mappers/to-theme-model')

import { themesService } from '../services/themes.service'
import { toThemeModel } from '../mappers/to-theme-model'
import { getThemesUseCase } from './get-themes.use-case'

const mockThemesService = themesService as jest.Mocked<typeof themesService>
const mockToThemeModel = toThemeModel as jest.Mock

describe('getThemesUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls getAll with default params and returns mapped paginated result', async () => {
    const dto = { id: 'uuid-1', name: 'Salvia' }
    const model = { id: 'uuid-1', name: 'Salvia' }
    mockThemesService.getAll.mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 } as any)
    mockToThemeModel.mockReturnValue(model)

    const result = await getThemesUseCase()

    expect(mockThemesService.getAll).toHaveBeenCalledWith(1, 20)
    expect(mockToThemeModel).toHaveBeenCalledWith(dto, 0, [dto])
    expect(result).toEqual({ data: [model], total: 1, page: 1, limit: 20 })
  })

  it('calls getAll with custom page and limit', async () => {
    mockThemesService.getAll.mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 } as any)

    const result = await getThemesUseCase(2, 10)

    expect(mockThemesService.getAll).toHaveBeenCalledWith(2, 10)
    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
  })
})
