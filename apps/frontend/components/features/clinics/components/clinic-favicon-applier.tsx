'use client'

import { useEffect } from 'react'
import { useCurrentClinic } from '../hooks/use-current-clinic.hook'

const FAVICON_ATTR = 'data-clinic-favicon'

export function ClinicFaviconApplier() {
  const { data: clinic, isLoading } = useCurrentClinic()

  useEffect(() => {
    if (isLoading) return

    const existing = document.head.querySelector<HTMLLinkElement>(
      `link[rel="icon"][${FAVICON_ATTR}]`,
    )

    if (clinic?.faviconUrl) {
      if (existing) {
        existing.href = clinic.faviconUrl
      } else {
        const link = document.createElement('link')
        link.rel = 'icon'
        link.href = clinic.faviconUrl
        link.setAttribute(FAVICON_ATTR, 'true')
        document.head.appendChild(link)
      }
    } else {
      existing?.remove()
    }
  }, [clinic?.faviconUrl, isLoading])

  return null
}
