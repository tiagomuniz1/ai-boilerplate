'use client'

import { useState } from 'react'
import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useAppointmentPhotos } from '../hooks/use-appointment-photos.hook'
import { useUploadConsultationPhotos } from '../hooks/use-upload-consultation-photos.hook'
import { useDeleteConsultationPhoto } from '../hooks/use-delete-consultation-photo.hook'
import { PhotoGridSkeleton } from './photo-grid-skeleton'
import { PhotoThumbnail } from './photo-thumbnail'
import { PhotoUpload } from './photo-upload'
import { PhotoPreviewModal } from './photo-preview-modal'
import { PhotoDeleteDialog } from './photo-delete-dialog'
import type { IApiError } from '@/types/api.types'

export interface PhotoSectionProps {
  appointmentId: string
  canManage: boolean
  userRole: UserRole
}

export function PhotoSection({ appointmentId, canManage, userRole }: PhotoSectionProps) {
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: photos, isLoading, isError } = useAppointmentPhotos(appointmentId)
  const { mutate: upload, isPending: isUploading, error: uploadError } = useUploadConsultationPhotos(appointmentId)
  const { mutate: deletePhoto, isPending: isDeleting } = useDeleteConsultationPhoto(appointmentId)

  const isProfessional = userRole === UserRole.PROFESSIONAL
  const canUploadOrDelete = isProfessional && canManage
  const previewIndex = photos?.findIndex((photo) => photo.id === previewId) ?? -1
  const previewPhoto = previewIndex >= 0 ? photos![previewIndex] : null

  function handleDeleteConfirm() {
    // Only reachable while the delete dialog is open, which requires deletingId to be set
    // (PhotoDeleteDialog's isOpen is `!!deletingId`), so deletingId is guaranteed here.
    deletePhoto(deletingId!, {
      onSuccess: () => {
        setDeletingId(null)
        setPreviewId(null)
      },
    })
  }

  const uploadApiError = uploadError as IApiError | null
  const uploadGlobalError =
    uploadApiError?.status === 422
      ? 'Arquivo inválido. Verifique o tipo (JPEG, PNG ou WebP) e o tamanho (máx. 8MB).'
      : uploadApiError?.status === 403
        ? 'Você não tem permissão para enviar fotos nesta consulta.'
        : uploadApiError
          ? 'Ocorreu um erro ao enviar as fotos. Tente novamente.'
          : null

  return (
    <>
      <div data-testid="photo-section">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">Fotos</h2>
            <p className="text-sm text-text-mute">Fotos de evolução do tratamento, organizadas por data de envio.</p>
          </div>
        </div>

        {canUploadOrDelete && (
          <div className="mb-4">
            <PhotoUpload isPending={isUploading} onUpload={(files) => upload(files)} />
            {uploadGlobalError && (
              <p className="mt-1 text-xs text-danger" data-testid="photo-section-upload-error">
                {uploadGlobalError}
              </p>
            )}
          </div>
        )}

        {isLoading && <PhotoGridSkeleton />}

        {isError && !isLoading && (
          <Alert variant="error" data-testid="photo-section-error">
            Não foi possível carregar as fotos. Tente novamente.
          </Alert>
        )}

        {!isLoading && !isError && photos && photos.length === 0 && (
          <p className="text-sm text-text-mute" data-testid="photo-section-empty">
            Nenhuma foto enviada.
          </p>
        )}

        {!isLoading && !isError && photos && photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" data-testid="photo-section-grid">
            {photos.map((photo) => (
              <PhotoThumbnail
                key={photo.id}
                photoId={photo.id}
                fileName={photo.fileName}
                createdAt={photo.createdAt}
                onClick={() => setPreviewId(photo.id)}
              />
            ))}
          </div>
        )}
      </div>

      <PhotoPreviewModal
        photo={previewPhoto}
        onClose={() => setPreviewId(null)}
        canDelete={canUploadOrDelete}
        isDeleting={isDeleting}
        onDelete={(id) => setDeletingId(id)}
        hasPrevious={previewIndex > 0}
        hasNext={previewIndex >= 0 && previewIndex < (photos?.length ?? 0) - 1}
        onPrevious={() => setPreviewId(photos![previewIndex - 1].id)}
        onNext={() => setPreviewId(photos![previewIndex + 1].id)}
      />

      <PhotoDeleteDialog
        isOpen={!!deletingId}
        isPending={isDeleting}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
