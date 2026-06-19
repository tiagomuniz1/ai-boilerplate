import { ThemeBorderRadius } from '@app/shared'
import { toThemeModel } from './to-theme-model'

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  name: 'Salvia Natural',
  slug: 'salvia-natural',
  isDefault: true,
  accentColor: '#4CAF50',
  accentSoftColor: '#A5D6A7',
  borderRadius: ThemeBorderRadius.MD,
  bgColor: '#FFFFFF',
  bgDarkColor: '#121212',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T10:00:00.000Z',
  ...overrides,
})

describe('toThemeModel', () => {
  it('maps all fields correctly', () => {
    const dto = makeDto()
    const model = toThemeModel(dto as any)

    expect(model.id).toBe('uuid-1')
    expect(model.name).toBe('Salvia Natural')
    expect(model.slug).toBe('salvia-natural')
    expect(model.isDefault).toBe(true)
    expect(model.accentColor).toBe('#4CAF50')
    expect(model.accentSoftColor).toBe('#A5D6A7')
    expect(model.borderRadius).toBe(ThemeBorderRadius.MD)
    expect(model.bgColor).toBe('#FFFFFF')
    expect(model.bgDarkColor).toBe('#121212')
    expect(model.createdAt).toEqual(new Date('2024-01-15T10:00:00.000Z'))
    expect(model.updatedAt).toEqual(new Date('2024-01-16T10:00:00.000Z'))
  })

  it('maps null bgColor and bgDarkColor', () => {
    const dto = makeDto({ bgColor: null, bgDarkColor: null })
    const model = toThemeModel(dto as any)

    expect(model.bgColor).toBeNull()
    expect(model.bgDarkColor).toBeNull()
  })

  it('converts createdAt and updatedAt strings to Date instances', () => {
    const dto = makeDto()
    const model = toThemeModel(dto as any)

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.updatedAt).toBeInstanceOf(Date)
  })
})
