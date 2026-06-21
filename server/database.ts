import { mkdirSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  validateWaitTimeSamples,
  type DataQualityIssue,
  type DataQualityLevel,
  type WaitTimeSampleInput,
} from './services/dataQuality.js'

export type StorageCollection = 'waitTimeHistory' | 'predictions'

interface WaitTimeHistoryPayload extends WaitTimeSampleInput {
  status: 'OPEN' | 'CLOSED'
  quality?: DataQualityLevel
}

export interface AppendSamplesResult {
  saved: number
  valid: number
  suspicious: number
  invalid: number
  duplicatesSkipped: number
}

interface PredictionResultPayload {
  actualWaitTime: number
  evaluatedAt: string
  absoluteError: number
  percentageError: number
  accuracy: number
}

interface PredictionPayload {
  id: string
  parkId: string
  attractionId: string
  attractionName: string
  timestamp: string
  currentWaitTime: number
  predicted30: number
  predicted60: number
  confidence?: 'low' | 'medium' | 'high'
  result30?: PredictionResultPayload
  result60?: PredictionResultPayload
}

interface LegacyBlobRow {
  data: string
}

interface TableColumn {
  name: string
}

const PARK_METADATA: Record<string, { name: string; provider: string }> = {
  'magic-kingdom': { name: 'Magic Kingdom', provider: 'ThemeParks Wiki' },
  epcot: { name: 'EPCOT', provider: 'ThemeParks Wiki' },
  'hollywood-studios': { name: 'Hollywood Studios', provider: 'ThemeParks Wiki' },
  'animal-kingdom': { name: 'Animal Kingdom', provider: 'ThemeParks Wiki' },
  'universal-studios-florida': { name: 'Universal Studios Florida', provider: 'ThemeParks Wiki' },
  'islands-of-adventure': { name: 'Islands of Adventure', provider: 'ThemeParks Wiki' },
  'epic-universe': { name: 'Epic Universe', provider: 'ThemeParks Wiki' },
  'seaworld-orlando': { name: 'SeaWorld Orlando', provider: 'ThemeParks Wiki' },
  'busch-gardens-tampa': { name: 'Busch Gardens Tampa', provider: 'ThemeParks Wiki' },
}

const configuredDatabasePath = process.env.DATABASE_PATH?.trim()
const databasePath = configuredDatabasePath
  ? isAbsolute(configuredDatabasePath)
    ? configuredDatabasePath
    : resolve(process.cwd(), configuredDatabasePath)
  : resolve(process.cwd(), 'server', 'data', 'orlando-queue.db')

mkdirSync(dirname(databasePath), { recursive: true })

const database = new DatabaseSync(databasePath)

database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`)

const tableExists = (tableName: string) =>
  Boolean(database
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(tableName))

const tableHasColumn = (tableName: string, columnName: string) => {
  if (!tableExists(tableName)) return false
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as unknown as TableColumn[]
  return columns.some((column) => column.name === columnName)
}

const parseLegacyArray = <T>(row: LegacyBlobRow | undefined): T[] => {
  if (!row) return []

  try {
    const parsed: unknown = JSON.parse(row.data)
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch {
    return []
  }
}

const prepareLegacyTables = () => {
  if (tableHasColumn('predictions', 'data')) {
    database.exec(`
      ALTER TABLE predictions RENAME TO predictions_legacy_blob;
    `)
  }
}

const createRelationalSchema = () => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS parks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attractions (
      id TEXT PRIMARY KEY,
      park_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (park_id) REFERENCES parks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wait_time_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      park_id TEXT NOT NULL,
      attraction_id TEXT NOT NULL,
      wait_time INTEGER,
      status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED')),
      timestamp TEXT NOT NULL,
      quality TEXT NOT NULL DEFAULT 'VALID'
        CHECK (quality IN ('VALID', 'SUSPICIOUS', 'INVALID')),
      FOREIGN KEY (park_id) REFERENCES parks(id) ON DELETE CASCADE,
      FOREIGN KEY (attraction_id) REFERENCES attractions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS data_quality_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      park_id TEXT,
      attraction_id TEXT,
      timestamp TEXT,
      quality TEXT NOT NULL CHECK (quality IN ('VALID', 'SUSPICIOUS', 'INVALID')),
      issues TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      park_id TEXT NOT NULL,
      attraction_id TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      current_wait_time INTEGER NOT NULL,
      predicted_30 INTEGER NOT NULL,
      predicted_60 INTEGER NOT NULL,
      confidence TEXT NOT NULL DEFAULT 'low',
      FOREIGN KEY (park_id) REFERENCES parks(id) ON DELETE CASCADE,
      FOREIGN KEY (attraction_id) REFERENCES attractions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prediction_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prediction_id TEXT NOT NULL UNIQUE,
      actual_30 INTEGER,
      actual_60 INTEGER,
      error_30 REAL,
      error_60 REAL,
      checked_at TEXT,
      FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_wait_samples_park_timestamp
      ON wait_time_samples(park_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_wait_samples_attraction_timestamp
      ON wait_time_samples(attraction_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_quality_events_quality
      ON data_quality_events(quality);
    CREATE INDEX IF NOT EXISTS idx_predictions_park_generated
      ON predictions(park_id, generated_at);
    CREATE INDEX IF NOT EXISTS idx_predictions_attraction_generated
      ON predictions(attraction_id, generated_at);
  `)

  if (!tableHasColumn('wait_time_samples', 'quality')) {
    database.exec(`
      ALTER TABLE wait_time_samples
      ADD COLUMN quality TEXT NOT NULL DEFAULT 'VALID';
    `)
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_wait_samples_quality
      ON wait_time_samples(quality);
  `)
}

const runTransaction = (operation: () => void) => {
  database.exec('BEGIN IMMEDIATE')
  try {
    operation()
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

const upsertParkAndAttraction = (
  parkId: string,
  attractionId: string,
  attractionName: string,
) => {
  const metadata = PARK_METADATA[parkId] ?? {
    name: parkId,
    provider: 'ThemeParks Wiki',
  }

  database.prepare(`
    INSERT INTO parks (id, name, provider)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      provider = excluded.provider
  `).run(parkId, metadata.name, metadata.provider)

  database.prepare(`
    INSERT INTO attractions (id, park_id, name)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      park_id = excluded.park_id,
      name = excluded.name
  `).run(attractionId, parkId, attractionName)
}

const replaceWaitTimeHistory = (entries: WaitTimeHistoryPayload[]) => {
  const { accepted, rejected } = validateWaitTimeSamples(entries)

  runTransaction(() => {
    database.exec('DELETE FROM wait_time_samples')
    const insertSample = database.prepare(`
      INSERT INTO wait_time_samples (
        park_id,
        attraction_id,
        wait_time,
        status,
        timestamp,
        quality
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    accepted.forEach((entry) => {
      upsertParkAndAttraction(entry.parkId, entry.attractionId, entry.attractionName)
      insertSample.run(
        entry.parkId,
        entry.attractionId,
        entry.waitTime,
        entry.status,
        entry.timestamp,
        entry.quality,
      )
    })

    recordDataQualityEvents(rejected.map(({ sample, result }) => ({
      parkId: sample.parkId,
      attractionId: sample.attractionId,
      timestamp: sample.timestamp,
      quality: result.quality,
      issues: result.issues,
    })))
  })
}

const getLatestSampleContext = (
  parkId: string,
  attractionId: string,
): WaitTimeSampleInput[] => {
  const row = database.prepare(`
    SELECT
      samples.park_id AS parkId,
      samples.attraction_id AS attractionId,
      attractions.name AS attractionName,
      samples.wait_time AS waitTime,
      samples.status AS status,
      samples.timestamp AS timestamp,
      samples.quality AS quality
    FROM wait_time_samples AS samples
    JOIN attractions ON attractions.id = samples.attraction_id
    WHERE samples.park_id = ? AND samples.attraction_id = ?
    ORDER BY samples.timestamp DESC, samples.id DESC
    LIMIT 1
  `).get(parkId, attractionId) as unknown as WaitTimeSampleInput | undefined

  return row ? [row] : []
}

export function appendWaitTimeSamples(
  entries: WaitTimeHistoryPayload[],
): AppendSamplesResult {
  const accepted: Array<WaitTimeHistoryPayload & {
    quality: Exclude<DataQualityLevel, 'INVALID'>
  }> = []
  const rejected: Array<{
    sample: WaitTimeHistoryPayload
    issues: DataQualityIssue[]
  }> = []
  const acceptedByAttraction = new Map<string, WaitTimeSampleInput[]>()

  entries.forEach((entry) => {
    const key = `${entry.parkId}:${entry.attractionId}`
    const context = [
      ...getLatestSampleContext(entry.parkId, entry.attractionId),
      ...(acceptedByAttraction.get(key) ?? []),
    ]
    const { accepted: validated, rejected: invalid } =
      validateWaitTimeSamples([entry], context)

    if (invalid.length) {
      rejected.push({
        sample: entry,
        issues: invalid[0].result.issues,
      })
      return
    }

    const validatedEntry = validated[0] as WaitTimeHistoryPayload & {
      quality: Exclude<DataQualityLevel, 'INVALID'>
    }
    accepted.push(validatedEntry)
    acceptedByAttraction.set(key, [
      ...(acceptedByAttraction.get(key) ?? []),
      validatedEntry,
    ])
  })

  runTransaction(() => {
    const insertSample = database.prepare(`
      INSERT INTO wait_time_samples (
        park_id,
        attraction_id,
        wait_time,
        status,
        timestamp,
        quality
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    accepted.forEach((entry) => {
      upsertParkAndAttraction(entry.parkId, entry.attractionId, entry.attractionName)
      insertSample.run(
        entry.parkId,
        entry.attractionId,
        entry.waitTime,
        entry.status,
        entry.timestamp,
        entry.quality,
      )
    })

    recordDataQualityEvents(rejected.map(({ sample, issues }) => ({
      parkId: sample.parkId,
      attractionId: sample.attractionId,
      timestamp: sample.timestamp,
      quality: 'INVALID',
      issues,
    })))
  })

  return {
    saved: accepted.length,
    valid: accepted.filter((entry) => entry.quality === 'VALID').length,
    suspicious: accepted.filter((entry) => entry.quality === 'SUSPICIOUS').length,
    invalid: rejected.filter(({ issues }) =>
      !issues.some((issue) => issue.code === 'DUPLICATE_MINUTE'),
    ).length,
    duplicatesSkipped: rejected.filter(({ issues }) =>
      issues.some((issue) => issue.code === 'DUPLICATE_MINUTE'),
    ).length,
  }
}

const replacePredictions = (entries: PredictionPayload[]) => {
  runTransaction(() => {
    database.exec('DELETE FROM prediction_results')
    database.exec('DELETE FROM predictions')

    const insertPrediction = database.prepare(`
      INSERT INTO predictions (
        id,
        park_id,
        attraction_id,
        generated_at,
        current_wait_time,
        predicted_30,
        predicted_60,
        confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertResult = database.prepare(`
      INSERT INTO prediction_results (
        prediction_id,
        actual_30,
        actual_60,
        error_30,
        error_60,
        checked_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    entries.forEach((entry) => {
      upsertParkAndAttraction(entry.parkId, entry.attractionId, entry.attractionName)
      insertPrediction.run(
        entry.id,
        entry.parkId,
        entry.attractionId,
        entry.timestamp,
        entry.currentWaitTime,
        entry.predicted30,
        entry.predicted60,
        entry.confidence ?? 'low',
      )

      if (entry.result30 || entry.result60) {
        insertResult.run(
          entry.id,
          entry.result30?.actualWaitTime ?? null,
          entry.result60?.actualWaitTime ?? null,
          entry.result30?.absoluteError ?? null,
          entry.result60?.absoluteError ?? null,
          entry.result60?.evaluatedAt ?? entry.result30?.evaluatedAt ?? null,
        )
      }
    })
  })
}

const migrateLegacyData = () => {
  const history = tableExists('wait_time_history')
    ? parseLegacyArray<WaitTimeHistoryPayload>(
        database.prepare('SELECT data FROM wait_time_history WHERE id = 1').get() as LegacyBlobRow | undefined,
      )
    : []
  const predictions = tableExists('predictions_legacy_blob')
    ? parseLegacyArray<PredictionPayload>(
        database.prepare('SELECT data FROM predictions_legacy_blob WHERE id = 1').get() as LegacyBlobRow | undefined,
      )
    : []

  if (history.length && getWaitTimeHistory().length === 0) {
    replaceWaitTimeHistory(history)
  }
  if (predictions.length && getPredictions().length === 0) {
    replacePredictions(predictions)
  }

  database.exec(`
    DROP TABLE IF EXISTS wait_time_history;
    DROP TABLE IF EXISTS predictions_legacy_blob;
  `)
}

const calculateEvaluation = (
  predicted: number,
  actual: number,
  checkedAt: string,
): PredictionResultPayload => {
  const absoluteError = Math.abs(predicted - actual)
  const percentageError = (absoluteError / Math.max(actual, 5)) * 100

  return {
    actualWaitTime: actual,
    evaluatedAt: checkedAt,
    absoluteError,
    percentageError: Math.round(percentageError * 10) / 10,
    accuracy: Math.max(0, Math.round((100 - percentageError) * 10) / 10),
  }
}

const getWaitTimeHistory = (): WaitTimeHistoryPayload[] =>
  database.prepare(`
    SELECT
      samples.park_id AS parkId,
      samples.attraction_id AS attractionId,
      attractions.name AS attractionName,
      samples.wait_time AS waitTime,
      samples.status AS status,
      samples.timestamp AS timestamp,
      samples.quality AS quality
    FROM wait_time_samples AS samples
    JOIN attractions ON attractions.id = samples.attraction_id
    ORDER BY samples.timestamp ASC, samples.id ASC
  `).all() as unknown as WaitTimeHistoryPayload[]

interface PredictionRow {
  id: string
  parkId: string
  attractionId: string
  attractionName: string
  timestamp: string
  currentWaitTime: number
  predicted30: number
  predicted60: number
  confidence: 'low' | 'medium' | 'high'
  actual30: number | null
  actual60: number | null
  error30: number | null
  error60: number | null
  checkedAt: string | null
}

const getPredictions = (): PredictionPayload[] => {
  const rows = database.prepare(`
    SELECT
      predictions.id AS id,
      predictions.park_id AS parkId,
      predictions.attraction_id AS attractionId,
      attractions.name AS attractionName,
      predictions.generated_at AS timestamp,
      predictions.current_wait_time AS currentWaitTime,
      predictions.predicted_30 AS predicted30,
      predictions.predicted_60 AS predicted60,
      predictions.confidence AS confidence,
      results.actual_30 AS actual30,
      results.actual_60 AS actual60,
      results.error_30 AS error30,
      results.error_60 AS error60,
      results.checked_at AS checkedAt
    FROM predictions
    JOIN attractions ON attractions.id = predictions.attraction_id
    LEFT JOIN prediction_results AS results
      ON results.prediction_id = predictions.id
    ORDER BY predictions.generated_at ASC
  `).all() as unknown as PredictionRow[]

  return rows.map((row) => ({
    id: row.id,
    parkId: row.parkId,
    attractionId: row.attractionId,
    attractionName: row.attractionName,
    timestamp: row.timestamp,
    currentWaitTime: row.currentWaitTime,
    predicted30: row.predicted30,
    predicted60: row.predicted60,
    confidence: row.confidence,
    ...(row.actual30 !== null && row.checkedAt
      ? { result30: calculateEvaluation(row.predicted30, row.actual30, row.checkedAt) }
      : {}),
    ...(row.actual60 !== null && row.checkedAt
      ? { result60: calculateEvaluation(row.predicted60, row.actual60, row.checkedAt) }
      : {}),
  }))
}

prepareLegacyTables()
createRelationalSchema()
migrateLegacyData()

export function readCollection(collection: StorageCollection): unknown[] {
  return collection === 'waitTimeHistory'
    ? getWaitTimeHistory()
    : getPredictions()
}

export function writeCollection(
  collection: StorageCollection,
  value: unknown[],
): void {
  if (collection === 'waitTimeHistory') {
    replaceWaitTimeHistory(value as WaitTimeHistoryPayload[])
  } else {
    replacePredictions(value as PredictionPayload[])
  }
}

export function deleteCollection(collection: StorageCollection): void {
  if (collection === 'waitTimeHistory') {
    database.exec(`
      DELETE FROM wait_time_samples;
      DELETE FROM data_quality_events;
    `)
  } else {
    database.exec(`
      DELETE FROM prediction_results;
      DELETE FROM predictions;
    `)
  }
}

export interface DataQualityEventInput {
  parkId?: string
  attractionId?: string
  timestamp?: string
  quality: DataQualityLevel
  issues: DataQualityIssue[]
}

export function recordDataQualityEvents(events: DataQualityEventInput[]): void {
  if (!events.length) return

  const insert = database.prepare(`
    INSERT INTO data_quality_events (
      park_id,
      attraction_id,
      timestamp,
      quality,
      issues,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `)

  events.forEach((event) => {
    insert.run(
      event.parkId ?? null,
      event.attractionId ?? null,
      event.timestamp ?? null,
      event.quality,
      JSON.stringify(event.issues),
      new Date().toISOString(),
    )
  })
}

export function closeDatabase(): void {
  database.close()
}

export { databasePath }
export { database }
