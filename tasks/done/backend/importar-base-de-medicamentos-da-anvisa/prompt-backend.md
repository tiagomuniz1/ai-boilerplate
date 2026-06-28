Você é um engenheiro de software sênior especialista na arquitetura deste projeto.

Sua tarefa é implementar exatamente o que está descrito abaixo.

Siga TODAS as regras e contexto definidos na task.

---
## INSTRUCTIONS
- Não inventar padrões
- Não ignorar regras
- Não simplificar a solução
- Código deve ser production-ready
- Seguir estritamente a arquitetura definida
- Se faltar informação, não inventar

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Importar Base de Medicamentos da ANVISA (Backend / Script CLI)

## Descrição
Implementar um **script CLI idempotente** que baixa a base oficial de Dados Abertos de medicamentos da ANVISA, converte o encoding, faz o parse, normaliza e faz **upsert em lote** na tabela `medications` (criada na task `criar-modulo-de-medicamentos`). Roda manualmente via `yarn import:medications` e pode ser agendado depois (cron/GitHub Actions) sem mudança de código.

---

## Contexto
- Depende da task #1 (`criar-modulo-de-medicamentos`): usa a entidade `Medication` e o método `IMedicationsRepository.bulkUpsert(...)`.
- Fonte oficial: `https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv`.
  - Separador `;`, campos entre aspas duplas.
  - **Encoding Latin-1 / Windows-1252** — precisa converter p/ UTF-8 (senão acentos viram mojibake, ex.: `IND�STRIA`).
  - Pode conter **quebras de linha dentro de campos** entre aspas → exige parser de CSV real (não `split` manual).
  - Atualizado diariamente (D-1).
- Colunas (cabeçalho):
  `TIPO_PRODUTO; NOME_PRODUTO; DATA_FINALIZACAO_PROCESSO; CATEGORIA_REGULATORIA; NUMERO_REGISTRO_PRODUTO; DATA_VENCIMENTO_REGISTRO; NUMERO_PROCESSO; CLASSE_TERAPEUTICA; EMPRESA_DETENTORA_REGISTRO; SITUACAO_REGISTRO; PRINCIPIO_ATIVO`
- Particularidades dos dados:
  - `NUMERO_REGISTRO_PRODUTO` e `PRINCIPIO_ATIVO` podem vir **vazios**.
  - O mesmo produto **repete** por fabricante/país → não dá para usar `NUMERO_REGISTRO_PRODUTO` como chave.
  - Não há concentração/forma farmacêutica/posologia estruturadas (fora de escopo nesta fase).

---

## Mapeamento de colunas (ANVISA → `medications`)

| Coluna ANVISA | Campo da entidade | Observação |
|---|---|---|
| `NOME_PRODUTO` | `name` | trim; pular linha se vazio |
| `PRINCIPIO_ATIVO` | `activeIngredient` | trim; `null` se vazio |
| `CATEGORIA_REGULATORIA` | `regulatoryCategory` | trim; `null` se vazio |
| `CLASSE_TERAPEUTICA` | `therapeuticClass` | trim; `null` se vazio |
| `EMPRESA_DETENTORA_REGISTRO` | `holderCompany` | trim; `null` se vazio |
| `NUMERO_REGISTRO_PRODUTO` | `registrationNumber` | trim; `null` se vazio |
| `SITUACAO_REGISTRO` | `registrationStatus` | "Ativo"/"Inativo" |
| — | `source` | sempre `MedicationSource.ANVISA` |
| — | `import_hash` | sha256 (ver abaixo) |
| — | `is_active` | `registrationStatus?.toLowerCase() === 'ativo'` |

- Importar apenas `TIPO_PRODUTO === 'MEDICAMENTO'` (ignorar outros tipos, se houver).
- `DATA_FINALIZACAO_PROCESSO`, `DATA_VENCIMENTO_REGISTRO`, `NUMERO_PROCESSO` não são mapeados nesta fase.

---

## Dedup / chave de upsert (`import_hash`)
- `import_hash = sha256( normalize(name) + '|' + normalize(registrationNumber) + '|' + normalize(holderCompany) + '|' + normalize(activeIngredient) )`, onde `normalize = (v) => (v ?? '').trim().toLowerCase()`.
- Upsert via `bulkUpsert` → `INSERT ... ON CONFLICT (import_hash) DO UPDATE SET ...` (índice único parcial em `import_hash` já criado na task #1).
- **Idempotência**: rodar o script 2x não duplica registros; apenas atualiza os campos mutáveis (`name`, `activeIngredient`, `registrationStatus`, `is_active`, etc.) e `updated_at`.
- Linhas duplicadas dentro do **mesmo arquivo** (mesmo `import_hash`) → deduplicar em memória por lote antes do upsert (evita erro `ON CONFLICT` afetar a mesma linha 2x no mesmo INSERT).

---

## Fluxo do script
1. **Bootstrap** de um `DataSource` standalone (seguir `src/database/seeds/run-carga-seed.ts`: `dotenv` + `.env.local`, respeitar `DB_SCHEMA`, rodar migrations pendentes se necessário).
2. **Download** do CSV via `axios` (`responseType: 'arraybuffer'`, `timeout` generoso, ex.: 60s). Permitir também `--file <path>` para importar de um arquivo local já baixado (facilita testes e reprocessamento).
3. **Decode** do buffer `win1252` → string UTF-8 com `iconv-lite`.
4. **Parse** streaming/iterável com `csv-parse` (`delimiter: ';'`, `columns: true`, `relax_quotes`/`relax_column_count` conforme necessário, `bom: true`).
5. Para cada linha: filtrar `TIPO_PRODUTO`, mapear, calcular `import_hash`, acumular em buffer.
6. **Upsert em lote** (chunk de ~1000) via `bulkUpsert`, dentro de uma `QueryRunner`/transação por lote (não uma transação única para o arquivo inteiro — milhões de linhas).
7. Logar progresso (linhas lidas, lotes gravados, ignoradas) e total final. **Nunca** logar dados sensíveis.
8. Encerrar com `process.exit(0)` em sucesso, `1` em falha (padrão dos runners existentes).

---

## Arquivos e script `package.json`
```
apps/backend/src/database/seeds/medications/
  import-anvisa-medications.ts        # função pura de import: recebe DataSource + opções, faz o trabalho
  anvisa-medication.parser.ts         # parse + normalização + cálculo de import_hash (sem I/O — testável)
  run-import-medications.ts           # runner CLI (bootstrap do DataSource, args, exit codes)
```
`apps/backend/package.json` → adicionar:
```json
"import:medications": "ts-node -r tsconfig-paths/register src/database/seeds/run-import-medications.ts"
```

---

## Dependências novas (confirmar antes de adicionar)
- `csv-parse` — parser robusto (aspas, quebras de linha embutidas, BOM).
- `iconv-lite` — decode `win1252` correto (`latin1` nativo do Node não cobre todos os caracteres do Windows-1252).
- `axios` já existe no backend (reuso para o download).

```
yarn workspace @app/backend add csv-parse iconv-lite
```

---

## Decisões técnicas da task
- **Camada:** script de seed/CLI (mesma família de `run-carga-seed.ts`). NÃO criar endpoint HTTP nesta task.
- **Transação:** por **lote** (chunk), não global.
- **Encoding:** `win1252` → UTF-8 via `iconv-lite` (obrigatório).
- **Parser:** `csv-parse` (NÃO fazer split manual por `;`/`\n`).
- **Idempotência:** garantida por `import_hash` + `ON CONFLICT DO UPDATE`.
- **Reuso:** consumir `IMedicationsRepository.bulkUpsert` (task #1) — não escrever SQL de upsert solto no script.

---

## Restrições
- NÃO usar `process.env` fora de `env.config.ts` no código da aplicação (o runner de seed segue o padrão dos runners existentes, que carregam env via `dotenv` no bootstrap — mesmo padrão de `run-carga-seed.ts`).
- NÃO criar transação única para o arquivo inteiro.
- NÃO usar `split` manual de CSV.
- NÃO logar conteúdo sensível; logar apenas contadores/progresso.
- NÃO marcar como `MANUAL` — todo registro importado é `source = ANVISA`.

---

## Cenários de teste (unitários — sobre `anvisa-medication.parser.ts`)
- Linha válida → mapeamento correto de todas as colunas.
- Decode de acentos (`win1252`) → string UTF-8 correta (sem mojibake).
- `PRINCIPIO_ATIVO`/`NUMERO_REGISTRO_PRODUTO` vazios → `null` nos campos.
- `SITUACAO_REGISTRO = 'Ativo'` → `is_active = true`; `'Inativo'` → `false`.
- `import_hash` é determinístico e estável (mesma entrada → mesmo hash; normalização case/trim).
- Duas linhas iguais → mesmo `import_hash` (deduplicação por lote).
- `TIPO_PRODUTO` ≠ `MEDICAMENTO` → linha ignorada.
- Linha sem `NOME_PRODUTO` → ignorada.

> O fluxo de I/O (download/upsert) pode ser testado com `--file` apontando para um **fixture CSV pequeno** em `win1252`, validando idempotência (rodar 2x → mesma contagem).

---

## Definition of Done
- [ ] `csv-parse` e `iconv-lite` adicionados ao backend
- [ ] Script `yarn import:medications` baixa, decodifica (win1252→UTF-8), parseia e faz upsert em lote
- [ ] Suporte a `--file <path>` para importar de arquivo local
- [ ] Dedup por `import_hash`; idempotente (rodar 2x não duplica)
- [ ] Upsert em lotes (~1000) via `IMedicationsRepository.bulkUpsert`, transação por lote
- [ ] Parser isolado e 100% testado (encoding, normalização, hash, filtros)
- [ ] Logs de progresso sem dados sensíveis; exit codes corretos
- [ ] Validado contra o CSV real: contagem coerente e acentuação correta (amostragem)
- [ ] Naming convention e estrutura seguidas
