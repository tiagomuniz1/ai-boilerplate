# Plano — Gestão de Medicamentos (base para o módulo de Receitas)

## Objetivo

Criar a **base canônica de medicamentos** da plataforma, que servirá de fonte para o futuro **módulo de receitas médicas**. O médico prescreverá medicamentos a partir desta base. Esta entrega cobre o CRUD a nível de plataforma + a importação da base oficial da ANVISA.

---

## Decisão central — base própria vs. API externa

**Decisão: manter tabela própria, populada por importação do CSV de Dados Abertos da ANVISA.** API externa em runtime foi descartada.

Racional:
- **Imutabilidade médico-legal**: uma receita precisa referenciar um `medicationId` estável, que não pode sumir nem mudar se um terceiro alterar/derrubar a API. Depender de runtime externo no fluxo de prescrição é risco inaceitável.
- **Disponibilidade/latência**: prescrever não pode depender de a ANVISA (ou qualquer terceiro) estar no ar.
- **Custo/qualidade**: não há API pública gratuita e atualizada com qualidade; as boas são pagas. O CSV oficial da ANVISA é gratuito e oficial.
- **Aderência ao projeto**: é exatamente o modelo de `medical-record-canonical-fields` e `specialties` — reference data de plataforma armazenado localmente, gerido pelo `PLATFORM_ADMIN` no backoffice.

### Fonte ANVISA (verificada por inspeção do arquivo real)
- URL: `https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv`
- Separador `;`, campos entre aspas duplas, **encoding Latin-1 / Windows-1252** (exige conversão p/ UTF-8), pode conter quebras de linha dentro de campos (exige parser de CSV real), atualizado diariamente (D-1).
- Colunas: `TIPO_PRODUTO; NOME_PRODUTO; DATA_FINALIZACAO_PROCESSO; CATEGORIA_REGULATORIA; NUMERO_REGISTRO_PRODUTO; DATA_VENCIMENTO_REGISTRO; NUMERO_PROCESSO; CLASSE_TERAPEUTICA; EMPRESA_DETENTORA_REGISTRO; SITUACAO_REGISTRO; PRINCIPIO_ATIVO`.
- Cuidados conhecidos: `NUMERO_REGISTRO_PRODUTO` e `PRINCIPIO_ATIVO` podem vir **vazios**; o mesmo registro **repete** por fabricante/país; o dataset **não** traz concentração/forma farmacêutica/posologia estruturadas (serão modeladas depois, no módulo de receitas).

---

## Escopo e decisões fechadas

- Recurso **global de plataforma** — sem `clinicId`. Escrita exclusiva do `PLATFORM_ADMIN`; leitura por `ADMIN`/`DOCTOR` (para a futura prescrição).
- **Soft delete** + flag `is_active` (PLATFORM_ADMIN pode desativar uma entrada sem removê-la).
- Listagem **paginada + busca** (a base tem dezenas de milhares de itens — diferente de canonical-fields, que carrega tudo).
- Importação por **script CLI idempotente** (`yarn import:medications`). Dedup por `import_hash` (sha256 normalizado), pois `NUMERO_REGISTRO_PRODUTO` vem vazio/repetido.
- Entradas criadas manualmente têm `source = MANUAL` e `import_hash = null`; entradas da ANVISA têm `source = ANVISA`.
- **Não** modelar concentração/forma/posologia nesta fase — virão com o módulo de receitas.
- Agendamento automático do import (cron/GitHub Actions, refresh diário D-1) fica para fase futura — o script já é a base.

---

## Ordem de execução

Executar **uma a uma, nesta ordem**. O backend precede o frontend porque os DTOs no `@app/shared` são contrato dos dois lados.

| # | Área | Task | Depende de | Resumo |
|---|---|---|---|---|
| 1 | backend | `criar-modulo-de-medicamentos` | — | Entidade `Medication` + CRUD (PLATFORM_ADMIN escreve; ADMIN/DOCTOR leem), migration, DTOs/enum no `@app/shared`, cache, paginação + busca. |
| 2 | backend | `importar-base-de-medicamentos-da-anvisa` | #1 | Script CLI idempotente: download do CSV, decode Win1252→UTF-8, parse, normalização, dedup por `import_hash`, upsert em lote. |
| 3 | frontend | `criar-telas-de-gestao-de-medicamentos` | #1 | Telas de gestão no backoffice (PLATFORM_ADMIN): listar (busca/paginação), criar, editar, ativar/desativar, excluir. |

### Grafo de dependências
```
#1 ─┬─> #2
    └─> #3
```

### Flexibilidade
- **#2** e **#3** dependem só de **#1** e podem ser feitas em qualquer ordem após o backend base. Recomenda-se #2 antes de #3 para que a tela já tenha dados reais para validar.

---

## Migrations (ordem dos timestamps)

| Task | Migration |
|---|---|
| #1 | `1751000000000-create-medications-table` |

---

## Dependências novas (a confirmar na execução da #2)
- `csv-parse` — parser robusto (aspas, quebras de linha embutidas).
- `iconv-lite` — decode `win1252` correto (`latin1` nativo do Node não cobre todos os caracteres).

---

## Definition of Done (transversal)
- Testes unitários 100% + integração; E2E nos fluxos críticos (frontend).
- Sem violação de arquitetura; sem `process.env` fora de `env.config.ts` (backend); sem axios fora do API Client (frontend); dados de API via React Query (nunca Zustand).
- Ao finalizar a feature: atualizar `ai/context/permissions.md` (adicionar a matriz de Medicamentos) e o `CHANGELOG.md` de cada app.
- Ao concluir cada task, mover a pasta para `tasks/done/<area>/`.
