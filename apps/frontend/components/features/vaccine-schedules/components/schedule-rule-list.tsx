'use client'

import { useState } from 'react'
import { PatientGender } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { useVaccines } from '@/components/features/vaccines/hooks/use-vaccines.hook'
import { useScheduleRules } from '../hooks/use-schedule-rules.hook'
import { vaccineSchedulesService } from '../services/vaccine-schedules.service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { IVaccineScheduleRuleModel } from '../types/vaccine-schedule.types'
import type { IApiError } from '@/types/api.types'

function idadeLegivel(meses: number): string {
  if (meses === 0) return 'ao nascer'
  if (meses < 24) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(meses / 12)
  const resto = meses % 12
  return resto === 0 ? `${anos} anos` : `${anos}a ${resto}m`
}

function janela(rule: IVaccineScheduleRuleModel): string {
  const de = idadeLegivel(rule.minAgeMonths)
  return rule.maxAgeMonths === null ? `a partir de ${de}` : `${de} a ${idadeLegivel(rule.maxAgeMonths)}`
}

export function ScheduleRuleList() {
  const queryClient = useQueryClient()
  const [filtroVacina, setFiltroVacina] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deletingRule, setDeletingRule] = useState<IVaccineScheduleRuleModel | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({
    vaccineId: '', doseLabel: '', doseOrder: '1', minAgeMonths: '0',
    maxAgeMonths: '', minIntervalDays: '', appliesToGender: '',
  })

  const { data: rules, isPending, isError } = useScheduleRules(filtroVacina || undefined)
  const { data: vaccines } = useVaccines({ limit: 100 })

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['vaccine-schedule-rules'] })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => vaccineSchedulesService.createRule(data as never),
    onSuccess: () => { invalidar(); setIsFormOpen(false) },
    onError: (error) => {
      const apiError = error as unknown as IApiError
      setFormError(apiError.detail ?? 'Erro ao criar a regra. Tente novamente.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vaccineSchedulesService.deleteRule(id),
    onSuccess: () => { invalidar(); setDeletingRule(null) },
  })

  function submeter() {
    setFormError(null)
    createMutation.mutate({
      vaccineId: form.vaccineId,
      doseLabel: form.doseLabel,
      doseOrder: Number(form.doseOrder),
      minAgeMonths: Number(form.minAgeMonths),
      maxAgeMonths: form.maxAgeMonths ? Number(form.maxAgeMonths) : undefined,
      minIntervalDays: form.minIntervalDays ? Number(form.minIntervalDays) : undefined,
      appliesToGender: form.appliesToGender || undefined,
    })
  }

  return (
    <div className="flex flex-col gap-6" data-testid="schedule-rule-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Calendário vacinal</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-text-dim">
            As regras que o sistema usa para dizer o que falta a cada paciente. Ponto de partida:
            o Calendário Nacional de Vacinação — ajuste aqui quando ele mudar.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => { setFormError(null); setIsFormOpen(true) }}
          data-testid="schedule-rule-new-button"
          className="w-full sm:w-auto"
        >
          + Nova regra
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <label htmlFor="rule-vaccine-filter" className="text-sm text-text-dim">
          Vacina
        </label>
        <select
          id="rule-vaccine-filter"
          value={filtroVacina}
          onChange={(event) => setFiltroVacina(event.target.value)}
          data-testid="schedule-rule-filter"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
        >
          <option value="">Todas as vacinas</option>
          {vaccines?.data.map((vaccine) => (
            <option key={vaccine.id} value={vaccine.id}>
              {vaccine.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && (
          <div className="flex flex-col gap-3 p-6" data-testid="schedule-rule-skeleton">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} height={20} className="w-full" />
            ))}
          </div>
        )}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="schedule-rule-error">
              Não foi possível carregar o calendário. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && (rules?.length ?? 0) === 0 && (
          <div className="py-16 text-center" data-testid="schedule-rule-empty">
            <p className="text-sm text-text-dim">Nenhuma regra cadastrada.</p>
          </div>
        )}

        {!isPending && !isError && rules && rules.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left" data-testid="schedule-rule-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Vacina</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Dose</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Janela</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Intervalo</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Sexo</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="border-b border-line last:border-0 hover:bg-surface-raised"
                    data-testid={`schedule-rule-row-${rule.id}`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-text">{rule.vaccineName}</td>
                    <td className="px-6 py-4 text-sm text-text-dim">
                      {rule.doseOrder}. {rule.doseLabel}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-dim">{janela(rule)}</td>
                    <td className="px-6 py-4 text-sm text-text-dim">
                      {rule.minIntervalDays ? `${rule.minIntervalDays} dias` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-dim">
                      {rule.appliesToGender === PatientGender.FEMALE
                        ? 'Feminino'
                        : rule.appliesToGender === PatientGender.MALE
                          ? 'Masculino'
                          : 'Todos'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setDeletingRule(rule)}
                        data-testid={`schedule-rule-delete-${rule.id}`}
                        className="text-sm text-danger hover:underline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Nova regra" data-testid="schedule-rule-form-modal">
        <div className="flex flex-col gap-4">
          {formError && (
            <Alert variant="error" data-testid="schedule-rule-form-error">
              {formError}
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="rule-vaccine" className="text-sm text-text-dim">Vacina</label>
            <select
              id="rule-vaccine"
              value={form.vaccineId}
              onChange={(e) => setForm({ ...form, vaccineId: e.target.value })}
              data-testid="schedule-rule-form-vaccine"
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
            >
              <option value="">Selecione</option>
              {vaccines?.data.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Rótulo da dose" id="rule-dose-label" placeholder="1ª dose"
              value={form.doseLabel} onChange={(e) => setForm({ ...form, doseLabel: e.target.value })}
              data-testid="schedule-rule-form-dose-label"
            />
            <Input
              label="Ordem" id="rule-dose-order" type="number" min={1}
              value={form.doseOrder} onChange={(e) => setForm({ ...form, doseOrder: e.target.value })}
              data-testid="schedule-rule-form-dose-order"
            />
            <Input
              label="Idade mínima (meses)" id="rule-min-age" type="number" min={0}
              value={form.minAgeMonths} onChange={(e) => setForm({ ...form, minAgeMonths: e.target.value })}
              data-testid="schedule-rule-form-min-age"
            />
            <Input
              label="Idade máxima (meses)" id="rule-max-age" type="number" min={0}
              helperText="Vazio = sem teto"
              value={form.maxAgeMonths} onChange={(e) => setForm({ ...form, maxAgeMonths: e.target.value })}
              data-testid="schedule-rule-form-max-age"
            />
            <Input
              label="Intervalo mínimo (dias)" id="rule-interval" type="number" min={0}
              helperText="Desde a dose anterior"
              value={form.minIntervalDays} onChange={(e) => setForm({ ...form, minIntervalDays: e.target.value })}
              data-testid="schedule-rule-form-interval"
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rule-gender" className="text-sm text-text-dim">Sexo</label>
              <select
                id="rule-gender"
                value={form.appliesToGender}
                onChange={(e) => setForm({ ...form, appliesToGender: e.target.value })}
                data-testid="schedule-rule-form-gender"
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
              >
                <option value="">Todos</option>
                <option value={PatientGender.FEMALE}>Feminino</option>
                <option value={PatientGender.MALE}>Masculino</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsFormOpen(false)} data-testid="schedule-rule-form-cancel">
              Cancelar
            </Button>
            <Button
              variant="primary" disabled={createMutation.isPending} onClick={submeter}
              data-testid="schedule-rule-form-submit"
            >
              {createMutation.isPending ? 'Salvando…' : 'Criar regra'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deletingRule}
        onClose={() => setDeletingRule(null)}
        title="Excluir regra"
        data-testid="schedule-rule-delete-dialog"
      >
        <p className="text-sm text-text-dim" data-testid="schedule-rule-delete-message">
          A regra sai do calendário e deixa de ser considerada no cálculo de pendências de todos os
          pacientes. As doses já registradas continuam nas cadernetas.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeletingRule(null)} data-testid="schedule-rule-delete-cancel">
            Cancelar
          </Button>
          <Button
            variant="primary" disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(deletingRule!.id)}
            data-testid="schedule-rule-delete-confirm"
            className="bg-danger hover:bg-danger/90"
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}
