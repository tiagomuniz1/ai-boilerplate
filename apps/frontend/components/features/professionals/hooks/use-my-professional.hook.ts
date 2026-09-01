import { useQuery } from '@tanstack/react-query'
import { getMyProfessionalUseCase } from '../use-cases/get-my-professional.use-case'

// A ficha de profissional do próprio usuário, ou `null` se ele não exerce.
//
// "Eu atendo aqui?" é pergunta sobre a ficha, não sobre o cargo: um ADMIN que
// também é médico tem ficha, uma recepcionista não. Antes isto era respondido
// pegando o primeiro item de GET /professionals — o que só funcionava para
// PROFESSIONAL, porque para ADMIN aquela chamada devolve a clínica inteira.
export function useMyProfessional() {
  return useQuery({
    queryKey: ['professionals', 'me'],
    queryFn: getMyProfessionalUseCase,
  })
}
