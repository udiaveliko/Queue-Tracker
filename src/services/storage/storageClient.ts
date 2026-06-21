import { ApiStorageAdapter } from './apiStorageAdapter'
import { localStorageAdapter } from './localStorageAdapter'
import type {
  StorageAdapter,
  StorageCollection,
  StorageCollectionMap,
} from './storageTypes'
import { API_BASE_URL } from '../apiBaseUrl'

const activeAdapter: StorageAdapter = new ApiStorageAdapter({
  baseUrl: API_BASE_URL,
  fallback: localStorageAdapter,
})

export const storageClient = {
  get adapterName() {
    return activeAdapter.name
  },

  get<K extends StorageCollection>(collection: K): StorageCollectionMap[K] {
    return activeAdapter.get(collection)
  },

  set<K extends StorageCollection>(
    collection: K,
    value: StorageCollectionMap[K],
  ): void {
    activeAdapter.set(collection, value)
  },

  remove(collection: StorageCollection): void {
    activeAdapter.remove(collection)
  },
}
