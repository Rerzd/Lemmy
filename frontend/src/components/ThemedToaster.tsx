import type { CSSProperties } from 'react'
import { Toaster } from 'sonner'
import { useTheme } from '../hooks/useTheme'

// sonner's own palette is replaced by our tokens; success and error keep their icons.
const tokenStyle = {
  '--normal-bg': 'var(--surface)',
  '--normal-text': 'var(--text)',
  '--normal-border': 'var(--border)',
} as CSSProperties

export function ThemedToaster() {
  const { resolved } = useTheme()
  return (
    <Toaster
      theme={resolved}
      position="top-right"
      closeButton
      style={tokenStyle}
      toastOptions={{
        classNames: {
          toast: 'rounded-control! shadow-overlay! font-sans!',
          success: '[&_[data-icon]]:text-status-ok',
          error: '[&_[data-icon]]:text-status-over',
        },
      }}
    />
  )
}
