import "server-only"

import {createClient, type SanityClient} from "next-sanity"

import {apiVersion, dataset, projectId} from "../env"

export class SanityWriteConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SanityWriteConfigurationError"
  }
}

let configuredToken: string | null = null
let writeClient: SanityClient | null = null

export function getSanityWriteClient() {
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim()

  if (!token) {
    throw new SanityWriteConfigurationError(
      "SANITY_API_WRITE_TOKEN não está configurado.",
    )
  }

  if (!writeClient || configuredToken !== token) {
    configuredToken = token
    writeClient = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false,
      token,
    })
  }

  return writeClient
}

export function assertSanityWriteConfigured() {
  getSanityWriteClient()
}
