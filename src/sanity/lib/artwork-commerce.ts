import "server-only"

import {revalidatePath} from "next/cache"

import {ARTWORK_COMMERCE_QUERY} from "@/sanity/queries/artwork"

import {getSanityWriteClient} from "./write-client"

type ArtworkCommerce = {
  saleId?: string
  paymentPreferenceId?: string
  providerPaymentId?: string
  reservationExpiresAt?: string
  updatedAt?: string
} | null

type ArtworkCommerceDocument = {
  _id: string
  _rev: string
  status: string | null
  slug: string | null
  commerce: ArtworkCommerce
}

type ArtworkOwnership = {
  artworkId: string
  saleId: string
  paymentPreferenceId: string
}

type ReserveArtworkInput = ArtworkOwnership & {
  expiresAt: string
}

type SellArtworkInput = ArtworkOwnership & {
  providerPaymentId: string
}

type MutationKind = "reserve" | "sell" | "release" | "refund"

type CommerceMutation = ArtworkOwnership & {
  kind: MutationKind
  expiresAt?: string
  providerPaymentId?: string
}

export class ArtworkCommerceConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ArtworkCommerceConflictError"
  }
}

function assertPublishedArtworkId(artworkId: string) {
  if (
    !artworkId ||
    artworkId.startsWith("drafts.") ||
    artworkId.startsWith("versions.")
  ) {
    throw new ArtworkCommerceConflictError(
      "A venda precisa referenciar o documento publicado da obra.",
    )
  }
}

function ownsReservation(
  commerce: ArtworkCommerce,
  input: ArtworkOwnership,
) {
  return (
    commerce?.saleId === input.saleId &&
    commerce.paymentPreferenceId === input.paymentPreferenceId
  )
}

function isSanityConflict(error: unknown) {
  if (!error || typeof error !== "object") return false

  const candidate = error as {
    statusCode?: unknown
    response?: {statusCode?: unknown; status?: unknown}
  }

  return (
    candidate.statusCode === 409 ||
    candidate.response?.statusCode === 409 ||
    candidate.response?.status === 409
  )
}

function revalidateArtwork(slug: string | null) {
  revalidatePath("/")
  revalidatePath("/venda")
  revalidatePath("/exposicao")

  if (slug) {
    revalidatePath(`/obra/${slug}`)
  }
}

function getNextDocumentState(
  document: ArtworkCommerceDocument,
  input: CommerceMutation,
  updatedAt: string,
) {
  const status = document.status
  const commerce = document.commerce
  const sameReservation = ownsReservation(commerce, input)
  const sameSale = commerce?.saleId === input.saleId

  if (input.kind === "reserve") {
    if (status === "reserved" && !sameReservation) {
      throw new ArtworkCommerceConflictError(
        "A obra está reservada por outra negociação ou por uma reserva editorial.",
      )
    }

    if (status === "available" && commerce?.saleId && !sameSale) {
      throw new ArtworkCommerceConflictError(
        "A obra possui metadados de outra venda.",
      )
    }

    if (status !== "available" && status !== "reserved") {
      throw new ArtworkCommerceConflictError(
        "O estado atual da obra não permite uma nova reserva.",
      )
    }

    const expiresAt = input.expiresAt

    if (!expiresAt || Number.isNaN(Date.parse(expiresAt))) {
      throw new ArtworkCommerceConflictError(
        "A reserva precisa ter uma validade reconhecida.",
      )
    }

    if (
      status === "reserved" &&
      sameReservation &&
      commerce?.reservationExpiresAt === expiresAt
    ) {
      return null
    }

    return {
      status: "reserved",
      commerce: {
        saleId: input.saleId,
        paymentPreferenceId: input.paymentPreferenceId,
        reservationExpiresAt: expiresAt,
        updatedAt,
      },
    }
  }

  if (input.kind === "sell") {
    if (status === "sold") {
      if (!sameSale) {
        throw new ArtworkCommerceConflictError(
          "A obra já está vinculada a outra venda.",
        )
      }

      if (
        commerce.providerPaymentId === input.providerPaymentId &&
        sameReservation
      ) {
        return null
      }
    } else if (status === "reserved") {
      if (!sameReservation) {
        throw new ArtworkCommerceConflictError(
          "A reserva da obra pertence a outra cobrança.",
        )
      }
    } else if (status === "available") {
      if (commerce?.saleId && !sameSale) {
        throw new ArtworkCommerceConflictError(
          "A obra possui metadados de outra venda.",
        )
      }
    } else {
      throw new ArtworkCommerceConflictError(
        "O estado atual da obra não permite confirmar a venda.",
      )
    }

    if (!input.providerPaymentId) {
      throw new ArtworkCommerceConflictError(
        "O pagamento confirmado precisa ter um identificador do provedor.",
      )
    }

    return {
      status: "sold",
      commerce: {
        saleId: input.saleId,
        paymentPreferenceId: input.paymentPreferenceId,
        providerPaymentId: input.providerPaymentId,
        updatedAt,
      },
    }
  }

  if (status === "available" && !commerce) {
    return null
  }

  if (input.kind === "release") {
    if (status !== "reserved" || !sameReservation) {
      throw new ArtworkCommerceConflictError(
        "A reserva não pertence à preferência que está sendo liberada.",
      )
    }
  } else {
    const canRefund =
      (status === "sold" && sameReservation) ||
      (status === "reserved" && sameReservation)

    if (!canRefund) {
      throw new ArtworkCommerceConflictError(
        "A obra não pertence à venda reembolsada.",
      )
    }
  }

  return {status: "available", commerce: null}
}

async function mutateArtworkCommerce(input: CommerceMutation) {
  assertPublishedArtworkId(input.artworkId)
  const client = getSanityWriteClient()
  const draftId = `drafts.${input.artworkId}`

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const documents = await client.fetch<ArtworkCommerceDocument[]>(
      ARTWORK_COMMERCE_QUERY,
      {ids: [input.artworkId, draftId]},
      {perspective: "raw"},
    )
    const publishedDocument = documents.find(
      (document) => document._id === input.artworkId,
    )

    if (!publishedDocument) {
      throw new ArtworkCommerceConflictError(
        "A obra publicada não foi encontrada no Sanity.",
      )
    }

    const updatedAt = new Date().toISOString()
    let transaction = client.transaction()
    let mutationCount = 0

    for (const document of documents) {
      const nextState = getNextDocumentState(document, input, updatedAt)

      if (!nextState) continue

      transaction = transaction.patch(document._id, (patch) => {
        const revisionPatch = patch.ifRevisionId(document._rev)

        if (nextState.commerce === null) {
          return revisionPatch.set({status: nextState.status}).unset(["commerce"])
        }

        return revisionPatch.set({
          status: nextState.status,
          commerce: nextState.commerce,
        })
      })
      mutationCount += 1
    }

    if (mutationCount === 0) {
      revalidateArtwork(publishedDocument.slug)
      return
    }

    try {
      await transaction.commit({visibility: "sync", returnDocuments: false})
      revalidateArtwork(publishedDocument.slug)
      return
    } catch (error) {
      if (attempt < 3 && isSanityConflict(error)) continue
      throw error
    }
  }
}

export function reserveArtworkForPayment(input: ReserveArtworkInput) {
  return mutateArtworkCommerce({...input, kind: "reserve"})
}

export function markArtworkAsSold(input: SellArtworkInput) {
  return mutateArtworkCommerce({...input, kind: "sell"})
}

export function releaseArtworkReservation(input: ArtworkOwnership) {
  return mutateArtworkCommerce({...input, kind: "release"})
}

export function releaseArtworkAfterRefund(input: ArtworkOwnership) {
  return mutateArtworkCommerce({...input, kind: "refund"})
}
