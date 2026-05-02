'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/atoms/button/button'
import type { IUserModel } from '../types/user-model.types'

export interface UserTableRowProps {
  user: IUserModel
  isCurrentUser: boolean
  onDeleteClick: (user: IUserModel) => void
}

export function UserTableRow({ user, isCurrentUser, onDeleteClick }: UserTableRowProps) {
  return (
    <tr data-testid={`user-table-row-${user.id}`}>
      <td className="px-4 py-3 text-sm text-text" data-testid={`user-name-${user.id}`}>
        {user.fullName}
      </td>
      <td className="px-4 py-3 text-sm text-text" data-testid={`user-email-${user.id}`}>
        {user.email}
      </td>
      <td className="px-4 py-3 text-sm text-text-dim capitalize" data-testid={`user-role-${user.id}`}>
        {user.role}
      </td>
      <td className="px-4 py-3 text-sm text-text-dim" data-testid={`user-created-at-${user.id}`}>
        {user.createdAt.toLocaleDateString('pt-BR')}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/users/${user.id}/edit`}
            className="text-sm font-medium text-accent hover:underline"
            data-testid={`user-edit-link-${user.id}`}
          >
            Editar
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteClick(user)}
            disabled={isCurrentUser}
            title={isCurrentUser ? 'Não é possível excluir o próprio usuário' : undefined}
            data-testid={`user-delete-button-${user.id}`}
            className="text-danger hover:text-danger/80 border-danger/30"
          >
            Excluir
          </Button>
        </div>
      </td>
    </tr>
  )
}
