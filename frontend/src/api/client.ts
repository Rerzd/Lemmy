import axios from 'axios'

// One shared axios instance for the whole app.
// Configured once here so we don't repeat the base URL or the token logic.
export const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
})

// Interceptor: runs before every request. Reads the token from localStorage
// and attaches it as a Bearer header. This is why no other file needs to think
// about auth headers — they just call api.get(...) and it works.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lemmy_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
