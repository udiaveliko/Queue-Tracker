export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      window.setInterval(() => {
        void registration.update()
      }, 60 * 60 * 1000)
    }).catch((error: unknown) => {
      console.warn('Não foi possível ativar o modo offline.', error)
    })
  })
}
