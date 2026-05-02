import { Header } from '@/components/ui/organisms/header/header'
import { Sidebar } from '@/components/ui/organisms/sidebar/sidebar'
import { AuthInitializer } from '@/components/features/auth/components/auth-initializer'

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <AuthInitializer />
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
