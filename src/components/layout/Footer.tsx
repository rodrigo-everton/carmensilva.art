import Container from "@/components/ui/Container"

export default function Footer() {
  return (
    <footer className="mt-20 border-t">
      <Container>
        <div className="py-10 text-sm">
          © {new Date().getFullYear()} Carmen Silva
        </div>
      </Container>
    </footer>
  )
}