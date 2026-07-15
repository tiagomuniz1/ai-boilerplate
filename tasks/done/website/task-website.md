# Task — Site Institucional / Landing de Captura (novo app `website`)

## Descrição

Implementar o **site institucional do Pulso** (landing page de captura de novas clínicas) como um **novo app dentro do monorepo**, em `apps/website`. É uma **SPA one-page, long-scroll**, com modo claro/escuro, navegação por âncoras e CTA repetido apontando para o fluxo de cadastro self-service de clínica.

O design de referência já existe nesta mesma pasta:
- `tasks/website/Pulso Landing.dc.html` — protótipo de alta fidelidade (HTML/CSS/JS inline). **É referência de design, não código de produção.** Não embutir o HTML como está.
- `tasks/website/README.md` — handoff completo (seções, tokens, interações, comportamento).
- `tasks/marketing/landing-institucional.md` — fonte da copy institucional em PT-BR e direção de marca.

A tarefa é **recriar esse design** usando os padrões de arquitetura, naming e camadas do frontend Pulso (`ai/context/frontend.md`), porém em um **app novo e independente** (`apps/website`) — não dentro de `apps/frontend`.

---

## Decisões centrais (confirmadas)

| Tema | Decisão |
|---|---|
| **App** | Novo workspace `@app/website` em `apps/website` — Next.js (App Router) + React + Tailwind, mesma stack e convenções do `apps/frontend`. Independente do frontend autenticado. |
| **Escopo** | Página única (long-scroll) com as 12 seções do handoff, na ordem descrita. Sem autenticação, sem rotas protegidas, sem chamadas de API. |
| **CTA** | Todos os botões "Criar clínica grátis" / "Criar minha clínica grátis" apontam para o fluxo real de cadastro self-service. URL configurável via `NEXT_PUBLIC_*` (destino = registro público de clínica, `POST /clinics/register` no frontend/backend). |
| **Tema** | Toggle claro/escuro afeta apenas as seções de conteúdo (recursos, dashboard, white-label, como funciona, prova social, FAQ). Hero, navbar, segurança, CTA final e footer permanecem **sempre escuros/vinho** (identidade de marca). Persistir preferência em `localStorage`. |
| **Placeholders** | Prova social e mockups de produto permanecem **placeholders**. **Não inventar depoimentos** nem números de tração. Screenshots reais entram depois. |
| **Responsivo** | Recriar com breakpoints mobile (single-column) a partir dos grids do handoff. O protótipo não detalha responsivo — implementar seguindo os grids descritos. |
| **Dados** | Estático. Nenhuma camada de service/API nesta versão — a única "integração" é o destino do link do CTA. |

---

## Contexto de arquitetura

- Seguir estritamente `ai/context/frontend.md` e `ai/context/architecture.md`: naming convention, Atomic Design (`atoms → molecules → organisms`), tokens no `tailwind.config.ts` (nunca cor/spacing hardcoded no JSX), utility `cn()` (`clsx` + `tailwind-merge`).
- **Camadas:** como não há API, o app fica em UI + estado local. Não criar services/use-cases/mappers "vazios" só por formalidade — a regra de camadas se aplica **quando houver** dado de servidor (não há aqui). Se no futuro entrar telemetria/lead capture, aí sim seguir `UI → hooks → use-cases → services → api-client`.
- **Estado:** `isDark` e `faqOpen` são estado local de UI. `isDark` pode ir para um store Zustand (`stores/theme.store.ts`) por ser preferência global de UI persistida — **nunca** para dado de API. `faqOpen` é `useState` local do componente de FAQ.
- Componentes de seção pertencem à feature `landing` (`components/features/landing/`), não ao design system. O DS (`components/ui/`) recebe só átomos/moléculas agnósticos de domínio (Button, ThemeToggle, Accordion, LogoMark, etc.).

---

## Scaffolding do novo app (`apps/website`)

Espelhar a configuração do `apps/frontend`, adaptando o que for específico:

- `apps/website/package.json` — `"name": "@app/website"`, `"version": "0.1.0"`, scripts equivalentes (`dev`, `build`, `start`, `test:unit`, `test:integration`, `test`, `test:unit:coverage`, `typecheck`, `lint`, `cypress:run`). Dependências mínimas: `next`, `react`, `react-dom`, `clsx`, `tailwind-merge`, `zustand` (para o tema); dev: `tailwindcss`, `postcss`, `autoprefixer`, `typescript`, `@types/*`, `jest`, `jest-environment-jsdom`, `ts-jest`, `@testing-library/*`, `cypress`, `eslint`, `eslint-config-next`. **Não** adicionar `axios`, `react-query`, `react-hook-form` — não há formulário nem API nesta versão.
- Já coberto por `workspaces: ["apps/*", ...]` no `package.json` raiz — o novo app é reconhecido automaticamente.
- `apps/website/next.config.js` — `output: 'standalone'`. Sem alias para `@app/shared` a menos que algum type venha a ser usado (nesta versão não é necessário).
- `apps/website/tsconfig.json` — espelhar o do frontend (paths `@/*`, strict, jsx preserve).
- `apps/website/tailwind.config.ts` + `postcss.config.js` — `darkMode: 'class'`; tokens do handoff no `theme.extend` (cores, tipografia, radius, shadows). Ver **Design Tokens** abaixo.
- `apps/website/app/layout.tsx` — carregar a fonte **Satoshi** (self-host via `next/font/local` ou confirmar licenciamento; o protótipo usa CDN Fontshare — em produção preferir self-host). Fallback `Helvetica Neue, Arial, sans-serif`. Definir `<html lang="pt-BR">` e metadata (title, description, Open Graph) do site institucional.
- `apps/website/app/globals.css` — reset + variáveis de tema (claro/escuro) via CSS custom properties, no mesmo espírito do frontend.
- `apps/website/app/page.tsx` — compõe as seções da landing na ordem.
- `apps/website/Dockerfile` — espelhar o do frontend (build standalone), se o deploy exigir imagem própria.
- `apps/website/jest.config.ts` + `jest.setup.ts`, `apps/website/cypress.config.ts` — espelhar os do frontend.
- `apps/website/CHANGELOG.md` — entrada inicial `0.1.0`.

> Versionamento independente por app (ver CLAUDE.md). Tags no formato `website/vMAJOR.MINOR.PATCH` quando for versionar.

---

## Seções a implementar (ordem do handoff)

Copy e valores exatos estão no `README.md` e no HTML de referência. Resumo:

1. **Navbar** (sticky, sempre escura) — logo (dois anéis vinho/terracota) + wordmark "pulso"; âncoras Recursos / Segurança / Como funciona / Perguntas; toggle de tema; CTA sólido terracota "Criar clínica grátis".
2. **Hero** (sempre escuro, textura diagonal terracota) — badge, H1 52px, subheadline, CTA primário + secundário, microcopy; mockup placeholder + cartão flutuante "Receita autêntica ✓ verificada por QR" com padrão tipo QR (grid 6×6 determinístico).
3. **Barra de confiança** — 4 selos curtos (multi-tenant, QR, ANVISA, fluxo brasileiro).
4. **Recursos** (`#recursos`) — título + grid de 6 cards numerados (01–06).
5. **Dashboard/analytics** — texto + placeholder de screenshot (imagem `order:2`).
6. **White-label** — texto + 2 placeholders de login (tema escuro / claro).
7. **Como funciona** (`#como-funciona`) — 3 passos numerados + CTA vinho.
8. **Segurança** (`#seguranca`, sempre escura) — 6 cards translúcidos.
9. **Prova social** — título + 3 caixas tracejadas `[ depoimento — em breve ]` (**placeholder, não inventar**).
10. **FAQ** (`#perguntas`) — 6 perguntas em acordeão.
11. **CTA final** (vinho sólido) — headline + subheadline + botão branco + microcopy.
12. **Footer** (sempre escuro) — logo + tagline + colunas Produto/Suporte + copyright.

---

## Interações & comportamento

- **Toggle de tema:** alterna `isDark`; afeta só as seções de conteúdo (item acima). Persistir em `localStorage`; respeitar `prefers-color-scheme` como default inicial. Evitar flash de tema errado no load (script inline ou classe no `<html>` antes da hidratação).
- **Acordeão FAQ:** clique no cabeçalho expande/colapsa; ícone `+`/`–` em terracota. Comportamento: uma aberta por vez (`faqOpen: number | null`) — pode permitir múltiplas se preferir, mas manter simples.
- **Navegação por âncora:** `scroll-behavior: smooth` até `#recursos`, `#seguranca`, `#como-funciona`, `#perguntas`.
- **Hover states:** links → terracota `#C76D4D`; botões escurecem levemente (ver valores no HTML).
- **CTAs:** `href` = URL do fluxo de cadastro (configurável via env), abrindo o registro público de clínica.

---

## Design Tokens

**Cores** (para `tailwind.config.ts`):
- Vinho profundo (primária/acento): `#5B1027`
- Terracota (acento secundário/CTA): `#C76D4D` · hover `#b85f40` · vinho hover `#450d1f`
- Azul meia-noite (fundo escuro): `#0B1120`
- Branco quente (fundo claro): `#FAF7F4`
- Cinza de borda (claro): `#E6E6E9`
- Acento suave (badges): `#F5D8DF`
- Texto muted claro: `#6b6470` · muted escuro: `#b7b2b8`

**Tipografia:** Satoshi (400/500/700/900), fallback Helvetica/Arial. H1 52px/700 (lh 1.08, ls -0.02em); H2 34–38px/700; H3 16–19px/700; corpo 14.5–19px/400 (lh 1.6–1.65).

**Espaçamento/forma:** padding de seção 96px/40px (desktop); radius 10–18px; shadow hero `0 30px 70px rgba(0,0,0,0.45)`; shadow cartão QR `0 18px 40px rgba(0,0,0,0.35)`.

> Todos os valores acima entram como tokens no `tailwind.config.ts` (`theme.extend`). **Nunca** hardcoded como `bg-[#5B1027]` no JSX.

---

## Estrutura esperada

```
apps/website/
  package.json
  next.config.js
  tsconfig.json
  tailwind.config.ts
  postcss.config.js
  jest.config.ts
  jest.setup.ts
  cypress.config.ts
  Dockerfile
  CHANGELOG.md
  app/
    layout.tsx           → fonte, metadata, <html lang="pt-BR">
    globals.css          → reset + variáveis de tema
    page.tsx             → compõe as seções
    providers.tsx        → provider do tema (se necessário)
  components/
    ui/                  → design system (agnóstico de domínio)
      atoms/             → Button, ThemeToggle, LogoMark, SectionHeading, ...
      molecules/         → FeatureCard, StepCard, SecurityCard, FaqItem, TrustBadge, ...
    features/
      landing/
        components/      → Navbar, Hero, TrustBar, Features, DashboardShowcase,
                           WhiteLabel, HowItWorks, Security, SocialProof, Faq,
                           FinalCta, Footer, QrPattern
        constants/       → copy e dados das seções (features, steps, security, faqs, trust)
  lib/
    cn.ts                → clsx + tailwind-merge
  stores/
    theme.store.ts       → isDark (persistido)
  cypress/
    e2e/                 → landing.cy.ts
```

---

## Restrições

- NÃO embutir o HTML do protótipo como está — recriar com componentes React + Tailwind.
- NÃO usar valores arbitrários de cor/spacing no JSX (`bg-[#xxx]`, `p-[13px]`) — sempre tokens do tema.
- NÃO inventar depoimentos, logos de clientes ou métricas — prova social permanece placeholder.
- NÃO afirmar certificações inexistentes (ex.: "certificado ISO/LGPD") — usar "pensado para a LGPD" (ver critérios do `landing-institucional.md`).
- NÃO adicionar `axios`, service ou store de dados de API — a página é estática.
- NÃO colocar secrets em `NEXT_PUBLIC_*`; a URL do CTA é pública por natureza.
- NÃO alterar `apps/frontend` — o site é um app novo e independente.
- Manter Hero/Navbar/Segurança/CTA final/Footer sempre escuros, independentemente do toggle.

---

## Cenários de teste

**Unitários (100%):**
- `cn()` compõe classes corretamente.
- `theme.store` alterna e persiste `isDark`; lê default de `prefers-color-scheme`.
- Cada card (FeatureCard, StepCard, SecurityCard, TrustBadge) renderiza título/descrição das props.
- `FaqItem` alterna `open` e o sinal `+`/`–`.
- `QrPattern` renderiza 36 células com o padrão determinístico.
- Navbar/Hero/CTA renderizam o `href` do CTA a partir da env configurada.

**Integração (React Testing Library):**
- Toggle de tema alterna as seções de conteúdo (claro ↔ escuro) e mantém Hero/Segurança/Footer escuros.
- FAQ: clicar num cabeçalho expande a resposta; clicar de novo colapsa; apenas uma aberta por vez.
- Links de âncora apontam para `#recursos`, `#seguranca`, `#como-funciona`, `#perguntas`.
- Prova social renderiza os placeholders (sem depoimentos reais).

**E2E (Cypress, `data-testid`):**
- Página carrega e rola até cada seção via links da navbar.
- Toggle de tema muda a aparência das seções de conteúdo.
- Acordeão de FAQ abre e fecha.
- CTA "Criar minha clínica grátis" tem o `href` do fluxo de cadastro.

---

## Definition of Done

- [ ] Novo app `apps/website` (`@app/website`) criado e reconhecido pelo workspace (`yarn workspace @app/website dev/build` funcionam).
- [ ] `tailwind.config.ts` com todos os tokens do handoff; nenhum valor de cor/spacing hardcoded no JSX.
- [ ] Fonte Satoshi carregada (self-host ou licenciamento confirmado) com fallback.
- [ ] As 12 seções implementadas na ordem, com a copy exata do handoff/marketing.
- [ ] Toggle de tema (persistido, sem flash) afetando só as seções de conteúdo; Hero/Navbar/Segurança/CTA/Footer sempre escuros.
- [ ] Acordeão de FAQ e navegação por âncora (smooth scroll) funcionando.
- [ ] Responsivo: layouts em single-column no mobile a partir dos grids do desktop.
- [ ] CTAs apontando para a URL do cadastro self-service via `NEXT_PUBLIC_*`.
- [ ] Prova social e mockups permanecem placeholders (sem conteúdo inventado).
- [ ] Testes unitários (100%) + integração (loading/estado/interação) + E2E dos fluxos críticos.
- [ ] Sem `console.log`, sem warnings de lint, sem código comentado.
- [ ] Segue naming convention e Atomic Design; nenhum dado de API em Zustand (não há dado de API).
- [ ] `CHANGELOG.md` do app criado (`0.1.0`).
- [ ] Ao concluir, mover esta pasta para `tasks/done/website/` (mantendo o handoff como referência histórica).
