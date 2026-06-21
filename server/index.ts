import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import cors from 'cors'
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import {
  closeDatabase,
  databasePath,
  deleteCollection,
  readCollection,
  recordDataQualityEvents,
  type StorageCollection,
  writeCollection,
} from './database.js'
import {
  getAnalyticsOverview,
  getAttractionAnalytics,
  getParkAnalytics,
} from './analytics.js'
import {
  isCollectorEnabled,
  getCollectorStatus,
  runCollectorOnce,
  startWaitTimeCollector,
  stopWaitTimeCollector,
} from './services/waitTimeCollector.js'

const parsedPort = Number(process.env.PORT)
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3001
const frontendDirectory = resolve(process.cwd(), 'dist')
const frontendIndex = resolve(frontendDirectory, 'index.html')
const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

const isStorageCollection = (value: string): value is StorageCollection =>
  value === 'waitTimeHistory' || value === 'predictions'

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    database: databasePath,
  })
})

app.get('/analytics/overview', (_request, response) => {
  response.json(getAnalyticsOverview())
})

app.post('/data-quality/events', (request, response) => {
  if (!Array.isArray(request.body)) {
    response.status(400).json({ error: 'O corpo deve ser um array de eventos.' })
    return
  }

  const events = request.body.filter((event: unknown) => {
    if (!event || typeof event !== 'object') return false
    const quality = (event as { quality?: string }).quality
    return quality === 'VALID' || quality === 'SUSPICIOUS' || quality === 'INVALID'
  })

  recordDataQualityEvents(events)
  response.status(202).json({ accepted: events.length })
})

app.post('/collector/run-once', async (_request, response, next) => {
  try {
    response.json(await runCollectorOnce())
  } catch (error) {
    next(error)
  }
})

app.get('/collector/status', (_request, response) => {
  response.json(getCollectorStatus())
})

app.get('/analytics/park/:parkId', (request, response) => {
  const analytics = getParkAnalytics(request.params.parkId)

  if (!analytics) {
    response.status(404).json({ error: 'Parque não encontrado no histórico.' })
    return
  }

  response.json(analytics)
})

app.get('/analytics/attraction/:attractionId', (request, response) => {
  const analytics = getAttractionAnalytics(request.params.attractionId)

  if (!analytics) {
    response.status(404).json({ error: 'Atração não encontrada no histórico.' })
    return
  }

  response.json(analytics)
})

app.get('/storage/:collection', (request, response) => {
  const { collection } = request.params

  if (!isStorageCollection(collection)) {
    response.status(404).json({ error: 'Coleção não encontrada.' })
    return
  }

  response.json(readCollection(collection))
})

app.put('/storage/:collection', (request, response) => {
  const { collection } = request.params

  if (!isStorageCollection(collection)) {
    response.status(404).json({ error: 'Coleção não encontrada.' })
    return
  }

  if (!Array.isArray(request.body)) {
    response.status(400).json({ error: 'O corpo da requisição deve ser um array JSON.' })
    return
  }

  writeCollection(collection, request.body)
  response.json(request.body)
})

app.delete('/storage/:collection', (request, response) => {
  const { collection } = request.params

  if (!isStorageCollection(collection)) {
    response.status(404).json({ error: 'Coleção não encontrada.' })
    return
  }

  deleteCollection(collection)
  response.status(204).send()
})

if (existsSync(frontendIndex)) {
  app.use(express.static(frontendDirectory))

  app.use((request, response, next) => {
    if (
      request.method !== 'GET'
      || request.path.startsWith('/storage')
      || request.path === '/analytics'
      || request.path.startsWith('/analytics/')
      || request.path.startsWith('/health')
      || request.path.startsWith('/data-quality')
      || request.path === '/collector'
      || request.path.startsWith('/collector/')
    ) {
      next()
      return
    }

    response.sendFile(frontendIndex)
  })
}

app.use((request, response) => {
  response.status(404).json({
    error: request.path.startsWith('/storage')
      || request.path === '/analytics'
      || request.path.startsWith('/analytics/')
      || request.path.startsWith('/data-quality')
      || request.path === '/collector'
      || request.path.startsWith('/collector/')
      ? 'Endpoint não encontrado.'
      : 'Recurso não encontrado.',
  })
})

app.use((
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  void _next
  console.error(error)
  response.status(500).json({ error: 'Erro interno ao acessar o armazenamento.' })
})

const server = app.listen(PORT, () => {
  console.log(`Orlando Queue Tracker disponível em http://localhost:${PORT}`)
  console.log(`SQLite: ${databasePath}`)

  if (isCollectorEnabled()) {
    startWaitTimeCollector()
  } else {
    console.info('[Collector] Desativado. Defina ENABLE_COLLECTOR=true para ativar.')
  }
})

const shutdown = () => {
  stopWaitTimeCollector()
  server.close(() => {
    closeDatabase()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
