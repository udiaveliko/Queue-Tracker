import { ArrowUpRightIcon, SparkIcon } from '../components/Icons'
import { Logo } from '../components/Logo'
import { ParkCard } from '../components/ParkCard'
import { getParks } from '../services/waitTimes'
import { ThemeToggle } from '../components/ThemeToggle'
import { PWAInstallPrompt } from '../components/PWAInstallPrompt'

interface HomePageProps {
  onSelectPark: (parkId: string) => void
  onOpenPlanner: () => void
  onOpenAnalyticsDashboard: () => void
}

export function HomePage({
  onSelectPark,
  onOpenPlanner,
  onOpenAnalyticsDashboard,
}: HomePageProps) {
  const parks = getParks()

  return (
    <main className="home-page">
      <header className="topbar">
        <Logo />
        <div className="topbar-actions">
          <span className="live-pill"><i /> Dados ao vivo</span>
          <ThemeToggle />
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow"><SparkIcon /> Orlando, Florida</div>
        <h1>Menos fila.<br /><span>Mais parque.</span></h1>
        <p>
          Compare tempos de espera e descubra sua próxima atração
          sem perder o ritmo do dia.
        </p>
        <div className="hero-metric">
          <span className="metric-number">09</span>
          <span>parques<br />monitorados</span>
          <ArrowUpRightIcon />
        </div>
        <div className="home-actions">
          <button className="planner-cta" type="button" onClick={onOpenPlanner}>
            <SparkIcon />
            Planejar meu dia
            <ArrowUpRightIcon />
          </button>
          <button className="analytics-dashboard-cta" type="button" onClick={onOpenAnalyticsDashboard}>
            Ver análises
            <ArrowUpRightIcon />
          </button>
        </div>
      </section>

      <PWAInstallPrompt />

      <section className="parks-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Explore</span>
            <h2>Escolha seu parque</h2>
          </div>
          <span className="park-count">{parks.length} parques</span>
        </div>

        <div className="parks-grid">
          {parks.map((park, index) => (
            <ParkCard
              key={park.id}
              park={park}
              index={index}
              onSelect={onSelectPark}
            />
          ))}
        </div>
      </section>

      <footer className="footer">
        <Logo />
        <p>Seu tempo em Orlando vale ouro.</p>
      </footer>
    </main>
  )
}
