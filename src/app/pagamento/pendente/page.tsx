import type {Metadata} from "next"

import PaymentReturnPage from "@/components/payment/PaymentReturnPage"

export const metadata: Metadata = {
  title: "Pagamento pendente",
  description: "Acompanhe a confirmação do pagamento realizado pelo Mercado Pago.",
  robots: {
    index: false,
    follow: false,
  },
}

type PaymentPendingPageProps = {
  searchParams: Promise<{conversa?: string | string[]}>
}

export default async function PaymentPendingPage({
  searchParams,
}: PaymentPendingPageProps) {
  const {conversa} = await searchParams

  return <PaymentReturnPage status="pending" conversationId={conversa} />
}
