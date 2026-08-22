import "server-only"
import {createClient} from "next-sanity"

import {apiVersion, dataset, projectId} from "../env"

const token = process.env.SANITY_API_READ_TOKEN

if (!token) {
  throw new Error("Missing environment variable: SANITY_API_READ_TOKEN")
}

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  token,
})