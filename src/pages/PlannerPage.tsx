import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  SearchIcon,
  SparkIcon,
  TrendDownIcon,
  TrendUpIcon,
} from '../components/Icons'
import {
  createStoredRoutePlannerAttraction,
  planAttractionRoute,
} from '../services/routePlanner'
import { getParks, getParkWaitTimes } from '../services/waitTimes'
import type {
  ParkWaitTimes,
  RoutePlannerAttraction,
  RouteRecommendation,
} from '../types'
import { ThemeToggle } from '../components/ThemeToggle'

interface PlannerPageProps {
  onBack: () => void
}

const recommendationLabel: Record<RouteRecommendation, string> = {
  GO_NOW: 'Entrar agora',
  WAIT: 'Melhor esperar',
  STABLE: 'Estável',
}

export function PlannerPage({ onBack }: PlannerPageProps) {
  const parks = getParks()
  const [parkId, setParkId] = useState(parks[0]?.id ?? '')
  const [data, setData] = useState<ParkWaitTimes | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    setIsLoading(true)
    setError(null)
    setSelectedIds(new Set())

    getParkWaitTimes(parkId)
      .then((response) => {
        if (isActive) setData(response)
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o parque.')
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [parkId])

  const openAttractions = useMemo<RoutePlannerAttraction[]>(() => {
    if (!data) return []

    return data.park.attractions
      .map((attraction) => createStoredRoutePlannerAttraction(parkId, attraction))
      .filter((attraction): attraction is RoutePlannerAttraction => attraction !== null)
      .filter((attraction) =>
        `${attraction.name} ${attraction.land}`.toLowerCase().includes(query.toLowerCase()),
      )
      .sort((a, b) => a.waitTime - b.waitTime)
  }, [data, parkId, query])

  const selectedAttractions = useMemo(() => {
    if (!data) return []

    return data.park.attractions
      .map((attraction) => createStoredRoutePlannerAttraction(parkId, attraction))
      .filter((attraction): attraction is RoutePlannerAttraction =>
        attraction !== null && selectedIds.has(attraction.id),
      )
  }, [data, parkId, selectedIds])

  const route = useMemo(
    () => planAttractionRoute(selectedAttractions),
    [selectedAttractions],
  )

  const toggleAttraction = (attractionId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(attractionId)) next.delete(attractionId)
      else next.add(attractionId)
      return next
    })
  }

  return (
    <main className="planner-page">
      <header className="park-nav">
        <button className="icon-button" onClick={onBack} aria-label="Voltar">
          <ArrowLeftIcon />
        </button>
        <div className="park-nav-title">
          <strong>Planejador de rota</strong>
          <span>Orlando Queue Tracker</span>
        </div>
        <div className="internal-header-actions">
          <ThemeToggle />
          <span className="planner-nav-icon"><SparkIcon /></span>
        </div>
      </header>

      <section className="planner-hero">
        <span className="analytics-eyebrow"><SparkIcon /> Rota inteligente</span>
        <h1>Seu dia,<br /><span>bem planejado.</span></h1>
        <p>Escolha suas atrações e receba a melhor ordem com base nas filas e tendências atuais.</p>
      </section>

      <section className="planner-content">
        <label className="planner-park-select">
          <span>Escolha o parque</span>
          <select
            value={parkId}
            onChange={(event) => setParkId(event.target.value)}
            aria-label="Escolher parque"
          >
            {parks.map((park) => (
              <option key={park.id} value={park.id}>{park.name}</option>
            ))}
          </select>
          <ChevronRightIcon />
        </label>

        {data?.warning && <p className="planner-warning">{data.warning}</p>}

        <div className="planner-layout">
          <div className="planner-attractions-panel">
            <div className="planner-section-heading">
              <div>
                <span className="section-kicker">Selecione</span>
                <h2>Atrações abertas</h2>
              </div>
              <span>{selectedIds.size} escolhidas</span>
            </div>

            <label className="search-field">
              <SearchIcon />
              <input
                type="search"
                placeholder="Buscar atração ou área"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            {error ? (
              <div className="planner-empty planner-error" role="alert">
                <SearchIcon />
                <h3>Não foi possível carregar as atrações</h3>
                <p>{error}</p>
              </div>
            ) : isLoading ? (
              <div className="planner-options">
                {Array.from({ length: 6 }, (_, index) => (
                  <div className="planner-option skeleton-card" key={index}>
                    <span className="skeleton planner-option-check" />
                    <span className="skeleton-copy">
                      <span className="skeleton skeleton-title" />
                      <span className="skeleton skeleton-subtitle" />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="planner-options">
                {openAttractions.map((attraction) => {
                  const isSelected = selectedIds.has(attraction.id)

                  return (
                    <button
                      type="button"
                      className={`planner-option ${isSelected ? 'is-selected' : ''}`}
                      key={attraction.id}
                      onClick={() => toggleAttraction(attraction.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="planner-option-check">{isSelected ? '✓' : ''}</span>
                      <span className="planner-option-copy">
                        <strong>{attraction.name}</strong>
                        <small>{attraction.land}</small>
                      </span>
                      <span className="planner-option-wait">
                        <strong>{attraction.waitTime}</strong>
                        <small>min</small>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <aside className="planned-route-panel">
            <div className="planned-route-header">
              <div>
                <span className="section-kicker">Sugestão</span>
                <h2>Melhor ordem</h2>
              </div>
              <div className="route-total">
                <ClockIcon />
                <strong>{route.totalEstimatedWait}</strong>
                <span>min de fila</span>
              </div>
            </div>

            {route.stops.length ? (
              <ol className="route-stops">
                {route.stops.map((stop) => (
                  <li key={stop.id} className={`route-stop recommendation-${stop.recommendation.toLowerCase()}`}>
                    <span className="route-order">{stop.order}</span>
                    <div className="route-stop-copy">
                      <strong>{stop.name}</strong>
                      <span>{stop.land}</span>
                      <div className="route-stop-meta">
                        <span>
                          {stop.trend === 'up'
                            ? <TrendUpIcon />
                            : stop.trend === 'down'
                              ? <TrendDownIcon />
                              : '→'}
                          {recommendationLabel[stop.recommendation]}
                        </span>
                      </div>
                    </div>
                    <div className="route-stop-wait">
                      <strong>{stop.waitTime}</strong>
                      <span>min agora</span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="planner-empty route-empty">
                <SparkIcon />
                <h3>Sua rota aparecerá aqui</h3>
                <p>Selecione pelo menos uma atração aberta.</p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  )
}
