'use client'

import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import {
  MAXIMUM_RECURRING_OCCURRENCES,
  MINIMUM_RECURRING_OCCURRENCES,
  RECURRENCE_INTERVAL_LABELS,
  RecurrenceInterval,
} from '@app/shared'
import { getWeekdayNamePtBR } from '@/lib/format-date'
import type { IBookFormValues } from '../types/book-form.types'

const INPUT_CLASS =
  'w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent'

interface RecurrenceFieldsProps {
  register: UseFormRegister<IBookFormValues>
  errors: FieldErrors<IBookFormValues>
  isRecurring: boolean
  endMode: IBookFormValues['endMode']
  date: string
  startTime: string
  /** Earliest possible repetition — the anchor plus one interval. */
  minUntilDate: string
  maxUntilDate: string
}

export function RecurrenceFields({
  register,
  errors,
  isRecurring,
  endMode,
  date,
  startTime,
  minUntilDate,
  maxUntilDate,
}: RecurrenceFieldsProps) {
  return (
    <div className="border-t border-line pt-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" data-testid="book-dialog-recurrence-toggle" {...register('isRecurring')} />
        Repetir esta consulta
      </label>

      {isRecurring && (
        <div className="mt-3 space-y-3" data-testid="book-dialog-recurrence-fields">
          <div>
            <label htmlFor="recurrenceInterval" className="block text-sm font-medium mb-1">
              Repetir a cada
            </label>
            <select
              id="recurrenceInterval"
              data-testid="book-dialog-recurrence-interval"
              {...register('recurrenceInterval')}
              className={INPUT_CLASS}
            >
              {Object.values(RecurrenceInterval).map((interval) => (
                <option key={interval} value={interval}>
                  {RECURRENCE_INTERVAL_LABELS[interval]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text/50" data-testid="book-dialog-recurrence-summary">
              Toda {getWeekdayNamePtBR(date)} às {startTime}
            </p>
          </div>

          <fieldset className="space-y-2" data-testid="book-dialog-recurrence-end">
            <legend className="block text-sm font-medium mb-1">Terminar</legend>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="occurrences"
                data-testid="book-dialog-recurrence-end-count"
                {...register('endMode')}
              />
              Após
              <input
                type="number"
                min={MINIMUM_RECURRING_OCCURRENCES}
                max={MAXIMUM_RECURRING_OCCURRENCES}
                data-testid="book-dialog-recurrence-occurrences"
                disabled={endMode !== 'occurrences'}
                {...register('occurrenceCount')}
                className="w-20 rounded-md border border-line bg-surface-2 px-2 py-1 text-sm disabled:opacity-40"
              />
              consultas
            </label>
            {errors.occurrenceCount && (
              <p
                className="text-danger text-xs pl-6"
                data-testid="book-dialog-recurrence-occurrences-error"
              >
                {errors.occurrenceCount.message}
              </p>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="until"
                data-testid="book-dialog-recurrence-end-date"
                {...register('endMode')}
              />
              Em
              <input
                type="date"
                min={minUntilDate}
                max={maxUntilDate}
                data-testid="book-dialog-recurrence-until"
                disabled={endMode !== 'until'}
                {...register('untilDate')}
                className="rounded-md border border-line bg-surface-2 px-2 py-1 text-sm disabled:opacity-40"
              />
            </label>
            {errors.untilDate && (
              <p className="text-danger text-xs pl-6" data-testid="book-dialog-recurrence-until-error">
                {errors.untilDate.message}
              </p>
            )}
          </fieldset>
        </div>
      )}
    </div>
  )
}
