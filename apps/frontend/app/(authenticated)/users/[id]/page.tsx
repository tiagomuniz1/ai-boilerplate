'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { UserDetails } from '@/components/features/users/components/user-details'
import { DeleteUserDialog } from '@/components/features/users/components/delete-user-dialog'
import { useUser } from '@/components/features/users/hooks/use-user.hook'
import { useDeleteUser } from '@/components/features/users/hooks/use-delete-user.hook'

export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const currentUser = useAuthStore((state) => state.user)
  const isAdmin = currentUser?.role === UserRole.ADMIN
  const { data: user, isPending, isError } = useUser(id)
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  function handleDeleteConfirm() {
    deleteUser(id, {
      onSuccess: () => {
        router.push('/users')
      },
      onError: () => {
        setShowDeleteDialog(false)
      },
    })
  }

  return (
    <main className="p-6 max-w-2xl" data-testid="user-details-page">
      {isAdmin && (
        <div className="flex items-center gap-4 mb-6">
          <Link href="/users">
            <Button variant="ghost" size="sm" data-testid="user-details-back-button">
              ← Voltar
            </Button>
          </Link>
        </div>
      )}

      {isPending && (
        <div className="flex flex-col gap-4" data-testid="user-details-skeleton">
          <Skeleton height={32} className="w-64" />
          <Skeleton height={16} className="w-48" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={40} className="w-full" />
            ))}
          </div>
        </div>
      )}

      {isError && (
        <Alert variant="error" data-testid="user-details-error">
          Não foi possível carregar os dados do usuário. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isPending && !isError && user && (
        <UserDetails
          user={user}
          canDelete={isAdmin}
          onDeleteClick={() => setShowDeleteDialog(true)}
        />
      )}

      <DeleteUserDialog
        user={user ?? null}
        isOpen={showDeleteDialog}
        isPending={isDeleting}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
    </main>
  )
}
