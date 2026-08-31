import type {Metadata} from "next"

import PaymentReturnPage from "@/components/payment/PaymentReturnPage"

export const metadata: Metadata = {
  title: "Pagamento enviado",
  description: "Retorno do pagamento realizado pelo Mercado Pago.",
  robots: {
    index: false,
    follow: false,
  },
}

type PaymentSuccessPageProps = {
  searchParams: Promise<{conversa?: string | string[]}>
}

export default async function PaymentSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const {conversa} = await searchParams

  return <PaymentReturnPage status="success" conversationId={conversa} />
}
