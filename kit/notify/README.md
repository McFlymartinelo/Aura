# Aura Notify

Notifications in-app et push Web, avec un style paramétrable.

| Couche | Contenu | Dépendances |
|---|---|---|
| `notify.css` | styles `instrument`, `banner`, `card` | aucune |
| `react/` | `NotifyProvider`, `useNotify`, client push VAPID | React |
| `server/` | abonnements, calendrier, envoi | `web-push` (optionnel) |
| `sw/` | service worker push | aucune |

Le style **`auto`** choisit `instrument` sur Android et `banner` sur iOS.
Le rendu final du push reste celui du système : on contrôle l'icône, le titre,
le corps, les actions Android, le `tag` et le son — pas la mise en page.

---

## Installation

```bash
node <chemin>/cli/aura.mjs add notify --dir <projet>
# ou
node <chemin>/cli/aura.mjs init --dir <projet> --stack vite --notify
```

Importer le CSS **après** `aura.css` :

```ts
import "./aura/aura.css"
import "./aura/notify/notify.css"
```

---

## In-app

```tsx
import { NotifyProvider, useNotify } from "./aura/notify/react"

export function Root() {
  return (
    <NotifyProvider appName="Mon App" style="auto">
      <App />
    </NotifyProvider>
  )
}

function SaveButton() {
  const { notify } = useNotify()

  return (
    <button
      onClick={() =>
        notify({
          title: "Sauvegarde",
          message: "La copie serveur est à jour.",
          tone: "success",
          action: { label: "Voir", onClick: () => {} },
        })
      }
    >
      Enregistrer
    </button>
  )
}
```

Options :

| Option | Rôle |
|---|---|
| `title` | libellé court (kicker en instrument, titre en carte/bandeau) |
| `message` | texte principal |
| `tone` | `info`, `success`, `warn`, `danger` |
| `duration` | ms ; `0` = persistante |
| `action` | `{ label, onClick }` |
| `tag` | remplace une notification existante |
| `icon` | icône React (carte) |

Styles :

```tsx
<NotifyProvider style="instrument" /> // rail d'accent, bas
<NotifyProvider style="banner" />     // pleine largeur, haut (iOS)
<NotifyProvider style="card" />       // carte avec icône
<NotifyProvider style="auto" />       // Android → instrument, iOS → banner
```

Le provider expose `resolvedStyle` et `setStyle` pour un sélecteur de réglages.
La position est `bottom` par défaut ; le bandeau force `top`.

---

## Push Web

### 1. Service worker

Avec `vite-plugin-pwa` (`generateSW`), ajouter le script :

```ts
// vite.config.ts
VitePWA({
  workbox: {
    importScripts: ["push-sw.js"],
  },
  devOptions: { enabled: true, type: "classic" },
})
```

Copier `notify/sw/push-sw.js` dans `public/`. Le service worker gère :
`push`, `notificationclick`, `pushsubscriptionchange`, et relaie l'événement
aux onglets (`AURA_PUSH`, `AURA_NAV`).

> Le push ne se teste pas dans le serveur de dev : le SW de dev n'inclut pas
> `importScripts`. Utiliser un build de production (ou l'app installée).

### 2. Client

```ts
import { createPushClient } from "./aura/notify/react"

const push = createPushClient({
  apiBase: "/api",
  getHeaders: () => ({ Authorization: `Bearer ${token}` }),
})

const status = await push.status()
const result = await push.enable()
```

`status.reason` indique **pourquoi** le push est disponible ou non :

| `reason` | Cause | À afficher |
|---|---|---|
| `ok` | tout est prêt | bouton Activer |
| `ios-install` | Safari iPhone hors PWA | Partager → Sur l’écran d’accueil |
| `ios-outdated` | iOS < 16.4 | mise à jour iOS |
| `insecure` | HTTP (IP locale, pas HTTPS) | ouvrir en https:// |
| `unsupported` | navigateur sans Push/Notification | changer de navigateur |

`enable()` renvoie `{ ok, reason }` avec les mêmes valeurs, plus `vapid`,
`denied` et `error`. Pour les messages prêts à l’emploi :

```ts
import { describePushContext, pushContextSummary } from "./aura/notify/react"

describePushContext(status) // message actionnable, ou null si tout va bien
pushContextSummary(status)  // « iOS 18.6 · écran d’accueil · HTTPS · Push API ok »
```

#### React

`usePush` garde l’état et les actions ; `PushCard` fournit la carte de
réglages complète (statut, diagnostic, Activer / Tester / Désactiver).

```tsx
import { PushCard } from "./aura/notify/react"

<PushCard
  appName="Mon App"
  apiBase="/api"
  getHeaders={() => ({ Authorization: `Bearer ${token}` })}
  onEnabled={() => console.log("push activé")}
/>
```

```tsx
const push = usePush({ apiBase: "/api" })
await push.enable()
await push.test()
push.hint    // explication si indisponible
push.summary // ligne de diagnostic
```

`usePush` crée le client une seule fois : `apiBase`, `swUrl` et les chemins
sont lus au montage. `getHeaders` est appelé à chaque requête.

### 3. Serveur

```js
import { createPushService } from "./aura/notify/server/index.mjs"
import { createWebPushSender } from "./aura/notify/server/webpush.mjs"

const sender = await createWebPushSender({
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
  subject: "mailto:admin@exemple.fr",
})

const push = createPushService({
  db, // get / all / run
  sender,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  appName: "Mon App",
})
```

Routes à exposer (avec ta session) :

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/push/vapid` | `{ configured, publicKey }` (public) |
| POST | `/push/subscribe` | `{ endpoint, keys }` |
| POST | `/push/unsubscribe` | `{ endpoint }` |
| POST | `/push/test` | envoie une notification test |
| POST | `/notifications/schedule` | `{ items: [{ key, at, title, body, url, tag }] }` |

Le **client calcule ses échéances** (rappels, prévision de plein) et les envoie.
Le serveur ne lit pas les données métier : il stocke le calendrier et envoie à
l'heure. C'est ce qui permet de rester local-first.

Envoi périodique :

```js
setInterval(() => push.sendDue().catch(console.error), 5 * 60_000)
```

`sendDue()` envoie les éléments dont `at <= maintenant`, marque `sent_at`,
supprime les abonnements expirés (404/410/403) et abandonne après 5 échecs.

Chaque erreur d’envoi contient `host`, `status` et `body` (le JSON du service
push). Exemple Apple : `400 · web.push.apple.com · {"reason":"BadWebPushTopic"}`.

> **Piège Apple** : `web.push.apple.com` renvoie `400 BadWebPushTopic` dès que
> l’en-tête `Topic` dépasse **16 caractères** (le RFC 8030 en autorise 32).
> `createWebPushSender` ne l’envoie jamais à Apple ; `pushSendOptions()` expose
> la règle pour un sender maison. Ne pas réintroduire de `topic` global.

Le schéma SQL est dans `notify/server/schema.sql` (tables préfixées `aura_`).

---

## iOS — app fermée, verrouillée, tuée

Le push fonctionne **app fermée** sur iOS 16.4+ : APNs réveille le service
worker, qui affiche la notification. Quelques règles :

- l’app doit être **installée sur l’écran d’accueil** (pas un onglet Safari) ;
- la permission doit rester sur **Autoriser** (Réglages → Notifications → app) ;
- vérifier que **Résumé des notifications** est désactivé pour l’app, sinon la
  notification est regroupée et arrive plus tard ;
- après un redémarrage ou une fermeture forcée, **iOS 17** a des bugs connus où
  les push cessent jusqu’à la réouverture de l’app. iOS 18 corrige la majorité
  des cas. Sur une cible iOS 17.x, conseiller la mise à jour.

Protocole de test :

1. fermer l’app (glisser vers le haut dans le sélecteur) ou verrouiller le
   téléphone ;
2. déclencher `push.test()` depuis le serveur ou un autre appareil ;
3. la notification doit apparaître sur l’écran verrouillé.

Ne pas confondre les trois canaux :

| Canal | App ouverte | App fermée |
|---|---|---|
| In-app (`useNotify`) | oui | non |
| Rappel local calculé côté client | oui | non |
| Push serveur (`sendDue` / cron) | oui | **oui** |

## Mise à jour du front

Une PWA qui reste sur une ancienne version ne verra jamais les corrections.
Voir `kit/pwa/README.md` : `Cache-Control: no-cache` sur `index.html`,
`manifest` et `sw.js`, plus `registerServiceWorker({ autoReload: true })`.

---

## Configuration

| Variable | Rôle |
|---|---|
| `VAPID_PUBLIC_KEY` | clé publique (exposée au client) |
| `VAPID_PRIVATE_KEY` | clé privée (serveur uniquement) |
| `VAPID_SUBJECT` | `mailto:` ou URL de contact |

Générer une paire :

```bash
npx web-push generate-vapid-keys
```

`web-push` est la seule dépendance du module, et uniquement côté serveur.
Pour rester sans dépendance, passer un `sender` maison à `createPushService`.

---

## Limites

- Pas de push sur iOS hors PWA installée (limite Apple, iOS 16.4+).
- Le calendrier est calculé côté client (local-first) : les échéances ne sont
  planifiées côté serveur qu’après un `syncSchedule()`. Une échéance déjà
  stockée part même si l’app est fermée ; une échéance qui n’a jamais été
  synchronisée ne partira pas.
- iOS 17 : bugs de livraison après redémarrage / fermeture forcée ; iOS 18 est
  plus fiable. Toujours tester sur un vrai build installé.
- Les actions de notification sont limitées à 2 sur Android, 0 sur iOS.
- Le service worker de dev n’inclut pas le push : tester en production.
