jest.mock('../services/themes.service')
jest.mock('../mappers/to-theme-model')

import { themesService } from '../services/themes.service'
import { toThemeModel } from '../mappers/to-theme-model'
import { getActiveThemeUseCase } from './get-active-theme.use-case'

const mockThemesService = themesService as jest.Mocked<typeof themesService>
const mockToThemeModel = toThemeModel as jest.Mock

const makeDto = () => ({ id: 'uuid-1', name: 'Salvia', slug: 'salvia', createdAt: new Date(), updatedAt: new Date() })
const makeModel = () => ({ id: 'uuid-1', name: 'Salvia' })

describe('getActiveThemeUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns mapped model when active theme exists', async () => {
    const dto = makeDto()
    const model = makeModel()
    mockThemesService.getActive.mockResolvedValue(dto as any)
    mockToThemeModel.mockReturnValue(model)

    const result = await getActiveThemeUseCase()

    expect(mockThemesService.getActive).toHaveBeenCalled()
    expect(mockToThemeModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('returns null when getActive returns null', async () => {
    mockThemesService.getActive.mockResolvedValue(null)

    const result = await getActiveThemeUseCase()

    expect(result).toBeNull()
    expect(mockToThemeModel).not.toHaveBeenCalled()
  })
})
