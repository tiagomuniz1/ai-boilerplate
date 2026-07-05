import { Header } from '@/components/ui/organisms/header/header'
import { Sidebar } from '@/components/ui/organisms/sidebar/sidebar'
import { AuthInitializer } from '@/components/features/auth/components/auth-initializer'
import { ClinicThemeProvider } from '@/components/features/themes/components/clinic-theme-provider'
import { ClinicFaviconApplier } from '@/components/features/clinics/components/clinic-favicon-applier'

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <AuthInitializer />
      <ClinicThemeProvider />
      <ClinicFaviconApplier />
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
