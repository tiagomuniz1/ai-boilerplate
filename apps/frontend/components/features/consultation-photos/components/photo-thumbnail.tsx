'use client'

import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { usePhotoThumbnail } from '../hooks/use-photo-thumbnail.hook'

export interface PhotoThumbnailProps {
  photoId: string
  fileName: string
  createdAt: Date
  onClick?: () => void
}

export function PhotoThumbnail({ photoId, fileName, createdAt, onClick }: PhotoThumbnailProps) {
  const { url, isLoading, isError } = usePhotoThumbnail(photoId)

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`photo-thumbnail-${photoId}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface-2 text-left transition-colors hover:border-accent"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
        {isLoading && (
          <Skeleton
            data-testid={`photo-thumbnail-loading-${photoId}`}
            className="h-full w-full rounded-none"
          />
        )}

        {isError && !isLoading && (
          <div
            data-testid={`photo-thumbnail-error-${photoId}`}
            className="flex h-full w-full items-center justify-center text-text-mute"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 16l4-4a2 2 0 012.8 0L16 17M14 13l1.5-1.5a2 2 0 012.8 0L21 14M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        )}

        {url && !isLoading && !isError && (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL, next/image doesn't support it
          <img
            src={url}
            alt={fileName}
            loading="lazy"
            data-testid={`photo-thumbnail-image-${photoId}`}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        )}
      </div>
      <span className="px-2 py-1.5 text-xs text-text-mute" data-testid={`photo-thumbnail-date-${photoId}`}>
        {createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
      </span>
    </button>
  )
}
