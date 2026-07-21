'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { useAuthStore } from '@/stores/auth.store'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { useUsers } from '../hooks/use-users.hook'
import { useDeleteUser } from '../hooks/use-delete-user.hook'
import { UserTableRow, getInitials, roleBadge } from './user-table-row'
import { DeleteUserDialog } from './delete-user-dialog'
import type { IUserModel } from '../types/user-model.types'
import { cn } from '@/lib/cn'

export function UserList() {
  const basePath = useBasePath()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const params = debouncedSearch ? { search: debouncedSearch } : undefined
  const { data: users, isPending, isError } = useUsers(params)
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser()
  const currentUser = useAuthStore((state) => state.user)

  const [userToDelete, setUserToDelete] = useState<IUserModel | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function handleDeleteClick(user: IUserModel) {
    setUserToDelete(user)
  }

  function handleDeleteClose() {
    setUserToDelete(null)
  }

  function handleDeleteConfirm() {
    /* c8 ignore next */
    if (!userToDelete) return

    deleteUser(userToDelete.id, {
      onSuccess: () => {
        setUserToDelete(null)
        setSuccessMessage(`Usuário ${userToDelete.fullName} excluído com sucesso.`)
        setTimeout(() => setSuccessMessage(null), 5000)
      },
      onError: () => {
        setUserToDelete(null)
      },
    })
  }

  const userCount = users?.length ?? 0

  return (
    <div className="flex flex-col gap-6" data-testid="user-list">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Usuários</h1>
          {!isPending && !isError && users && (
            <p className="mt-0.5 text-sm text-text-dim">
              {userCount === 1 ? '1 usuário cadastrado' : `${userCount} usuários cadastrados`}
            </p>
          )}
        </div>
        <Link href={`${basePath}/users/new`} className="block sm:inline-block">
          <Button variant="primary" data-testid="user-list-new-button" className="w-full sm:w-auto">
            + Novo usuário
          </Button>
        </Link>
      </div>

      <Input
        placeholder="Buscar por nome..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        data-testid="user-list-search"
      />

      {successMessage && (
        <Alert variant="success" data-testid="user-list-success">
          {successMessage}
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">

        {isPending && (
          <div data-testid="user-list-skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-line px-6 py-4 last:border-0">
                <Skeleton width={36} height={36} className="rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton height={12} className="w-40" />
                  <Skeleton height={10} className="w-32" />
                </div>
                <Skeleton height={20} className="w-16 rounded-full" />
                <Skeleton height={12} className="w-24" />
                <Skeleton height={12} className="w-20" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="user-list-error">
              Não foi possível carregar a lista de usuários. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && users && users.length === 0 && (
          <div className="py-16 text-center" data-testid="user-list-empty">
            <p className="text-sm text-text-dim">Nenhum usuário encontrado.</p>
          </div>
        )}

        {!isPending && !isError && users && users.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left" data-testid="user-list-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Usuário</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Status</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Role</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Perfis</th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute lg:table-cell">Criado em</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    isCurrentUser={user.id === currentUser?.id}
                    onDeleteClick={handleDeleteClick}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isPending && !isError && users && users.length > 0 && (
          <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="user-list-cards">
            {users.map((user) => {
              const badge = roleBadge[user.role]
              const isCurrentUser = user.id === currentUser?.id
              return (
                <MobileListCard
                  key={user.id}
                  data-testid={`user-card-${user.id}`}
                  title={
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warm-soft text-xs font-semibold text-warm select-none">
                        {getInitials(user.fullName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{user.fullName}</span>
                        <span className="block truncate text-xs font-normal text-text-dim">{user.email}</span>
                      </span>
                    </span>
                  }
                  rows={[
                    {
                      label: 'Status',
                      value: (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            user.isActive ? 'bg-good-soft text-good' : 'bg-danger-soft text-danger',
                          )}
                        >
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      ),
                    },
                    {
                      label: 'Role',
                      value: (
                        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badge.className)}>
                          {badge.label}
                        </span>
                      ),
                    },
                    {
                      label: 'Perfis',
                      value: user.isProfessional
                        ? 'Profissional'
                        /* c8 ignore next */
                        : user.isPatient
                          ? 'Paciente'
                          : '—',
                    },
                    {
                      label: 'Criado em',
                      value: user.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
                    },
                  ]}
                  actions={
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(user)}
                        disabled={isCurrentUser}
                        title={isCurrentUser ? 'Não é possível excluir o próprio usuário' : undefined}
                        data-testid={`user-card-delete-button-${user.id}`}
                        className="text-xs text-danger hover:text-danger/80"
                      >
                        Excluir
                      </Button>
                      <Link
                        href={`${basePath}/users/${user.id}/edit`}
                        data-testid={`user-card-edit-link-${user.id}`}
                        className="text-xs text-text-mute hover:text-text transition-colors"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`${basePath}/users/${user.id}`}
                        data-testid={`user-card-view-link-${user.id}`}
                        className="ml-auto flex items-center gap-1 text-xs text-text-mute transition-colors hover:text-text"
                      >
                        Ver detalhes
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    </>
                  }
                />
              )
            })}
          </ul>
        )}

      </div>

      <DeleteUserDialog
        user={userToDelete}
        isOpen={userToDelete !== null}
        isPending={isDeleting}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
