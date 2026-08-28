import "server-only"

import type {SupabaseClient, User} from "@supabase/supabase-js"
import {Resend} from "resend"

import {createSupabaseAdminClient} from "@/lib/supabase-admin"

const SUPABASE_PAGE_SIZE = 1000
const FALLBACK_FROM_EMAIL = "onboarding@resend.dev"
const FALLBACK_FROM_NAME = "Carmem Silva"

type AdminEmailRecipient = {
  id: string
  email: string
  name: string | null
}

export type NewConversationEmailInput = {
  conversationId: string
  artworkId: string
  artworkTitle: string
  customerEmail: string | null
  customerName: string | null
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }

  return "erro desconhecido"
}

function normalizeSingleLine(value: string, fallback: string) {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return normalized || fallback
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      default:
        return "&#39;"
    }
  })
}

function isEmail(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
}

function senderAddress() {
  const configuredEmail = process.env.RESEND_FROM_EMAIL?.trim()
  const email = configuredEmail || FALLBACK_FROM_EMAIL

  if (!configuredEmail) {
    console.warn(
      "RESEND_FROM_EMAIL não está configurado; onboarding@resend.dev deve ser usado somente durante o onboarding do Resend.",
    )
  }

  if (!isEmail(email)) {
    console.error("RESEND_FROM_EMAIL não contém um endereço de e-mail válido.")
    return null
  }

  const name = normalizeSingleLine(
    process.env.RESEND_FROM_NAME ?? FALLBACK_FROM_NAME,
    FALLBACK_FROM_NAME,
  )
  const quotedName = name.replace(/(["\\])/g, "\\$1")

  return `"${quotedName}" <${email}>`
}

function conversationUrl(conversationId: string) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (!configuredSiteUrl) {
    return null
  }

  try {
    const baseUrl = new URL(
      configuredSiteUrl.includes("://")
        ? configuredSiteUrl
        : `https://${configuredSiteUrl}`,
    )
    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname)
    const hasSafeProtocol =
      baseUrl.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" &&
        baseUrl.protocol === "http:" &&
        isLocalhost)

    if (!hasSafeProtocol || baseUrl.username || baseUrl.password) {
      throw new Error("origem insegura")
    }

    const url = new URL("/admin/mensagem", baseUrl.origin)
    url.searchParams.set("conversa", conversationId)

    return url.toString()
  } catch (error) {
    console.error(
      "NEXT_PUBLIC_SITE_URL é inválida; a notificação será enviada sem link.",
      errorMessage(error),
    )
    return null
  }
}

async function listRoleAdminIds(supabase: SupabaseClient) {
  const adminIds = new Set<string>()

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const {data, error} = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .order("user_id", {ascending: true})
      .range(from, from + SUPABASE_PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Não foi possível listar os papéis administrativos: ${error.message}`)
    }

    for (const role of data ?? []) {
      if (typeof role.user_id === "string") {
        adminIds.add(role.user_id)
      }
    }

    if (!data || data.length < SUPABASE_PAGE_SIZE) {
      break
    }
  }

  return adminIds
}

async function listAllAuthUsers(supabase: SupabaseClient) {
  const users: User[] = []
  let page = 1

  while (page) {
    const {data, error} = await supabase.auth.admin.listUsers({
      page,
      perPage: SUPABASE_PAGE_SIZE,
    })

    if (error) {
      throw new Error(`Não foi possível listar os usuários: ${error.message}`)
    }

    users.push(...data.users)
    page = "nextPage" in data && data.nextPage ? data.nextPage : 0
  }

  return users
}

function userName(user: User) {
  const metadataName = user.user_metadata.nome ?? user.user_metadata.full_name

  return typeof metadataName === "string"
    ? normalizeSingleLine(metadataName, "") || null
    : null
}

async function listAdminRecipients(supabase: SupabaseClient) {
  const [roleAdminIds, users] = await Promise.all([
    listRoleAdminIds(supabase),
    listAllAuthUsers(supabase),
  ])
  const recipients: AdminEmailRecipient[] = []

  for (const user of users) {
    const isAdmin =
      user.app_metadata.role === "admin" || roleAdminIds.has(user.id)

    if (!isAdmin) {
      continue
    }

    const email = user.email?.trim().toLowerCase()

    if (!email || !isEmail(email)) {
      console.warn(
        "Administrador sem e-mail válido não receberá a notificação de conversa.",
        {adminId: user.id},
      )
      continue
    }

    recipients.push({
      id: user.id,
      email,
      name: userName(user),
    })
  }

  return recipients
}

function renderEmail(
  input: NewConversationEmailInput,
  admin: AdminEmailRecipient,
  url: string | null,
) {
  const adminName = normalizeSingleLine(admin.name ?? "administrador(a)", "administrador(a)")
  const artworkTitle = normalizeSingleLine(input.artworkTitle, "Obra sem título")
  const artworkId = normalizeSingleLine(input.artworkId, "não informado")
  const customerName = normalizeSingleLine(input.customerName ?? "não informado", "não informado")
  const customerEmail = normalizeSingleLine(input.customerEmail ?? "não informado", "não informado")
  const conversationId = normalizeSingleLine(input.conversationId, "não informado")
  const subject = `Nova conversa sobre “${artworkTitle}”`
  const linkHtml = url
    ? `<p style="margin: 28px 0 0;"><a href="${escapeHtml(url)}" style="display: inline-block; border-radius: 8px; background: #7d2134; color: #ffffff; padding: 12px 18px; text-decoration: none; font-weight: 600;">Abrir conversa no painel</a></p>`
    : "<p style=\"margin: 24px 0 0;\">Acesse o painel administrativo para abrir a conversa.</p>"
  const linkText = url
    ? `\nAbrir conversa no painel: ${url}`
    : "\nAcesse o painel administrativo para abrir a conversa."

  return {
    subject,
    html: `<!doctype html>
<html lang="pt-BR">
  <body style="margin: 0; background: #f7f3ed; color: #241b1d; font-family: Arial, sans-serif;">
    <main style="max-width: 620px; margin: 0 auto; padding: 32px 20px;">
      <section style="border-radius: 14px; background: #ffffff; padding: 28px;">
        <p style="margin: 0 0 16px;">Olá, ${escapeHtml(adminName)}.</p>
        <h1 style="margin: 0 0 16px; color: #7d2134; font-size: 24px;">Uma nova conversa foi criada</h1>
        <p style="margin: 0 0 24px; line-height: 1.6;">Um cliente demonstrou interesse em uma obra no site.</p>
        <table role="presentation" style="width: 100%; border-collapse: collapse; line-height: 1.5;">
          <tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">Cliente</td><td style="padding: 6px 0;">${escapeHtml(customerName)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">E-mail</td><td style="padding: 6px 0;">${escapeHtml(customerEmail)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">Obra</td><td style="padding: 6px 0;">${escapeHtml(artworkTitle)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">ID da obra</td><td style="padding: 6px 0;">${escapeHtml(artworkId)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">Conversa</td><td style="padding: 6px 0;">${escapeHtml(conversationId)}</td></tr>
        </table>
        ${linkHtml}
      </section>
    </main>
  </body>
</html>`,
    text: `Olá, ${adminName}.

Uma nova conversa foi criada.
Um cliente demonstrou interesse em uma obra no site.

Cliente: ${customerName}
E-mail: ${customerEmail}
Obra: ${artworkTitle}
ID da obra: ${artworkId}
Conversa: ${conversationId}
${linkText}`,
  }
}

export async function notifyAdminsOfNewConversation(
  input: NewConversationEmailInput,
) {
  try {
    const apiKey = process.env.RESEND_SECRET_KEY?.trim()

    if (!apiKey) {
      console.error(
        "RESEND_SECRET_KEY não está configurada; a notificação de nova conversa não será enviada.",
      )
      return
    }

    const from = senderAddress()

    if (!from) {
      return
    }

    const supabase = createSupabaseAdminClient()
    const recipients = await listAdminRecipients(supabase)

    if (recipients.length === 0) {
      console.warn("Nenhum administrador com e-mail válido foi encontrado para notificação.")
      return
    }

    const url = conversationUrl(input.conversationId)
    const resend = new Resend(apiKey)

    await Promise.all(
      recipients.map(async (admin) => {
        const email = renderEmail(input, admin, url)

        try {
          const {error} = await resend.emails.send(
            {
              from,
              to: admin.email,
              subject: email.subject,
              html: email.html,
              text: email.text,
            },
            {
              idempotencyKey: `conversation-created/${input.conversationId}/${admin.id}`,
            },
          )

          if (error) {
            console.error("O Resend recusou a notificação de nova conversa.", {
              conversationId: input.conversationId,
              adminId: admin.id,
              error: errorMessage(error),
            })
          }
        } catch (error) {
          console.error("Não foi possível enviar a notificação de nova conversa.", {
            conversationId: input.conversationId,
            adminId: admin.id,
            error: errorMessage(error),
          })
        }
      }),
    )
  } catch (error) {
    console.error("Não foi possível preparar a notificação de nova conversa.", {
      conversationId: input.conversationId,
      error: errorMessage(error),
    })
  }
}
