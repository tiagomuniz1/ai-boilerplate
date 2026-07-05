# Plano — Validação de Receita com QR Code

## Problema

Toda receita emitida gera um PDF sob demanda (`GET /prescriptions/:id/pdf`) a partir de um `snapshot` (jsonb) denormalizado. O PDF pode ser adulterado por quem o recebe e usado para comprar medicamentos com dados falsificados — não há como a farmácia conferir a autenticidade contra a fonte.

## Objetivo

Todo PDF de receita passa a ter um **QR Code no rodapé** apontando para uma **página pública de verificação** que exibe os dados autoritativos da receita (direto do banco). A farmácia bipa o QR e confere o que foi realmente prescrito contra o papel em mãos:

- PDF adulterado → os dados na página não batem.
- URL/receita forjada ou inexistente → a página mostra claramente "receita inválida".

O QR **não valida o PDF por assinatura criptográfica** — ele aponta para a **fonte da verdade** (consulta ao banco). A confiança vem de comparar o papel com o que o servidor retorna.

---

## Decisões-chave já fechadas

- **Identificador na URL:** coluna nova `verification_token` (aleatória/opaca, `randomBytes(32).toString('hex')`) — desacopla do PK interno, não vaza o `id` da receita e permite revogação futura. Segue o idioma já usado em `send-set-password-email.use-case.ts`.
- **PII do paciente na página pública:** **nome e CPF mascarados** (`Maria S.`, `***.***.789-**`). Suficiente para a farmácia cross-conferir contra o documento físico, sem expor PII de saúde completo numa página pública. Alinhado à regra "em caso de dúvida sobre expor um dado, não expor". A máscara é aplicada **no backend** — PII completo nunca trafega para o cliente público.
- **Escopo dos itens expostos:** apenas a **identificação das medicações** (nome, princípio ativo, dosagem, quantidade). **Não** expor `instructions` (observação do médico por medicamento) nem `notes` (observações gerais) — revelariam posologia/como o medicamento deve ser ministrado. A página serve só para confirmar quais medicações foram receitadas e validar a autenticidade.
- **Geração do QR:** nó **nativo `qr` do pdfmake** (`{ qr: url, fit: 90 }`). **Zero dependências novas** — `qrcode` não é necessário.
- **Rota da página:** clínica-escopada dentro do grupo `(public)` — `app/[slug]/(public)/verify/prescriptions/[token]`. Espelha o padrão de `login`/`register`/`set-password`, ganha a tematização da clínica de graça e encaixa no `middleware.ts` (que trata o 1º segmento do path como slug).
- **Endpoint de verificação:** `GET /prescriptions/verify/:token` marcado com `@Public()`. Sem escopo de `clinicId` e sem `withDeleted` — receita soft-deleted retorna 404 (= inválida).

---

## Ordem de execução

Executar **uma a uma, nesta ordem**. O backend precede o frontend porque o novo DTO no `@app/shared` (`VerifyPrescriptionResponseDto`) atravessa os dois lados.

| # | Área | Task | Depende de | Resumo |
|---|---|---|---|---|
| 1 | backend | `adicionar-validacao-de-receita-com-qrcode` | — | Coluna `verification_token` + migration com backfill; geração do token na criação; endpoint público `GET /prescriptions/verify/:token` com dados mascarados; QR nativo no rodapé do PDF; DTO no shared. |
| 2 | frontend | `criar-pagina-publica-de-verificacao-de-receita` | #1 | Rota pública `app/[slug]/(public)/verify/prescriptions/[token]`; feature `prescription-verification` (service → mapper → use-case → hook → component); estados loading/inválida/sucesso; liberar `/verify` no `middleware.ts`. |

---

## Migrations

| Task | Migration |
|---|---|
| #1 | `1753000000000-add-verification-token-to-prescriptions` |

A migration adiciona a coluna `nullable`, faz **backfill** dos registros existentes com tokens únicos, e então aplica `NOT NULL` + índice único.

---

## Definition of Done (transversal)

- Testes unitários 100% + integração; E2E no fluxo crítico "emitir receita → abrir verificação" (frontend).
- Sem violação de arquitetura; sem `process.env` fora de `env.config.ts` (backend); sem axios fora do API Client (frontend).
- QR no rodapé de todo PDF de receita; página pública acessível **sem login**.
- Nenhum PII completo (nome/CPF) do paciente trafega para o cliente público — máscara aplicada no backend.
- Ao finalizar a feature: atualizar `ai/context/permissions.md` (nota sobre o endpoint público de verificação) e o `CHANGELOG.md` de cada app.

---

## Fora de escopo

- Assinatura digital/criptográfica do PDF (ICP-Brasil).
- Revogação manual de receita via UI (a coluna `verification_token` já viabiliza no futuro).
- QR em atestados/exames — mesmo padrão pode ser replicado depois se desejado.
