import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RegisterClinicForm } from '@/components/features/clinics/components/register-clinic-form'

export default function RegisterPage() {
  const cookieStore = cookies()
  if (cookieStore.get('access_token')) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text">Criar nova clínica</h1>
          <p className="mt-2 text-sm text-text-dim">
            Preencha os dados abaixo para registrar sua clínica na plataforma
          </p>
        </div>
        <RegisterClinicForm />
        <p className="text-center text-sm text-text-dim">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </main>
  )
}
