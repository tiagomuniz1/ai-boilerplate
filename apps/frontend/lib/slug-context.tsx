'use client'

import { createContext, useContext } from 'react'
import { isSubdomainMode } from '@/lib/subdomain'

const SlugContext = createContext<string>('')

export function SlugProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  return <SlugContext.Provider value={slug}>{children}</SlugContext.Provider>
}

export function useSlug(): string {
  return useContext(SlugContext)
}

// Prefix for building in-app links. Empty in subdomain-mode (the slug lives in the
// host and the middleware re-adds it to the path); "/<slug>" in path-mode (local
// dev). Keeps the browser URL clean under a subdomain (backoffice.example.com/clinics)
// while local dev stays path-based (localhost:3000/backoffice/clinics).
export function useBasePath(): string {
  const slug = useContext(SlugContext)
  return isSubdomainMode() ? '' : `/${slug}`
}

export function useClinicPath(path: string): string {
  return `${useBasePath()}${path}`
}
