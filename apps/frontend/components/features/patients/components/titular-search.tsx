'use client'

import { useEffect, useRef, useState } from 'react'
import { useController, Control, FieldValues, Path } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/cn'
import { formatCpf } from '@/lib/format-cpf'
import { patientsService } from '../services/patients.service'

interface TitularSearchProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  currentPatientId?: string
  initialLabel?: string
  error?: string
}

export function TitularSearch<T extends FieldValues>({
  control,
  name,
  currentPatientId,
  initialLabel,
  error,
}: TitularSearchProps<T>) {
  const [inputValue, setInputValue] = useState(initialLabel ?? '')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { field } = useController({ name, control })

  useEffect(() => {
    if (initialLabel) setInputValue(initialLabel)
  }, [initialLabel])

  const { data: searchResponse, isFetching } = useQuery({
    queryKey: ['titular-search', debouncedTerm, currentPatientId],
    queryFn: () =>
      patientsService.getAll({
        search: debouncedTerm,
        excludeDependents: true,
        excludeId: currentPatientId,
        limit: 10,
      }),
    enabled: debouncedTerm.length >= 2,
  })
  const searchResults = searchResponse?.data ?? []

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setInputValue(value)
    setIsOpen(true)
    if (field.value) field.onChange('')
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => setDebouncedTerm(value), 300)
  }

  function handleSelect(patient: { id: string; user: { fullName: string }; documentNumber: string | null }) {
    field.onChange(patient.id)
    setInputValue(`${patient.user.fullName} (${formatCpf(patient.documentNumber)})`)
    setIsOpen(false)
  }

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const showDropdown = isOpen && debouncedTerm.length >= 2

  return (
    <div className="relative flex flex-col gap-1.5" ref={containerRef}>
      <label htmlFor="titular-search" className="text-sm font-medium text-text">
        Paciente titular (responsável)
      </label>
      <input
        id="titular-search"
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (debouncedTerm.length >= 2) setIsOpen(true)
        }}
        placeholder="Buscar paciente titular por nome..."
        autoComplete="off"
        aria-invalid={!!error}
        data-testid="patient-form-titular-search"
        className={cn(
          'h-10 w-full rounded-md px-3 text-base',
          'bg-surface border border-line',
          'text-text placeholder:text-text/50',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          error && 'border-danger focus-visible:ring-danger',
        )}
      />
      {showDropdown && (
        <ul
          className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border border-line bg-surface shadow-md"
          data-testid="patient-form-titular-search-results"
        >
          {isFetching ? (
            <li className="px-3 py-2 text-sm text-text/60">Buscando...</li>
          ) : searchResults.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text/60">Nenhum paciente encontrado</li>
          ) : (
            searchResults.map((patient) => (
              <li
                key={patient.id}
                role="option"
                aria-selected={field.value === patient.id}
                data-testid="patient-form-titular-option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(patient)}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent/10"
              >
                {patient.user.fullName} ({formatCpf(patient.documentNumber)})
              </li>
            ))
          )}
        </ul>
      )}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  )
}
