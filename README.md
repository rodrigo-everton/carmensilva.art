This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Pagamentos negociados com Mercado Pago

O fluxo de Checkout Pro é iniciado por uma pessoa administradora dentro de cada
conversa. O valor é definido em reais, o link é enviado como uma mensagem de
pagamento estruturada e somente o webhook assinado pode confirmar a venda.

Antes do deploy:

1. Aplique, no Supabase, as migrations versionadas em `supabase/migrations/`.
2. Copie as variáveis de `.env.example` para `.env.local` e para o ambiente da
   Vercel. `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` e
   `SUPABASE_SECRET_KEY` são credenciais exclusivas do servidor. Defina também
   `MERCADOPAGO_ENVIRONMENT` (`test` ou `production`), fixe a conta com
   `MERCADOPAGO_SELLER_ID`, use `MERCADOPAGO_SITE_ID=MLB` e configure a validade
   em horas com `MERCADOPAGO_PREFERENCE_TTL_HOURS` (padrão: `24`).
3. Crie um token Sanity com permissão **Editor** e salve-o somente no servidor
   como `SANITY_API_WRITE_TOKEN`. Ele mantém a obra como `reserved` durante a
   cobrança, `sold` após a aprovação e `available` após expiração ou reembolso.
4. Em **Suas integrações > Webhooks** no Mercado Pago, configure o evento
   **Pagamentos** apontando para
   `https://www.carmemsilva.art.br/api/webhooks/mercadopago?source_news=webhooks`.
5. Use o botão **Simular** do painel do Mercado Pago para validar o receptor. O
   retorno do navegador serve apenas como feedback; a confirmação financeira é
   feita pela consulta server-side executada após o webhook.

A integração usa diretamente o `init_point` devolvido pela preferência; não é
necessária uma Public Key do Mercado Pago no navegador.

O Client ID, o Client Secret e o número da aplicação são identificadores
opcionais neste fluxo direto. O segredo exigido pelo webhook é a **assinatura
secreta** gerada ao salvar a configuração em **Suas integrações > Webhooks**;
ele não é o Client Secret. Usuário, senha e código de uma conta de teste servem
somente para entrar no checkout como comprador e não devem ser salvos no
ambiente da aplicação.

## E-mails transacionais

Consulte [docs/resend-supabase.md](docs/resend-supabase.md) para configurar o
Resend, o SMTP do Supabase Auth, os templates e a validação operacional.
