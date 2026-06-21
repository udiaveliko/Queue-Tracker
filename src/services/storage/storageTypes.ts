import type {
  StoredPrediction,
  WaitTimeHistoryEntry,
} from '../../types'

export type StorageCollection = 'waitTimeHistory' | 'predictions'

export interface StorageCollectionMap {
  waitTimeHistory: WaitTimeHistoryEntry[]
  predictions: StoredPrediction[]
}

export interface StorageAdapter {
  readonly name: 'local' | 'api'
  get<K extends StorageCollection>(collection: K): StorageCollectionMap[K]
  set<K extends StorageCollection>(
    collection: K,
    value: StorageCollectionMap[K],
  ): void
  remove(collection: StorageCollection): void
}

export interface ApiStorageConfiguration {
  baseUrl: string
  fallback: StorageAdapter
}
