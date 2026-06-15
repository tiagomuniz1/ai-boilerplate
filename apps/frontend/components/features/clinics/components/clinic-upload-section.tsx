'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useUploadClinicLogo } from '../hooks/use-upload-clinic-logo.hook'
import { useUploadClinicFavicon } from '../hooks/use-upload-clinic-favicon.hook'
import type { IClinicModel } from '../types/clinic.types'

function resetInput(input: HTMLInputElement) {
  try {
    input.value = ''
  } catch {
    // JSDOM does not support resetting file input value
  }
}

const LOGO_MAX_BYTES = 2 * 1024 * 1024
const FAVICON_MAX_BYTES = 512 * 1024
const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const FAVICON_TYPES = ['image/x-icon', 'image/png', 'image/svg+xml']

interface ClinicUploadSectionProps {
  clinic: IClinicModel
}

export function ClinicUploadSection({ clinic }: ClinicUploadSectionProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="clinic-upload-section">
      <LogoUpload clinicId={clinic.id} currentLogoUrl={clinic.logoUrl} clinicName={clinic.name} />
      <FaviconUpload clinicId={clinic.id} currentFaviconUrl={clinic.faviconUrl} />
    </div>
  )
}

interface LogoUploadProps {
  clinicId: string
  currentLogoUrl: string | null
  clinicName: string
}

function LogoUpload({ clinicId, currentLogoUrl, clinicName }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const { mutate, isPending } = useUploadClinicLogo(clinicId)

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)

    if (!LOGO_TYPES.includes(file.type)) {
      setError('Tipo inválido. Utilize JPEG, PNG ou WebP.')
            resetInput(event.target)
      return
    }

    if (file.size > LOGO_MAX_BYTES) {
      setError('Arquivo muito grande. O limite é 2MB.')
      resetInput(event.target)
      return
    }

    mutate(file, {
      onError: () => setError('Não foi possível enviar o arquivo. Tente novamente.'),
    })
    resetInput(event.target)
  }

  return (
    <div className="flex flex-col gap-3" data-testid="logo-upload">
      <span className="text-sm font-medium text-text">Logomarca</span>

      <div className="flex items-center gap-4">
        <div
          data-testid="logo-preview"
          className="w-16 h-16 rounded-[10px] overflow-hidden shrink-0 border border-line bg-surface grid place-items-center"
        >
          {currentLogoUrl ? (
            <Image
              src={currentLogoUrl}
              alt={clinicName}
              width={64}
              height={64}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-xl font-semibold text-text-mute">
              {clinicName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          isLoading={isPending}
          data-testid="logo-upload-button"
          onClick={() => inputRef.current?.click()}
        >
          {isPending ? 'Enviando...' : 'Alterar logo'}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={LOGO_TYPES.join(',')}
        className="hidden"
        data-testid="logo-file-input"
        onChange={handleChange}
      />

      {error && (
        <Alert variant="error" data-testid="logo-upload-error">
          {error}
        </Alert>
      )}
    </div>
  )
}

interface FaviconUploadProps {
  clinicId: string
  currentFaviconUrl: string | null
}

function FaviconUpload({ clinicId, currentFaviconUrl }: FaviconUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const { mutate, isPending } = useUploadClinicFavicon(clinicId)

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)

    if (!FAVICON_TYPES.includes(file.type)) {
      setError('Tipo inválido. Utilize ICO, PNG ou SVG.')
      resetInput(event.target)
      return
    }

    if (file.size > FAVICON_MAX_BYTES) {
      setError('Arquivo muito grande. O limite é 512KB.')
      resetInput(event.target)
      return
    }

    mutate(file, {
      onError: () => setError('Não foi possível enviar o arquivo. Tente novamente.'),
    })
    resetInput(event.target)
  }

  return (
    <div className="flex flex-col gap-3" data-testid="favicon-upload">
      <span className="text-sm font-medium text-text">Favicon</span>

      <div className="flex items-center gap-4">
        <div
          data-testid="favicon-preview"
          className="w-10 h-10 rounded border border-line bg-surface grid place-items-center shrink-0 overflow-hidden"
        >
          {currentFaviconUrl ? (
            <Image
              src={currentFaviconUrl}
              alt="Favicon"
              width={40}
              height={40}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-xs text-text-mute">ico</span>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          isLoading={isPending}
          data-testid="favicon-upload-button"
          onClick={() => inputRef.current?.click()}
        >
          {isPending ? 'Enviando...' : 'Alterar favicon'}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={FAVICON_TYPES.join(',')}
        className="hidden"
        data-testid="favicon-file-input"
        onChange={handleChange}
      />

      {error && (
        <Alert variant="error" data-testid="favicon-upload-error">
          {error}
        </Alert>
      )}
    </div>
  )
}
