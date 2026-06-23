'use client'

import { useState } from 'react'
import type { IDashboardModel } from '../types/dashboard.types'

const PAGE_SIZE = 5

interface BirthdayPanelProps {
  todayBirthdays: IDashboardModel['todayBirthdays']
}

export function BirthdayPanel({ todayBirthdays }: BirthdayPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const visible = todayBirthdays.slice(0, PAGE_SIZE)
  const hasMore = todayBirthdays.length > PAGE_SIZE

  const filtered = todayBirthdays.filter((b) =>
    b.fullName.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <div
        data-testid="dashboard-birthdays"
        className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
      >
        <span className="text-sm font-semibold text-text">Aniversariantes do dia 🎂</span>

        {todayBirthdays.length === 0 ? (
          <p className="text-sm text-text-mute">Nenhum aniversariante hoje.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((b) => (
              <li key={b.patientId} className="flex items-center justify-between text-sm">
                <span className="text-text">{b.fullName}</span>
                <span className="text-xs text-text-dim">{b.age} anos</span>
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <button
            data-testid="birthday-ver-mais"
            onClick={() => setModalOpen(true)}
            className="mt-auto pt-2 text-xs font-semibold uppercase tracking-wide text-accent hover:underline text-left"
          >
            Ver mais ({todayBirthdays.length})
          </button>
        )}
      </div>

      {modalOpen && (
        <div
          data-testid="birthday-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-line bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text">
                Aniversariantes do dia 🎂 ({todayBirthdays.length})
              </span>
              <button
                data-testid="birthday-modal-close"
                onClick={() => setModalOpen(false)}
                className="text-text-mute hover:text-text"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <input
              data-testid="birthday-search"
              type="text"
              placeholder="Filtrar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-line bg-background px-3 py-2 text-sm text-text placeholder:text-text-mute focus:outline-none focus:ring-1 focus:ring-accent"
            />

            <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <li className="text-sm text-text-mute">Nenhum resultado.</li>
              ) : (
                filtered.map((b) => (
                  <li key={b.patientId} className="flex items-center justify-between text-sm">
                    <span className="text-text">{b.fullName}</span>
                    <span className="text-xs text-text-dim">{b.age} anos</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
