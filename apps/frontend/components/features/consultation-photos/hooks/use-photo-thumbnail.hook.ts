'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchConsultationPhotoBlobUseCase } from '../use-cases/fetch-consultation-photo-blob.use-case'

export interface IPhotoThumbnail {
  url: string | null
  isLoading: boolean
  isError: boolean
}

// The file never changes after upload, so the Blob itself can be cached indefinitely.
// The object URL is NOT stored in the React Query cache — it's created/revoked here,
// scoped to this hook's lifecycle, to avoid leaking blob: URLs as photoId changes or
// the consuming component unmounts.
export function usePhotoThumbnail(photoId: string): IPhotoThumbnail {
  const { data: blob, isLoading, isError } = useQuery({
    queryKey: ['photo-thumbnail', photoId],
    queryFn: () => fetchConsultationPhotoBlobUseCase(photoId),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    enabled: Boolean(photoId),
  })

  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [blob])

  return { url, isLoading, isError }
}
