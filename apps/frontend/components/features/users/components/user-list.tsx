'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { useAuthStore } from '@/stores/auth.store'
import { useUsers } from '../hooks/use-users.hook'
import { useDeleteUser } from '../hooks/use-delete-user.hook'
import { UserTableRow } from './user-table-row'
import { DeleteUserDialog } from './delete-user-dialog'
import type { IUserModel } from '../types/user-model.types'

export function UserList() {
  const { data: users, isPending, isError } = useUsers()
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

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Usuários</h1>
          {!isPending && !isError && users && (
            <p className="mt-0.5 text-sm text-text-dim">
              {userCount === 1 ? '1 usuário cadastrado' : `${userCount} usuários cadastrados`}
            </p>
          )}
        </div>
        <Link href="/users/new">
          <Button variant="primary" data-testid="user-list-new-button">
            + Novo usuário
          </Button>
        </Link>
      </div>

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
          <div className="overflow-x-auto">
            <table className="w-full text-left" data-testid="user-list-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Usuário</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Status</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Role</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Criado em</th>
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
