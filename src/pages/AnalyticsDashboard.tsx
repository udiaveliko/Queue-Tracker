import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  ChartIcon,
  ClockIcon,
  RefreshIcon,
  TrendDownIcon,
  TrendUpIcon,
} from '../components/Icons'
import {
  getAnalyticsOverview,
  getBackendAttractionAnalytics,
  getBackendParkAnalytics,
  type AnalyticsOverviewResponse,
  type AttractionAnalyticsResponse,
  type AttractionMetric,
  type ParkAnalyticsResponse,
} from '../services/backendAnalytics'
import { ThemeToggle } from '../components/ThemeToggle'

interface AnalyticsDashboardProps {
  onBack: () => void
  onOpenCollectorStatus: () => void
}

const formatWait = (value: number | null) =>
  value === null ? '—' : `${value.toFixed(1)} min`

const formatHour = (hour: number | undefined) =>
  hour === undefined ? '—' : `${String(hour).padStart(2, '0')}:00`

export function AnalyticsDashboard({
  onBack,
  onOpenCollectorStatus,
}: AnalyticsDashboardProps) {
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null)
  const [parkAnalytics, setParkAnalytics] = useState<ParkAnalyticsResponse | null>(null)
  const [attractionAnalytics, setAttractionAnalytics] =
    useState<AttractionAnalyticsResponse | null>(null)
  const [selectedParkId, setSelectedParkId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isParkLoading, setIsParkLoading] = useState(false)
  const [isAttractionLoading, setIsAttractionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sectionError, setSectionError] = useState<string | null>(null)

  useEffect(() => {
    getAnalyticsOverview()
      .then((response) => {
        setOverview(response)
        setSelectedParkId(response.parkRankings[0]?.id ?? '')
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os analytics.')
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedParkId) {
      setParkAnalytics(null)
      return
    }

    setAttractionAnalytics(null)
    setIsParkLoading(true)
    setSectionError(null)
    getBackendParkAnalytics(selectedParkId)
      .then(setParkAnalytics)
      .catch((loadError: unknown) => {
        setParkAnalytics(null)
        setSectionError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o parque.')
      })
      .finally(() => setIsParkLoading(false))
  }, [selectedParkId])

  const maxHourlyWait = useMemo(
    () => Math.max(...(parkAnalytics?.hourlyHistory.map((item) => item.averageWait) ?? [1]), 1),
    [parkAnalytics],
  )

  const openAttraction = (attraction: AttractionMetric) => {
    setIsAttractionLoading(true)
    setSectionError(null)
    getBackendAttractionAnalytics(attraction.id)
      .then(setAttractionAnalytics)
      .catch((loadError: unknown) => {
        setAttractionAnalytics(null)
        setSectionError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a atração.')
      })
      .finally(() => setIsAttractionLoading(false))
  }

  const renderAttractionRanking = (
    title: string,
    items: AttractionMetric[],
    value: (item: AttractionMetric) => string,
  ) => (
    <section className="db-ranking-card">
      <h3>{title}</h3>
      <ol>
        {items.length ? (
          items.slice(0, 5).map((item, index) => (
            <li key={item.id}>
              <button type="button" onClick={() => openAttraction(item)}>
                <span>{index + 1}</span>
                <strong>{item.name}</strong>
                <em>{value(item)}</em>
              </button>
            </li>
          ))
        ) : (
          <li className="db-ranking-empty">Histórico insuficiente</li>
        )}
      </ol>
    </section>
  )

  if (isLoading) {
    return (
      <main className="analytics-dashboard centered-state" role="status" aria-label="Carregando análises">
        <span className="skeleton analytics-skeleton-chart" />
      </main>
    )
  }

  if (error && !overview) {
    return (
      <main className="analytics-dashboard centered-state">
        <ChartIcon />
        <p>{error}</p>
        <small>Verifique sua conexão e tente novamente em instantes.</small>
        <button className="primary-button" onClick={onBack}>Voltar</button>
      </main>
    )
  }

  const hasSamples = (overview?.totalSamples ?? 0) > 0

  return (
    <main className="analytics-dashboard">
      <header className="park-nav">
        <button className="icon-button" onClick={onBack} aria-label="Voltar">
          <ArrowLeftIcon />
        </button>
        <div className="park-nav-title">
          <strong>Painel de análises</strong>
          <span>Histórico de filas</span>
        </div>
        <div className="internal-header-actions">
          <ThemeToggle />
          <span className="analytics-nav-icon"><ChartIcon /></span>
        </div>
      </header>

      <section className="db-hero">
        <span className="analytics-eyebrow"><ChartIcon /> Histórico real</span>
        <h1>Visão geral</h1>
        <p>Análises produzidas diretamente das amostras persistidas pelo Orlando Queue Tracker.</p>

        <div className="db-summary-grid">
          <div><span>Parques</span><strong>{overview?.totalParks ?? 0}</strong></div>
          <div><span>Atrações</span><strong>{overview?.totalAttractions ?? 0}</strong></div>
          <div><span>Amostras</span><strong>{overview?.totalSamples ?? 0}</strong></div>
          <div><span>Média geral</span><strong>{formatWait(overview?.overallAverageWait ?? null)}</strong></div>
        </div>
      </section>

      <section className="db-content">
        <button
          className="collector-status-link"
          type="button"
          onClick={onOpenCollectorStatus}
        >
          <span><RefreshIcon /></span>
          <span>
            <strong>Status do coletor</strong>
            <small>Ver última execução, erros e próxima coleta</small>
          </span>
          <em>Monitorar →</em>
        </button>

        {sectionError && (
          <div className="db-section-error" role="alert">
            <span>!</span>
            <p>{sectionError}</p>
          </div>
        )}

        <section className="data-quality-summary">
          <div className="data-quality-heading">
            <div>
              <span className="section-kicker">Qualidade dos dados</span>
              <h2>Saúde dos dados</h2>
            </div>
            <strong>
              {overview?.dataQualityRate === null
                ? '—'
                : `${overview?.dataQualityRate.toFixed(1)}%`}
            </strong>
          </div>
          <div className="data-quality-metrics">
            <div className="quality-valid">
              <span>Válidas</span>
              <strong>{overview?.validSamples ?? 0}</strong>
            </div>
            <div className="quality-suspicious">
              <span>Suspeitas</span>
              <strong>{overview?.suspiciousSamples ?? 0}</strong>
            </div>
            <div className="quality-invalid">
              <span>Inválidas rejeitadas</span>
              <strong>{overview?.invalidSamples ?? 0}</strong>
            </div>
          </div>
          <p>
            Amostras inválidas são auditadas, mas não entram no histórico,
            previsões ou cálculos analíticos.
          </p>
        </section>

        {!hasSamples ? (
          <div className="db-empty">
            <ClockIcon />
            <h2>Histórico em construção</h2>
            <p>As análises aparecerão assim que as primeiras coletas forem concluídas.</p>
          </div>
        ) : (
          <>
            <section className="db-insights">
              <div>
                <TrendUpIcon />
                <span>Maior média</span>
                <strong>{overview?.highestAveragePark?.name}</strong>
                <small>{formatWait(overview?.highestAveragePark?.averageWait ?? null)}</small>
              </div>
              <div>
                <TrendDownIcon />
                <span>Menor média</span>
                <strong>{overview?.lowestAveragePark?.name}</strong>
                <small>{formatWait(overview?.lowestAveragePark?.averageWait ?? null)}</small>
              </div>
            </section>

            <section className="db-park-section">
              <div className="db-section-heading">
                <div>
                  <span className="section-kicker">Comparativo</span>
                  <h2>Ranking de parques</h2>
                </div>
                <select
                  value={selectedParkId}
                  onChange={(event) => setSelectedParkId(event.target.value)}
                  aria-label="Selecionar parque para análise"
                >
                  {overview?.parkRankings.map((park) => (
                    <option key={park.id} value={park.id}>{park.name}</option>
                  ))}
                </select>
              </div>

              <div className="db-park-ranking">
                {overview?.parkRankings.map((park, index) => (
                  <button
                    key={park.id}
                    className={park.id === selectedParkId ? 'is-active' : ''}
                    onClick={() => setSelectedParkId(park.id)}
                  >
                    <span>{index + 1}</span>
                    <strong>{park.name}</strong>
                    <em>{formatWait(park.averageWait)}</em>
                  </button>
                ))}
              </div>
            </section>

            {isParkLoading && (
              <div className="db-panel-loading" aria-label="Carregando dados reais do parque">
                <span className="skeleton analytics-skeleton-chart" />
              </div>
            )}

            {!isParkLoading && parkAnalytics && (
              <>
                <section className="db-hour-card">
                  <div className="db-section-heading">
                    <div>
                      <span className="section-kicker">{parkAnalytics.park.name}</span>
                      <h2>Fila média por hora</h2>
                    </div>
                    <span>
                      Melhor {formatHour(parkAnalytics.bestAverageHour?.hour)}
                      {' · '}
                      Pior {formatHour(parkAnalytics.worstAverageHour?.hour)}
                    </span>
                  </div>
                  {parkAnalytics.hourlyHistory.length ? (
                    <div className="db-bar-chart">
                      {parkAnalytics.hourlyHistory.map((item) => (
                        <div key={item.hour}>
                          <span>{Math.round(item.averageWait)}</span>
                          <i style={{ height: `${Math.max(8, item.averageWait / maxHourlyWait * 100)}%` }} />
                          <small>{String(item.hour).padStart(2, '0')}h</small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="db-inline-empty">Sem histórico horário suficiente.</div>
                  )}
                </section>

                <div className="db-attraction-rankings">
                  {renderAttractionRanking(
                    'Maiores filas médias',
                    parkAnalytics.highestAverageAttractions,
                    (item) => formatWait(item.averageWait),
                  )}
                  {renderAttractionRanking(
                    'Menores filas médias',
                    parkAnalytics.lowestAverageAttractions,
                    (item) => formatWait(item.averageWait),
                  )}
                  {renderAttractionRanking(
                    'Maior variação',
                    parkAnalytics.highestVariationAttractions,
                    (item) => `${item.variation} min`,
                  )}
                </div>
              </>
            )}

            {isAttractionLoading && (
              <div className="db-panel-loading" aria-label="Carregando atração">
                <span className="skeleton analytics-skeleton-chart" />
              </div>
            )}

            {!isAttractionLoading && attractionAnalytics && (
              <section className="db-attraction-detail">
                <button
                  onClick={() => setAttractionAnalytics(null)}
                  aria-label="Fechar detalhes da atração"
                >
                  Fechar
                </button>
                <span className="section-kicker">Detalhe da atração</span>
                <h2>{attractionAnalytics.attraction.name}</h2>
                <p>{attractionAnalytics.attraction.parkName}</p>
                <div>
                  <span>Média<strong>{formatWait(attractionAnalytics.averageWait)}</strong></span>
                  <span>Menor<strong>{formatWait(attractionAnalytics.minimumWait)}</strong></span>
                  <span>Maior<strong>{formatWait(attractionAnalytics.maximumWait)}</strong></span>
                  <span>Precisão<strong>
                    {attractionAnalytics.predictionAccuracy.averageAccuracy === null
                      ? '—'
                      : `${attractionAnalytics.predictionAccuracy.averageAccuracy}%`}
                  </strong></span>
                </div>
                <p className="db-insight-text">
                  O melhor horário histórico é {formatHour(attractionAnalytics.bestHour?.hour)}
                  {' '}e o maior movimento médio ocorre às {formatHour(attractionAnalytics.worstHour?.hour)}.
                </p>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  )
}
