import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/features/auth/components/login-form'

export default function LoginPage() {
  const cookieStore = cookies()
  if (cookieStore.get('access_token')) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text">Entrar</h1>
          <p className="mt-2 text-sm text-text-dim">Acesse sua conta para continuar</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
