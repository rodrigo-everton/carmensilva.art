import "server-only"

import {
  createClient as createSupabaseClient,
  type User,
} from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { cache } from "react"

import { createClient } from "@/sanity/lib/supabase/server"

type UserWithRoleData = Pick<User, "id" | "app_metadata">

export type AdminUser = {
  id: string
  email: string | null
  name: string | null
}

export async function isAdmin(
  user: UserWithRoleData | null | undefined,
): Promise<boolean> {
  if (!user) {
    return false
  }

  // Keep support for accounts provisioned through Supabase app_metadata.
  if (user.app_metadata.role === "admin") {
    return true
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()

  if (!supabaseUrl || !secretKey) {
    return false
  }

  // This client never reaches the browser. The secret key lets the server
  // read the role even when public.user_roles is protected by RLS.
  const supabaseAdmin = createSupabaseClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Não foi possível consultar o papel do usuário.", error.message)
    return false
  }

  return data?.role === "admin"
}

export async function getAuthenticatedDestination(
  user: UserWithRoleData | null | undefined,
) {
  return (await isAdmin(user)) ? "/admin" : "/conta"
}

export const requireAdmin = cache(async (): Promise<AdminUser> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  if (!(await isAdmin(user))) {
    redirect("/conta")
  }

  const metadataName = user.user_metadata.nome

  return {
    id: user.id,
    email: user.email ?? null,
    name: typeof metadataName === "string" ? metadataName : null,
  }
})
