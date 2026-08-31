"use client"

import Image from "next/image"
import {ChevronLeft, ChevronRight} from "lucide-react"
import {useKeenSlider} from "keen-slider/react"
import {useState} from "react"

import "keen-slider/keen-slider.min.css"

export type ArtworkCarouselImage = {
  id: string
  src: string
  alt: string
}

type ArtworkCarouselProps = {
  images: ArtworkCarouselImage[]
  title: string
}

export default function ArtworkCarousel({
  images,
  title,
}: ArtworkCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [sliderRef, slider] = useKeenSlider<HTMLDivElement>({
    initial: 0,
    loop: true,
    slideChanged(instance) {
      setCurrentSlide(instance.track.details.rel)
    },
  })

  return (
    <div
      role="region"
      aria-roledescription="carrossel"
      aria-label={`Galeria da obra ${title}`}
    >
      <div className="relative">
        <div
          ref={sliderRef}
          className="keen-slider overflow-hidden rounded-[1.5rem] bg-green-secondary/50"
        >
          {images.map((image, index) => (
            <div
              key={image.id}
              className="keen-slider__slide relative aspect-4/5"
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} de ${images.length}`}
              aria-hidden={currentSlide !== index}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                preload={index === 0}
                sizes="(max-width: 639px) calc(100vw - 3.5rem), (max-width: 1023px) calc(100vw - 5.5rem), (max-width: 1279px) 58vw, 46rem"
                className="object-contain"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => slider.current?.prev()}
          aria-label="Mostrar imagem anterior"
          className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-red shadow-md transition-colors hover:bg-orange-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-4"
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => slider.current?.next()}
          aria-label="Mostrar próxima imagem"
          className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-red shadow-md transition-colors hover:bg-orange-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-4"
        >
          <ChevronRight className="size-6" aria-hidden="true" />
        </button>
      </div>

      <div
        role="group"
        className="mt-2 flex flex-wrap justify-center"
        aria-label="Escolher imagem"
      >
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => slider.current?.moveToIdx(index)}
            aria-label={`Mostrar imagem ${index + 1}`}
            aria-current={currentSlide === index ? "true" : undefined}
            className="group flex size-8 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red"
          >
            <span
              className={`size-2.5 rounded-full transition-colors ${
                currentSlide === index
                  ? "bg-red"
                  : "bg-red/25 group-hover:bg-red/50"
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Imagem {currentSlide + 1} de {images.length}
      </p>
    </div>
  )
}
