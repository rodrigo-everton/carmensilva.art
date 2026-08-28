import {readFile} from "node:fs/promises"

const MANAGEMENT_API = "https://api.supabase.com/v1"

function requiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} não está configurada.`)
  }

  return value
}

function siteOrigin(value) {
  const url = new URL(value.includes("://") ? value : `https://${value}`)

  if (
    url.username ||
    url.password ||
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL precisa ser uma origem HTTPS de produção, sem caminho, query ou hash.",
    )
  }

  return url.origin
}

function projectReference(value) {
  const url = new URL(value)
  const match = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)

  if (!match) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não contém um project ref hospedado válido.")
  }

  return match[1]
}

function senderEmail(value) {
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)) {
    throw new Error("RESEND_FROM_EMAIL não contém um endereço válido.")
  }

  return value.toLowerCase()
}

function existingRedirects(value) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(",")

  return values.map((item) => item.trim()).filter(Boolean)
}

async function responseBody(response) {
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const rawMessage = body?.message ?? body?.error
    const message =
      typeof rawMessage === "string"
        ? rawMessage
        : rawMessage
          ? JSON.stringify(rawMessage)
          : response.statusText
    throw new Error(`Supabase Management API (${response.status}): ${message}`)
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("A Supabase Management API respondeu sem uma configuração válida.")
  }

  return body
}

async function template(name) {
  return readFile(new URL(`../supabase/templates/${name}.html`, import.meta.url), "utf8")
}

const accessToken = requiredEnvironmentVariable("SUPABASE_ACCESS_TOKEN")
const resendApiKey = requiredEnvironmentVariable("RESEND_SECRET_KEY")
const fromEmail = senderEmail(requiredEnvironmentVariable("RESEND_FROM_EMAIL"))
const fromName = process.env.RESEND_FROM_NAME?.trim() || "Carmem Silva"
const origin = siteOrigin(requiredEnvironmentVariable("NEXT_PUBLIC_SITE_URL"))
const projectRef = projectReference(
  requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
)
const endpoint = `${MANAGEMENT_API}/projects/${projectRef}/config/auth`
const headers = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
}

const current = await responseBody(await fetch(endpoint, {headers}))

if (current.disable_signup === true) {
  throw new Error(
    "Novos cadastros estão desabilitados no Supabase. Habilite-os antes de configurar a confirmação por e-mail.",
  )
}

const confirmationCallback = new URL("/auth/callback", origin).toString()
const recoveryCallback = new URL(confirmationCallback)
recoveryCallback.searchParams.set("next", "/redefinir-senha")

const redirects = new Set(existingRedirects(current.uri_allow_list))
redirects.add(confirmationCallback)
redirects.add(recoveryCallback.toString())

const [confirmationTemplate, recoveryTemplate, passwordChangedTemplate] =
  await Promise.all([
    template("confirmation"),
    template("recovery"),
    template("password-changed"),
  ])

const configuration = {
  site_url: origin,
  uri_allow_list: [...redirects].join(","),
  external_email_enabled: true,
  mailer_autoconfirm: false,
  mailer_allow_unverified_email_sign_ins: false,
  smtp_admin_email: fromEmail,
  smtp_host: "smtp.resend.com",
  smtp_port: "465",
  smtp_user: "resend",
  smtp_pass: resendApiKey,
  smtp_sender_name: fromName,
  mailer_subjects_confirmation: "Confirme seu cadastro | Carmem Silva",
  mailer_templates_confirmation_content: confirmationTemplate,
  mailer_subjects_recovery: "Redefina sua senha | Carmem Silva",
  mailer_templates_recovery_content: recoveryTemplate,
  mailer_notifications_password_changed_enabled: true,
  mailer_subjects_password_changed_notification:
    "Sua senha foi alterada | Carmem Silva",
  mailer_templates_password_changed_notification_content:
    passwordChangedTemplate,
}

await responseBody(
  await fetch(endpoint, {
    method: "PATCH",
    headers,
    body: JSON.stringify(configuration),
  }),
)

// Confirme o estado persistido, sem depender apenas do corpo retornado pelo PATCH.
const updated = await responseBody(await fetch(endpoint, {headers}))

const expectedValues = {
  site_url: configuration.site_url,
  external_email_enabled: true,
  mailer_autoconfirm: false,
  mailer_allow_unverified_email_sign_ins: false,
  smtp_admin_email: configuration.smtp_admin_email,
  smtp_host: configuration.smtp_host,
  smtp_port: configuration.smtp_port,
  smtp_user: configuration.smtp_user,
  smtp_sender_name: configuration.smtp_sender_name,
  mailer_subjects_confirmation: configuration.mailer_subjects_confirmation,
  mailer_templates_confirmation_content: confirmationTemplate,
  mailer_subjects_recovery: configuration.mailer_subjects_recovery,
  mailer_templates_recovery_content: recoveryTemplate,
  mailer_notifications_password_changed_enabled: true,
  mailer_subjects_password_changed_notification:
    configuration.mailer_subjects_password_changed_notification,
  mailer_templates_password_changed_notification_content:
    passwordChangedTemplate,
}

const templateFields = new Set([
  "mailer_templates_confirmation_content",
  "mailer_templates_recovery_content",
  "mailer_templates_password_changed_notification_content",
])

const mismatches = Object.entries(expectedValues)
  .filter(([key, value]) => {
    const actual = String(updated[key])
    const expected = String(value)

    return templateFields.has(key)
      ? actual.trim() !== expected.trim()
      : actual !== expected
  })
  .map(([key]) => key)

const updatedRedirects = new Set(existingRedirects(updated.uri_allow_list))

if ([...redirects].some((redirect) => !updatedRedirects.has(redirect))) {
  mismatches.push("uri_allow_list")
}

if (mismatches.length) {
  throw new Error(
    `O Supabase respondeu, mas estes campos não foram confirmados: ${mismatches.join(", ")}.`,
  )
}

console.log(
  JSON.stringify({
    ok: true,
    projectRef,
    siteUrl: origin,
    sender: fromEmail,
    smtp: "smtp.resend.com:465",
    confirmationRequired: true,
    passwordChangedNotification: true,
    templates: ["confirmation", "recovery", "password-changed"],
  }),
)
