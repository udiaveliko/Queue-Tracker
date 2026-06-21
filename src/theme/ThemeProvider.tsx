import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ThemeContext } from './themeContext'
import {
  getStoredTheme,
  getSystemTheme,
  saveTheme,
} from './themeStorage'
import type { Theme, ThemeContextValue } from './themeTypes'

interface ThemeProviderProps {
  children: ReactNode
}

const getInitialTheme = () => getStoredTheme() ?? getSystemTheme()

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
    saveTheme(nextTheme)
  }

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  }), [theme])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-light')
    root.classList.add(`theme-${theme}`)
    root.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#090a0b' : '#f2f3f5')
  }, [theme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
