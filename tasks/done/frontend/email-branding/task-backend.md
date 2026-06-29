# Task — Branding da Clínica nos E-mails Transacionais (Backend)

## Descrição

Atualizar o template HTML do e-mail transacional de definição de senha para que ele sempre reflita a identidade visual da clínica do destinatário — usando a logo cadastrada e a cor de destaque do tema ativo. Quando não houver branding configurado, o e-mail exibe os valores padrão da plataforma.

---

## Contexto

- O `SmtpEmailAdapter.buildHtml()` gera HTML com branding fixo da plataforma (`#0066cc`, sem logo, "Pulso" hardcoded).
- A entidade `Clinic` já possui `logoUrl: string | null` e `logoDarkUrl: string | null`.
- A entidade `Theme` já possui `accentColor: string` e `accentSoftColor: string`.
- A clínica referencia seu tema via `themeId: string | null`.
- O `SendSetPasswordEmailUseCase` já busca a clínica (para obter o `slug`) — basta estender essa busca para incluir `logoUrl` e `accentColor`.
- O `ThemesModule` já possui `FindThemeByIdUseCase`, mas não o exporta. O `AuthModule` já importa `ClinicsModule`.

---

## Contratos

### Interface do adapter (atualização)

```ts
// apps/backend/src/modules/auth/adapters/email.adapter.interface.ts
export interface ISendSetPasswordEmailParams {
  to: string
  recipientName: string
  link: string
  clinicName?: string      // novo — nome da clínica para exibir no corpo e no subject
  clinicLogoUrl?: string   // novo — URL pública do S3
  accentColor?: string     // novo — cor hex do tema ativo (ex: "#0066cc")
}
```

---

## Assinaturas esperadas

```ts
// SmtpEmailAdapter
private buildHtml(
  recipientName: string,
  link: string,
  branding: { clinicName: string; clinicLogoUrl: string | null; accentColor: string }
): string

// SendSetPasswordEmailUseCase — execute() sem mudança de assinatura pública
// Internamente resolve branding antes de chamar emailAdapter.sendSetPasswordEmail()
```

---

## Fluxo principal

### Resolução de branding no `SendSetPasswordEmailUseCase.execute()`

1. Busca o usuário e a clínica (comportamento já existente para obter `slug`).
2. Lê `clinic.logoUrl` e `clinic.themeId`.
3. Se `clinic.themeId` não for `null`, chama `FindThemeByIdUseCase.execute(clinic.themeId)` para obter `accentColor`.
4. Monta objeto de branding:
   ```ts
   const branding = {
     clinicName: clinic.name,
     clinicLogoUrl: clinic.logoUrl ?? null,
     accentColor: theme?.accentColor ?? '#0066cc',
   }
   ```
5. Passa o branding em `ISendSetPasswordEmailParams` ao chamar `emailAdapter.sendSetPasswordEmail()`.
6. Se a clínica não for encontrada (ex: `PLATFORM_ADMIN` sem `clinicId`), envia o e-mail com os defaults da plataforma — não bloqueia o envio.

### Template HTML resultante

- **Subject:** `Defina sua senha — ${clinicName}`
- **Topo do e-mail:** logo da clínica quando `clinicLogoUrl` estiver presente; caso contrário, nome da clínica em texto.
- **Botão CTA:** fundo com `accentColor`.
- **Corpo:** substitui "Pulso" pelo `clinicName` onde aplicável.

Estrutura do HTML:

```html
<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <!-- cabeçalho com branding -->
  ${clinicLogoUrl
    ? `<img src="${clinicLogoUrl}" alt="${clinicName}"
           style="max-height:56px;max-width:180px;object-fit:contain;display:block;margin-bottom:24px">`
    : `<p style="font-weight:700;font-size:18px;margin:0 0 24px">${clinicName}</p>`
  }

  <p>Olá, ${recipientName}.</p>
  <p>Sua conta foi criada na plataforma ${clinicName}. Clique no botão abaixo para definir sua senha e acessar o sistema.</p>
  <p style="margin:32px 0">
    <a href="${link}"
       style="background:${accentColor};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Definir minha senha
    </a>
  </p>
  <p style="color:#666;font-size:13px">
    Este link é válido por 72 horas. Se você não esperava este e-mail, ignore-o.
  </p>
  <p style="color:#666;font-size:13px">
    Ou copie e cole este endereço no navegador:<br/>
    <span style="word-break:break-all">${link}</span>
  </p>
</div>
```

---

## Regras de negócio

- **Logo:** exibir `<img>` apenas quando `clinicLogoUrl` for não-nulo — nunca exibir imagem quebrada.
- **Cor:** usar `accentColor` do tema ativo da clínica; fallback `'#0066cc'` quando não houver tema.
- **Nome:** usar `clinic.name`; fallback `'Pulso'` quando não houver clínica (ex: usuário PLATFORM_ADMIN).
- **Falha ao buscar tema:** logar `warn` e prosseguir com o fallback de cor — nunca bloquear o envio do e-mail.
- **`clinicId` nulo:** enviar com defaults da plataforma (`clinicName='Pulso'`, `clinicLogoUrl=null`, `accentColor='#0066cc'`).
- **Logo:** usar `logoUrl` (versão light) — não usar `logoDarkUrl`, pois clientes de e-mail não suportam `prefers-color-scheme` de forma confiável.

---

## Dependências

- `FindThemeByIdUseCase` (ThemesModule) — precisa ser exportado e injetado no `AuthModule`
- `FindClinicByIdUseCase` (ClinicsModule) — já injetado via `ClinicsModule`
- `IUsersRepository` — já injetado
- `IEmailAdapter` / `SmtpEmailAdapter` — já existentes

---

## Decisões técnicas da task

- **Não alterar a assinatura pública de `execute()`** — o caller (`CreateUserUseCase`, `ActivateUserUseCase`, etc.) não precisa mudar.
- **`ThemesModule` exporta `FindThemeByIdUseCase`** — padrão do projeto: módulos exportam use-cases, não repositories.
- **Busca do tema em try/catch** — falha ao resolver o tema não pode bloquear o envio do e-mail, que é assíncrono e já tem seu próprio bloco de tratamento.
- **`logoUrl` (light)** — clientes de e-mail não suportam dark mode de forma uniforme; usar sempre a versão light.
- **`buildHtml` recebe objeto `branding`** — evita lista crescente de parâmetros; tipado como objeto interno (não exposto na interface).

---

## Restrições

- NÃO alterar a assinatura pública de `SendSetPasswordEmailUseCase.execute(userId, clinicId)`.
- NÃO usar `logoDarkUrl` no template de e-mail.
- NÃO bloquear o fluxo quando a busca de tema falhar — usar fallback e logar `warn`.
- NÃO criar nova entidade, migration ou DTO no `shared` — o branding é passado internamente entre use-case e adapter.
- NÃO expor `accentColor` ou `logoUrl` em logs de erro.

---

## Alterações nos módulos

### `ThemesModule`

```ts
// themes.module.ts — adicionar FindThemeByIdUseCase em exports
@Module({
  ...
  exports: [FindThemeByIdUseCase],
})
export class ThemesModule {}
```

### `AuthModule`

```ts
// auth.module.ts — importar ThemesModule
@Module({
  imports: [
    ...
    ClinicsModule,
    ThemesModule, // novo
  ],
  ...
})
export class AuthModule {}
```

---

## Estrutura de arquivos alterados

```
apps/backend/src/modules/auth/
  adapters/
    email.adapter.interface.ts              → adicionar clinicName?, clinicLogoUrl?, accentColor? em ISendSetPasswordEmailParams
    smtp-email.adapter.ts                   → atualizar buildHtml() para usar branding; atualizar subject
    smtp-email.adapter.spec.ts              → cobrir buildHtml com e sem logo, com e sem accentColor

  use-cases/
    send-set-password-email.use-case.ts     → injetar FindThemeByIdUseCase; resolver branding antes de chamar o adapter
    send-set-password-email.use-case.spec.ts → cobrir todos os cenários de branding

apps/backend/src/modules/themes/
  themes.module.ts                          → exportar FindThemeByIdUseCase
```

---

## Cenários de teste

### `SmtpEmailAdapter` (unitário)

- `buildHtml` com `clinicLogoUrl` presente → HTML contém `<img src="...">` com `alt` do `clinicName`
- `buildHtml` com `clinicLogoUrl = null` → HTML contém nome da clínica em texto, sem `<img>`
- `buildHtml` com `accentColor` customizado → botão tem `background:${accentColor}`
- `buildHtml` sem `accentColor` → botão usa fallback `#0066cc`
- `buildHtml` com `clinicName` → subject e corpo usam o nome da clínica
- `buildHtml` sem `clinicName` → body usa fallback `'Pulso'`

### `SendSetPasswordEmailUseCase` (unitário)

- Clínica com `themeId` válido → busca tema, passa `accentColor` ao adapter
- Clínica sem `themeId` (`null`) → não chama `FindThemeByIdUseCase`, usa cor fallback
- `FindThemeByIdUseCase` lança exceção → captura, loga `warn`, envia e-mail com cor fallback
- Clínica com `logoUrl` → passa `clinicLogoUrl` ao adapter
- Clínica sem `logoUrl` → passa `clinicLogoUrl: undefined` (ou `null`) ao adapter
- `clinicId = null` → não tenta buscar clínica/tema, usa defaults da plataforma
- Clínica não encontrada → usa defaults e prossegue sem lançar exceção

---

## Definition of Done

- [ ] `ISendSetPasswordEmailParams` atualizado com `clinicName?`, `clinicLogoUrl?`, `accentColor?`
- [ ] `SmtpEmailAdapter.buildHtml()` usa logo quando disponível, fallback de texto quando não
- [ ] `SmtpEmailAdapter.buildHtml()` aplica `accentColor` no botão CTA; fallback `#0066cc`
- [ ] Subject do e-mail usa `clinicName`; fallback `'Pulso'`
- [ ] `SendSetPasswordEmailUseCase` injeta `FindThemeByIdUseCase` e resolve branding antes do envio
- [ ] Falha ao buscar tema não bloqueia envio — `warn` logado, fallback aplicado
- [ ] `ThemesModule` exporta `FindThemeByIdUseCase`
- [ ] `AuthModule` importa `ThemesModule`
- [ ] Testes unitários com 100% de cobertura (`smtp-email.adapter.spec.ts` e `send-set-password-email.use-case.spec.ts`)
- [ ] Sem dados sensíveis em logs
- [ ] Build sem erros / lint sem warnings
