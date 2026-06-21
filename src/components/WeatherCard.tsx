import type { ParkWeather } from '../types'
import { RefreshIcon } from './Icons'

interface WeatherCardProps {
  weather: ParkWeather | null
  isLoading: boolean
  hasError: boolean
  onRefresh: () => void
}

const getWeatherInfo = (code: number, isDay = true) => {
  if (code === 0) return { icon: isDay ? '☀️' : '🌙', label: 'Céu limpo' }
  if (code <= 3) return { icon: isDay ? '🌤️' : '☁️', label: 'Parcialmente nublado' }
  if (code <= 48) return { icon: '🌫️', label: 'Neblina' }
  if (code <= 57) return { icon: '🌦️', label: 'Garoa' }
  if (code <= 67) return { icon: '🌧️', label: 'Chuva' }
  if (code <= 77) return { icon: '🌨️', label: 'Precipitação' }
  if (code <= 82) return { icon: '🌦️', label: 'Pancadas de chuva' }
  return { icon: '⛈️', label: 'Tempestade' }
}

const formatHour = (time: string, first: boolean) => {
  if (first) return 'Agora'
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit' }).format(new Date(time))
}

export function WeatherCard({
  weather,
  isLoading,
  hasError,
  onRefresh,
}: WeatherCardProps) {
  if (isLoading) {
    return (
      <section className="weather-card weather-loading" aria-label="Carregando previsão">
        <span className="skeleton weather-skeleton-main" />
        <span className="skeleton weather-skeleton-line" />
        <span className="skeleton weather-skeleton-hours" />
      </section>
    )
  }

  if (hasError || !weather) {
    return (
      <section className="weather-card weather-error">
        <div>
          <span className="weather-kicker">Clima no parque</span>
          <strong>Previsão indisponível</strong>
        </div>
        <button type="button" onClick={onRefresh}>
          <RefreshIcon />
          Tentar novamente
        </button>
      </section>
    )
  }

  const current = getWeatherInfo(weather.weatherCode, weather.isDay)

  return (
    <section className="weather-card">
      <div className="weather-current">
        <div>
          <span className="weather-kicker">Clima no parque</span>
          <div className="weather-temperature">
            <strong>{weather.temperature}°</strong>
            <span>{current.label}</span>
          </div>
          <p>
            Sensação de {weather.apparentTemperature}°
            <i />
            Chuva {weather.precipitationProbability}%
          </p>
        </div>
        <span className="weather-main-icon" aria-hidden="true">{current.icon}</span>
      </div>

      <div className="weather-hourly">
        {weather.hourly.map((hour, index) => {
          const info = getWeatherInfo(hour.weatherCode)

          return (
            <div key={hour.time}>
              <span>{formatHour(hour.time, index === 0)}</span>
              <b aria-hidden="true">{info.icon}</b>
              <strong>{hour.temperature}°</strong>
              <small>{hour.precipitationProbability}%</small>
            </div>
          )
        })}
      </div>
    </section>
  )
}
