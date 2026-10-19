import axios from 'axios'

interface ValidationIssue {
  loc?: (string | number)[]
  msg?: string
}

// Turns an API error into something we can show the user. FastAPI sends either
// a plain string `detail` (our 404/409/422 rules) or a list of validation issues.
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Cannot reach the server. Is the backend running?'
    const detail = error.response.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0) {
      return (detail as ValidationIssue[])
        .map((issue) => {
          const field = issue.loc?.[issue.loc.length - 1]
          return field && field !== 'body' ? `${field}: ${issue.msg}` : issue.msg
        })
        .join('. ')
    }
  }
  return fallback
}
