"use client"

import {ArrowUpRight, LoaderCircle} from "lucide-react"
import {useFormStatus} from "react-dom"

import {startArtworkConversation} from "@/app/mensagem/actions"

type ArtworkInterestButtonProps = {
  artworkId: string
  artworkTitle: string
}

function InterestSubmitButton({artworkTitle}: Pick<ArtworkInterestButtonProps, "artworkTitle">) {
  const {pending} = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 font-semibold text-orange transition-colors hover:text-orange-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange disabled:cursor-wait disabled:opacity-65"
      aria-label={`Tenho interesse na obra ${artworkTitle}`}
    >
      {pending ? "Abrindo conversa..." : "Tenho interesse"}
      {pending ? (
        <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" />
      ) : (
        <ArrowUpRight
          size={18}
          className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden="true"
        />
      )}
    </button>
  )
}

export default function ArtworkInterestButton({
  artworkId,
  artworkTitle,
}: ArtworkInterestButtonProps) {
  return (
    <form action={startArtworkConversation}>
      <input type="hidden" name="artworkId" value={artworkId} />
      <InterestSubmitButton artworkTitle={artworkTitle} />
    </form>
  )
}
