export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg" role="status" aria-label="Loading">
      <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
