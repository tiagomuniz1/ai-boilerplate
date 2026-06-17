import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SlugProvider } from '@/lib/slug-context'

async function fetchClinicBySlug(slug: string): Promise<{ name: string } | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/clinics/slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const clinic = await fetchClinicBySlug(params.slug)
  const name = clinic?.name ?? params.slug
  return {
    title: name,
    description: `Sistema de gestão clínica — ${name}`,
  }
}

export default async function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const clinic = await fetchClinicBySlug(params.slug)
  if (!clinic) notFound()

  return <SlugProvider slug={params.slug}>{children}</SlugProvider>
}
