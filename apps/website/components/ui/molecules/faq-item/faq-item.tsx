'use client'

import { useId } from 'react'

export interface FaqItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

/**
 * Single accordion row. Controlled: the parent owns which item is open, so the sign
 * (+/–) and the visibility of the answer are driven by the `isOpen` prop.
 */
export function FaqItem({ question, answer, isOpen, onToggle }: FaqItemProps) {
  const panelId = useId()

  return (
    <div
      data-testid="faq-item"
      className="mb-3 overflow-hidden rounded-xl border border-content-line bg-content-card"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-md font-bold text-content-text">{question}</span>
        <span className="shrink-0 text-3xl text-terracotta" aria-hidden="true">
          {isOpen ? '–' : '+'}
        </span>
      </button>
      {isOpen && (
        <p id={panelId} className="px-6 pb-5 text-base text-content-mute">
          {answer}
        </p>
      )}
    </div>
  )
}
