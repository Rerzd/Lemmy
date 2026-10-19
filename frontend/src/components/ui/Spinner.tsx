export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950" role="status" aria-label="Loading">
      <div className="size-7 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
    </div>
  )
}
