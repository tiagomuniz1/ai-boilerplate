// Catálogo canônico de imunobiológicos da plataforma, curado pelo PLATFORM_ADMIN.
//
// Ponto de partida: o Calendário Nacional de Vacinação do Ministério da Saúde,
// acrescido das vacinas de uso corrente na rede privada (dengue, herpes-zóster,
// meningocócica ACWY, hepatite A adulto). Não há importação automática: o
// calendário não é publicado em formato aberto como o CSV da ANVISA, e são
// dezenas de entradas — curadoria manual é mais barata que um importador.
//
// O backoffice edita tudo isto sem deploy; este arquivo é só o ponto de partida.
export interface VaccineSeed {
  name: string
  abbreviation: string | null
  preventedDiseases: string | null
}

export const VACCINES: VaccineSeed[] = [
  { name: 'BCG', abbreviation: 'BCG', preventedDiseases: 'formas graves de tuberculose' },
  { name: 'Hepatite B', abbreviation: 'HB', preventedDiseases: 'hepatite B' },
  { name: 'Penta', abbreviation: 'Penta', preventedDiseases: 'difteria, tétano, coqueluche, hepatite B, Haemophilus influenzae b' },
  { name: 'Poliomielite inativada', abbreviation: 'VIP', preventedDiseases: 'poliomielite' },
  { name: 'Rotavírus humano', abbreviation: 'VRH', preventedDiseases: 'diarreia por rotavírus' },
  { name: 'Pneumocócica 10-valente', abbreviation: 'Pneumo 10', preventedDiseases: 'pneumonia, otite, meningite por pneumococo' },
  { name: 'Meningocócica C', abbreviation: 'Meningo C', preventedDiseases: 'doença meningocócica C' },
  { name: 'Meningocócica ACWY', abbreviation: 'Meningo ACWY', preventedDiseases: 'doença meningocócica A, C, W e Y' },
  { name: 'Febre amarela', abbreviation: 'FA', preventedDiseases: 'febre amarela' },
  { name: 'Tríplice viral', abbreviation: 'SCR', preventedDiseases: 'sarampo, caxumba, rubéola' },
  { name: 'Tetra viral', abbreviation: 'SCRV', preventedDiseases: 'sarampo, caxumba, rubéola, varicela' },
  { name: 'Varicela', abbreviation: 'VZ', preventedDiseases: 'catapora' },
  { name: 'Hepatite A', abbreviation: 'HA', preventedDiseases: 'hepatite A' },
  { name: 'Difteria, tétano e coqueluche', abbreviation: 'DTP', preventedDiseases: 'difteria, tétano, coqueluche' },
  { name: 'Difteria e tétano adulto', abbreviation: 'dT', preventedDiseases: 'difteria, tétano' },
  { name: 'Difteria, tétano e coqueluche acelular adulto', abbreviation: 'dTpa', preventedDiseases: 'difteria, tétano, coqueluche' },
  { name: 'HPV quadrivalente', abbreviation: 'HPV', preventedDiseases: 'infecção por papilomavírus humano' },
  { name: 'Influenza', abbreviation: 'Influenza', preventedDiseases: 'gripe' },
  { name: 'COVID-19', abbreviation: 'COVID-19', preventedDiseases: 'covid-19' },
  { name: 'Pneumocócica 23-valente', abbreviation: 'Pneumo 23', preventedDiseases: 'doença pneumocócica invasiva' },
  { name: 'Dengue', abbreviation: 'Dengue', preventedDiseases: 'dengue' },
  { name: 'Herpes-zóster', abbreviation: 'HZ', preventedDiseases: 'herpes-zóster e neuralgia pós-herpética' },
  { name: 'Raiva humana', abbreviation: 'Raiva', preventedDiseases: 'raiva' },
]
