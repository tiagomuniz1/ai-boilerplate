import { MedicationList } from '@/components/features/medications/components/medication-list'

export default function MedicationsPage() {
  return (
    <main className="p-6 sm:p-8" data-testid="medications-page">
      <MedicationList />
    </main>
  )
}
