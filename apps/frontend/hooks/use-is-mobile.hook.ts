import { useEffect, useState } from 'react'

const MOBILE_QUERY = '(max-width: 639px)'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia(MOBILE_QUERY)
    setIsMobile(mediaQuery.matches)

    function handleChange(event: MediaQueryListEvent) {
      setIsMobile(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}
