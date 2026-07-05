import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from './use-is-mobile.hook'

function mockMatchMedia(matches: boolean) {
  let changeListener: ((event: { matches: boolean }) => void) | null = null

  const mediaQueryList = {
    matches,
    media: '(max-width: 639px)',
    onchange: null,
    addEventListener: jest.fn((event: string, listener: typeof changeListener) => {
      if (event === 'change') changeListener = listener
    }),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockReturnValue(mediaQueryList),
  })

  return {
    mediaQueryList,
    triggerChange: (nextMatches: boolean) => {
      mediaQueryList.matches = nextMatches
      changeListener?.({ matches: nextMatches })
    },
  }
}

describe('useIsMobile', () => {
  it('returns false when viewport does not match the mobile query', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true when viewport matches the mobile query', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('updates when the media query change event fires', () => {
    const { triggerChange } = mockMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => triggerChange(true))
    expect(result.current).toBe(true)
  })

  it('removes the change listener on unmount', () => {
    const { mediaQueryList } = mockMatchMedia(false)
    const { unmount } = renderHook(() => useIsMobile())
    unmount()
    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('defaults to false when window.matchMedia is unavailable', () => {
    const original = window.matchMedia
    // @ts-expect-error simulating an environment without matchMedia support
    delete window.matchMedia
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
    window.matchMedia = original
  })
})
