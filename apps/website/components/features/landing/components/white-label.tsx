import { MediaPlaceholder } from '@/components/ui/atoms/media-placeholder/media-placeholder'

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
          <MediaPlaceholder tone="dark" aspectClassName="aspect-[3/4]">
            [ login clínica A ]
            <br />
            tema escuro
          </MediaPlaceholder>
          <MediaPlaceholder tone="light" aspectClassName="aspect-[3/4]">
            [ login clínica B ]
            <br />
            tema claro
          </MediaPlaceholder>
        </div>
      </div>
    </section>
  )
}
