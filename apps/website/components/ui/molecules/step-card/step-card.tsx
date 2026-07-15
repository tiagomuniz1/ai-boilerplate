export interface StepCardProps {
  number: string
  title: string
  description: string
}

/** Numbered step (1–3) in the "Como funciona" section. */
export function StepCard({ number, title, description }: StepCardProps) {
  return (
    <div data-testid="step-card" className="px-3 text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-pill bg-terracotta text-xl font-bold text-white">
        {number}
      </div>
      <h3 className="mb-2.5 text-xl font-bold text-content-text">{title}</h3>
      <p className="text-base text-content-mute">{description}</p>
    </div>
  )
}
