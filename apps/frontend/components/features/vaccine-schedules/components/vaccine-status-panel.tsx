'use client'

import { useState } from 'react'
import { VaccineDecision, VaccineScheduleStatus } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { useMyProfessional } from '@/components/features/professionals/hooks/use-my-professional.hook'
import { usePatientVaccineStatus } from '../hooks/use-patient-vaccine-status.hook'
import { useRecordVaccineDecision } from '../hooks/use-record-vaccine-decision.hook'
import type { IPatientVaccineStatusItem } from '../types/vaccine-schedule.types'
import type { IApiError } from '@/types/api.types'

// A linguagem é de sugestão, não de ordem: o sistema informa o que o calendário
// diz, e quem decide é quem atende. "Pendente pelo calendário", não "em atraso".
const STATUS_LABEL: Record<string, string> = {
  [VaccineScheduleStatus.EM_DIA]: 'Em dia',
  [VaccineScheduleStatus.PENDENTE]: 'Pendente pelo calendário',
  [VaccineScheduleStatus.ATRASADA]: 'Fora da janela do calendário',
  [VaccineScheduleStatus.FUTURA]: 'Ainda não devida',
  [VaccineScheduleStatus.NAO_SE_APLICA]: 'Não se aplica',
}

const STATUS_STYLE: Record<string, string> = {
  [VaccineScheduleStatus.EM_DIA]: 'bg-success/10 text-success',
  [VaccineScheduleStatus.PENDENTE]: 'bg-warning/10 text-warning',
  [VaccineScheduleStatus.ATRASADA]: 'bg-danger/10 text-danger',
  [VaccineScheduleStatus.FUTURA]: 'bg-line text-text-dim',
  [VaccineScheduleStatus.NAO_SE_APLICA]: 'bg-line text-text-mute',
}

// A ordem da lista responde "o que preciso olhar agora".
const ORDEM: string[] = [
  VaccineScheduleStatus.ATRASADA,
  VaccineScheduleStatus.PENDENTE,
  VaccineScheduleStatus.FUTURA,
  VaccineScheduleStatus.EM_DIA,
  VaccineScheduleStatus.NAO_SE_APLICA,
]

function formatDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function idadeLegivel(meses: number): string {
  if (meses < 24) return meses === 1 ? '1 mês' : `${meses} meses`
  const anos = Math.floor(meses / 12)
  return anos === 1 ? '1 ano' : `${anos} anos`
}

interface VaccineStatusPanelProps {
  patientId: string
}

export function VaccineStatusPanel({ patientId }: VaccineStatusPanelProps) {
  const { data, isPending, isError } = usePatientVaccineStatus(patientId)
  const { data: myProfessional } = useMyProfessional()
  const decisionMutation = useRecordVaccineDecision()

  // Decidir sobre esquema vacinal é ato clínico: depende da ficha, como
  // registrar uma dose.
  const canDecide = !!myProfessional

  const [deciding, setDeciding] = useState<IPatientVaccineStatusItem | null>(null)
  const [decision, setDecision] = useState<VaccineDecision>(VaccineDecision.ADIADA)
  const [reason, setReason] = useState('')
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const items = [...(data?.items ?? [])].sort(
    (a, b) => ORDEM.indexOf(a.status) - ORDEM.indexOf(b.status),
  )
  const pendentes = items.filter(
    (i) => i.status === VaccineScheduleStatus.PENDENTE || i.status === VaccineScheduleStatus.ATRASADA,
  ).length

  function abrirDecisao(item: IPatientVaccineStatusItem) {
    setDeciding(item)
    setDecision(item.decision ?? VaccineDecision.ADIADA)
    setReason(item.decisionReason ?? '')
    setDecisionError(null)
  }

  function confirmarDecisao() {
    if (!deciding) return
    if (decision !== VaccineDecision.CONFIRMADA && !reason.trim()) {
      setDecisionError('Informe o motivo — ele fica registrado junto da decisão.')
      return
    }
    decisionMutation.mutate(
      { patientId, vaccineId: deciding.vaccineId, decision, reason: reason.trim() || undefined },
      {
        onSuccess: () => setDeciding(null),
        onError: (error) => {
          const apiError = error as unknown as IApiError
          setDecisionError(apiError.detail ?? 'Erro ao registrar a decisão. Tente novamente.')
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="vaccine-status-panel">
      <div>
        <h2 className="text-lg font-semibold text-text">Situação vacinal</h2>
        {!isPending && !isError && data && (
          <p className="mt-0.5 text-sm text-text-dim" data-testid="vaccine-status-summary">
            {idadeLegivel(data.ageInMonths)} ·{' '}
            {pendentes === 0
              ? 'nada pendente pelo calendário'
              : pendentes === 1
                ? '1 vacina pendente pelo calendário'
                : `${pendentes} vacinas pendentes pelo calendário`}
          </p>
        )}
      </div>

      {/* O sistema informa, não prescreve — e isso precisa estar na tela, não só
          na modelagem. */}
      <p className="text-xs text-text-mute" data-testid="vaccine-status-disclaimer">
        Sugestão baseada no calendário cadastrado. A conduta é do profissional.
      </p>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && (
          <div className="flex flex-col gap-3 p-6" data-testid="vaccine-status-skeleton">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} height={20} className="w-full" />
            ))}
          </div>
        )}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="vaccine-status-error">
              Não foi possível calcular a situação vacinal. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && items.length === 0 && (
          <div className="py-12 text-center" data-testid="vaccine-status-empty">
            <p className="text-sm text-text-dim">
              Nenhuma vacina do calendário se aplica a este paciente.
            </p>
          </div>
        )}

        {!isPending && !isError && items.length > 0 && (
          <ul className="divide-y divide-line" data-testid="vaccine-status-list">
            {items.map((item) => (
              <li
                key={item.vaccineId}
                className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                data-testid={`vaccine-status-item-${item.vaccineId}`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text">{item.vaccineName}</span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[item.status]}`}
                      data-testid={`vaccine-status-badge-${item.vaccineId}`}
                    >
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <span className="text-xs text-text-dim">
                    {item.dosesTaken} de {item.dosesExpected} dose(s)
                    {item.nextDoseLabel && ` · próxima: ${item.nextDoseLabel}`}
                    {item.nextDoseDueFrom && ` a partir de ${formatDate(item.nextDoseDueFrom)}`}
                  </span>
                  {item.decisionReason && (
                    <span className="text-xs text-text-mute" data-testid={`vaccine-decision-reason-${item.vaccineId}`}>
                      {item.decidedByProfessionalName}: {item.decisionReason}
                    </span>
                  )}
                </div>

                {canDecide && item.status !== VaccineScheduleStatus.EM_DIA && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirDecisao(item)}
                    data-testid={`vaccine-decide-${item.vaccineId}`}
                    className="text-xs"
                  >
                    Registrar conduta
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        isOpen={!!deciding}
        onClose={() => setDeciding(null)}
        title={`Conduta — ${deciding?.vaccineName ?? ''}`}
        data-testid="vaccine-decision-dialog"
      >
        <div className="flex flex-col gap-4">
          {decisionError && (
            <Alert variant="error" data-testid="vaccine-decision-error">
              {decisionError}
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="vaccine-decision" className="text-sm text-text-dim">
              Decisão
            </label>
            <select
              id="vaccine-decision"
              value={decision}
              onChange={(event) => setDecision(event.target.value as VaccineDecision)}
              data-testid="vaccine-decision-select"
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
            >
              <option value={VaccineDecision.CONFIRMADA}>Vai ser aplicada</option>
              <option value={VaccineDecision.ADIADA}>Adiar</option>
              <option value={VaccineDecision.DISPENSADA}>Não se aplica a esta paciente</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="vaccine-decision-reason" className="text-sm text-text-dim">
              Motivo {decision !== VaccineDecision.CONFIRMADA && '(obrigatório)'}
            </label>
            <textarea
              id="vaccine-decision-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              data-testid="vaccine-decision-reason"
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeciding(null)} data-testid="vaccine-decision-cancel">
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={decisionMutation.isPending}
              onClick={confirmarDecisao}
              data-testid="vaccine-decision-confirm"
            >
              {decisionMutation.isPending ? 'Salvando…' : 'Registrar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
