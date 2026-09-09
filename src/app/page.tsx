import Hero from "@/app/layout/Hero"
import LocalBusinessJsonLd from "@/components/local-business-json-ld"

export default function Home() {
  return (
    <>
      <LocalBusinessJsonLd />
      <Hero/>
    </>
  )
}
