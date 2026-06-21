import type {
  ApiStorageConfiguration,
  StorageAdapter,
  StorageCollection,
  StorageCollectionMap,
} from './storageTypes'

/**
 * Backend contract expected by this adapter:
 * GET  {baseUrl}/storage/{collection} -> JSON array
 * PUT  {baseUrl}/storage/{collection} -> JSON array in the request body
 * DELETE {baseUrl}/storage/{collection}
 *
 * Reads stay synchronous through the local fallback/cache so the current app
 * remains compatible. Remote hydration and writes happen in the background.
 */
export class ApiStorageAdapter implements StorageAdapter {
  readonly name = 'api' as const
  private readonly baseUrl: string
  private readonly fallback: StorageAdapter
  private readonly hydratedCollections = new Set<StorageCollection>()

  constructor(configuration: ApiStorageConfiguration) {
    this.baseUrl = configuration.baseUrl.replace(/\/$/, '')
    this.fallback = configuration.fallback
  }

  get<K extends StorageCollection>(collection: K): StorageCollectionMap[K] {
    this.hydrate(collection)
    return this.fallback.get(collection)
  }

  set<K extends StorageCollection>(
    collection: K,
    value: StorageCollectionMap[K],
  ): void {
    this.fallback.set(collection, value)
    void this.request(collection, {
      method: 'PUT',
      body: JSON.stringify(value),
    })
  }

  remove(collection: StorageCollection): void {
    this.fallback.remove(collection)
    void this.request(collection, { method: 'DELETE' })
  }

  private hydrate(collection: StorageCollection) {
    if (this.hydratedCollections.has(collection)) return
    this.hydratedCollections.add(collection)

    void this.request(collection)
      .then((remoteValue) => {
        if (Array.isArray(remoteValue)) {
          this.fallback.set(collection, remoteValue)
          window.dispatchEvent(new CustomEvent('oqt-storage-synced', {
            detail: { collection },
          }))
        }
      })
      .catch(() => {
        this.hydratedCollections.delete(collection)
      })
  }

  private async request(
    collection: StorageCollection,
    init?: RequestInit,
  ): Promise<StorageCollectionMap[typeof collection] | null> {
    const response = await fetch(`${this.baseUrl}/storage/${collection}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Storage API respondeu com status ${response.status}.`)
    }

    if (response.status === 204 || init?.method === 'DELETE') return null
    return await response.json() as StorageCollectionMap[typeof collection]
  }
}
