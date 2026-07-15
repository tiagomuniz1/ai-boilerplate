# Changelog — @app/website

Segue [Semantic Versioning](https://semver.org/lang/pt-BR/). Tags: `website/vMAJOR.MINOR.PATCH`.

## [0.1.0] — 2026-07-15

### Added

- Novo app `@app/website` (Next.js App Router + React + Tailwind), site institucional /
  landing de captura de novas clínicas.
- SPA one-page long-scroll com as 12 seções: navbar, hero, barra de confiança, recursos,
  dashboard/analytics, white-label, como funciona, segurança, prova social (placeholder),
  FAQ, CTA final e footer.
- Modo claro/escuro persistido (`theme.store` + `use-apply-theme`), com script de
  pré-hidratação para evitar flash. Hero, navbar, segurança, CTA final e footer permanecem
  sempre escuros/vinho por identidade de marca; as seções de conteúdo alternam.
- Acordeão de FAQ (uma resposta aberta por vez) e navegação por âncora com smooth scroll.
- Design system inicial em `components/ui` (atoms: `Logo`, `CtaLink`, `ThemeToggle`,
  `MediaPlaceholder`; molecules: `FeatureCard`, `StepCard`, `SecurityCard`, `TrustBadge`,
  `FaqItem`) com todos os tokens do handoff no `tailwind.config.ts`.
- CTAs apontando para o cadastro self-service de clínica via `NEXT_PUBLIC_REGISTER_URL`.
- Testes unitários + integração (100% de cobertura) e E2E (Cypress) dos fluxos críticos.
