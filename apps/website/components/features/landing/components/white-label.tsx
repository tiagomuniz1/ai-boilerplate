import { ScreenshotImage } from '@/components/ui/molecules/screenshot-image/screenshot-image'

/** White-label — content section. Copy left, two branded login placeholders right (desktop). */
export function WhiteLabel() {
  return (
    <section className="bg-content-bg px-10 py-section text-content-text">
      <div className="mx-auto grid max-w-content items-center gap-15 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-pretty text-6xl font-bold">
            O sistema com a cara da sua clínica.
          </h2>
          <p className="text-lg leading-relaxed text-content-mute">
            Cada clínica ganha seu próprio endereço, logo (claro e escuro), favicon e cores. Da
            tela de login aos PDFs e e-mails, o paciente vê a marca da clínica — não a nossa. Modo
            claro e escuro incluídos.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ScreenshotImage
            src="/screenshots/login-dark.png"
            alt="Tela de login do Pulso com a marca da clínica em tema escuro."
            width={900}
            height={1200}
            className="w-full rounded-3xl border border-white/[0.12]"
          />
          <ScreenshotImage
            src="/screenshots/login-light.png"
            alt="Tela de login do Pulso com a marca da clínica em tema claro."
            width={900}
            height={1200}
            className="w-full rounded-3xl border border-soft-gray"
          />
        </div>
      </div>
    </section>
  )
}
