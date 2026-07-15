export interface SecurityCardProps {
  title: string
  description: string
}

/**
 * Translucent card on the always-dark Segurança section. Uses fixed on-dark tokens so it
 * looks identical regardless of the theme toggle.
 */
export function SecurityCard({ title, description }: SecurityCardProps) {
  return (
    <div
      data-testid="security-card"
      className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5.5"
    >
      <h3 className="mb-2 text-md font-bold text-terracotta-light">{title}</h3>
      <p className="text-sm-plus text-dark-fg-muted">{description}</p>
    </div>
  )
}
