// The only gradient in the app: the brand mark.
export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
        L
      </span>
      {withWordmark && <span className="text-lg font-semibold tracking-tight text-slate-100">Lemmy</span>}
    </span>
  )
}
