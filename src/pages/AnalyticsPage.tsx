import { useEffect, useMemo, useState } from 'react'
import { AnalyticsCard } from '../components/AnalyticsCard'
import { ArrowLeftIcon, ChartIcon, SearchIcon } from '../components/Icons'
import { getParkAnalytics } from '../services/analytics'
import type { ParkAnalytics } from '../types'
import { ThemeToggle } from '../components/ThemeToggle'

interface AnalyticsPageProps {
  parkId: string
  onBack: () => void
  onOpenPredictionAccuracy: () => void
}

export function AnalyticsPage({
  parkId,
  onBack,
  onOpenPredictionAccuracy,
}: AnalyticsPageProps) {
  const [data, setData] = useState<ParkAnalytics | null>(null)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    getParkAnalytics(parkId)
      .then((response) => {
        if (isActive) setData(response)
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as análises.')
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [parkId])

  const attractions = useMemo(() => {
    if (!data) return []
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')

    return data.attractions.filter((attraction) =>
      `${attraction.attractionName} ${attraction.land}`
        .toLocaleLowerCase('pt-BR')
        .includes(normalizedQuery),
    )
  }, [data, query])

  const parkAverage = data
    ? Math.round(data.attractions.reduce((sum, item) => sum + item.averageWait, 0) / data.attractions.length)
    : 0

  if (error) {
    return (
      <main className="analytics-page centered-state">
        <p>{error}</p>
        <button className="primary-button" onClick={onBack}>Voltar ao parque</button>
      </main>
    )
  }

  return (
    <main
      className="analytics-page"
      style={{ '--analytics-accent': data?.parkAccent ?? '#0a84ff' } as React.CSSProperties}
    >
      <header className="park-nav">
        <button className="icon-button" onClick={onBack} aria-label="Voltar ao parque">
          <ArrowLeftIcon />
        </button>
        <div className="park-nav-title">
          <strong>{data?.parkName ?? 'Análises'}</strong>
          <span>Análise de filas</span>
        </div>
        <div className="internal-header-actions">
          <ThemeToggle />
          <span className="analytics-nav-icon"><ChartIcon /></span>
        </div>
      </header>

      <section className="analytics-hero">
        <span className="analytics-eyebrow"><ChartIcon /> Inteligência de filas</span>
        <h1>Análises</h1>
        <p>Descubra os melhores momentos para aproveitar cada atração.</p>

        <div className="analytics-summary">
          <div>
            <strong>{data?.attractions.length ?? '—'}</strong>
            <span>Atrações analisadas</span>
          </div>
          <div>
            <strong>{parkAverage}<small> min</small></strong>
            <span>Média do parque</span>
          </div>
          <div>
            <strong>13<small> h</small></strong>
            <span>Janela analisada</span>
          </div>
        </div>
      </section>

      <section className="analytics-content">
        <button
          className="prediction-accuracy-link"
          type="button"
          onClick={onOpenPredictionAccuracy}
        >
          <span className="prediction-accuracy-link-icon"><ChartIcon /></span>
          <span>
            <strong>Precisão das previsões</strong>
            <small>Veja como as previsões se comparam às filas reais</small>
          </span>
          <span>Ver análise →</span>
        </button>

        <label className="search-field analytics-search">
          <SearchIcon />
          <input
            type="search"
            placeholder="Buscar atração ou área"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && <span>{attractions.length}</span>}
        </label>

        <div className="analytics-list-heading">
          <div>
            <span className="section-kicker">Histórico de hoje</span>
            <h2>Por atração</h2>
          </div>
          <span>{attractions.length} resultados</span>
        </div>

        {isLoading ? (
          <div className="analytics-list">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="analytics-card analytics-skeleton" key={index}>
                <span className="skeleton skeleton-title" />
                <span className="skeleton analytics-skeleton-metrics" />
                <span className="skeleton analytics-skeleton-chart" />
              </div>
            ))}
          </div>
        ) : attractions.length ? (
          <div className="analytics-list">
            {attractions.map((attraction, index) => (
              <AnalyticsCard
                key={attraction.attractionId}
                analytics={attraction}
                accent={data?.parkAccent ?? '#0a84ff'}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="analytics-empty">
            <SearchIcon />
            <h3>Nenhuma atração encontrada</h3>
            <p>Altere a busca ou aguarde a coleta de mais dados.</p>
          </div>
        )}
      </section>
    </main>
  )
}
