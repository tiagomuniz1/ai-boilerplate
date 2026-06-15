'use client'

import { createContext, useContext } from 'react'

const SlugContext = createContext<string>('')

export function SlugProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  return <SlugContext.Provider value={slug}>{children}</SlugContext.Provider>
}

export function useSlug(): string {
  return useContext(SlugContext)
}

export function useClinicPath(path: string): string {
  const slug = useContext(SlugContext)
  return `/${slug}${path}`
}
