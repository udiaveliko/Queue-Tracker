import { useEffect, useState } from 'react'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { AnalyticsDashboard } from './pages/AnalyticsDashboard'
import { HomePage } from './pages/HomePage'
import { ParkPage } from './pages/ParkPage'
import { PlannerPage } from './pages/PlannerPage'
import { PredictionAccuracyPage } from './pages/PredictionAccuracyPage'
import { CollectorStatusPage } from './pages/CollectorStatusPage'

interface AppRoute {
  parkId: string | null
  page: 'home' | 'park' | 'analytics' | 'analytics-dashboard' | 'collector-status' | 'prediction-accuracy' | 'planner'
}

const getRouteFromPath = (): AppRoute => {
  if (window.location.pathname === '/planner') {
    return { parkId: null, page: 'planner' }
  }

  if (window.location.pathname === '/analytics-dashboard') {
    return { parkId: null, page: 'analytics-dashboard' }
  }

  if (window.location.pathname === '/collector-status') {
    return { parkId: null, page: 'collector-status' }
  }

  const accuracyMatch = window.location.pathname.match(
    /^\/park\/([^/]+)\/analytics\/prediction-accuracy$/,
  )
  if (accuracyMatch) return { parkId: accuracyMatch[1], page: 'prediction-accuracy' }

  const analyticsMatch = window.location.pathname.match(/^\/park\/([^/]+)\/analytics$/)
  if (analyticsMatch) return { parkId: analyticsMatch[1], page: 'analytics' }

  const parkMatch = window.location.pathname.match(/^\/park\/([^/]+)$/)
  if (parkMatch) return { parkId: parkMatch[1], page: 'park' }

  return { parkId: null, page: 'home' }
}

function App() {
  const [route, setRoute] = useState<AppRoute>(getRouteFromPath)

  useEffect(() => {
    const handlePopState = () => setRoute(getRouteFromPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const selectPark = (parkId: string) => {
    window.history.pushState({}, '', `/park/${parkId}`)
    setRoute({ parkId, page: 'park' })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const goHome = () => {
    window.history.pushState({}, '', '/')
    setRoute({ parkId: null, page: 'home' })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const openAnalytics = (parkId: string) => {
    window.history.pushState({}, '', `/park/${parkId}/analytics`)
    setRoute({ parkId, page: 'analytics' })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const openPredictionAccuracy = (parkId: string) => {
    window.history.pushState({}, '', `/park/${parkId}/analytics/prediction-accuracy`)
    setRoute({ parkId, page: 'prediction-accuracy' })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const openPlanner = () => {
    window.history.pushState({}, '', '/planner')
    setRoute({ parkId: null, page: 'planner' })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const openAnalyticsDashboard = () => {
    window.history.pushState({}, '', '/analytics-dashboard')
    setRoute({ parkId: null, page: 'analytics-dashboard' })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const openCollectorStatus = () => {
    window.history.pushState({}, '', '/collector-status')
    setRoute({ parkId: null, page: 'collector-status' })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  if (route.page === 'planner') {
    return <PlannerPage onBack={goHome} />
  }

  if (route.page === 'analytics-dashboard') {
    return (
      <AnalyticsDashboard
        onBack={goHome}
        onOpenCollectorStatus={openCollectorStatus}
      />
    )
  }

  if (route.page === 'collector-status') {
    return <CollectorStatusPage onBack={openAnalyticsDashboard} />
  }

  if (route.page === 'prediction-accuracy' && route.parkId) {
    return (
      <PredictionAccuracyPage
        parkId={route.parkId}
        onBack={() => openAnalytics(route.parkId!)}
      />
    )
  }

  if (route.page === 'analytics' && route.parkId) {
    return (
      <AnalyticsPage
        parkId={route.parkId}
        onBack={() => selectPark(route.parkId!)}
        onOpenPredictionAccuracy={() => openPredictionAccuracy(route.parkId!)}
      />
    )
  }

  if (route.page === 'park' && route.parkId) {
    return (
      <ParkPage
        parkId={route.parkId}
        onBack={goHome}
        onOpenAnalytics={() => openAnalytics(route.parkId!)}
      />
    )
  }

  return (
    <HomePage
      onSelectPark={selectPark}
      onOpenPlanner={openPlanner}
      onOpenAnalyticsDashboard={openAnalyticsDashboard}
    />
  )
}

export default App
