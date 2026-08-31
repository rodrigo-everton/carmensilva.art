import type {Metadata} from "next"

import PaymentReturnPage from "@/components/payment/PaymentReturnPage"

export const metadata: Metadata = {
  title: "Pagamento não concluído",
  description: "Retorno de um pagamento não concluído no Mercado Pago.",
  robots: {
    index: false,
    follow: false,
  },
}

type PaymentFailurePageProps = {
  searchParams: Promise<{conversa?: string | string[]}>
}

export default async function PaymentFailurePage({
  searchParams,
}: PaymentFailurePageProps) {
  const {conversa} = await searchParams

  return <PaymentReturnPage status="failure" conversationId={conversa} />
}
