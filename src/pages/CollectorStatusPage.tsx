import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  ClockIcon,
  RefreshIcon,
  SparkIcon,
} from '../components/Icons'
import {
  getCollectorStatus,
  runCollectorNow,
  type CollectorStatusResponse,
} from '../services/collectorStatus'
import { ThemeToggle } from '../components/ThemeToggle'

interface CollectorStatusPageProps {
  onBack: () => void
}

const REFRESH_INTERVAL_MS = 30_000

const formatDateTime = (value: string | null) => {
  if (!value) return 'Ainda não disponível'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

const formatDuration = (milliseconds: number | null) => {
  if (milliseconds === null) return '—'
  if (milliseconds < 1000) return `${milliseconds} ms`
  return `${(milliseconds / 1000).toFixed(1)} s`
}

export function CollectorStatusPage({ onBack }: CollectorStatusPageProps) {
  const [status, setStatus] = useState<CollectorStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRunningNow, setIsRunningNow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = useCallback(async (background = false) => {
    if (!background) setIsLoading(true)

    try {
      setStatus(await getCollectorStatus())
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o status.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
    const interval = window.setInterval(
      () => void loadStatus(true),
      REFRESH_INTERVAL_MS,
    )
    return () => window.clearInterval(interval)
  }, [loadStatus])

  const qualityRate = useMemo(() => {
    const summary = status?.lastRunSummary
    if (!summary) return null
    const evaluated = summary.valid + summary.suspicious + summary.invalid
    return evaluated ? summary.valid / evaluated * 100 : null
  }, [status])

  const runNow = async () => {
    setIsRunningNow(true)
    setError(null)

    try {
      await runCollectorNow()
      await loadStatus(true)
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Não foi possível iniciar a coleta.')
    } finally {
      setIsRunningNow(false)
    }
  }

  if (isLoading) {
    return (
      <main className="collector-status-page centered-state" role="status" aria-label="Carregando status das atualizações">
        <span className="skeleton analytics-skeleton-chart" />
      </main>
    )
  }

  return (
    <main className="collector-status-page">
      <header className="park-nav">
        <button className="icon-button" onClick={onBack} aria-label="Voltar">
          <ArrowLeftIcon />
        </button>
        <div className="park-nav-title">
          <strong>Status do coletor</strong>
          <span>Monitoramento automático</span>
        </div>
        <div className="internal-header-actions">
          <ThemeToggle />
          <span className={`collector-header-status ${status?.enabled ? 'is-enabled' : ''}`}>
            <i />
          </span>
        </div>
      </header>

      <section className="collector-status-hero">
        <span className="analytics-eyebrow"><SparkIcon /> Monitoramento</span>
        <h1>Coletor<br />automático</h1>
        <p>Acompanhe a saúde da coleta que alimenta o histórico e os analytics.</p>

        <div className={`collector-main-status ${status?.enabled ? 'is-enabled' : 'is-disabled'}`}>
          <div>
            <i />
            <span>{status?.enabled ? 'Ligado' : 'Desligado'}</span>
          </div>
          <strong>{status?.isRunning ? 'Atualizando filas agora' : 'Pronto para a próxima atualização'}</strong>
          <small>Intervalo de {(status?.intervalMs ?? 0) / 60_000} minutos</small>
        </div>
      </section>

      <section className="collector-status-content">
        {error && (
          <div className="db-section-error" role="alert">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        <div className="collector-time-grid">
          <div>
            <ClockIcon />
            <span>Última coleta</span>
            <strong>{formatDateTime(status?.lastRunAt ?? null)}</strong>
          </div>
          <div>
            <ClockIcon />
            <span>Próxima coleta</span>
            <strong>{formatDateTime(status?.nextRunAt ?? null)}</strong>
          </div>
          <div>
            <RefreshIcon />
            <span>Duração</span>
            <strong>{formatDuration(status?.lastRunDurationMs ?? null)}</strong>
          </div>
        </div>

        {status?.lastRunSummary ? (
          <>
            <section className="collector-summary-card">
              <div className="collector-card-heading">
                <div>
                  <span className="section-kicker">Última execução</span>
                  <h2>Resumo da coleta</h2>
                </div>
                <strong>{qualityRate === null ? '—' : `${qualityRate.toFixed(1)}%`}</strong>
              </div>
              <div className="collector-metrics-grid">
                <div><span>Parques</span><strong>{status.lastRunSummary.parksProcessed}</strong></div>
                <div><span>Atrações recebidas</span><strong>{status.lastRunSummary.attractionsReceived}</strong></div>
                <div><span>Amostras salvas</span><strong>{status.lastRunSummary.samplesSaved}</strong></div>
                <div className="quality-valid"><span>Válidas</span><strong>{status.lastRunSummary.valid}</strong></div>
                <div className="quality-suspicious"><span>Suspeitas</span><strong>{status.lastRunSummary.suspicious}</strong></div>
                <div className="quality-invalid"><span>Inválidas</span><strong>{status.lastRunSummary.invalid}</strong></div>
                <div><span>Duplicatas ignoradas</span><strong>{status.lastRunSummary.duplicatesSkipped}</strong></div>
                <div className={status.lastRunSummary.errors ? 'quality-invalid' : 'quality-valid'}>
                  <span>Erros</span><strong>{status.lastRunSummary.errors}</strong>
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="db-empty collector-empty">
            <ClockIcon />
            <h2>Nenhuma coleta concluída</h2>
            <p>Execute uma coleta manual ou aguarde o próximo ciclo automático.</p>
          </div>
        )}

        <button
          className={`collector-run-button ${isRunningNow || status?.isRunning ? 'is-running' : ''}`}
          type="button"
          onClick={() => void runNow()}
          disabled={isRunningNow || status?.isRunning}
        >
          <RefreshIcon />
          {isRunningNow || status?.isRunning ? 'Coleta em andamento…' : 'Rodar coleta agora'}
        </button>

        <p className="collector-auto-refresh">
          Status atualizado automaticamente a cada 30 segundos
        </p>
      </section>
    </main>
  )
}
