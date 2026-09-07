/**
 * O que o profissional decidiu sobre uma pendência apontada pelo calendário.
 *
 * O sistema informa, não prescreve: ele diz "pendente pelo calendário" e a
 * palavra final é de quem atende. Sem esta camada, contraindicação, dose
 * tomada fora e esquema especial virariam erro visível para a paciente.
 */
export enum VaccineDecision {
  /** Vai ser aplicada — a pendência continua, mas reconhecida. */
  CONFIRMADA = 'confirmada',
  /** Fica para depois, por decisão clínica. */
  ADIADA = 'adiada',
  /** Não se aplica a esta paciente (contraindicação, esquema próprio). */
  DISPENSADA = 'dispensada',
}
