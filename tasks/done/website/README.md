# Handoff: Landing Institucional Pulso

## Overview
Landing page (SPA, one-page scroll) para captura de novas clínicas no SaaS Pulso. Objetivo: comunicar confiança clínica/segurança e converter no CTA "Criar minha clínica grátis" (cadastro self-service, `POST /clinics/register`).

## About the Design Files
O arquivo neste pacote (`Pulso Landing.dc.html`) é uma **referência de design em HTML** — um protótipo de alta fidelidade mostrando aparência, copy e comportamento pretendidos, não código de produção para copiar diretamente. A tarefa é **recriar este design no ambiente já existente do repositório de destino** (ex.: Next.js/React, conforme o frontend do Pulso descrito no PRD) usando os padrões, componentes e sistema de estilos já estabelecidos no projeto — não embutir o HTML como está.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamento e copy estão definidos e devem ser recriados com precisão. Os placeholders de imagem (blocos listrados com texto em monospace, ex. "[ screenshot do produto ]") indicam onde entram screenshots reais do produto — devem ser substituídos por capturas reais da aplicação, não por stock genérico.

## Screens / Views
Página única, long-scroll, com as seções abaixo (nessa ordem):

1. **Navbar** (sticky, topo)
   - Fundo `#0B1120`, altura ~64px (padding 16px/40px), borda inferior `1px solid rgba(255,255,255,0.08)`.
   - Esquerda: mark do logo (dois anéis sobrepostos, vinho `#5B1027` e terracota `#C76D4D`) + wordmark "pulso" em branco quente `#FAF7F4`, 22px/700.
   - Direita: links âncora "Recursos", "Segurança", "Como funciona", "Perguntas" (15px, cor `#e9e5e2`, hover `#C76D4D`); botão de alternância de tema ("Modo claro"/"Modo escuro" — outline, transparente); botão CTA sólido terracota "Criar clínica grátis" (10px/20px padding, radius 10px, 600 weight).

2. **Hero**
   - Fundo `#0B1120`, texto `#FAF7F4`, padding 96px/40px 110px. Textura sutil: linhas diagonais repetidas em terracota a 25-35% de opacidade.
   - Grid 2 colunas (1.1fr / 1fr), gap 60px.
   - Coluna esquerda: badge pill "Feito para clínicas brasileiras" (fundo terracota 16% opacidade); H1 52px/700/line-height 1.08 "Gestão clínica com a confiança que a medicina exige."; parágrafo 19px cor `#c9c3c0` (subheadline, texto abaixo); dois CTAs lado a lado — primário terracota sólido "Criar minha clínica grátis", secundário outline "Ver recursos"; microcopy 13px "Cadastro em minutos. Sem cartão de crédito."
   - Coluna direita: mockup de produto (placeholder listrado, aspect-ratio 16/11, radius 18px, sombra grande) + cartão flutuante inferior-esquerdo com padrão tipo QR code (grid 6×6 de quadrados pretos/transparentes) e texto "Receita autêntica / ✓ verificada por QR".

3. **Barra de confiança**
   - Fundo `#FAF7F4`, borda inferior `#E6E6E9`, padding 36px/40px.
   - 4 itens em linha (wrap), cada um com bolinha terracota 7px + texto 14px/600: dados isolados (multi-tenant), receitas verificáveis por QR, base ANVISA, feito para o fluxo clínico brasileiro.

4. **Recursos** (`#recursos`)
   - Título centralizado 38px/700 "Tudo que a clínica precisa, sem sistemas soltos." + subtítulo.
   - Grid 3 colunas, 6 cards (gap 24px, radius 16px, padding 28px, borda 1px): badge numerado (01–06, quadrado 38px, fundo vinho, texto branco) + título 19px/700 + descrição 15px cor muted.
   - Cards: Agenda inteligente, Prontuário por especialidade, Receitas com verificação por QR, Atestados e exames, Base de medicamentos ANVISA, Prontos para o Brasil (copy completa no arquivo).

5. **Dashboard/analytics**
   - Grid 2 colunas: placeholder de screenshot (esquerda visualmente, `order:2` no HTML) + texto "Enxergue a clínica inteira em uma tela." à direita.

6. **White-label**
   - Grid 2 colunas: texto "O sistema com a cara da sua clínica." à esquerda; à direita, 2 placeholders lado a lado (aspect 3/4) simulando telas de login com temas diferentes (escuro `#0B1120` e claro `#FAF7F4`).

7. **Como funciona** (`#como-funciona`)
   - Título centralizado "Comece hoje, em três passos." + 3 colunas com círculo numerado terracota (48px) + título + descrição.
   - CTA centralizado abaixo, vinho sólido.

8. **Segurança** (`#seguranca`)
   - Fundo sempre escuro `#0B1120` (independe do tema claro/escuro da página), título centralizado "Segurança não é recurso — é fundação."
   - Grid 2 colunas × 3 linhas de cards translúcidos (fundo `rgba(255,255,255,0.04)`, borda `rgba(255,255,255,0.08)`, radius 14px) com título em terracota claro `#e3a98f` + descrição.

9. **Prova social (placeholder)**
   - Título "Clínicas que confiam no Pulso." + 3 caixas tracejadas com texto monospace "[ depoimento — em breve ]". **Não substituir por depoimentos inventados** até haver clientes reais.

10. **FAQ** (`#perguntas`)
    - 6 perguntas em acordeão (cards com borda, radius 14px); clique expande/colapsa (ícone "+"/"–" em terracota). Copy completa no arquivo.

11. **CTA final**
    - Fundo vinho sólido `#5B1027`, texto branco quente, título 38px + subtítulo + botão branco sólido + microcopy.

12. **Footer**
    - Fundo `#0B1120` sempre escuro. Logo + tagline curta ("Pulso — sistema de gestão para clínicas."), colunas de links (Produto, Suporte), linha de copyright.

## Interactions & Behavior
- **Toggle de tema** (botão na navbar): alterna `isDark` no estado do componente. Afeta o fundo/texto das seções de conteúdo (recursos, dashboard, white-label, como funciona, prova social, FAQ) entre paleta clara (`#FAF7F4`/branco) e escura (`#0B1120`/`#131a2c`). Hero, navbar, segurança, CTA final e footer permanecem sempre escuros/vinho (fixos por identidade de marca), não são afetados pelo toggle.
- **Acordeão FAQ**: clique no cabeçalho de cada pergunta expande/colapsa a resposta; apenas uma pode ficar aberta por vez (ou múltiplas — implementar conforme preferir, o protótipo permite qualquer uma aberta independentemente).
- **Navegação por âncora**: links da navbar/footer fazem scroll suave (`scroll-behavior: smooth`) até a seção correspondente (`#recursos`, `#seguranca`, `#como-funciona`, `#perguntas`).
- **CTAs**: todos os botões "Criar clínica grátis" / "Criar minha clínica grátis" devem apontar para o fluxo real de cadastro self-service (`POST /clinics/register` no backend). No protótipo usam uma URL placeholder configurável.
- Hover states: links clareiam/mudam para terracota `#C76D4D`; botões escurecem levemente (ver valores hover no HTML).
- Responsivo: não implementado em detalhe no protótipo (grids fixos); recriar com breakpoints mobile (single-column) seguindo os grids descritos acima.

## State Management
- `isDark: boolean` — tema das seções de conteúdo (persistir preferência do usuário se fizer sentido, ex. localStorage).
- `faqOpen: number | null` (ou set de índices) — controla qual(is) pergunta(s) do FAQ está(ão) expandida(s).
- Sem chamadas de API no protótipo — a página é estática; a integração real é apenas o destino do CTA.

## Design Tokens

**Cores**
- Vinho profundo (primária/acento): `#5B1027`
- Terracota suave (acento secundário/CTA): `#C76D4D`
- Azul meia-noite (fundo escuro): `#0B1120`
- Branco quente (fundo claro): `#FAF7F4`
- Cinza suave (bordas modo claro): `#E6E6E9`
- Acento suave (badges): `#F5D8DF` (referenciado na identidade; não usado diretamente no protótipo atual — disponível para badges/realces)
- Texto muted claro: `#6b6470` · Texto muted escuro: `#b7b2b8`

**Tipografia**
- Família: **Satoshi** (via Fontshare: `https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap`), fallback Helvetica/Arial sans-serif.
- H1 hero: 52px/700, line-height 1.08, letter-spacing -0.02em
- H2 seção: 34–38px/700, letter-spacing -0.01em
- H3 card: 16–19px/700
- Corpo: 14.5–19px/400, line-height 1.6–1.65

**Espaçamento / forma**
- Padding de seção: 96px vertical / 40px horizontal (desktop)
- Radius: 10–18px (suave, conforme identidade visual)
- Sombra hero mockup: `0 30px 70px rgba(0,0,0,0.45)`
- Sombra cartão QR flutuante: `0 18px 40px rgba(0,0,0,0.35)`

## Assets
- Logo: recriado como forma geométrica simples (dois anéis sobrepostos vinho/terracota) — **não é o arquivo vetorial oficial da marca**. Usar o logo real da Pulso (fornecido no board de identidade visual) em produção.
- Placeholders de imagem (mockups de dashboard, agenda, telas de login) são blocos CSS listrados com legenda em monospace — devem ser substituídos por screenshots reais do produto.
- Fonte Satoshi carregada via CDN Fontshare no protótipo — confirmar licenciamento/self-hosting da fonte no projeto de produção.

## Files
- `Pulso Landing.dc.html` — protótipo completo da landing (HTML/CSS/JS inline, formato de Design Component da ferramenta de design; abre direto no navegador).
- Copy institucional de referência original: `landing-institucional.md` (fonte da copy, direção de marca e critérios de revisão — não incluído neste pacote; está nos uploads do projeto de design).
