import type {MetadataRoute} from "next"

import {getSiteUrl} from "@/lib/site-url"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/auth/",
        "/conta",
        "/mensagem",
        "/pagamento/",
        "/studio",
      ],
    },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).toString(),
  }
}
