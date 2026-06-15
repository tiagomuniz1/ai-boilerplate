import { notFound } from 'next/navigation'
import { SlugProvider } from '@/lib/slug-context'

async function validateClinicSlug(slug: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/clinics/slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 } },
    )
    return res.ok
  } catch {
    return true
  }
}

export default async function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const exists = await validateClinicSlug(params.slug)
  if (!exists) notFound()

  return <SlugProvider slug={params.slug}>{children}</SlugProvider>
}
