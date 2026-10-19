import axios from 'axios'

export const TOKEN_KEY = 'lemmy_token'
// Fired when the API rejects our token, so AuthProvider can sign the user out.
export const UNAUTHORIZED_EVENT = 'lemmy:unauthorized'

// One shared axios instance for the whole app.
// Configured once here so we don't repeat the base URL or the token logic.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
})

// Interceptor: runs before every request. Reads the token from localStorage
// and attaches it as a Bearer header. This is why no other file needs to think
// about auth headers — they just call api.get(...) and it works.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// A 401 anywhere except the login call itself means the token expired or is
// invalid: drop it and let the app send the user back to the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginCall = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginCall) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)
