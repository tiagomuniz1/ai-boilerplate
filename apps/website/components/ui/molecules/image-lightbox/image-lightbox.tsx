'use client'

import { useEffect } from 'react'
import { useImageLightboxStore } from '@/stores/image-lightbox.store'

/** Full-size preview of a product screenshot, opened by clicking any ScreenshotImage. */
export function ImageLightbox() {
  const src = useImageLightboxStore((s) => s.src)
  const alt = useImageLightboxStore((s) => s.alt)
  const close = useImageLightboxStore((s) => s.close)

  useEffect(() => {
    if (!src) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [src, close])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight/80 p-4"
      onClick={close}
      data-testid="image-lightbox-backdrop"
    >
      <div
        className="relative max-h-full max-w-5xl"
        onClick={(event) => event.stopPropagation()}
        data-testid="image-lightbox"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fechar"
          data-testid="image-lightbox-close"
          className="absolute -top-10 right-0 text-2xl text-warm-white transition-colors hover:text-terracotta"
        >
          ✕
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element -- full-size preview of an already-optimized image; no need for next/image here */}
        <img src={src} alt={alt} className="max-h-[85vh] w-auto rounded-2xl shadow-hero" />
      </div>
    </div>
  )
}
