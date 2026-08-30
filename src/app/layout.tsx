import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getSiteUrl } from "@/lib/site-url";
import { SanityLive } from "@/sanity/lib/live";

const siteUrl = getSiteUrl();

const TITLE = "Carmem Silva - Arte";
const NAME = "Carmem Silva Cruz";
const DESC = "Obras a venda, exposições e trajetória artística de Carmem Silva.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: TITLE,
    template: "%s | Carmem Silva - Arte",
  },

  description: DESC,

  applicationName: TITLE,

  authors: [
    {
      name: NAME,
      url: siteUrl,
    },
  ],

  creator: NAME,
  publisher: NAME,

  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },

  //TODO: faltam icone opengraph e descricao da imagem
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: TITLE,
    title: TITLE,
    description: DESC,
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 630,
        alt: "",
      },
    ],
  },

  twitter: {
     card: "summary_large_image",
     title: TITLE,
     description: DESC,
     images: ["/opengraph-image.jpg"],
   },

   robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />

        <main>{children}</main>

        <Footer />
        <SanityLive />
      </body>
    </html>
  )
}
