import Image from 'next/image'

/** Consultation detail — content-bg section. Copy on the left, screenshot on the right (desktop). */
export function AppointmentShowcase() {
  return (
    <section className="bg-content-bg px-10 py-section text-content-text">
      <div className="mx-auto grid max-w-content items-center gap-15 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-pretty text-6xl font-bold">
            Cada consulta documentada, do início ao fim.
          </h2>
          <p className="text-lg leading-relaxed text-content-mute">
            Dados do paciente, prontuário, receitas, atestados e exames reunidos em uma única tela.
            Conclua ou cancele a consulta com um clique — sem alternar entre sistemas ou perder o
            histórico.
          </p>
        </div>
        <div>
          <Image
            src="/screenshots/consulta-detalhe.png"
            alt="Tela de detalhe de uma consulta no Pulso, com dados do paciente e abas de resumo, prontuário, receitas, atestados e exames."
            width={2930}
            height={1596}
            className="w-full rounded-3xl border border-soft-gray"
          />
        </div>
      </div>
    </section>
  )
}
