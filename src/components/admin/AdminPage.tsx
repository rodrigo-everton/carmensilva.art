import type { LucideIcon } from "lucide-react"

type AdminPageHeaderProps = {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
}: AdminPageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-3xl bg-red px-6 py-8 text-white sm:px-9 sm:py-10">
      <div
        aria-hidden="true"
        className="absolute -right-14 -top-20 size-56 rounded-full border-[1.75rem] border-red-secondary/15"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 right-1/4 size-40 rounded-full bg-orange/20 blur-2xl"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-orange-secondary">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-red-secondary">
            {description}
          </p>
        </div>

        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-orange text-white shadow-sm">
          <Icon className="size-7" strokeWidth={1.7} aria-hidden="true" />
        </span>
      </div>
    </header>
  )
}

type AdminEmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-5 py-14 text-center sm:py-16">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-green-secondary text-green-hover">
        <Icon className="size-6" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-red">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-black/65">
        {description}
      </p>
    </div>
  )
}
