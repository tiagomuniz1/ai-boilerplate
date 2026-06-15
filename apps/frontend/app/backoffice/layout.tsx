import { SlugProvider } from '@/lib/slug-context'

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return <SlugProvider slug="backoffice">{children}</SlugProvider>
}
