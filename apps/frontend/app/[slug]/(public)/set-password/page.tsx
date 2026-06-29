import { SetPasswordForm } from '@/components/features/set-password/components/set-password-form'

export default function SetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl font-bold text-text">Definir senha</h1>
          <p className="text-sm text-text-dim">Crie uma senha para acessar sua conta.</p>
        </div>
        <SetPasswordForm />
      </div>
    </main>
  )
}
