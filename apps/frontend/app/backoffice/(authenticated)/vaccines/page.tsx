import { VaccineList } from '@/components/features/vaccines/components/vaccine-list'

export default function VaccinesPage() {
  return (
    <main className="p-6 sm:p-8" data-testid="vaccines-page">
      <VaccineList />
    </main>
  )
}
