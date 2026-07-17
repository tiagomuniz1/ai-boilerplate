'use client'

import Image from 'next/image'
import { useImageLightboxStore } from '@/stores/image-lightbox.store'

export interface ScreenshotImageProps {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
  className?: string
}

/** Product screenshot that opens a full-size ImageLightbox preview when clicked. */
export function ScreenshotImage({ src, alt, width, height, priority, className }: ScreenshotImageProps) {
  const open = useImageLightboxStore((s) => s.open)

  return (
    <button
      type="button"
      onClick={() => open(src, alt)}
      aria-label={`Ampliar imagem: ${alt}`}
      data-testid="screenshot-image-trigger"
      className="block w-full cursor-zoom-in appearance-none border-0 bg-transparent p-0 text-left"
    >
      <Image src={src} alt={alt} width={width} height={height} priority={priority} className={className} />
    </button>
  )
}
