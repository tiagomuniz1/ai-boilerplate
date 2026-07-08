'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { usePatientMedicalHistory } from '../hooks/use-patient-medical-history.hook'
import { useMedicalRecord } from '../hooks/use-medical-record.hook'
import { MedicalRecordView } from './medical-record-view'
import type { IMedicalRecordModel } from '../types/medical-record-model.types'

interface PatientMedicalHistoryProps {
  patientId: string
}

function HistorySkeleton() {
  return (
    <div className="space-y-3" data-testid="patient-history-skeleton">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5 rounded-md border border-border p-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

function RecordDetailModal({
  recordId,
  isOpen,
  onClose,
}: {
  recordId: string
  isOpen: boolean
  onClose: () => void
}) {
  const { data: record, isLoading } = useMedicalRecord(recordId)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Prontuário">
      {isLoading && <div data-testid="record-detail-loading" className="py-4 text-sm text-text/50">Carregando...</div>}
      {record && <MedicalRecordView record={record} />}
    </Modal>
  )
}

interface HistoryCardProps {
  record: IMedicalRecordModel
  onClick: () => void
}

function HistoryCard({ record, onClick }: HistoryCardProps) {
  const formattedDate = record.createdAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="history-card"
      className="w-full rounded-md border border-border p-3 text-left transition-colors hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text" data-testid="history-card-date">
          {formattedDate}
        </span>
        <span className="text-xs text-text/50" data-testid="history-card-specialty">
          {record.specialtyName ?? 'Clínica geral'}
        </span>
      </div>
      <p className="mt-1 text-xs text-text/60" data-testid="history-card-doctor">
        {record.doctorName}
      </p>
    </button>
  )
}

export function PatientMedicalHistory({ patientId }: PatientMedicalHistoryProps) {
  const [page, setPage] = useState(1)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

  const { data, isLoading, isError } = usePatientMedicalHistory(patientId, { page, limit: 10 })

  if (isLoading) return <HistorySkeleton />

  if (isError) {
    return (
      <Alert variant="error" data-testid="patient-history-error">
        Erro ao carregar histórico de prontuários.
      </Alert>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <p className="text-sm text-text/50" data-testid="patient-history-empty">
        Nenhum prontuário encontrado.
      </p>
    )
  }

  const totalPages = Math.ceil(data.total / data.limit)

  return (
    <div className="space-y-3" data-testid="patient-medical-history">
      <div className="space-y-2">
        {data.data.map((record) => (
          <HistoryCard
            key={record.id}
            record={record}
            onClick={() => setSelectedRecordId(record.id)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            data-testid="history-prev-page"
          >
            Anterior
          </Button>
          <span className="text-sm text-text/50" data-testid="history-page-info">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            data-testid="history-next-page"
          >
            Próxima
          </Button>
        </div>
      )}

      {selectedRecordId && (
        <RecordDetailModal
          recordId={selectedRecordId}
          isOpen={!!selectedRecordId}
          onClose={() => setSelectedRecordId(null)}
        />
      )}
    </div>
  )
}
