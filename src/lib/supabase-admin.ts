import "server-only"

import {createClient} from "@supabase/supabase-js"

export class SupabaseConfigurationError extends Error {
  constructor() {
    super("As credenciais de servidor do Supabase não estão configuradas.")
    this.name = "SupabaseConfigurationError"
  }
}

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()

  if (!supabaseUrl || !secretKey) {
    throw new SupabaseConfigurationError()
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
