'use client'

import { useState } from 'react'
import { FaqItem } from '@/components/ui/molecules/faq-item/faq-item'
import { FAQS } from '../constants/landing-content'

/** Perguntas frequentes — content-alt section. One answer open at a time. */
export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggle(index: number) {
    setOpenIndex((current) => (current === index ? null : index))
  }

  return (
    <section id="perguntas" className="bg-content-alt px-10 py-section text-content-text">
      <div className="mx-auto max-w-narrow">
        <h2 className="mb-10 text-center text-7xl font-bold">Perguntas frequentes</h2>
        {FAQS.map((faq, index) => (
          <FaqItem
            key={faq.question}
            question={faq.question}
            answer={faq.answer}
            isOpen={openIndex === index}
            onToggle={() => toggle(index)}
          />
        ))}
      </div>
    </section>
  )
}
