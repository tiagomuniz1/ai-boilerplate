# Pulso — Texto Institucional para Site de Captura (SPA)

## Context

O Pulso é um SaaS multi-tenant de gestão para clínicas médicas (backend NestJS, frontend Next.js), hoje rodando em staging (`staging.pulso.center`) e já com registro público de clínica (self-service). Precisamos de um **texto institucional** que sirva de base para o Claude design gerar uma **SPA de captura (landing page)** para atrair novas clínicas.

Este documento **é o entregável**: reúne posicionamento, direção de design e a copy pronta em PT-BR, seção a seção, para colar/adaptar no prompt de geração da página. Não há mudança de código.

**Decisões de posicionamento (confirmadas):**
- **Público-alvo:** clínicas pequenas e médias (recepção + vários médicos/especialidades).
- **CTA principal:** cadastro self-service — "Criar minha clínica grátis" (usa o `POST /clinics/register` que já existe).
- **Tom:** confiável & clínico — segurança, conformidade (LGPD/ANVISA) e credibilidade médica em primeiro plano.
- **Idioma:** Português (BR).

---

## 1. Essência da marca

- **Nome:** Pulso
- **Uma frase (positioning statement):** *O sistema de gestão que sua clínica confia — agenda, prontuário e receitas com segurança de ponta a ponta.*
- **Promessa central:** confiança. Cada dado isolado por clínica, cada receita verificável, cada documento auditável.
- **Personalidade:** sóbria, precisa, tranquila. Fala como um bom prontuário: claro, organizado, sem ruído.
- **O que evitar:** hype de "revolucionar", promessas vagas, tom de startup barulhenta. Aqui, credibilidade > empolgação.

---

## 2. Direção de design (para o Claude design)

- **Paleta (derivada dos temas reais do produto):**
  - Primária/acento: **bordô profundo `#5B1027`** (tema "Pulso") — sério, clínico, memorável.
  - Alternativa/neutra de apoio: **sálvia `#6D7A71`** (tema padrão "Salvia Natural") para seções calmas.
  - Fundos claros: `#FAF7F4` / branco; fundo escuro (dark mode): `#0B1120`.
  - Acento suave (badges, realces): `#F5D8DF`.
- **Tipografia:** sans-serif legível e institucional (ex.: Inter/Geist). Títulos com peso, corpo arejado.
- **Formas:** cantos arredondados suaves (8–18px), sombras leves, muito respiro. Nada agressivo.
- **Imagética:** interface real do produto (dashboard, agenda, receita com QR), ícones de linha, fotos sóbrias de ambiente clínico. Preferir **screenshots do produto** a stock genérico.
- **Modo claro e escuro:** o produto tem os dois — a landing pode oferecer toggle como prova de cuidado.
- **Ritmo da página:** hero forte → prova de confiança → blocos de features → diferenciais → segurança/conformidade → CTA final. Uma ideia por seção.

---

## 3. Estrutura da SPA (seções) + copy pronta

### Seção 0 — Navbar
- Logo "Pulso" · links âncora: Recursos · Segurança · Como funciona · Perguntas · **[Criar clínica grátis]** (botão acento)

### Seção 1 — Hero
- **Headline:** Gestão clínica com a confiança que a medicina exige.
- **Subheadline:** Agenda, prontuário eletrônico, receitas e atestados em um só lugar — cada clínica com seu próprio espaço, sua marca e seus dados isolados.
- **CTA primário:** Criar minha clínica grátis
- **CTA secundário:** Ver recursos
- **Microcopy sob o botão:** Cadastro em minutos. Sem cartão de crédito.
- **Visual:** mockup do dashboard (KPIs + agenda) em um device, com um cartão de "Receita autêntica ✓ verificada por QR" flutuando.

### Seção 2 — Barra de confiança / prova rápida
Faixa com 3–4 selos curtos:
- 🔒 Dados isolados por clínica (multi-tenant)
- ✅ Receitas verificáveis por QR Code
- 🇧🇷 Base de medicamentos ANVISA
- 🏥 Feito para o fluxo real da clínica brasileira

### Seção 3 — Blocos de recursos (o coração da página)
Título da seção: **Tudo que a clínica precisa, sem sistemas soltos.**
Subtítulo: Um núcleo integrado que acompanha o paciente do agendamento à receita.

Cards (ícone + título + 1–2 linhas):

1. **Agenda inteligente** — Disponibilidade em tempo real a partir da agenda de cada médico, com duração de slot configurável, bloqueios de horário e visão por dia ou semana. Marque, confirme, conclua ou registre faltas.
2. **Prontuário por especialidade** — Formulários que se adaptam à especialidade da consulta. Campos padronizados (peso, pressão, alergias…) garantem dados consistentes — e cada prontuário guarda a versão do modelo usada, para auditoria.
3. **Receitas com verificação por QR** — Cada receita gera um PDF com a marca da clínica e um QR Code. Farmácia ou paciente escaneia e confirma a autenticidade numa página pública — com nome e CPF mascarados. Anti-fraude de verdade.
4. **Atestados e exames** — Atestados de afastamento e comparecimento e solicitações de exame em PDF branded, com resultados anexados e guardados com segurança.
5. **Base de medicamentos ANVISA** — Busca rápida na base oficial de medicamentos, com princípio ativo e classe terapêutica. Modelos de receita reutilizáveis para prescrever em um clique.
6. **Prontos para o Brasil** — Múltiplos CRMs por médico (com estado e registro principal), especialidades com RQE, convênio vs. particular e ranking de CID nos atestados.

### Seção 4 — Painel & analytics
- **Título:** Enxergue a clínica inteira em uma tela.
- **Corpo:** Um painel com os números que importam — agendados, confirmados, atendidos e faltas — além de novos vs. recorrentes, mix convênio/particular, distribuição por idade e os aniversariantes do dia. Filtre por período e, se for médico, veja só o que é seu.
- **Visual:** screenshot do dashboard real (KPIs + gráficos + painel "Aniversariantes 🎂").

### Seção 5 — White-label / marca própria
- **Título:** O sistema com a cara da sua clínica.
- **Corpo:** Cada clínica ganha seu próprio endereço, logo (claro e escuro), favicon e cores. Da tela de login aos PDFs e e-mails, o paciente vê a marca da clínica — não a nossa. Modo claro e escuro incluídos.
- **Visual:** duas telas de login lado a lado, com marcas/cores diferentes, mostrando o mesmo produto branded.

### Seção 6 — Como funciona (3 passos)
- **Título:** Comece hoje, em três passos.
1. **Crie sua clínica** — Cadastro self-service em minutos. Sem burocracia.
2. **Configure sua marca e equipe** — Suba seu logo, escolha as cores, convide médicos e recepção (cada um com seu acesso).
3. **Atenda com tudo integrado** — Agenda, prontuário, receitas e relatórios funcionando desde o primeiro paciente.
- **CTA ao fim:** Criar minha clínica grátis

### Seção 7 — Segurança & conformidade (pilar do tom "confiável & clínico")
- **Título:** Segurança não é recurso — é fundação.
- Bullets:
  - **Isolamento total por clínica** — cada tenant com seus dados estritamente separados.
  - **Papéis e permissões** — administrador, recepcionista e médico, cada um vê só o que deve. Médico acessa apenas os próprios pacientes e consultas.
  - **Arquivos protegidos** — logos e resultados de exame em armazenamento privado, servidos apenas por endpoints controlados. Nunca links públicos.
  - **Documentos auditáveis** — receitas, atestados e prontuários guardados como registros imutáveis com data e autoria.
  - **Autenticação moderna** — login com tokens, expiração e onboarding por link seguro (defina sua senha, sem senha trafegando).
  - **Pensado para a LGPD** — dados sensíveis mascarados na verificação pública e minimizados por padrão.

### Seção 8 — Prova social (placeholder)
- **Título:** Clínicas que confiam no Pulso.
- Espaço para 2–3 depoimentos + logos. *(Marcar como placeholder — preencher quando houver clientes; não inventar depoimentos reais.)*

### Seção 9 — CTA final
- **Headline:** Sua clínica organizada, seus dados seguros. Comece agora.
- **Subheadline:** Crie sua clínica gratuitamente e veja o Pulso funcionando com o seu primeiro paciente.
- **Botão:** Criar minha clínica grátis
- **Microcopy:** Sem cartão de crédito · Configuração em minutos

### Seção 10 — Rodapé
- Logo + tagline curta · Recursos · Segurança · Perguntas frequentes · Contato · © Pulso.
- Nota discreta: "Pulso — sistema de gestão para clínicas."

---

## 4. Perguntas frequentes (FAQ) — copy

- **Preciso instalar algo?** Não. O Pulso é 100% web; cada clínica acessa pelo seu próprio endereço.
- **Meus dados ficam separados dos de outras clínicas?** Sim. Cada clínica é um ambiente isolado — ninguém acessa dados de outra.
- **Como funciona a verificação de receita por QR?** Cada receita traz um QR Code que leva a uma página pública de conferência. A farmácia ou o paciente confirma a autenticidade; dados sensíveis aparecem mascarados.
- **Dá para usar a marca da minha clínica?** Sim. Logo, cores, favicon e endereço próprios — inclusive nos PDFs e e-mails.
- **A base de medicamentos é atualizada?** Usamos a base pública da ANVISA, com busca rápida por nome e princípio ativo.
- **Quais perfis de acesso existem?** Administrador, recepcionista e médico — cada um com as permissões adequadas ao seu papel.

---

## 5. Banco de mensagens (para reuso pelo designer)

**Headlines alternativas para o hero:**
- Gestão clínica com a confiança que a medicina exige.
- Do agendamento à receita, sua clínica em um só lugar — com segurança de ponta a ponta.
- O sistema que cuida da clínica para a clínica cuidar do paciente.

**Frases de apoio:**
- Cada receita, verificável. Cada dado, isolado. Cada documento, auditável.
- Feito para o fluxo real da clínica brasileira.
- Sua marca do login ao PDF.

---

## 6. Instruções de uso / verificação

1. **Alimentar o Claude design** com este documento (seções 1–4 como direção; seções 3, 7, 9 e FAQ como copy pronta).
2. Pedir uma **SPA de uma página** (long-scroll), responsiva, com modo claro/escuro, âncoras de navegação e CTA repetido (hero, meio, final) apontando para o fluxo de cadastro self-service.
3. **Revisar antes de publicar:**
   - Confirmar que a seção de prova social está como placeholder (sem depoimentos inventados).
   - Conferir o destino do CTA (rota de registro público de clínica).
   - Validar contraste/acessibilidade da paleta bordô `#5B1027` sobre fundos claros e escuros.
   - Revisar a copy de segurança para não prometer certificações que ainda não existam (ex.: não afirmar "certificado ISO/LGPD" — usar "pensado para a LGPD").
4. **Não** incluir dados de clientes reais, números de tração inventados ou selos de conformidade não comprovados.

---

## Notas finais

- Toda a copy acima reflete features que **já existem** no produto (levantadas nos módulos de backend e telas de frontend): multi-tenancy branded, agenda + exceções + disponibilidade, prontuário template-driven com snapshot, receitas com QR público e mascaramento, atestados/exames em PDF, base ANVISA, multi-CRM/RQE, dashboard com KPIs. Não há promessa de recurso inexistente.
- Se surgir uma landing bilíngue no futuro, esta base em PT-BR é a canônica para tradução.
