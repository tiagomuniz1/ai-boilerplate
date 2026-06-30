# Task — Prescrição por Princípio Ativo (Frontend)

## Descrição

Adaptar a interface de criação de receitas e o cadastro do médico para suportar prescrição por princípio ativo. A preferência do médico define o default por item; o autocomplete de medicamentos passa a usar o endpoint `/active-ingredients` no modo genérico, retornando entradas únicas de princípio ativo com dosagem já embutida (ex.: `"PARACETAMOL 500 MG"`).

**Pré-requisito:** task backend **receita-principio-ativo** concluída:
- `DoctorResponseDto.prescribeByActiveIngredient: boolean`
- `GET /active-ingredients?search=&limit=` → `ActiveIngredientResponseDto[]` com `id`, `name`, `representativeMedicationId`
- `CreatePrescriptionItemDto.useActiveIngredient: boolean`
- `PrescriptionResponseDto.items[].useActiveIngredient: boolean`

---

## Contexto

- O formulário de receita (`prescription-form.tsx`) usa `useMedications` para buscar medicamentos e adiciona itens com `medicationId`, `name`, `activeIngredient` e `instructions`.
- No modo genérico, a busca deve usar `GET /active-ingredients` em vez de `GET /medications` — retorna princípios ativos únicos sem ruído de marcas.
- A string `name` do `ActiveIngredientResponseDto` já contém a dosagem (`"PARACETAMOL 500 MG"`) — isso resolve o próximo requisito de exibir dosagem na receita sem nenhum campo adicional.
- `representativeMedicationId` é o `medicationId` enviado para o backend; o médico nunca vê nem escolhe a marca.

---

## Contratos

### Tipos locais

```ts
// types/doctor-model.types.ts (atualização)
interface IDoctorModel {
  // ...campos existentes
  prescribeByActiveIngredient: boolean
}

// types/active-ingredient.types.ts (novo)
interface IActiveIngredientModel {
  id: string
  name: string                      // "PARACETAMOL 500 MG"
  representativeMedicationId: string
}

// types/prescription-input.types.ts (atualização)
interface IPrescriptionItemInput {
  medicationId: string
  name: string                      // exibido na lista do formulário
  activeIngredient: string | null
  instructions: string
  useActiveIngredient: boolean
}
```

### Novo service e hook

```ts
// active-ingredients.service.ts (novo)
activeIngredientsService.search(params: { search?: string; limit?: number }): Promise<IActiveIngredientResponseDto[]>
// GET /active-ingredients?search=&limit=

// use-active-ingredients.hook.ts (novo)
useActiveIngredients(search: string): { data: IActiveIngredientModel[] | undefined; isPending: boolean }
// só busca quando search.length >= 2
```

---

## Fluxo principal

### 1. Cadastro do médico — preferência padrão

Na tela de edição (`/doctors/[id]/edit`), adicionar toggle:

```
Prescrever por princípio ativo por padrão
Quando ativo, as receitas iniciarão com o modo genérico
habilitado em cada medicamento.
```

- Mapeado para `prescribeByActiveIngredient` no payload de `PATCH /doctors/:id`.
- Visível e editável por ADMIN e DOCTOR (próprio perfil).

### 2. Formulário de receita — campo de busca condicional

O formulário determina o modo inicial a partir do `prescribeByActiveIngredient` do médico da consulta.

**Modo marca (`useActiveIngredient = false` por item):**
- Busca em `GET /medications` — comportamento atual.
- Exibe `name` em destaque, `activeIngredient` como texto secundário.

**Modo genérico (`useActiveIngredient = true` por item):**
- Busca em `GET /active-ingredients`.
- Exibe apenas `name` do `ActiveIngredientResponseDto` (ex.: `"PARACETAMOL 500 MG"`).
- Sem texto secundário — o nome já é autoexplicativo (princípio ativo + dosagem).
- Ao selecionar: adiciona item com `medicationId = representativeMedicationId`, `name = activeIngredient.name`, `activeIngredient = activeIngredient.name`, `useActiveIngredient = true`.

### 3. Toggle por item

Cada item adicionado à lista da receita tem um toggle individual:

```
☑ Genérico      ← label curto; marcado = modo genérico
```

- Pré-marcado conforme preferência do médico.
- Alternar recalcula o `name` exibido na lista (marca ↔ princípio ativo).
- Medicamento sem `activeIngredient`: toggle desabilitado e fixo em `false` + tooltip "Princípio ativo não disponível".

### 4. Submit

Cada item enviado no DTO:
```ts
{
  medicationId: item.medicationId,         // representativeMedicationId no modo genérico
  instructions: item.instructions,
  useActiveIngredient: item.useActiveIngredient,
}
```

### 5. Exibição de receita existente

Na listagem de itens de uma receita já criada (tela de detalhes da consulta):
- `useActiveIngredient && activeIngredient` → exibir `activeIngredient` (inclui dosagem)
- caso contrário → exibir `name` (comportamento atual)

---

## Regras de negócio

- `prescribeByActiveIngredient` do médico define apenas o **estado inicial** do toggle — não bloqueia.
- O campo de busca muda de endpoint conforme o modo atual do toggle no formulário (não globalmente).
- Ao trocar de modo no toggle de um item já adicionado, apenas o `useActiveIngredient` muda — `medicationId` e `name` não são substituídos retroativamente (o item foi escolhido com critério do modo anterior).
- Item sem `activeIngredient`: `useActiveIngredient` enviado como `false` mesmo que o toggle estivesse marcado — nunca enviar `true` sem `activeIngredient`.
- Não armazenar estado do formulário de receita em Zustand.

---

## Dependências

- `useDoctor` ou dados do appointment (já carregados) — para ler `prescribeByActiveIngredient`
- `useMedications` (existente) — modo marca, sem alteração
- `useActiveIngredients` (novo) — modo genérico
- `useCreatePrescription` (existente) — payload por item passa a incluir `useActiveIngredient`
- `IDoctorModel` — atualizar com `prescribeByActiveIngredient`

---

## Decisões técnicas

- **Dois hooks, não um** — `useMedications` e `useActiveIngredients` têm shapes de resposta diferentes; unificá-los criaria abstração desnecessária.
- **`name` do item no modo genérico = `activeIngredient.name`** — a string já contém princípio ativo + dosagem; não há campo separado de dosagem a adicionar agora.
- **Toggle por item em vez de toggle global** — evita estados inconsistentes quando itens de uma mesma receita precisam de modos diferentes (ex.: antibiótico por marca, analgésico por genérico).
- **`representativeMedicationId` transparente** — o médico nunca vê qual marca foi escolhida como representante; o backend pode mudar o representante sem impacto na UX.

---

## Estrutura de arquivos

```
components/features/active-ingredients/       → novo
  services/active-ingredients.service.ts
  hooks/use-active-ingredients.hook.ts
  mappers/to-active-ingredient-model.ts
  types/active-ingredient.types.ts

components/features/doctors/
  types/doctor-model.types.ts                 → + prescribeByActiveIngredient
  mappers/to-doctor-model.ts                  → mapear campo novo
  components/doctor-form.tsx                  → + toggle prescribeByActiveIngredient

components/features/prescriptions/
  components/prescription-form.tsx            → busca condicional, toggle por item, payload atualizado
  use-cases/create-prescription.use-case.ts   → incluir useActiveIngredient nos itens
```

---

## Cenários de teste

### `useActiveIngredients` hook
- Não busca quando `search.length < 2`
- Chama `activeIngredientsService.search` com o termo quando `length >= 2`

### `activeIngredientsService`
- Chama `GET /active-ingredients?search=&limit=`
- Mapeia resposta para `IActiveIngredientModel[]`

### `prescription-form` (integração)
- Médico com `prescribeByActiveIngredient = true` → toggle de cada item inicia marcado; campo de busca usa `useActiveIngredients`
- Médico com `prescribeByActiveIngredient = false` → toggle inicia desmarcado; campo de busca usa `useMedications`
- Selecionar item no modo genérico → adiciona com `medicationId = representativeMedicationId` e `useActiveIngredient = true`
- Toggle marcado → item submetido com `useActiveIngredient: true`
- Toggle desmarcado → item submetido com `useActiveIngredient: false`
- Medicamento sem `activeIngredient` → toggle desabilitado; enviado com `useActiveIngredient: false`

### `doctor-form` (integração)
- Toggle `prescribeByActiveIngredient` visível e editável
- Submit inclui o campo no payload

---

## Definition of Done

- [ ] `IDoctorModel` e mapper atualizados com `prescribeByActiveIngredient`
- [ ] Toggle no formulário do médico, salvo via `PATCH /doctors/:id`
- [ ] `activeIngredientsService` e `useActiveIngredients` implementados e testados
- [ ] Formulário de receita usa `useActiveIngredients` no modo genérico e `useMedications` no modo marca
- [ ] Resultados do modo genérico exibem apenas `name` (princípio ativo + dosagem), sem marca
- [ ] Toggle `useActiveIngredient` por item, pré-preenchido pela preferência do médico
- [ ] Medicamento sem `activeIngredient`: toggle desabilitado, `useActiveIngredient: false` no payload
- [ ] Payload de criação inclui `useActiveIngredient` por item
- [ ] Exibição de receita existente respeita `useActiveIngredient` do snapshot
- [ ] Testes unitários 100% de cobertura (service, hook, mapper, use-case)
- [ ] Testes de integração: `prescription-form` e `doctor-form`
- [ ] Sem axios fora de `api-client.ts`, sem dados de API em Zustand
