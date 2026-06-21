import type { ParkWeather } from '../types'

interface OpenMeteoResponse {
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    precipitation: number
    weather_code: number
    is_day: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    precipitation_probability: number[]
    weather_code: number[]
  }
}

export async function getParkWeather(
  latitude: number,
  longitude: number,
): Promise<ParkWeather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,apparent_temperature,precipitation,weather_code,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    forecast_hours: '6',
    temperature_unit: 'celsius',
    timezone: 'America/New_York',
  })

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)

  if (!response.ok) {
    throw new Error('Não foi possível carregar a previsão do tempo.')
  }

  const data = await response.json() as OpenMeteoResponse
  const currentHourIndex = data.hourly.time.findIndex((time) => time >= data.current.time)
  const startIndex = Math.max(0, currentHourIndex)

  return {
    temperature: Math.round(data.current.temperature_2m),
    apparentTemperature: Math.round(data.current.apparent_temperature),
    precipitationProbability: data.hourly.precipitation_probability[startIndex] ?? 0,
    weatherCode: data.current.weather_code,
    isDay: data.current.is_day === 1,
    updatedAt: data.current.time,
    hourly: data.hourly.time.slice(startIndex, startIndex + 5).map((time, index) => {
      const sourceIndex = startIndex + index

      return {
        time,
        temperature: Math.round(data.hourly.temperature_2m[sourceIndex]),
        precipitationProbability: data.hourly.precipitation_probability[sourceIndex] ?? 0,
        weatherCode: data.hourly.weather_code[sourceIndex],
      }
    }),
  }
}
