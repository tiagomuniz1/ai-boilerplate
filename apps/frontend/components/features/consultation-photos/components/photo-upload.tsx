'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 8 * 1024 * 1024

function resetInput(input: HTMLInputElement) {
  try {
    input.value = ''
  /* c8 ignore start */
  } catch {
    // browser compatibility: some browsers throw when resetting file input value
  }
  /* c8 ignore stop */
}

export interface PhotoUploadProps {
  isPending: boolean
  onUpload: (files: File[]) => void
}

export function PhotoUpload({ isPending, onUpload }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    setError(null)

    if (files.some((file) => !ACCEPTED_TYPES.includes(file.type))) {
      setError('Tipo inválido. Utilize JPEG, PNG ou WebP.')
      resetInput(event.target)
      return
    }

    if (files.some((file) => file.size > MAX_SIZE_BYTES)) {
      setError('Arquivo muito grande. O limite é 8MB por arquivo.')
      resetInput(event.target)
      return
    }

    onUpload(files)
    resetInput(event.target)
  }

  return (
    <div className="flex flex-col gap-2" data-testid="photo-upload">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        isLoading={isPending}
        onClick={() => inputRef.current?.click()}
        data-testid="photo-upload-button"
      >
        {isPending ? 'Enviando...' : 'Enviar fotos'}
      </Button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        data-testid="photo-upload-input"
        onChange={handleChange}
      />

      {error && (
        <Alert variant="error" data-testid="photo-upload-error">
          {error}
        </Alert>
      )}
    </div>
  )
}
