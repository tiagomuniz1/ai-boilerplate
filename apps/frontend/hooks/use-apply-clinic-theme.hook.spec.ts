jest.mock('@/components/features/themes/hooks/use-active-theme.hook')

import { renderHook } from '@testing-library/react'
import { ThemeBorderRadius } from '@app/shared'
import { useActiveTheme } from '@/components/features/themes/hooks/use-active-theme.hook'
import {
  useApplyClinicTheme,
  computeDarkAccent,
  computeDarkSoft,
  computeBgLight,
  computeBgDark,
} from './use-apply-clinic-theme.hook'

const mockUseActiveTheme = useActiveTheme as jest.MockedFunction<typeof useActiveTheme>

const sampleTheme = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Azul Clínico',
  slug: 'azul-clinico',
  accentColor: '#2563EB',
  accentSoftColor: '#DBEAFE',
  borderRadius: ThemeBorderRadius.DEFAULT,
  bgColor: null,
  bgDarkColor: null,
  isDefault: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('computeDarkAccent', () => {
  it('lightens and desaturates blue accent for dark mode', () => {
    const result = computeDarkAccent('#2563EB')
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
    expect(r).toBeLessThan(60)
    expect(g).toBeLessThan(60)
    expect(b).toBeLessThan(60)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('produces a very dark tinted color from rose accent', () => {
    const result = computeDarkSoft('#E11D48')
    const r = parseInt(result.slice(1, 3), 16)
    expect(r).toBeLessThan(60)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('returns a valid 6-digit hex string', () => {
    expect(computeDarkSoft('#000000')).toMatch(/^#[0-9a-f]{6}$/)
    expect(computeDarkSoft('#FFFFFF')).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('computeBgLight', () => {
  it('returns a color very close to the base bg (#F7F6F3)', () => {
    const result = computeBgLight('#2563EB')
    // rgb(...) format
    expect(result).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
    const [r, g, b] = result.match(/\d+/g)!.map(Number)
    // should stay close to base 247/246/243 — 4% shift at most ~9 units
    expect(r).toBeGreaterThanOrEqual(238)
    expect(g).toBeGreaterThanOrEqual(237)
    expect(b).toBeGreaterThanOrEqual(234)
  })

  it('produces a warmer tint for a warm accent (rose)', () => {
    const result = computeBgLight('#E11D48')
    const [r, , b] = result.match(/\d+/g)!.map(Number)
    // red channel should be higher than blue due to warm accent
    expect(r).toBeGreaterThan(b)
  })
})

describe('computeBgDark', () => {
  it('returns a color very close to the base dark bg (#0B1220)', () => {
    const result = computeBgDark('#2563EB')
    expect(result).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
    const [r, g, b] = result.match(/\d+/g)!.map(Number)
    // should stay close to base 11/18/32 — 4% shift at most ~9 units
    expect(r).toBeLessThan(21)
    expect(g).toBeLessThan(28)
    expect(b).toBeLessThan(42)
  })

  it('shifts red channel more than blue channel for a warm accent (rose)', () => {
    const result = computeBgDark('#E11D48')
    const [r, , b] = result.match(/\d+/g)!.map(Number)
    // Dark base is #0B1220 (r=11, b=32). Rose accent (r=225, b=72) shifts red more.
    const rShift = r - 11
    const bShift = b - 32
    expect(rShift).toBeGreaterThan(bShift)
  })
})

describe('useApplyClinicTheme', () => {
  let setPropertySpy: jest.SpyInstance
  let removePropertySpy: jest.SpyInstance
  let localStorageSetSpy: jest.SpyInstance
  let localStorageRemoveSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    setPropertySpy = jest.spyOn(document.documentElement.style, 'setProperty')
    removePropertySpy = jest.spyOn(document.documentElement.style, 'removeProperty')
    localStorageSetSpy = jest.spyOn(Storage.prototype, 'setItem')
    localStorageRemoveSpy = jest.spyOn(Storage.prototype, 'removeItem')
  })

  afterEach(() => {
    setPropertySpy.mockRestore()
    removePropertySpy.mockRestore()
    localStorageSetSpy.mockRestore()
    localStorageRemoveSpy.mockRestore()
  })

  it('sets all four accent CSS variables when theme is loaded', () => {
    mockUseActiveTheme.mockReturnValue({ data: sampleTheme } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    expect(setPropertySpy).toHaveBeenCalledWith('--accentLight', sampleTheme.accentColor)
    expect(setPropertySpy).toHaveBeenCalledWith('--accentSoftLight', sampleTheme.accentSoftColor)
    expect(setPropertySpy).toHaveBeenCalledWith('--accentDark', expect.stringMatching(/^#[0-9a-f]{6}$/))
    expect(setPropertySpy).toHaveBeenCalledWith('--accentSoftDark', expect.stringMatching(/^#[0-9a-f]{6}$/))
  })

  it('sets bg CSS variables using computed tint when bgColor/bgDarkColor are null', () => {
    mockUseActiveTheme.mockReturnValue({ data: sampleTheme } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    expect(setPropertySpy).toHaveBeenCalledWith('--bgLight', expect.stringMatching(/^rgb\(\d+,\d+,\d+\)$/))
    expect(setPropertySpy).toHaveBeenCalledWith('--bgDark', expect.stringMatching(/^rgb\(\d+,\d+,\d+\)$/))
  })

  it('uses stored bgColor/bgDarkColor directly when provided', () => {
    mockUseActiveTheme.mockReturnValue({
      data: { ...sampleTheme, bgColor: '#FAF0F1', bgDarkColor: '#1A0D10' },
    } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    expect(setPropertySpy).toHaveBeenCalledWith('--bgLight', '#FAF0F1')
    expect(setPropertySpy).toHaveBeenCalledWith('--bgDark', '#1A0D10')
  })

  it('sets all five radius CSS variables when theme is loaded', () => {
    mockUseActiveTheme.mockReturnValue({ data: sampleTheme } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    expect(setPropertySpy).toHaveBeenCalledWith('--radius-sm', '4px')
    expect(setPropertySpy).toHaveBeenCalledWith('--radius', '6px')
    expect(setPropertySpy).toHaveBeenCalledWith('--radius-md', '8px')
    expect(setPropertySpy).toHaveBeenCalledWith('--radius-lg', '12px')
    expect(setPropertySpy).toHaveBeenCalledWith('--radius-xl', '16px')
  })

  it('sets sharp radius values when theme.borderRadius is sharp', () => {
    mockUseActiveTheme.mockReturnValue({
      data: { ...sampleTheme, borderRadius: ThemeBorderRadius.SHARP },
    } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    expect(setPropertySpy).toHaveBeenCalledWith('--radius-sm', '2px')
    expect(setPropertySpy).toHaveBeenCalledWith('--radius', '3px')
    expect(setPropertySpy).toHaveBeenCalledWith('--radius-lg', '6px')
  })

  it('sets round radius values when theme.borderRadius is round', () => {
    mockUseActiveTheme.mockReturnValue({
      data: { ...sampleTheme, borderRadius: ThemeBorderRadius.ROUND },
    } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    expect(setPropertySpy).toHaveBeenCalledWith('--radius-sm', '8px')
    expect(setPropertySpy).toHaveBeenCalledWith('--radius', '12px')
    expect(setPropertySpy).toHaveBeenCalledWith('--radius-lg', '24px')
  })

  it('removes all CSS variables when theme is null', () => {
    mockUseActiveTheme.mockReturnValue({ data: undefined } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    expect(removePropertySpy).toHaveBeenCalledWith('--accentLight')
    expect(removePropertySpy).toHaveBeenCalledWith('--accentSoftLight')
    expect(removePropertySpy).toHaveBeenCalledWith('--accentDark')
    expect(removePropertySpy).toHaveBeenCalledWith('--accentSoftDark')
    expect(removePropertySpy).toHaveBeenCalledWith('--bgLight')
    expect(removePropertySpy).toHaveBeenCalledWith('--bgDark')
    expect(removePropertySpy).toHaveBeenCalledWith('--radius-sm')
    expect(removePropertySpy).toHaveBeenCalledWith('--radius')
    expect(removePropertySpy).toHaveBeenCalledWith('--radius-md')
    expect(removePropertySpy).toHaveBeenCalledWith('--radius-lg')
    expect(removePropertySpy).toHaveBeenCalledWith('--radius-xl')
    expect(setPropertySpy).not.toHaveBeenCalled()
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

  it('persists all CSS vars to localStorage when theme is applied', () => {
    mockUseActiveTheme.mockReturnValue({ data: sampleTheme } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    expect(localStorageSetSpy).toHaveBeenCalledWith(
      'clinic-theme-vars',
      expect.stringContaining('--accentLight'),
    )
    const stored = JSON.parse(localStorageSetSpy.mock.calls[0][1])
    expect(stored['--accentLight']).toBe(sampleTheme.accentColor)
    expect(stored['--accentSoftLight']).toBe(sampleTheme.accentSoftColor)
    expect(stored['--radius-sm']).toBeDefined()
    expect(stored['--bgLight']).toBeDefined()
  })

  it('removes clinic-theme-vars from localStorage when theme is null', () => {
    mockUseActiveTheme.mockReturnValue({ data: undefined } as ReturnType<typeof useActiveTheme>)

    renderHook(() => useApplyClinicTheme())

    expect(localStorageRemoveSpy).toHaveBeenCalledWith('clinic-theme-vars')
  })
})
