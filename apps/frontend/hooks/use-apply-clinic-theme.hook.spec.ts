jest.mock('@/components/features/themes/hooks/use-active-theme.hook')

import { renderHook } from '@testing-library/react'
import { useActiveTheme } from '@/components/features/themes/hooks/use-active-theme.hook'
import { useApplyClinicTheme, computeDarkAccent, computeDarkSoft } from './use-apply-clinic-theme.hook'

const mockUseActiveTheme = useActiveTheme as jest.MockedFunction<typeof useActiveTheme>

const sampleTheme = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Azul Clínico',
  slug: 'azul-clinico',
  accentColor: '#2563EB',
  accentSoftColor: '#DBEAFE',
  isDefault: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('computeDarkAccent', () => {
  it('lightens and desaturates blue accent for dark mode', () => {
    const result = computeDarkAccent('#2563EB')
    // should be noticeably lighter than the source
    const r = parseInt(result.slice(1, 3), 16)
    const b = parseInt(result.slice(5, 7), 16)
    expect(r).toBeGreaterThan(37)
    expect(b).toBeGreaterThan(235)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('lightens rose accent for dark mode', () => {
    const result = computeDarkAccent('#E11D48')
    const rSource = 0xe1
    const rResult = parseInt(result.slice(1, 3), 16)
    expect(rResult).toBeGreaterThan(rSource)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('returns a valid 6-digit hex string', () => {
    expect(computeDarkAccent('#000000')).toMatch(/^#[0-9a-f]{6}$/)
    expect(computeDarkAccent('#FFFFFF')).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('computeDarkSoft', () => {
  it('produces a very dark tinted color from blue accent', () => {
    const result = computeDarkSoft('#2563EB')
    const r = parseInt(result.slice(1, 3), 16)
    const g = parseInt(result.slice(3, 5), 16)
    const b = parseInt(result.slice(5, 7), 16)
    // all channels should be very dark (< 60)
    expect(r).toBeLessThan(60)
    expect(g).toBeLessThan(60)
    expect(b).toBeLessThan(60)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('produces a very dark tinted color from rose accent', () => {
    const result = computeDarkSoft('#E11D48')
    const r = parseInt(result.slice(1, 3), 16)
    // red channel dominant but still very dark
    expect(r).toBeLessThan(60)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('returns a valid 6-digit hex string', () => {
    expect(computeDarkSoft('#000000')).toMatch(/^#[0-9a-f]{6}$/)
    expect(computeDarkSoft('#FFFFFF')).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('useApplyClinicTheme', () => {
  let setPropertySpy: jest.SpyInstance
  let removePropertySpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    setPropertySpy = jest.spyOn(document.documentElement.style, 'setProperty')
    removePropertySpy = jest.spyOn(document.documentElement.style, 'removeProperty')
  })

  afterEach(() => {
    setPropertySpy.mockRestore()
    removePropertySpy.mockRestore()
  })

  it('sets all four accent CSS variables when theme is loaded', () => {
    mockUseActiveTheme.mockReturnValue({ data: sampleTheme } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    expect(setPropertySpy).toHaveBeenCalledWith('--accentLight', sampleTheme.accentColor)
    expect(setPropertySpy).toHaveBeenCalledWith('--accentSoftLight', sampleTheme.accentSoftColor)
    expect(setPropertySpy).toHaveBeenCalledWith('--accentDark', expect.stringMatching(/^#[0-9a-f]{6}$/))
    expect(setPropertySpy).toHaveBeenCalledWith('--accentSoftDark', expect.stringMatching(/^#[0-9a-f]{6}$/))
    expect(setPropertySpy).toHaveBeenCalledTimes(4)
  })

  it('removes all four accent CSS variables when theme is null', () => {
    mockUseActiveTheme.mockReturnValue({ data: undefined } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    expect(removePropertySpy).toHaveBeenCalledWith('--accentLight')
    expect(removePropertySpy).toHaveBeenCalledWith('--accentSoftLight')
    expect(removePropertySpy).toHaveBeenCalledWith('--accentDark')
    expect(removePropertySpy).toHaveBeenCalledWith('--accentSoftDark')
    expect(removePropertySpy).toHaveBeenCalledTimes(4)
  })

  it('sets dark accent as a lighter variant of the source accent', () => {
    mockUseActiveTheme.mockReturnValue({ data: sampleTheme } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    const darkAccentCall = setPropertySpy.mock.calls.find(([prop]) => prop === '--accentDark')
    const darkAccent = darkAccentCall?.[1] as string
    const rDark = parseInt(darkAccent.slice(1, 3), 16)
    const rSource = parseInt(sampleTheme.accentColor.slice(1, 3), 16)
    expect(rDark).toBeGreaterThan(rSource)
  })

  it('sets dark soft as a very dark tint of the source accent', () => {
    mockUseActiveTheme.mockReturnValue({ data: sampleTheme } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    const darkSoftCall = setPropertySpy.mock.calls.find(([prop]) => prop === '--accentSoftDark')
    const darkSoft = darkSoftCall?.[1] as string
    const r = parseInt(darkSoft.slice(1, 3), 16)
    const g = parseInt(darkSoft.slice(3, 5), 16)
    const b = parseInt(darkSoft.slice(5, 7), 16)
    expect(r).toBeLessThan(60)
    expect(g).toBeLessThan(60)
    expect(b).toBeLessThan(60)
  })

  it('does not set CSS variables when theme is still loading', () => {
    mockUseActiveTheme.mockReturnValue({ data: undefined } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    expect(setPropertySpy).not.toHaveBeenCalled()
  })
})
