import { UserList } from '@/components/features/users/components/user-list'

export default function UsersPage() {
  return (
    <main className="p-8" data-testid="users-page">
      <UserList />
    </main>
  )
}
