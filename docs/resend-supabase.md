# Resend e Supabase Auth

Esta integração tem dois caminhos de envio:

- o Supabase Auth envia confirmação de cadastro, recuperação de senha e aviso de
  senha alterada pelo SMTP do Resend;
- a aplicação usa o SDK do Resend para avisar as pessoas administradoras quando
  uma conversa é criada.

Os destinatários administrativos são descobertos no Supabase a partir das
contas com papel de administrador. Não crie `ADMIN_NOTIFICATION_EMAILS`: a lista
não é mantida em variável de ambiente.

## Variáveis da aplicação

Copie estas variáveis de `.env.example` para `.env.local` e para a hospedagem:

```dotenv
RESEND_SECRET_KEY=
RESEND_FROM_EMAIL=no-reply@updates.carmemsilva.art.br
RESEND_FROM_NAME="Carmem Silva"
```

- `RESEND_SECRET_KEY` é uma API key privada, usada somente no servidor.
- `RESEND_FROM_EMAIL` precisa pertencer ao domínio ou subdomínio verificado no
  Resend.
- `RESEND_FROM_NAME` é o nome visível do remetente.
- `SUPABASE_SECRET_KEY` também precisa estar configurada no servidor para a
  aplicação descobrir os administradores e resolver seus e-mails no Supabase.

O Supabase não lê essas variáveis da aplicação. A automação descrita abaixo
envia esses valores à Management API sem gravar a chave nos arquivos versionados.

## 1. Verificar o domínio no Resend

1. No Resend, abra **Domains** e selecione **Add Domain**.
2. Prefira um subdomínio transacional, como `emails.seu-dominio.com`. Isso
   separa a reputação dos e-mails de autenticação de outros envios.
3. Adicione no provedor DNS todos os registros exibidos pelo Resend. A
   verificação exige SPF e DKIM; adicione também o registro CAA se o painel o
   solicitar. DMARC é recomendado para produção.
4. Volte ao Resend e aguarde o estado **Verified** antes de usar o remetente.
5. Em **Domains > domínio verificado > Configuration**, mantenha **open
   tracking** e **click tracking** desabilitados. O rastreamento pode reescrever
   links de autenticação de uso único.

Depois da verificação, o Resend permite enviar de qualquer endereço pertencente
ao domínio verificado; não é necessário cadastrar cada remetente separadamente.

Neste projeto, o domínio verificado é `updates.carmemsilva.art.br` e o remetente
é `no-reply@updates.carmemsilva.art.br`.

## 2. Criar e proteger as API keys

Em **API Keys > Create API Key**, selecione **Sending access** e restrinja a key
ao domínio verificado. Para reduzir o impacto de uma credencial comprometida, é
preferível criar duas keys:

- uma para o SMTP do Supabase, armazenada somente no painel do Supabase;
- outra para a aplicação, armazenada como `RESEND_SECRET_KEY` na hospedagem.

Uma key do Resend foi exposta durante a configuração inicial e deve ser
rotacionada. Crie as novas keys, atualize todos os consumidores, valide os
envios e só então exclua a key antiga em **API Keys**. Nunca coloque uma key real
neste documento, em código-fonte, em uma variável `NEXT_PUBLIC_` ou em commits.

## 3. Conectar o SMTP do Resend ao Supabase

No projeto hospedado do Supabase, abra **Authentication > Emails > SMTP
Settings**, habilite o SMTP personalizado e preencha:

| Campo | Valor |
| --- | --- |
| Sender name | o mesmo valor de `RESEND_FROM_NAME` |
| Sender email | o mesmo valor de `RESEND_FROM_EMAIL` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a API key do Resend destinada ao SMTP |

A porta `465` usa SMTPS com TLS implícito. Salve a configuração e confirme que
o endereço do remetente pertence exatamente ao domínio ou subdomínio já
verificado.

### Aplicação automatizada

Para configurar o projeto hospedado sem copiar os templates pelo painel:

1. Crie um Personal Access Token em **Supabase > Account > Access Tokens**, com
   acesso de escrita à configuração de Auth do projeto.
2. Adicione temporariamente `SUPABASE_ACCESS_TOKEN=` ao `.env.local`.
3. Execute `npm run email:configure`.
4. Depois da confirmação `"ok": true`, remova o token do `.env.local` e revogue-o
   no Supabase se ele foi criado apenas para esta operação.

O script lê a configuração atual antes do `PATCH`, preserva os redirects já
existentes e adiciona somente os callbacks usados pela aplicação. Ele configura
SMTP, confirmação obrigatória, recuperação de senha, aviso de senha alterada e
os três templates em `supabase/templates/`.

## 4. Configurar confirmação e redirecionamentos

1. Em **Authentication > Sign In / Providers > Email**, mantenha **Confirm
   Email** habilitado. Com essa opção desligada, o cadastro confirma o e-mail
   implicitamente e nenhum e-mail de confirmação é necessário.
2. Em **Authentication > URL Configuration**, defina **Site URL** com a mesma
   origem de `NEXT_PUBLIC_SITE_URL`, sem caminhos adicionais.
3. Na lista **Redirect URLs**, adicione
   `https://carmemsilva.art.br/auth/callback`. Para desenvolvimento local, adicione
   também `http://localhost:3000/auth/callback` ou, se outros fluxos locais
   precisarem, `http://localhost:3000/**`.

O cadastro usa `/auth/callback`. A recuperação usa
`/auth/callback?next=/redefinir-senha` como destino; o valor completo deve ser
URL-encoded quando for incluído dentro de outra URL. Como a origem é a mesma da
**Site URL**, o Supabase aceita a query string e o callback encaminha a sessão
para `/redefinir-senha`.

O fluxo de senha fica assim:

1. `/recuperar-senha` chama a recuperação do Supabase;
2. o template **Reset password** envia `{{ .ConfirmationURL }}`;
3. depois da validação, o Supabase retorna a
   `/auth/callback?next=/redefinir-senha`;
4. `/redefinir-senha` grava a nova senha;
5. a notificação **Password changed** avisa a pessoa usuária.

## 5. Personalizar os templates em pt-BR

Em **Authentication > Emails > Templates**, edite os templates abaixo. O
Supabase usa Go Templates: preserve as expressões `{{ ... }}` exatamente como
estão. `{{ .ConfirmationURL }}` já contém o token e o `redirect_to`; não monte
esses dados manualmente no HTML.

As versões aplicadas pela automação estão em `supabase/templates/confirmation.html`,
`supabase/templates/recovery.html` e `supabase/templates/password-changed.html`.

### Confirm signup

Assunto:

```text
Confirme seu cadastro | Carmem Silva
```

HTML sugerido:

```html
<h2>Confirme seu cadastro</h2>
<p>Olá!</p>
<p>Recebemos um cadastro para <strong>{{ .Email }}</strong>.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar meu e-mail</a></p>
<p>Se você não fez este cadastro, ignore esta mensagem.</p>
```

### Reset password

Assunto:

```text
Redefina sua senha | Carmem Silva
```

HTML sugerido:

```html
<h2>Redefina sua senha</h2>
<p>Recebemos um pedido para redefinir a senha de <strong>{{ .Email }}</strong>.</p>
<p><a href="{{ .ConfirmationURL }}">Escolher uma nova senha</a></p>
<p>Se você não fez este pedido, ignore esta mensagem.</p>
```

### Password changed

Na seção **Security Notifications**, abra **Password changed**, habilite a
notificação e personalize o conteúdo.

Assunto:

```text
Sua senha foi alterada | Carmem Silva
```

HTML sugerido:

```html
<h2>Sua senha foi alterada</h2>
<p>A senha da conta <strong>{{ .Email }}</strong> foi alterada.</p>
<p>Se foi você, nenhuma ação é necessária.</p>
<p>Se não reconhece esta alteração, acesse {{ .SiteURL }} e redefina sua senha imediatamente.</p>
```

O template **Reset password** inicia uma recuperação. **Password changed** é
uma notificação de segurança enviada depois que a senha já foi modificada; os
dois devem permanecer habilitados e personalizados.

## 6. Limites e proteção contra abuso

- Revise **Authentication > Rate Limits**. Ao ativar SMTP personalizado, o
  Supabase começa com um limite baixo de 30 e-mails de autenticação por hora;
  ajuste-o somente para a demanda prevista e dentro dos limites do plano do
  Resend.
- Configure hCaptcha ou Cloudflare Turnstile em **Settings > Authentication >
  Bot and Abuse Protection > Enable CAPTCHA protection** para proteger cadastro,
  login e recuperação de senha.
- Não habilite CAPTCHA no painel antes de a interface enviar o `captchaToken`
  nas chamadas do Supabase; caso contrário, esses formulários passarão a
  falhar.
- Mantenha o rastreamento de links desligado no Resend. Links de confirmação e
  recuperação são sensíveis, de uso único e podem ser alterados por tracking ou
  consumidos antecipadamente por scanners de e-mail.

## 7. Hospedagem e validação

1. Na hospedagem, cadastre `RESEND_SECRET_KEY`, `RESEND_FROM_EMAIL` e
   `RESEND_FROM_NAME` para **Production**. Adicione-os também em **Preview** se
   os previews realmente precisarem enviar e-mails.
2. Confirme `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` no mesmo
   ambiente.
3. Faça um novo deploy; alterar variáveis não atualiza um deploy já construído.
4. Cadastre um e-mail novo e valide o recebimento e o retorno por
   `/auth/callback`.
5. Passe por `/recuperar-senha` e `/redefinir-senha`; confira tanto o e-mail de
   recuperação quanto o aviso de senha alterada.
6. Com uma conta cliente, crie uma conversa inédita. Confirme que as contas
   administrativas atuais do Supabase recebem a notificação. Reabrir uma
   conversa existente não deve gerar outro aviso de nova conversa.
7. Verifique os eventos em **Resend > Emails** e os erros em **Supabase > Logs**.
   O envio da notificação administrativa não deve desfazer a criação da conversa
   se o provedor de e-mail estiver temporariamente indisponível.

## Referências oficiais

- [SMTP do Resend](https://resend.com/docs/send-with-smtp)
- [Domínios verificados no Resend](https://resend.com/docs/dashboard/domains/introduction)
- [Tracking no Resend](https://resend.com/docs/dashboard/domains/tracking)
- [API keys do Resend](https://resend.com/docs/dashboard/api-keys/introduction)
- [SMTP personalizado no Supabase](https://supabase.com/docs/guides/auth/auth-smtp)
- [Templates de e-mail do Supabase](https://supabase.com/docs/guides/auth/auth-email-templates)
- [URLs de redirecionamento do Supabase](https://supabase.com/docs/guides/auth/redirect-urls)
- [CAPTCHA no Supabase](https://supabase.com/docs/guides/auth/auth-captcha)
- [Checklist de produção do Supabase](https://supabase.com/docs/guides/deployment/going-into-prod)
