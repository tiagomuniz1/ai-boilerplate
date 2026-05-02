'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
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

  return (
    <div className="flex flex-col gap-4" data-testid="user-list">
      <div className="flex items-center justify-between">
        <Typography variant="h2">Usuários</Typography>
        <Link href="/users/new">
          <Button variant="primary" data-testid="user-list-new-button">
            Novo usuário
          </Button>
        </Link>
      </div>

      {successMessage && (
        <Alert variant="success" data-testid="user-list-success">
          {successMessage}
        </Alert>
      )}

      {isPending && (
        <div className="flex flex-col gap-2" data-testid="user-list-skeleton">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={48} className="w-full" />
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="error" data-testid="user-list-error">
          Não foi possível carregar a lista de usuários. Tente novamente.
        </Alert>
      )}

      {!isPending && !isError && users && users.length === 0 && (
        <div className="py-12 text-center" data-testid="user-list-empty">
          <Typography variant="body" className="text-text-dim">
            Nenhum usuário encontrado.
          </Typography>
        </div>
      )}

      {!isPending && !isError && users && users.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-left" data-testid="user-list-table">
            <thead className="bg-surface-2 border-b border-line">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-text-dim">Nome</th>
                <th className="px-4 py-3 text-sm font-medium text-text-dim">Email</th>
                <th className="px-4 py-3 text-sm font-medium text-text-dim">Role</th>
                <th className="px-4 py-3 text-sm font-medium text-text-dim">Criado em</th>
                <th className="px-4 py-3 text-sm font-medium text-text-dim">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
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
