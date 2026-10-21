// The only gradient in the app: the brand mark.
export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-control bg-primary font-display text-sm font-bold text-primary-contrast">
        L
      </span>
      {withWordmark && <span className="text-lg font-semibold tracking-tight text-text">Lemmy</span>}
    </span>
  )
}
