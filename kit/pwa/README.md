# PWA — check-list Aura

## Icônes

Le kit fournit deux SVG sources :

- `icons/aura-icon.svg` — icône classique
- `icons/aura-icon-maskable.svg` — zone sûre Android

Générer tous les PNG en une commande (Vite ou Next) :

```bash
npx @vite-pwa/assets-generator@latest \
  --preset minimal \
  public/aura-icon.svg
```

Puis vérifier dans `public/` : `pwa-192.png`, `pwa-512.png`,
`pwa-512-maskable.png`, `apple-touch-icon.png`, `favicon.svg`.

Alternative sans Node : <https://www.pwabuilder.com/imageGenerator>.

## Manifest

- `display: "standalone"` (pas `fullscreen` : casse les gestes système).
- `id: "/"` + `scope: "/"` pour éviter les doublons d'installation.
- `theme_color` = couleur de la barre système ; `background_color` = écran de
  démarrage. Les deux doivent correspondre aux tokens `--aura-bg` / `--aura-ink`.
- `screenshots` : ajouter 2 captures (mobile + desktop) pour la fiche
  d'installation. Format conseillé : 1080×1920 et 1920×1080.
- `shortcuts` : 2 à 3 actions fréquentes (nouveau, recherche, réglages).

## Service worker

- Vite : `vite-plugin-pwa.snippet.ts.txt` (retirer le suffixe `.txt` une fois
  copié dans `vite.config.ts`).
- Next : `@serwist/next` (remplace next-pwa, maintenu) + `next-manifest.ts.txt`.
- Ne jamais mettre en cache les routes d'API privées sans stratégie explicite.
- Prévoir une page `offline.html` et la déclarer dans `navigateFallback`.

## Cache et mises à jour

Une PWA installée doit pouvoir changer de version **sans vider le cache à la
main**. Trois règles :

1. **Le HTML, le manifest et `sw.js` ne sont jamais servis depuis le cache
   HTTP.** Ce sont eux qui portent les `?v=` des assets et déclenchent les
   mises à jour. Express :

   ```js
   import express from "express"
   import {
     noCache,
     setPwaCacheHeaders,
   } from "./aura/pwa/cache-headers.snippet.mjs"

   app.use(express.static(publicDir, { setHeaders: setPwaCacheHeaders }))
   app.get("*", noCache, (_req, res) => res.sendFile(`${publicDir}/index.html`))
   ```

   Voir `cache-headers.snippet.mjs`. Sur Vercel/Netlify, mêmes en-têtes dans
   `vercel.json` / `_headers` ; sur Next, `headers()` dans `next.config.ts`.

2. **Chaque fichier modifié change son `?v=`** dans son importateur :
   `app.js?v=78` → `notifications.js?v=5` → `reminders.js?v=3`. Sans ça, un
   ancien module peut être réutilisé depuis le cache et ré-importer un module
   en double (listeners ou abonnements dupliqués).

3. **Enregistrer le SW avec `updateViaCache: "none"`**, vérifier les mises à
   jour au démarrage et recharger une fois quand la nouvelle version prend le
   contrôle :

   ```ts
   import { registerServiceWorker } from "./aura/react"

   await registerServiceWorker("/sw.js") // autoReload + checkUpdate par défaut
   ```

   `registerServiceWorker` ajoute `controllerchange` → `location.reload()`
   uniquement si la page était déjà contrôlée (pas de boucle au premier
   démarrage). À appeler une seule fois par page.

> iOS garde l’app **suspendue** quand on la quitte sans la tuer : le JS ne
> tourne pas et la mise à jour attend la prochaine ouverture. Après un
> déploiement important, fermer l’app (glisser vers le haut) et la rouvrir.


## Installation

- Chrome/Edge/Android : `beforeinstallprompt` + `PwaInstallCard`.
- iOS : pas d'API ; afficher « Partager → Sur l'écran d'accueil ».
- Vérifier `start_url` en mode avion après installation.

## Test

```bash
npm run build && npm run preview
# DevTools → Application → Manifest / Service Workers
# Lighthouse → PWA (installable, offline)
```
