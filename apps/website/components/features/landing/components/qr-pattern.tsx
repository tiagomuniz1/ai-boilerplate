import { QR_PATTERN } from '../constants/landing-content'

/** Decorative 6×6 checker evoking a QR code, on the hero's floating "Receita autêntica" card. */
export function QrPattern() {
  return (
    <div
      data-testid="qr-pattern"
      className="grid shrink-0 grid-cols-6 grid-rows-6 gap-0.5"
      aria-hidden="true"
    >
      {QR_PATTERN.map((bit, index) => (
        <div
          key={index}
          className={bit ? 'h-1.5 w-1.5 bg-ink' : 'h-1.5 w-1.5 bg-transparent'}
        />
      ))}
    </div>
  )
}
