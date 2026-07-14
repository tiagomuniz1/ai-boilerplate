'use client'

import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { useAuthStore } from '@/stores/auth.store'
import { UserRole } from '@app/shared'
import { useTemplates } from '../hooks/use-templates.hook'
import { TemplateListSkeleton } from './template-list-skeleton'

export function TemplateList() {
  const basePath = useBasePath()
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === UserRole.ADMIN

  const { data: paginated, isPending, isError } = useTemplates()

  return (
    <div className="flex flex-col gap-6" data-testid="template-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Modelos de prontuário</h1>
          {!isPending && !isError && paginated && (
            <p className="mt-0.5 text-sm text-text-dim">
              {paginated.total === 1 ? '1 modelo cadastrado' : `${paginated.total} modelos cadastrados`}
            </p>
          )}
        </div>
        {isAdmin && (
          <Link href={`${basePath}/medical-record-templates/new`} className="block sm:inline-block">
            <Button variant="primary" data-testid="template-list-new-button" className="w-full sm:w-auto">
              + Novo modelo
            </Button>
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && <TemplateListSkeleton />}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="template-list-error">
              Não foi possível carregar a lista de modelos. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && (!paginated || paginated.data.length === 0) && (
          <div className="py-16 text-center" data-testid="template-list-empty">
            <p className="text-sm text-text-dim">Nenhum modelo de prontuário encontrado.</p>
          </div>
        )}

        {!isPending && !isError && paginated && paginated.data.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left" data-testid="template-list-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Especialidade
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Campos
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.data.map((template) => (
                  <tr
                    key={template.id}
                    data-testid={`template-row-${template.id}`}
                    className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors duration-100"
                  >
                    <td
                      className="px-6 py-4 text-sm font-medium text-text"
                      data-testid={`template-name-${template.id}`}
                    >
                      {template.name}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-text-dim"
                      data-testid={`template-specialty-${template.id}`}
                    >
                      {template.specialtyName ?? 'Generalista'}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-text-dim"
                      data-testid={`template-fields-count-${template.id}`}
                    >
                      {template.fields.length}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        data-testid={`template-status-${template.id}`}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          template.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-line text-text-mute'
                        }`}
                      >
                        {template.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`${basePath}/medical-record-templates/${template.id}`}
                        data-testid={`template-view-link-${template.id}`}
                        className="text-xs text-text-mute hover:text-text transition-colors"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isPending && !isError && paginated && paginated.data.length > 0 && (
          <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="template-list-cards">
            {paginated.data.map((template) => (
              <MobileListCard
                key={template.id}
                data-testid={`template-card-${template.id}`}
                title={template.name}
                rows={[
                  { label: 'Especialidade', value: template.specialtyName ?? 'Generalista' },
                  { label: 'Campos', value: template.fields.length },
                  {
                    label: 'Status',
                    value: (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          template.isActive ? 'bg-success/10 text-success' : 'bg-line text-text-mute'
                        }`}
                      >
                        {template.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    ),
                  },
                ]}
                actions={
                  <Link
                    href={`${basePath}/medical-record-templates/${template.id}`}
                    data-testid={`template-card-view-link-${template.id}`}
                    className="flex items-center gap-1 text-xs text-text-mute transition-colors hover:text-text"
                  >
                    Ver detalhes
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                }
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
