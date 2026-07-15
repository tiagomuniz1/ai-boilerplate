import { MediaPlaceholder } from '@/components/ui/atoms/media-placeholder/media-placeholder'

/** Dashboard/analytics — content-alt section. Screenshot on the left, copy on the right (desktop). */
export function DashboardShowcase() {
  return (
    <section className="bg-content-alt px-10 py-section text-content-text">
      <div className="mx-auto grid max-w-content items-center gap-15 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <MediaPlaceholder tone="light" aspectClassName="aspect-[16/11]">
            [ screenshot do produto ]
            <br />
            KPIs · gráficos · aniversariantes
          </MediaPlaceholder>
        </div>
        <div className="order-1 md:order-2">
          <h2 className="mb-4 text-pretty text-6xl font-bold">
            Enxergue a clínica inteira em uma tela.
          </h2>
          <p className="text-lg leading-relaxed text-content-mute">
            Um painel com os números que importam — agendados, confirmados, atendidos e faltas —
            além de novos vs. recorrentes, mix convênio/particular, distribuição por idade e os
            aniversariantes do dia. Filtre por período e, se for médico, veja só o que é seu.
          </p>
        </div>
      </div>
    </section>
  )
}
