import { useMemo } from 'react'
import {
  ArrowLeftIcon,
  ChartIcon,
  ClockIcon,
  TrendDownIcon,
  TrendUpIcon,
} from '../components/Icons'
import {
  getAccuracyForAttraction,
  getAccuracyForPark,
  getOverallPredictionAccuracy,
  getPredictionAccuracyRankings,
  getStoredPredictions,
} from '../services/predictionAccuracy'
import { ThemeToggle } from '../components/ThemeToggle'

interface PredictionAccuracyPageProps {
  parkId: string
  onBack: () => void
}

const formatAccuracy = (value: number | null) =>
  value === null ? '—' : `${value.toFixed(1)}%`

export function PredictionAccuracyPage({
  parkId,
  onBack,
}: PredictionAccuracyPageProps) {
  const parkSummary = getAccuracyForPark(parkId)
  const overallSummary = getOverallPredictionAccuracy()
  const rankings = getPredictionAccuracyRankings(parkId)

  const attractionSummaries = useMemo(() => {
    const predictions = getStoredPredictions().filter((prediction) => prediction.parkId === parkId)
    const attractions = new Map(
      predictions.map((prediction) => [
        prediction.attractionId,
        prediction.attractionName,
      ]),
    )

    return [...attractions.entries()]
      .map(([attractionId, attractionName]) => ({
        attractionId,
        attractionName,
        summary: getAccuracyForAttraction(parkId, attractionId),
      }))
      .filter((item) => item.summary.evaluatedPredictions > 0)
      .sort((a, b) =>
        (b.summary.averageAccuracy ?? 0) - (a.summary.averageAccuracy ?? 0),
      )
  }, [parkId])

  const renderRanking = (
    title: string,
    items: typeof rankings.mostAccurate,
    type: 'best' | 'worst',
  ) => (
    <section className="accuracy-ranking-card">
      <div className="accuracy-section-heading">
        <div>
          <span className="section-kicker">{type === 'best' ? 'Melhores resultados' : 'Maiores desvios'}</span>
          <h2>{title}</h2>
        </div>
        {type === 'best' ? <TrendUpIcon /> : <TrendDownIcon />}
      </div>

      {items.length ? (
        <ol className="accuracy-ranking-list">
          {items.map((item, index) => (
            <li key={`${item.predictionId}-${item.horizonMinutes}`}>
              <span className="accuracy-rank">{index + 1}</span>
              <div>
                <strong>{item.attractionName}</strong>
                <span>
                  {item.horizonMinutes} min · previsto {item.predictedWaitTime} · real {item.actualWaitTime}
                </span>
              </div>
              <div className={`accuracy-score ${type}`}>
                <strong>{item.accuracy.toFixed(1)}%</strong>
                <span>erro {item.absoluteError} min</span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="accuracy-empty">
          <ClockIcon />
          <p>As primeiras avaliações aparecerão após 30 minutos de coleta contínua.</p>
        </div>
      )}
    </section>
  )

  return (
    <main className="accuracy-page">
      <header className="park-nav">
        <button className="icon-button" onClick={onBack} aria-label="Voltar às análises">
          <ArrowLeftIcon />
        </button>
        <div className="park-nav-title">
          <strong>Precisão das previsões</strong>
          <span>Análises</span>
        </div>
        <div className="internal-header-actions">
          <ThemeToggle />
          <span className="analytics-nav-icon"><ChartIcon /></span>
        </div>
      </header>

      <section className="accuracy-hero">
        <span className="analytics-eyebrow"><ChartIcon /> Validação local</span>
        <h1>Precisão das<br />previsões</h1>
        <p>Comparação entre as projeções salvas e as filas reais observadas 30 e 60 minutos depois.</p>

        <div className="accuracy-summary-grid">
          <div>
            <span>Precisão do parque</span>
            <strong>{formatAccuracy(parkSummary.averageAccuracy)}</strong>
            <small>{parkSummary.evaluatedPredictions} avaliações</small>
          </div>
          <div>
            <span>Precisão geral</span>
            <strong>{formatAccuracy(overallSummary.averageAccuracy)}</strong>
            <small>{overallSummary.evaluatedPredictions} avaliações</small>
          </div>
          <div>
            <span>Erro médio do parque</span>
            <strong>
              {parkSummary.averageAbsoluteError === null
                ? '—'
                : `${parkSummary.averageAbsoluteError.toFixed(1)} min`}
            </strong>
            <small>Erro absoluto</small>
          </div>
        </div>
      </section>

      <section className="accuracy-content">
        <div className="accuracy-rankings-grid">
          {renderRanking('Top 10 mais precisas', rankings.mostAccurate, 'best')}
          {renderRanking('Top 10 menos precisas', rankings.leastAccurate, 'worst')}
        </div>

        <section className="attraction-accuracy-card">
          <div className="accuracy-section-heading">
            <div>
              <span className="section-kicker">Por atração</span>
              <h2>Precisão média</h2>
            </div>
            <span>{attractionSummaries.length} atrações avaliadas</span>
          </div>

          {attractionSummaries.length ? (
            <div className="attraction-accuracy-list">
              {attractionSummaries.map((item) => (
                <div key={item.attractionId}>
                  <div>
                    <strong>{item.attractionName}</strong>
                    <span>{item.summary.evaluatedPredictions} avaliações</span>
                  </div>
                  <div className="accuracy-progress">
                    <i style={{ width: `${item.summary.averageAccuracy ?? 0}%` }} />
                  </div>
                  <strong>{formatAccuracy(item.summary.averageAccuracy)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="accuracy-empty">
              <ClockIcon />
              <p>Ainda não existem previsões maduras para calcular a precisão por atração.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
