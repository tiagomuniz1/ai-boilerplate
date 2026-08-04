// Canonical CRM (physician) specialty catalogue (no clinicId — global, like
// canonical themes/medications). Specialty is exclusively a CRM concept in this
// system: every other council (CRN, CREFITO, CRP, CRO, CRFA) templates and
// prescribes directly against councilType, with no specialty layer (see
// ai/context/permissions.md — "médico (CRM) através de uma das próprias
// especialidades... as demais profissões direto para a profissão").
//
// Curated to outpatient/office-consultation specialties (the ones this
// scheduling platform is built around) — deliberately excludes specialties
// with no meaningful office-consultation workflow (Anestesiologia, Patologia,
// Radiologia, Medicina Nuclear, Medicina Legal, Medicina do Trabalho, Medicina
// de Tráfego, Medicina Intensiva, Medicina de Emergência, etc.).
export interface CanonicalSpecialty {
  name: string
  description: string
  titleName: string
}

export const CANONICAL_SPECIALTIES: CanonicalSpecialty[] = [
  { name: 'Cardiologia', description: 'Diagnóstico e tratamento de doenças do coração e do sistema circulatório', titleName: 'cardiologista' },
  { name: 'Clínica Médica', description: 'Atendimento clínico geral a adultos, diagnóstico e acompanhamento de doenças diversas', titleName: 'clínico geral' },
  { name: 'Dermatologia', description: 'Diagnóstico e tratamento de doenças da pele, cabelo e unhas', titleName: 'dermatologista' },
  { name: 'Endocrinologia e Metabologia', description: 'Diagnóstico e tratamento de distúrbios hormonais e metabólicos', titleName: 'endocrinologista' },
  { name: 'Geriatria', description: 'Atendimento clínico voltado à saúde da pessoa idosa', titleName: 'geriatra' },
  { name: 'Ginecologia e Obstetrícia', description: 'Saúde do sistema reprodutor feminino, pré-natal e acompanhamento da gestação', titleName: 'ginecologista e obstetra' },
  { name: 'Hematologia e Hemoterapia', description: 'Diagnóstico e tratamento de doenças do sangue', titleName: 'hematologista' },
  { name: 'Mastologia', description: 'Diagnóstico, tratamento e acompanhamento de doenças da mama', titleName: 'mastologista' },
  { name: 'Nutrologia', description: 'Diagnóstico e tratamento de distúrbios nutricionais', titleName: 'nutrólogo' },
  { name: 'Oftalmologia', description: 'Diagnóstico e tratamento de doenças dos olhos e da visão', titleName: 'oftalmologista' },
  { name: 'Oncologia Clínica', description: 'Diagnóstico e tratamento clínico do câncer', titleName: 'oncologista' },
  { name: 'Ortopedia e Traumatologia', description: 'Diagnóstico e tratamento de doenças e lesões dos ossos, articulações e músculos', titleName: 'ortopedista' },
  { name: 'Otorrinolaringologia', description: 'Diagnóstico e tratamento de doenças do ouvido, nariz e garganta', titleName: 'otorrinolaringologista' },
  { name: 'Pediatria', description: 'Atendimento clínico à saúde de crianças e adolescentes', titleName: 'pediatra' },
  { name: 'Psiquiatria', description: 'Diagnóstico e tratamento de transtornos mentais e comportamentais', titleName: 'psiquiatra' },
  { name: 'Reumatologia', description: 'Diagnóstico e tratamento de doenças reumáticas e autoimunes', titleName: 'reumatologista' },
  { name: 'Urologia', description: 'Diagnóstico e tratamento de doenças do sistema urinário e reprodutor masculino', titleName: 'urologista' },
]
