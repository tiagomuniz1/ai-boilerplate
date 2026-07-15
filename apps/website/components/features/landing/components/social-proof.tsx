/**
 * Prova social — placeholder only. Do NOT replace the boxes with invented testimonials;
 * real quotes and logos go here once there are actual clients.
 */
export function SocialProof() {
  return (
    <section className="bg-content-bg px-10 py-22 text-content-text">
      <div className="mx-auto max-w-content text-center">
        <h2 className="mb-10 text-5xl font-bold">Clínicas que confiam no Pulso.</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              data-testid="testimonial-placeholder"
              className="rounded-xl border border-dashed border-dashed-line p-8 font-mono text-xs text-light-fg-placeholder-2"
            >
              [ depoimento — em breve ]
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
