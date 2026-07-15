export interface FeatureCardProps {
  number: string
  title: string
  description: string
}

/** Numbered feature card (01–06) used in the Recursos grid. */
export function FeatureCard({ number, title, description }: FeatureCardProps) {
  return (
    <div
      data-testid="feature-card"
      className="rounded-2xl border border-content-line bg-content-card p-7"
    >
      <div className="mb-4 flex h-9.5 w-9.5 items-center justify-center rounded-md bg-wine text-base font-bold text-white">
        {number}
      </div>
      <h3 className="mb-2.5 text-2xl font-bold text-content-text">{title}</h3>
      <p className="text-base text-content-mute">{description}</p>
    </div>
  )
}
