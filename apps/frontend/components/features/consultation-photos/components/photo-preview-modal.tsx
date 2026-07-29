'use client'

import { useEffect } from 'react'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { usePhotoThumbnail } from '../hooks/use-photo-thumbnail.hook'
import type { IConsultationPhotoModel, IConsultationPhotoGalleryItemModel } from '../types/consultation-photo-model.types'

export interface PhotoPreviewModalProps {
  photo: IConsultationPhotoModel | IConsultationPhotoGalleryItemModel | null
  onClose: () => void
  canDelete: boolean
  isDeleting?: boolean
  onDelete?: (photoId: string) => void
  hasPrevious?: boolean
  hasNext?: boolean
  onPrevious?: () => void
  onNext?: () => void
}

function isGalleryItem(
  photo: IConsultationPhotoModel | IConsultationPhotoGalleryItemModel,
): photo is IConsultationPhotoGalleryItemModel {
  return 'professionalName' in photo
}

function NavArrow({
  direction,
  onClick,
}: {
  direction: 'previous' | 'next'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'previous' ? 'Foto anterior' : 'Próxima foto'}
      data-testid={`photo-preview-${direction}-button`}
      className={`absolute top-1/2 -translate-y-1/2 ${direction === 'previous' ? 'left-2' : 'right-2'} flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-text shadow-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={direction === 'previous' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export function PhotoPreviewModal({
  photo,
  onClose,
  canDelete,
  isDeleting,
  onDelete,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: PhotoPreviewModalProps) {
  const { url, isLoading, isError } = usePhotoThumbnail(photo?.id ?? '')

  useEffect(() => {
    if (!photo) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' && hasPrevious) onPrevious?.()
      if (event.key === 'ArrowRight' && hasNext) onNext?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [photo, hasPrevious, hasNext, onPrevious, onNext])

  if (!photo) return null

  return (
    <Modal isOpen onClose={onClose} title="Foto da consulta" className="max-w-xl" data-testid="photo-preview-modal">
      <div className="flex flex-col gap-4" data-testid="photo-preview-content">
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2">
          {isLoading && (
            <Skeleton data-testid="photo-preview-loading" className="h-full w-full rounded-none" />
          )}

          {isError && !isLoading && (
            <p className="text-sm text-text-mute" data-testid="photo-preview-error">
              Não foi possível carregar a foto.
            </p>
          )}

          {url && !isLoading && !isError && (
            // eslint-disable-next-line @next/next/no-img-element -- blob: URL, next/image doesn't support it
            <img
              src={url}
              alt={photo.fileName}
              data-testid="photo-preview-image"
              className="h-full w-full object-contain"
            />
          )}

          {hasPrevious && onPrevious && <NavArrow direction="previous" onClick={onPrevious} />}
          {hasNext && onNext && <NavArrow direction="next" onClick={onNext} />}
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-mute">Enviada em</p>
            <p className="text-text" data-testid="photo-preview-date">
              {photo.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {isGalleryItem(photo) && (
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-text-mute">Profissional</p>
              <p className="text-text" data-testid="photo-preview-professional">
                {photo.professionalName}
              </p>
            </div>
          )}
        </div>

        {canDelete && onDelete && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onDelete(photo.id)}
              disabled={isDeleting}
              isLoading={isDeleting}
              className="text-danger hover:text-danger"
              data-testid="photo-preview-delete-button"
            >
              Excluir
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
