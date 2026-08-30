"use client"

import {ChevronDown} from "lucide-react"
import {useEffect, useId, useRef, useState} from "react"

type ExpandableDescriptionProps = {
  description: string
}

export default function ExpandableDescription({
  description,
}: ExpandableDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  const descriptionId = useId()
  const descriptionRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (isExpanded || !descriptionRef.current) return

    const descriptionElement = descriptionRef.current
    const measureOverflow = () => {
      setCanExpand(
        descriptionElement.scrollHeight > descriptionElement.clientHeight + 1,
      )
    }
    const animationFrame = window.requestAnimationFrame(measureOverflow)
    const resizeObserver = new ResizeObserver(measureOverflow)

    resizeObserver.observe(descriptionElement)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
    }
  }, [description, isExpanded])

  return (
    <div>
      <div className="relative">
        <p
          id={descriptionId}
          ref={descriptionRef}
          className={`break-words whitespace-pre-line text-base leading-8 text-red/75 sm:text-lg ${
            !isExpanded ? "line-clamp-6" : ""
          }`}
        >
          {description}
        </p>

        {canExpand && !isExpanded && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent"
          />
        )}
      </div>

      {canExpand && (
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={descriptionId}
          onClick={() => setIsExpanded((current) => !current)}
          className="mt-5 inline-flex items-center gap-2 rounded-md font-semibold text-orange transition-colors hover:text-orange-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange"
        >
          {isExpanded ? "Recolher descrição" : "Ler descrição completa"}
          <ChevronDown
            aria-hidden="true"
            className={`size-5 transition-transform duration-300 motion-reduce:transition-none ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
      )}
    </div>
  )
}
