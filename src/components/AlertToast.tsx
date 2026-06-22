import { useEffect, useState } from 'react'
import type { QueueAlert } from '../types'
import { ALERT_TRIGGERED_EVENT } from '../services/alerts'
import { BellFilledIcon, CloseIcon } from './Icons'

export function AlertToast() {
  const [alert, setAlert] = useState<QueueAlert | null>(null)

  useEffect(() => {
    let timeout: number | undefined
    const handleTriggered = (event: Event) => {
      setAlert((event as CustomEvent<QueueAlert>).detail)
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => setAlert(null), 8_000)
    }

    window.addEventListener(ALERT_TRIGGERED_EVENT, handleTriggered)
    return () => {
      window.removeEventListener(ALERT_TRIGGERED_EVENT, handleTriggered)
      window.clearTimeout(timeout)
    }
  }, [])

  if (!alert) return null

  return (
    <aside className="alert-toast" role="status" aria-live="polite">
      <span><BellFilledIcon /></span>
      <div>
        <small>Alerta de fila</small>
        <strong>{alert.triggerMessage}</strong>
      </div>
      <button type="button" onClick={() => setAlert(null)} aria-label="Fechar notificação">
        <CloseIcon />
      </button>
    </aside>
  )
}
