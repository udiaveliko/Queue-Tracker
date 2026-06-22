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
  RoutePlannerMode,
  RouteRecommendation,
  RouteStartMode,
  RouteStartPoint,
} from '../types'
import { ThemeToggle } from '../components/ThemeToggle'
import { ParkRouteMap } from '../components/ParkRouteMap'
import { OSMParkRouteMap } from '../components/OSMParkRouteMap'
import {
  geoLocationToRelative,
  hasEnoughOSMCoordinates,
} from '../data/attractionGeoLocations'
import { parkEntrances } from '../data/parkEntrances'
import { getParkLandOptions, PARK_CENTER } from '../data/parkLandCenters'
import {
  getParkLocationStatus,
  type ParkLocationStatus,
} from '../data/parkBoundaries'

interface PlannerPageProps {
  onBack: () => void
}

const recommendationLabel: Record<RouteRecommendation, string> = {
  GO_NOW: 'Entrar agora',
  WAIT: 'Melhor esperar',
  STABLE: 'Estável',
}

const routeModes: Array<{
  id: RoutePlannerMode
  label: string
  description: string
}> = [
  {
    id: 'shortest-wait',
    label: 'Menor fila',
    description: 'Prioriza tempo e previsão',
  },
  {
    id: 'shortest-walk',
    label: 'Menor caminhada',
    description: 'Mantém atrações próximas',
  },
  {
    id: 'balanced',
    label: 'Balanceado',
    description: 'Equilibra fila e distância',
  },
]

const formatDistance = (distance: number) =>
  distance >= 1000
    ? `${(distance / 1000).toFixed(1).replace('.', ',')} km`
    : `${distance} m`

const routeSummaryLabel: Record<RoutePlannerMode, string> = {
  'shortest-wait': 'Rota otimizada para menor fila',
  'shortest-walk': 'Rota otimizada para menor caminhada',
  balanced: 'Rota balanceada entre fila e distância',
}

const parkLocationLabels: Record<ParkLocationStatus, string> = {
  inside: 'Dentro do parque',
  near: 'Próximo ao parque',
  outside: 'Fora do parque',
}

interface GPSLocation {
  latitude: number
  longitude: number
  accuracy: number
}

export function PlannerPage({ onBack }: PlannerPageProps) {
  const parks = getParks()
  const [parkId, setParkId] = useState(parks[0]?.id ?? '')
  const [data, setData] = useState<ParkWaitTimes | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [routeMode, setRouteMode] = useState<RoutePlannerMode>('balanced')
  const [startMode, setStartMode] = useState<RouteStartMode>('entrance')
  const [startReference, setStartReference] = useState('')
  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [gpsMessage, setGpsMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    setIsLoading(true)
    setError(null)
    setSelectedIds(new Set())
    setStartMode('entrance')
    setStartReference('')
    setGpsLocation(null)
    setGpsStatus('idle')
    setGpsMessage(null)

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

  const landOptions = useMemo(() => getParkLandOptions(parkId), [parkId])
  const selectedPark = parks.find((park) => park.id === parkId)

  const entranceStartPoint = useMemo<RouteStartPoint>(() => {
    const entrance = parkEntrances[parkId] ?? { x: 50, y: 94 }
    return {
      parkId,
      attractionId: 'start-entrance',
      ...entrance,
      land: 'Entrada',
      estimatedLocation: true,
      label: 'Entrada do parque',
    }
  }, [parkId])

  const startPoint = useMemo<RouteStartPoint>(() => {
    if (startMode === 'gps' && gpsLocation) {
      const relative = geoLocationToRelative(parkId, {
        lat: gpsLocation.latitude,
        lng: gpsLocation.longitude,
      }) ?? PARK_CENTER

      return {
        parkId,
        attractionId: 'start-gps',
        ...relative,
        estimatedLocation: false,
        label: 'Minha localização atual',
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        isUserLocation: true,
      }
    }

    if (startMode === 'land') {
      const selectedLand = landOptions.find((land) => land.name === startReference)
        ?? landOptions[0]
      return {
        parkId,
        attractionId: `start-land-${selectedLand?.name ?? 'center'}`,
        x: selectedLand?.location.x ?? PARK_CENTER.x,
        y: selectedLand?.location.y ?? PARK_CENTER.y,
        land: selectedLand?.name,
        estimatedLocation: true,
        label: selectedLand?.name ?? 'Centro do parque',
      }
    }

    if (startMode === 'attraction') {
      const attraction = selectedAttractions.find((item) => item.id === startReference)
        ?? selectedAttractions[0]
      if (attraction) {
        return {
          ...attraction.location,
          label: attraction.name,
        }
      }
    }

    if (startMode === 'center') {
      return {
        parkId,
        attractionId: 'start-center',
        ...PARK_CENTER,
        estimatedLocation: true,
        label: 'Centro do parque',
      }
    }

    return entranceStartPoint
  }, [
    entranceStartPoint,
    gpsLocation,
    landOptions,
    parkId,
    selectedAttractions,
    startMode,
    startReference,
  ])

  const parkLocationStatus = useMemo<ParkLocationStatus | null>(() => {
    if (startMode !== 'gps' || !gpsLocation) return null
    return getParkLocationStatus(parkId, gpsLocation)
  }, [gpsLocation, parkId, startMode])

  const internalRouteStartPoint =
    startMode === 'gps' && parkLocationStatus !== 'inside'
      ? entranceStartPoint
      : startPoint

  const route = useMemo(
    () => planAttractionRoute(selectedAttractions, routeMode, internalRouteStartPoint),
    [internalRouteStartPoint, routeMode, selectedAttractions],
  )

  const toggleAttraction = (attractionId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(attractionId)) next.delete(attractionId)
      else next.add(attractionId)
      return next
    })
  }

  const useCurrentLocation = () => {
    setGpsMessage(null)

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setGpsStatus('error')
      setGpsMessage('A localização está disponível apenas em conexão segura (HTTPS).')
      return
    }

    if (!('geolocation' in navigator)) {
      setGpsStatus('error')
      setGpsMessage('Este navegador não oferece suporte à localização.')
      return
    }

    setGpsStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setStartMode('gps')
        setGpsStatus('success')
        setGpsMessage('Localização usada somente nesta tela e não armazenada.')
      },
      (locationError) => {
        const message = locationError.code === locationError.PERMISSION_DENIED
          ? 'Permissão de localização negada. Você ainda pode escolher entrada, centro, área ou atração.'
          : locationError.code === locationError.TIMEOUT
            ? 'A localização demorou demais. Tente novamente ou escolha outro ponto inicial.'
            : 'Não foi possível obter sua localização. Escolha outro ponto inicial.'
        setGpsStatus('error')
        setGpsMessage(message)
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 60_000,
      },
    )
  }

  useEffect(() => {
    if (
      startMode !== 'gps'
      || !('geolocation' in navigator)
    ) {
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setGpsStatus('success')
      },
      () => {
        // Mantém a última posição válida caso uma atualização pontual falhe.
      },
      {
        enableHighAccuracy: true,
        timeout: 30_000,
        maximumAge: 15_000,
      },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [startMode])

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
        <p>Escolha suas atrações e equilibre filas, tendências e deslocamentos dentro do parque.</p>
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

        <div className="route-mode-section">
          <div className="route-mode-heading">
            <div>
              <span className="section-kicker">Modo de roteiro</span>
              <h2>Como você quer aproveitar o parque?</h2>
            </div>
          </div>
          <div className="route-mode-control" role="group" aria-label="Modo de roteiro">
            {routeModes.map((mode) => (
              <button
                type="button"
                key={mode.id}
                className={routeMode === mode.id ? 'is-active' : ''}
                aria-pressed={routeMode === mode.id}
                onClick={() => setRouteMode(mode.id)}
              >
                <strong>{mode.label}</strong>
                <span>{mode.description}</span>
              </button>
            ))}
          </div>
          <p className="distance-disclaimer">
            Mapa simplificado criado para orientação. Use o mapa oficial do parque para navegação precisa.
          </p>
        </div>

        <section className="route-start-section">
          <div className="route-mode-heading">
            <span className="section-kicker">Ponto inicial</span>
            <h2>De onde você está começando?</h2>
          </div>
          <div className="route-start-controls">
            <label>
              <span>Tipo de local</span>
              <select
                value={startMode}
                onChange={(event) => {
                  setStartMode(event.target.value as RouteStartMode)
                  setStartReference('')
                }}
              >
                <option value="entrance">Entrada do parque</option>
                <option value="center">Centro do parque</option>
                <option value="land">Área específica</option>
                <option value="attraction" disabled={!selectedAttractions.length}>
                  Atração selecionada
                </option>
                {gpsLocation && <option value="gps">Minha localização atual</option>}
              </select>
            </label>

            {startMode === 'land' && (
              <label>
                <span>Área/land</span>
                <select
                  value={startReference || landOptions[0]?.name || ''}
                  onChange={(event) => setStartReference(event.target.value)}
                >
                  {landOptions.map((land) => (
                    <option key={land.name} value={land.name}>{land.name}</option>
                  ))}
                </select>
              </label>
            )}

            {startMode === 'attraction' && (
              <label>
                <span>Atração atual</span>
                <select
                  value={startReference || selectedAttractions[0]?.id || ''}
                  onChange={(event) => setStartReference(event.target.value)}
                >
                  {selectedAttractions.map((attraction) => (
                    <option key={attraction.id} value={attraction.id}>{attraction.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="gps-location-actions">
            <button
              type="button"
              className={startMode === 'gps' ? 'is-active' : ''}
              onClick={useCurrentLocation}
              disabled={gpsStatus === 'loading'}
              aria-label="Usar minha localização atual como ponto inicial"
            >
              <span aria-hidden="true">⌖</span>
              {gpsStatus === 'loading'
                ? 'Obtendo localização...'
                : gpsLocation
                  ? 'Atualizar minha localização'
                  : 'Usar minha localização'}
            </button>
            {gpsLocation && (
              <small>Precisão informada pelo navegador: cerca de {Math.round(gpsLocation.accuracy)} m.</small>
            )}
          </div>
          {gpsMessage && (
            <p className={`gps-location-message is-${gpsStatus}`} role={gpsStatus === 'error' ? 'alert' : 'status'}>
              {gpsMessage}
            </p>
          )}
          {parkLocationStatus && (
            <div
              className={`park-location-state is-${parkLocationStatus}`}
              role="status"
            >
              <span className="park-location-badge">
                <i aria-hidden="true" />
                {parkLocationLabels[parkLocationStatus]}
              </span>
              {parkLocationStatus === 'near' && (
                <p>
                  Você ainda não entrou no parque. Siga primeiro até a entrada principal.
                </p>
              )}
              {parkLocationStatus === 'outside' && (
                <p>Entre no parque para ativar a navegação interna.</p>
              )}
              {parkLocationStatus === 'inside' && (
                <p>Navegação interna ativa. A rota será atualizada conforme sua posição.</p>
              )}
            </div>
          )}
        </section>

        {hasEnoughOSMCoordinates(parkId, route, startPoint) ? (
          <OSMParkRouteMap
            parkId={parkId}
            parkName={selectedPark?.name ?? data?.park.name ?? 'Parque'}
            accent={selectedPark?.accent ?? '#0a84ff'}
            route={route}
            startPoint={startPoint}
            navigationStatus={parkLocationStatus}
          />
        ) : (
          <ParkRouteMap
            parkId={parkId}
            parkName={selectedPark?.name ?? data?.park.name ?? 'Parque'}
            accent={selectedPark?.accent ?? '#0a84ff'}
            route={route}
            startPoint={internalRouteStartPoint}
          />
        )}

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
            <div className="route-optimization-summary">
              <SparkIcon />
              <div>
                <span>Estratégia ativa</span>
                <strong>{routeSummaryLabel[routeMode]}</strong>
              </div>
            </div>
            <div className="planned-route-header">
              <div>
                <span className="section-kicker">Sugestão</span>
                <h2>Melhor ordem</h2>
              </div>
              <div className="route-total">
                <div>
                  <ClockIcon />
                  <strong>{route.totalEstimatedWait}</strong>
                  <span>min de fila</span>
                </div>
                <div>
                  <span className="route-distance-symbol" aria-hidden="true">↝</span>
                  <strong>{formatDistance(route.totalEstimatedDistance)}</strong>
                  <span>caminhada</span>
                </div>
              </div>
            </div>

            {route.stops.length ? (
              <>
                <div className="route-summary-grid">
                  <div>
                    <strong>{formatDistance(route.distanceFromStart)}</strong>
                    <span>Início até 1ª parada</span>
                  </div>
                  <div>
                    <strong>{route.totalEstimatedWait} min</strong>
                    <span>Filas estimadas</span>
                  </div>
                  <div>
                    <strong>{formatDistance(route.totalEstimatedDistance)}</strong>
                    <span>Distância total</span>
                  </div>
                  <div>
                    <strong>{route.landsVisited}</strong>
                    <span>Áreas visitadas</span>
                  </div>
                  <div>
                    <strong>{formatDistance(route.longestWalkingDistance)}</strong>
                    <span>Maior trecho</span>
                  </div>
                </div>
                <ol className="route-stops">
                  {route.stops.map((stop) => (
                    <li key={stop.id} className={`route-stop recommendation-${stop.recommendation.toLowerCase()}`}>
                      <span className="route-order">{stop.order}</span>
                      <div className="route-stop-copy">
                        <strong>{stop.name}</strong>
                        <span>
                          {stop.land}
                          {stop.location.estimatedLocation && (
                            <small className="estimated-location"> localização estimada</small>
                          )}
                        </span>
                        <div className="route-stop-meta">
                          <span>
                            {stop.trend === 'up'
                              ? <TrendUpIcon />
                              : stop.trend === 'down'
                                ? <TrendDownIcon />
                                : '→'}
                            {recommendationLabel[stop.recommendation]}
                          </span>
                          {stop.distanceFromPrevious > 0 && (
                            <span className="route-leg-distance">
                              ↝ {formatDistance(stop.distanceFromPrevious)} {stop.order === 1 ? 'desde o início' : 'desde a anterior'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="route-stop-wait">
                        <strong>{stop.waitTime}</strong>
                        <span>min agora</span>
                      </div>
                      <div className="route-explanation">
                        <div className="route-main-reason">
                          <span>Por que aqui?</span>
                          <strong>{stop.explanation.primaryReason}</strong>
                        </div>
                        <div className="route-score-list" aria-label={`Scores de ${stop.name}`}>
                          <span><strong>{stop.explanation.score}</strong> Geral</span>
                          <span><strong>{stop.explanation.waitScore}</strong> Fila</span>
                          <span><strong>{stop.explanation.distanceScore}</strong> Distância</span>
                          <span><strong>{stop.explanation.predictionScore}</strong> Previsão</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
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
