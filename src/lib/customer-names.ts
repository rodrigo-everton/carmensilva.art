import "server-only"

import {requireAdmin} from "@/lib/auth"
import {createSupabaseAdminClient} from "@/lib/supabase-admin"

function firstTwoNames(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const names = value.trim().split(/\s+/).filter(Boolean)

  return names.length > 0 ? names.slice(0, 2).join(" ") : null
}

export async function loadCustomerNames(customerIds: string[]) {
  await requireAdmin()

  const remainingIds = new Set(customerIds.filter(Boolean))
  const customerNames = new Map<string, string>()

  if (remainingIds.size === 0) {
    return customerNames
  }

  try {
    const supabase = createSupabaseAdminClient()
    const {data: profiles, error: profilesError} = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", [...remainingIds])

    if (profilesError) {
      console.error(
        "Não foi possível consultar os nomes dos clientes nos perfis.",
        profilesError.message,
      )
    } else {
      for (const profile of profiles ?? []) {
        const displayName = firstTwoNames(profile.full_name)

        if (displayName) {
          customerNames.set(profile.id, displayName)
          remainingIds.delete(profile.id)
        }
      }
    }

    const authUsers = await Promise.all(
      [...remainingIds].map(async (customerId) => {
        const {data, error} = await supabase.auth.admin.getUserById(customerId)

        if (error) {
          console.error(
            "Não foi possível consultar o nome de um cliente na autenticação.",
            {customerId, message: error.message},
          )
          return null
        }

        return data.user
      }),
    )

    for (const user of authUsers) {
      if (!user) {
        continue
      }

      const metadataName =
        firstTwoNames(user.user_metadata.nome) ??
        firstTwoNames(user.user_metadata.full_name)

      if (metadataName) {
        customerNames.set(user.id, metadataName)
      }
    }
  } catch (customerNamesError) {
    console.error(
      "Não foi possível carregar os nomes dos clientes.",
      customerNamesError instanceof Error
        ? customerNamesError.message
        : customerNamesError,
    )
  }

  return customerNames
}
