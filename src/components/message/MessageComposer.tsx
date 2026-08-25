"use client"

import {LoaderCircle, Send} from "lucide-react"
import {useFormStatus} from "react-dom"

type MessageComposerProps = {
  action: (formData: FormData) => void | Promise<void>
  conversationId: string
  placeholder?: string
}

function SendButton() {
  const {pending} = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-red px-5 text-sm font-semibold text-white transition-colors hover:bg-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:cursor-wait disabled:opacity-65"
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Send className="size-4" aria-hidden="true" />
      )}
      {pending ? "Enviando..." : "Enviar"}
    </button>
  )
}

export default function MessageComposer({
  action,
  conversationId,
  placeholder = "Escreva sua mensagem...",
}: MessageComposerProps) {
  return (
    <form action={action} className="border-t border-red/10 bg-white p-4 sm:p-5">
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor={`message-${conversationId}`} className="sr-only">
        Mensagem
      </label>
      <div className="flex flex-col items-end gap-3 sm:flex-row">
        <textarea
          id={`message-${conversationId}`}
          name="content"
          required
          maxLength={3000}
          rows={2}
          placeholder={placeholder}
          className="min-h-11 w-full resize-y rounded-xl border border-red/20 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-orange focus:ring-3 focus:ring-orange/15"
        />
        <SendButton />
      </div>
    </form>
  )
}
