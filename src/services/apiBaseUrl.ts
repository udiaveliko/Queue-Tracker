const configuredApiUrl = import.meta.env.VITE_STORAGE_API_URL

export const API_BASE_URL = (
  configuredApiUrl !== undefined
    ? configuredApiUrl.trim()
    : import.meta.env.DEV
      ? 'http://localhost:3001'
      : ''
).replace(/\/$/, '')

export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`
