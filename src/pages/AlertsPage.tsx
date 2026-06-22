import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ALERTS_CHANGED_EVENT,
  deactivateAlert,
  getAlerts,
  getAlertTypeLabel,
  reactivateAlert,
  removeAlert,
} from '../services/alerts'
import type { QueueAlert } from '../types'
import { ArrowLeftIcon, BellFilledIcon, BellIcon, ClockIcon } from '../components/Icons'
import { ThemeToggle } from '../components/ThemeToggle'

interface AlertsPageProps {
  onBack: () => void
  onOpenPark: (parkId: string) => void
}

const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—'

export function AlertsPage({ onBack, onOpenPark }: AlertsPageProps) {
  const [alerts, setAlerts] = useState<QueueAlert[]>(getAlerts)

  const refreshAlerts = useCallback(() => setAlerts(getAlerts()), [])

  useEffect(() => {
    window.addEventListener(ALERTS_CHANGED_EVENT, refreshAlerts)
    window.addEventListener('oqt-storage-synced', refreshAlerts)
    return () => {
      window.removeEventListener(ALERTS_CHANGED_EVENT, refreshAlerts)
      window.removeEventListener('oqt-storage-synced', refreshAlerts)
    }
  }, [refreshAlerts])

  const activeAlerts = alerts.filter((alert) => alert.active)
  const triggeredAlerts = alerts.filter((alert) => alert.triggeredAt)
  const trackedAttractions = useMemo(
    () => new Set(activeAlerts.map((alert) => `${alert.parkId}:${alert.attractionId}`)).size,
    [activeAlerts],
  )

  const renderAlert = (alert: QueueAlert, triggered = false) => (
    <article className={`alert-list-card ${triggered ? 'is-triggered' : ''}`} key={alert.id}>
      <span className="alert-list-icon">
        {triggered ? <BellFilledIcon /> : <BellIcon />}
      </span>
      <div className="alert-list-copy">
        <small>{alert.parkName} · {alert.attractionLand}</small>
        <strong>{alert.attractionName}</strong>
        <span>{getAlertTypeLabel(alert)}</span>
        {triggered && alert.triggerMessage && <p>{alert.triggerMessage}</p>}
        <em>
          <ClockIcon />
          {triggered
            ? `Disparado em ${formatDateTime(alert.triggeredAt)}`
            : `Criado em ${formatDateTime(alert.createdAt)}`}
        </em>
      </div>
      <div className="alert-list-actions">
        <button type="button" onClick={() => onOpenPark(alert.parkId)}>Ver atração</button>
        {alert.active ? (
          <button type="button" onClick={() => deactivateAlert(alert.id)}>Desativar</button>
        ) : (
          <button type="button" onClick={() => reactivateAlert(alert.id)}>Ativar novamente</button>
        )}
        <button type="button" className="is-danger" onClick={() => removeAlert(alert.id)}>
          Remover
        </button>
      </div>
    </article>
  )

  return (
    <main className="alerts-page">
      <header className="park-nav">
        <button className="icon-button" onClick={onBack} aria-label="Voltar">
          <ArrowLeftIcon />
        </button>
        <div className="park-nav-title">
          <strong>Alertas de fila</strong>
          <span>Acompanhamento ao vivo</span>
        </div>
        <ThemeToggle />
      </header>

      <section className="alerts-hero">
        <span className="analytics-eyebrow"><BellFilledIcon /> Monitoramento</span>
        <h1>A hora certa,<br /><span>sem adivinhação.</span></h1>
        <p>Acompanhe suas atrações e receba avisos dentro do app quando a condição for atingida.</p>
        <div className="alerts-summary">
          <div><strong>{activeAlerts.length}</strong><span>Alertas ativos</span></div>
          <div><strong>{triggeredAlerts.length}</strong><span>Disparados</span></div>
          <div><strong>{trackedAttractions}</strong><span>Atrações acompanhadas</span></div>
        </div>
      </section>

      <section className="alerts-content">
        <div className="alerts-section-heading">
          <div><span className="section-kicker">Agora</span><h2>Alertas ativos</h2></div>
          <span>{activeAlerts.length}</span>
        </div>
        {activeAlerts.length ? (
          <div className="alerts-list">{activeAlerts.map((alert) => renderAlert(alert))}</div>
        ) : (
          <div className="alerts-empty">
            <BellIcon />
            <h3>Nenhum alerta ativo</h3>
            <p>Abra um parque e toque no sino de uma atração para começar.</p>
          </div>
        )}

        <div className="alerts-section-heading is-secondary">
          <div><span className="section-kicker">Histórico</span><h2>Alertas disparados</h2></div>
          <span>{triggeredAlerts.length}</span>
        </div>
        {triggeredAlerts.length ? (
          <div className="alerts-list">{triggeredAlerts.map((alert) => renderAlert(alert, true))}</div>
        ) : (
          <div className="alerts-empty is-compact">
            <p>Os alertas atingidos aparecerão aqui.</p>
          </div>
        )}
      </section>
    </main>
  )
}
