import type {
  StorageAdapter,
  StorageCollection,
  StorageCollectionMap,
} from './storageTypes'

const STORAGE_KEYS: Record<StorageCollection, string> = {
  waitTimeHistory: 'orlando-queue-tracker:wait-time-history:v1',
  predictions: 'orlando-queue-tracker:prediction-accuracy:v1',
}

const emptyCollection = <K extends StorageCollection>(): StorageCollectionMap[K] =>
  [] as StorageCollectionMap[K]

export class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'local' as const

  get<K extends StorageCollection>(collection: K): StorageCollectionMap[K] {
    if (typeof window === 'undefined') return emptyCollection<K>()

    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEYS[collection])
      if (!storedValue) return emptyCollection<K>()

      const parsedValue: unknown = JSON.parse(storedValue)
      return Array.isArray(parsedValue)
        ? parsedValue as StorageCollectionMap[K]
        : emptyCollection<K>()
    } catch {
      return emptyCollection<K>()
    }
  }

  set<K extends StorageCollection>(
    collection: K,
    value: StorageCollectionMap[K],
  ): void {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(STORAGE_KEYS[collection], JSON.stringify(value))
    } catch {
      // Storage is an enhancement and must not interrupt queue updates.
    }
  }

  remove(collection: StorageCollection): void {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.removeItem(STORAGE_KEYS[collection])
    } catch {
      // Ignore unavailable browser storage.
    }
  }
}

export const localStorageAdapter = new LocalStorageAdapter()
