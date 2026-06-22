import { useCallback, useEffect, useMemo, useState } from 'react'
import { AttractionCard } from '../components/AttractionCard'
import { ArrowLeftIcon, BellIcon, ChartIcon, ClockIcon, RefreshIcon, SearchIcon, SortIcon } from '../components/Icons'
import { SkeletonList } from '../components/SkeletonList'
import { WeatherCard } from '../components/WeatherCard'
import { ParkHeroArt } from '../components/ParkHeroArt'
import { ParkIcon } from '../components/ParkIcon'
import { ThemeToggle } from '../components/ThemeToggle'
import { AlertModal } from '../components/AlertModal'
import { getParkWaitTimes } from '../services/waitTimes'
import { getParkWeather } from '../services/weather'
import { getDailyStatsForAttraction } from '../services/waitTimeHistory'
import { getPredictionForAttraction } from '../services/predictions'
import type { Attraction, ParkWaitTimes, ParkWeather, QueueAlertType } from '../types'
import {
  ALERTS_CHANGED_EVENT,
  createQueueAlert,
  evaluateAlertsForPark,
  getActiveAlerts,
} from '../services/alerts'
import {
  sortAttractions,
  type AttractionSortOption,
} from '../utils/sortAttractions'

interface ParkPageProps {
  parkId: string
  onBack: () => void
  onOpenAnalytics: () => void
  onOpenAlerts: () => void
}

const REFRESH_INTERVAL = 60_000
const WEATHER_REFRESH_INTERVAL = 10 * 60_000
type StatusFilter = 'all' | 'open' | 'closed'

const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'Abertas' },
  { value: 'closed', label: 'Fechadas' },
]

export function ParkPage({
  parkId,
  onBack,
  onOpenAnalytics,
  onOpenAlerts,
}: ParkPageProps) {
  const [data, setData] = useState<ParkWaitTimes | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOption, setSortOption] = useState<AttractionSortOption>('shortest')
  const [error, setError] = useState<string | null>(null)
  const [weather, setWeather] = useState<ParkWeather | null>(null)
  const [isWeatherLoading, setIsWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState(false)
  const [alertAttraction, setAlertAttraction] = useState<Attraction | null>(null)
  const [, setAlertsRevision] = useState(0)

  const loadWaitTimes = useCallback(async (background = false) => {
    if (background) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const response = await getParkWaitTimes(parkId)
      setData(response)
      evaluateAlertsForPark(
        parkId,
        response.park.attractions,
        (attractionId) => getPredictionForAttraction(parkId, attractionId),
        response.lastUpdated,
      )
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as filas.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [parkId])

  useEffect(() => {
    const refreshAlerts = () => setAlertsRevision((value) => value + 1)
    window.addEventListener(ALERTS_CHANGED_EVENT, refreshAlerts)
    return () => window.removeEventListener(ALERTS_CHANGED_EVENT, refreshAlerts)
  }, [])

  useEffect(() => {
    void loadWaitTimes()
    const interval = window.setInterval(() => void loadWaitTimes(true), REFRESH_INTERVAL)
    return () => window.clearInterval(interval)
  }, [loadWaitTimes])

  const loadWeather = useCallback(async () => {
    if (!data) return

    setIsWeatherLoading(true)

    try {
      const response = await getParkWeather(
        data.park.coordinates.latitude,
        data.park.coordinates.longitude,
      )
      setWeather(response)
      setWeatherError(false)
    } catch {
      setWeatherError(true)
    } finally {
      setIsWeatherLoading(false)
    }
  }, [data])

  useEffect(() => {
    if (!data) return

    void loadWeather()
    const interval = window.setInterval(() => void loadWeather(), WEATHER_REFRESH_INTERVAL)
    return () => window.clearInterval(interval)
  }, [data, loadWeather])

  const attractions = useMemo(() => {
    if (!data) return []

    const filteredAttractions = data.park.attractions
      .filter((attraction) =>
        `${attraction.name} ${attraction.land}`.toLowerCase().includes(query.toLowerCase()),
      )
      .filter((attraction) => {
        if (statusFilter === 'open') return attraction.status === 'open'
        if (statusFilter === 'closed') return attraction.status !== 'open'
        return true
      })

    return sortAttractions(filteredAttractions, sortOption)
  }, [data, query, sortOption, statusFilter])

  const openAttractions = data?.park.attractions.filter((item) => item.status === 'open') ?? []
  const activeParkAlerts = getActiveAlerts().filter((alert) => alert.parkId === parkId)
  const averageWait = openAttractions.length
    ? Math.round(openAttractions.reduce((sum, item) => sum + (item.waitTime ?? 0), 0) / openAttractions.length)
    : 0

  const formatUpdateTime = (isoDate: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(isoDate))

  if (error && !data) {
    return (
      <main className="park-page centered-state">
        <p>{error}</p>
        <button className="primary-button" onClick={() => void loadWaitTimes()}>Tentar novamente</button>
        <button className="text-button" onClick={onBack}>Voltar aos parques</button>
      </main>
    )
  }

  return (
    <main className="park-page">
      <header className="park-nav">
        <button className="icon-button" onClick={onBack} aria-label="Voltar">
          <ArrowLeftIcon />
        </button>
        <div className="park-nav-title">
          <strong>{data?.park.name ?? 'Carregando'}</strong>
          <span>Filas ao vivo</span>
        </div>
        <div className="internal-header-actions">
          <ThemeToggle />
          <button
            className={`icon-button ${isRefreshing ? 'is-spinning' : ''}`}
            onClick={() => void loadWaitTimes(true)}
            disabled={isRefreshing}
            aria-label="Atualizar filas"
          >
            <RefreshIcon />
          </button>
        </div>
      </header>

      <section
        className="park-hero"
        style={{ '--park-accent': data?.park.accent ?? '#888' } as React.CSSProperties}
      >
        <div className="park-hero-glow" />
        <ParkHeroArt parkId={parkId} />
        <div className="park-hero-topline">
          <span className="park-hero-icon">
            <ParkIcon parkId={parkId} />
          </span>
          <div className="park-hero-actions">
            <button className="analytics-link" type="button" onClick={onOpenAnalytics}>
              <ChartIcon />
              Análises
            </button>
            <button className="analytics-link alerts-link" type="button" onClick={onOpenAlerts}>
              <BellIcon />
              Alertas
            </button>
            <span className={`live-pill ${data?.dataSource === 'mock' ? 'is-mock' : ''}`}>
              <i />
              {data?.dataSource === 'mock' ? 'Simulado' : 'Ao vivo'}
            </span>
          </div>
        </div>
        <span className="park-hero-resort">{data?.park.resort ?? 'Carregando'}</span>
        <h1>{data?.park.name ?? 'Carregando parque...'}</h1>
        <p>{data?.park.location}</p>

        <div className="park-stats">
          <div>
            <strong>{openAttractions.length}</strong>
            <span>Abertas agora</span>
          </div>
          <div>
            <strong>{averageWait}<small> min</small></strong>
            <span>Espera média</span>
          </div>
          <div>
            <strong>{data?.park.attractions.length ?? '—'}</strong>
            <span>Total listado</span>
          </div>
        </div>
      </section>

      {data?.warning && (
        <div className="data-warning" role="status">
          <span>!</span>
          <p>{data.warning}</p>
          <button type="button" onClick={() => void loadWaitTimes(true)}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="weather-section">
        <WeatherCard
          weather={weather}
          isLoading={isWeatherLoading}
          hasError={weatherError}
          onRefresh={() => void loadWeather()}
        />
      </div>

      <section className="queue-section">
        <div className="queue-heading">
          <div>
            <span className="section-kicker">Tempo de espera</span>
            <h2>Filas agora</h2>
          </div>
          {data && (
            <span className="last-updated">
              <ClockIcon />
              {formatUpdateTime(data.lastUpdated)}
            </span>
          )}
        </div>

        <div className="queue-controls">
          <label className="search-field">
            <SearchIcon />
            <input
              type="search"
              placeholder="Buscar atração ou área"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && <span>{attractions.length}</span>}
          </label>

          <div className="segmented-control" aria-label="Filtrar atrações">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={statusFilter === filter.value ? 'is-active' : ''}
                onClick={() => setStatusFilter(filter.value)}
                aria-pressed={statusFilter === filter.value}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <label className="sort-control">
            <SortIcon />
            <span>Ordenar</span>
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as AttractionSortOption)}
              aria-label="Ordenar atrações"
            >
              <option value="shortest">Menor fila</option>
              <option value="longest">Maior fila</option>
              <option value="alphabetical">Ordem alfabética</option>
            </select>
          </label>
        </div>

        <div className="list-labels">
          <span>{attractions.length} atrações</span>
          <span>Atualizado em tempo real</span>
        </div>

        {isLoading ? (
          <SkeletonList />
        ) : attractions.length ? (
          <div className="attractions-list">
            {attractions.map((attraction, index) => {
              const rankedOpenAttractions = attractions.filter((item) => item.status === 'open')
              const rank = attraction.status === 'open'
                ? rankedOpenAttractions.findIndex((item) => item.id === attraction.id) + 1
                : null

              return (
                <AttractionCard
                  key={attraction.id}
                  attraction={attraction}
                  rank={rank}
                  index={index}
                  historyStats={getDailyStatsForAttraction(parkId, attraction.id)}
                  prediction={getPredictionForAttraction(parkId, attraction.id)}
                  parkId={parkId}
                  hasActiveAlert={activeParkAlerts.some(
                    (alert) =>
                      alert.attractionId === attraction.id
                      || alert.attractionName.localeCompare(attraction.name, 'pt-BR', {
                        sensitivity: 'base',
                      }) === 0,
                  )}
                  onCreateAlert={() => setAlertAttraction(attraction)}
                />
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <SearchIcon />
            <h3>Nenhuma atração encontrada</h3>
            <p>Tente buscar por outro nome ou área do parque.</p>
          </div>
        )}

        <p className="auto-update-note">
          <RefreshIcon />
          Atualização automática a cada 60 segundos
        </p>
      </section>
      {alertAttraction && data && (
        <AlertModal
          attraction={alertAttraction}
          parkName={data.park.name}
          onClose={() => setAlertAttraction(null)}
          onCreate={(type: QueueAlertType, targetWaitTime?: number) => {
            createQueueAlert({
              parkId,
              parkName: data.park.name,
              attraction: alertAttraction,
              type,
              targetWaitTime,
            })
            setAlertAttraction(null)
          }}
        />
      )}
    </main>
  )
}
