'use client'

import { useState } from 'react'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { usePatientPhotos } from '../hooks/use-patient-photos.hook'
import { PhotoGridSkeleton } from './photo-grid-skeleton'
import { PhotoThumbnail } from './photo-thumbnail'
import { PhotoPreviewModal } from './photo-preview-modal'

export interface PatientPhotoGalleryProps {
  patientId: string
}

const LIMIT = 20

export function PatientPhotoGallery({ patientId }: PatientPhotoGalleryProps) {
  const [page, setPage] = useState(1)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const { data, isLoading, isFetching, isError } = usePatientPhotos(patientId, page, LIMIT)

  const previewIndex = data?.data.findIndex((photo) => photo.id === previewId) ?? -1
  const previewPhoto = previewIndex >= 0 ? data!.data[previewIndex] : null
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  return (
    <>
      <div data-testid="patient-photo-gallery">
        {isLoading && <PhotoGridSkeleton />}

        {isError && !isLoading && (
          <Alert variant="error" data-testid="patient-photo-gallery-error">
            Não foi possível carregar as fotos. Tente novamente.
          </Alert>
        )}

        {!isLoading && !isError && data && data.data.length === 0 && (
          <p className="text-sm text-text-mute" data-testid="patient-photo-gallery-empty">
            Nenhuma foto registrada para este paciente ainda.
          </p>
        )}

        {!isLoading && !isError && data && data.data.length > 0 && (
          <>
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
              data-testid="patient-photo-gallery-grid"
            >
              {data.data.map((photo) => (
                <div key={photo.id} className="flex flex-col gap-1">
                  <PhotoThumbnail
                    photoId={photo.id}
                    fileName={photo.fileName}
                    createdAt={photo.createdAt}
                    onClick={() => setPreviewId(photo.id)}
                  />
                  <p
                    className="truncate px-0.5 text-xs text-text-mute"
                    data-testid={`patient-photo-gallery-item-meta-${photo.id}`}
                  >
                    <span data-testid={`patient-photo-gallery-item-professional-${photo.id}`}>
                      {photo.professionalName}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1 || isFetching}
                  data-testid="patient-photo-gallery-prev-page"
                >
                  Anterior
                </Button>
                <span className="text-sm text-text-mute" data-testid="patient-photo-gallery-page-info">
                  {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages || isFetching}
                  data-testid="patient-photo-gallery-next-page"
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <PhotoPreviewModal
        photo={previewPhoto}
        onClose={() => setPreviewId(null)}
        canDelete={false}
        hasPrevious={previewIndex > 0}
        hasNext={previewIndex >= 0 && previewIndex < (data?.data.length ?? 0) - 1}
        onPrevious={() => setPreviewId(data!.data[previewIndex - 1].id)}
        onNext={() => setPreviewId(data!.data[previewIndex + 1].id)}
      />
    </>
  )
}
