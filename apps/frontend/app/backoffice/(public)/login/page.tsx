import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/features/auth/components/login-form'
import { isSubdomainMode } from '@/lib/subdomain'

export default function BackofficeLoginPage() {
  const cookieStore = cookies()
  if (cookieStore.get('access_token')) {
    redirect(`${isSubdomainMode() ? '' : '/backoffice'}/clinics`)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src="/brand/pulso-logo-light.png"
            alt="Pulso"
            className="max-h-14 max-w-[220px] object-contain dark:hidden"
          />
          <img
            src="/brand/pulso-logo-dark.png"
            alt="Pulso"
            className="hidden max-h-14 max-w-[220px] object-contain dark:block"
          />
          <p className="text-sm text-text-dim">Acesse a administração da plataforma</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
