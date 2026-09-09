import socialLinks from "@/app/socialLinks.json"
import {getSiteUrl} from "@/lib/site-url"

export default function LocalBusinessJsonLd() {
  const siteUrl = getSiteUrl()
  const phone = new URL(socialLinks.whatsapp).searchParams.get("phone")

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": new URL("/#local-business", siteUrl).toString(),
    name: "Carmem Silva - Arte",
    description:
      "Obras à venda, exposições e trajetória de Carmem Silva, artista plástica e visual maranhense radicada em Brasília.",
    url: siteUrl,
    image: new URL("/retrato.webp", siteUrl).toString(),
    email: socialLinks.email,
    ...(phone ? {telephone: `+${phone}`} : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Brasília",
      addressRegion: "DF",
      addressCountry: "BR",
    },
    sameAs: [socialLinks.instagram, socialLinks.facebook],
  }

  return (
    <script
      id="local-business-json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  )
}
