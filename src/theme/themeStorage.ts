import type { Theme } from './themeTypes'

const THEME_STORAGE_KEY = 'orlando-queue-tracker:theme'

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    return storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : null
  } catch {
    return null
  }
}

export function saveTheme(theme: Theme): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Theme persistence is optional; switching still works in memory.
  }
}

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}
