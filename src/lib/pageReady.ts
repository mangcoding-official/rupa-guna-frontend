/**
 * Readiness checks shared by the page transition and the inner-page preloader: both hold their
 * reveal until the new page has real content and the images in its first screen have loaded.
 */

/** Resolves when the page has replaced its loading state (or after a timeout). */
export const pageReady = (ms = 2500) =>
  new Promise<void>((resolve) => {
    const until = performance.now() + ms
    const tick = () => {
      const main = document.getElementById('main')
      const loading = main?.querySelector('[role="status"]')
      if ((main && !loading && main.childElementCount > 0) || performance.now() > until) return resolve()
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

/** Waits for the images in the first screen of `root`, so a reveal never lands on blanks. */
export const imagesReady = (root: HTMLElement, ms = 1200) => {
  const fold = window.innerHeight
  const pending = [...root.querySelectorAll('img')].filter((img) => !img.complete && img.getBoundingClientRect().top < fold * 1.5)
  if (!pending.length) return Promise.resolve()
  return Promise.race([
    Promise.all(pending.map((img) => new Promise((r) => img.addEventListener('load', r, { once: true })))),
    new Promise((r) => setTimeout(r, ms)),
  ])
}
