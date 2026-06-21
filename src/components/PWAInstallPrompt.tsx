import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((window.navigator as NavigatorWithStandalone).standalone)
}

function isAppleMobileDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (
      window.navigator.platform === 'MacIntel'
      && window.navigator.maxTouchPoints > 1
    )
}

function InstallGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15v3.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15V3m0 0 4 4m-4-4L8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isStandalone())
  const [dismissed, setDismissed] = useState(false)
  const isIOS = isAppleMobileDevice()

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)

    if (choice.outcome === 'accepted') {
      setInstalled(true)
    } else {
      setDismissed(true)
    }
  }

  if (installed || dismissed || (!installPrompt && !isIOS)) return null

  return (
    <aside className="pwa-install-card" aria-labelledby="pwa-install-title">
      <button
        className="pwa-install-dismiss"
        type="button"
        aria-label="Fechar convite de instalação"
        onClick={() => setDismissed(true)}
      >
        ×
      </button>
      <div className="pwa-install-icon" aria-hidden="true">
        {isIOS ? <ShareGlyph /> : <InstallGlyph />}
      </div>
      <div className="pwa-install-copy">
        <span className="section-kicker">Acesso rápido</span>
        <h2 id="pwa-install-title">Leve o Queue Tracker com você</h2>
        {isIOS ? (
          <p>Toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</p>
        ) : (
          <p>Instale o app para abrir em tela cheia e acessar mais rápido durante o seu dia no parque.</p>
        )}
      </div>
      {!isIOS && (
        <button className="pwa-install-action" type="button" onClick={handleInstall}>
          <InstallGlyph />
          Instalar app
        </button>
      )}
    </aside>
  )
}
