/**
 * En-têtes de cache pour une PWA servie par Express.
 *
 * Le HTML, le manifest et le service worker doivent toujours être revalidés :
 * c'est le HTML qui porte les `?v=` des assets, et `sw.js` qui déclenche les
 * mises à jour. Sans ça, iOS (PWA installée) peut rester bloqué sur une
 * ancienne version.
 *
 *   import express from "express"
 *   import { setPwaCacheHeaders } from "./aura/pwa/cache-headers.snippet.mjs"
 *
 *   app.use(
 *     express.static(publicDir, { setHeaders: setPwaCacheHeaders }),
 *   )
 *
 *   app.get("*", (_req, res) => {
 *     res.setHeader("Cache-Control", "no-cache")
 *     res.sendFile(`${publicDir}/index.html`)
 *   })
 */

const REVALIDATE = /(^|\/)(index\.html|manifest\.json|manifest\.webmanifest|sw\.js)$/

/** À passer à `express.static({ setHeaders })`. */
export function setPwaCacheHeaders(res, filePath) {
  const name = String(filePath).replace(/\\/g, "/")
  if (REVALIDATE.test(name)) {
    res.setHeader("Cache-Control", "no-cache")
  }
}

/**
 * Middleware pour la route catch-all qui renvoie `index.html`.
 * Équivalent de `res.setHeader("Cache-Control", "no-cache")` avant
 * `sendFile`.
 */
export function noCache(_req, res, next) {
  res.setHeader("Cache-Control", "no-cache")
  next()
}
