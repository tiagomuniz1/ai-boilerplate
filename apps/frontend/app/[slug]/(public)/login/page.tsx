import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/features/auth/components/login-form'
import { isSubdomainMode } from '@/lib/subdomain'

interface ClinicBranding {
  name: string
  logoUrl: string | null
  logoDarkUrl: string | null
}

async function getClinicBranding(slug: string): Promise<ClinicBranding | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/clinics/slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    return { name: data.name ?? slug, logoUrl: data.logoUrl ?? null, logoDarkUrl: data.logoDarkUrl ?? null }
  } catch {
    return null
  }
}

export default async function LoginPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies()
  if (cookieStore.get(`access_token_${params.slug}`)) {
    redirect(`${isSubdomainMode() ? '' : `/${params.slug}`}/dashboard`)
  }

  const branding = await getClinicBranding(params.slug)

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          {branding?.logoUrl && (
            <img
              src={branding.logoUrl}
              alt={branding.name}
              className={`max-h-16 max-w-[200px] object-contain${branding.logoDarkUrl ? ' dark:hidden' : ''}`}
            />
          )}
          {branding?.logoDarkUrl && (
            <img
              src={branding.logoDarkUrl}
              alt={branding.name}
              className={`max-h-16 max-w-[200px] object-contain${branding.logoUrl ? ' hidden dark:block' : ''}`}
            />
          )}
          {!branding?.logoUrl && !branding?.logoDarkUrl && (
            <h1 className="text-2xl font-bold text-text">{branding?.name ?? params.slug}</h1>
          )}
          <p className="text-sm text-text-dim">Acesse sua conta para continuar</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
