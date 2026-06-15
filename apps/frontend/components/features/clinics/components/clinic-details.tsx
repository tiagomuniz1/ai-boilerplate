'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { useTheme } from '@/components/features/themes/hooks/use-theme.hook'
import { ClinicUploadSection } from './clinic-upload-section'
import type { IClinicModel } from '../types/clinic.types'

interface ClinicDetailsProps {
  clinic: IClinicModel
}

function DetailRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wider text-text-mute">{label}</span>
      <span className="text-sm text-text" data-testid={testId}>
        {value}
      </span>
    </div>
  )
}

export function ClinicDetails({ clinic }: ClinicDetailsProps) {
  const { data: theme } = useTheme(clinic.themeId ?? '')

  return (
    <div className="flex flex-col gap-6" data-testid="clinic-details">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography variant="h2" data-testid="clinic-details-name">
            {clinic.name}
          </Typography>
          <p className="mt-0.5 font-mono text-sm text-text-dim" data-testid="clinic-details-slug">
            {clinic.slug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/backoffice/clinics/${clinic.id}/users/new`}>
            <Button variant="secondary" size="sm" data-testid="clinic-details-new-user-button">
              + Usuário
            </Button>
          </Link>
          <Link href={`/backoffice/clinics/${clinic.id}/edit`}>
            <Button variant="ghost" size="sm" data-testid="clinic-details-edit-button">
              Editar
            </Button>
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
          <div className="bg-surface px-6 py-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wider text-text-mute">
                Status
              </span>
              <span data-testid="clinic-details-status">
                {clinic.isActive ? (
                  <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                    Ativa
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger"
                    data-testid="clinic-details-inactive-badge"
                  >
                    Inativa
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow label="Slug" value={clinic.slug} testId="clinic-details-slug-field" />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Cadastrada em"
              value={clinic.createdAt.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              testId="clinic-details-created-at"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Atualizada em"
              value={clinic.updatedAt.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              testId="clinic-details-updated-at"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wider text-text-mute">
                Tema
              </span>
              <span data-testid="clinic-details-theme">
                {theme ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-4 rounded-full border border-line"
                      style={{ background: theme.accentColor }}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-text">{theme.name}</span>
                  </span>
                ) : (
                  <span className="text-sm text-text-mute">
                    {clinic.themeId ? '—' : 'Padrão da plataforma'}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {clinic.address ? (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm" data-testid="clinic-details-address">
          <div className="border-b border-line px-6 py-3">
            <span className="text-xs font-medium uppercase tracking-wider text-text-mute">Endereço</span>
          </div>
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
            <div className="bg-surface px-6 py-4">
              <DetailRow
                label="Logradouro"
                value={`${clinic.address.street}, ${clinic.address.number}`}
                testId="clinic-details-address-street"
              />
            </div>
            {clinic.address.complement && (
              <div className="bg-surface px-6 py-4">
                <DetailRow
                  label="Complemento"
                  value={clinic.address.complement}
                  testId="clinic-details-address-complement"
                />
              </div>
            )}
            <div className="bg-surface px-6 py-4">
              <DetailRow
                label="Bairro"
                value={clinic.address.neighborhood}
                testId="clinic-details-address-neighborhood"
              />
            </div>
            <div className="bg-surface px-6 py-4">
              <DetailRow
                label="Cidade / UF"
                value={`${clinic.address.city} — ${clinic.address.state}`}
                testId="clinic-details-address-city"
              />
            </div>
            <div className="bg-surface px-6 py-4">
              <DetailRow
                label="CEP"
                value={clinic.address.zipCode}
                testId="clinic-details-address-zipcode"
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl border border-line bg-surface px-6 py-4 text-sm text-text-mute"
          data-testid="clinic-details-no-address"
        >
          Endereço não cadastrado.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line px-6 py-3">
          <span className="text-xs font-medium uppercase tracking-wider text-text-mute">
            Identidade Visual
          </span>
        </div>
        <div className="px-6 py-4">
          <ClinicUploadSection clinic={clinic} />
        </div>
      </div>
    </div>
  )
}
