# Aura

Design system **mobile-first** réutilisable pour applications web / PWA.
CSS d'abord, composants React sans dépendance, motion, PWA et CLI d'installation.

> Objectif : arrêter de repartir de zéro à chaque projet, et arrêter le
> « look AI » (dégradés violets, cartes dans des cartes, glassmorphism partout).

---

## Démarrage rapide

```bash
# Depuis le dossier Aura, vers n'importe quel projet
node cli/aura.mjs init --dir <chemin-projet> --stack vite --name "Mon App"

# Next.js
node cli/aura.mjs init --dir <chemin-projet> --stack next --name "Mon App"

# Lister les composants
node cli/aura.mjs list

# Ajouter un composant isolé
node cli/aura.mjs add Sheet,Segmented --dir <chemin-projet>
```

L'installateur copie `src/aura/` (CSS + React + PWA). Aucun build, aucun
package à installer.

Puis :

```tsx
import "./aura/aura.css"
import { ThemeProvider } from "./aura/react"

export function Root() {
  return (
    <ThemeProvider defaultTheme="system" defaultAccent="teal">
      <div className="aura-app">
        <div className="aura-frame">{/* … */}</div>
      </div>
    </ThemeProvider>
  )
}
```

---

## Pourquoi « copy-in » et pas un package npm ?

| Approche | Avantage | Inconvénient |
|---|---|---|
| Package npm | mises à jour centralisées | versions, build, conflits Tailwind |
| **Copy-in (Aura)** | zéro config, personnalisable, fonctionne partout | pas d'update automatique |

Aura est volontairement **copié dans le projet** : chaque app peut modifier ses
tokens et ses composants sans casser les autres. C'est le modèle shadcn/ui,
appliqué à un design system complet.

---

## Structure

```
Aura/
├── cli/aura.mjs              # init / add / list / theme
├── kit/
│   ├── aura.css              # tokens + base + composants + utilitaires
│   ├── react/                # 18 primitives accessibles
│   ├── pwa/                  # manifest, head, icônes, offline, snippets
│   └── auth/                 # serveur zéro-dép + écrans React
├── skills/aura-mobile/       # skill OpenCode / Claude Code
├── DESIGN.md                 # règles de direction artistique
└── README.md
```

### Installer le skill

Copier `skills/aura-mobile/` dans le dossier de skills de l'agent :

```bash
# OpenCode (global)
~/.config/opencode/skills/aura-mobile/SKILL.md

# Claude Code (global)
~/.claude/skills/aura-mobile/SKILL.md

# Ou par projet
<projet>/.opencode/skills/aura-mobile/SKILL.md
```

---

## Tokens

Tout passe par des variables CSS. On ne code **jamais** `#00AEEF` dans un écran.

```css
--aura-bg, --aura-surface, --aura-surface-2
--aura-ink, --aura-ink-2, --aura-ink-3
--aura-line, --aura-line-strong
--aura-accent, --aura-accent-solid, --aura-accent-soft, --aura-accent-strong
--aura-success / --aura-warn / --aura-danger (+ -soft)
--aura-r-sm … --aura-r-2xl
--aura-shadow-1 … 3
--aura-ease-out / --aura-ease-spring
--aura-safe-top (via env())
```

### Thème

```html
<html data-theme="light" data-accent="teal">
```

- `data-theme` : `light` | `dark` (ou géré par `ThemeProvider` + `system`).
- `data-accent` : `teal`, `ocean`, `indigo`, `violet`, `rose`, `amber`, `lime`, `mono`.

Accent sur mesure :

```bash
node cli/aura.mjs theme 265 --name violet
```

---

## Composants React

| Composant | Rôle |
|---|---|
| `ThemeProvider`, `useTheme` | thème clair/sombre/système + accent |
| `Screen`, `AppBar` | structure d'écran, barre haute |
| `BottomTabs` | tab bar flottante, clavier + badges + CTA, variante `capsule` |
| `Card` | surface, `soft`, `flat`, `hero` |
| `Button`, `IconButton` | 5 variantes, 3 tailles, loading |
| `Field` (`Input`, `Select`, `Textarea`) | labels, hints, erreurs, a11y |
| `Switch`, `Segmented`, `Chip`, `Badge` | contrôles |
| `Sheet` | bottom sheet avec piège de focus |
| `Stat`, `ListRow`, `Avatar` | données et listes |
| `Skeleton`, `EmptyState` | chargement et vide |
| `PwaInstallCard` | installation PWA |
| `AuthScreen`, `AuthProvider`, `useAuth` | module auth (opt-in) : inscription, OTP, session |
| `motion.ts` | presets Motion + View Transitions |
| `pwa.ts` | install, online, app badge, service worker |

Les icônes sont optionnelles : `icons.tsx` fournit le minimum, mais l'app peut
passer n'importe quel `ReactNode` (Lucide, Phosphor…).

---

## Patterns d'écran

### 1. Coquille mobile

```tsx
<div className="aura-app">
  <div className="aura-frame">
    <AppBar title="Titre" actions={<IconButton label="Réglages">…</IconButton>} />
    <Screen>{/* contenu scrollable */}</Screen>
    <BottomTabs items={items} value={tab} onChange={setTab} />
  </div>
</div>
```

### 2. Barre du bas qui glisse

La variante `capsule` remplace le fond d'onglet par une pastille pleine qui
voyage d'un onglet à l'autre. La position est pilotée par
`--aura-tab-index` / `--aura-tab-count`, donc réutilisable telle quelle :

```tsx
<BottomTabs
  variant="capsule"
  items={items}
  value={tab}
  onChange={setTab}
/>
```

Pour un geste au doigt (drag + ressort), l'app hôte rend son propre
`.aura-tabbar__pill` et anime `transform` en JS — c'est ce que fait Drivly.
Règles : une seule pastille par barre, cibles ≥ 44 px, pill désactivée quand
le CTA central est ouvert.

### 3. Carte héro

Une seule par écran. Elle porte le chiffre le plus important, pas un slogan.

```tsx
<Card variant="hero">
  <p className="aura-hero__eyebrow">Ce mois-ci</p>
  <p className="aura-hero__value">1 359,22 €</p>
  <p className="aura-hero__meta">3 255 km · 5,26 L/100 km</p>
</Card>
```

### 4. Liste / timeline

```tsx
<div className="aura-timeline">
  <div className="aura-timeline__rail" />
  <div className="aura-timeline__item">
    <div className="aura-timeline__dot">…</div>
    <p className="aura-timeline__date">24 févr.</p>
    <h3 className="aura-h3">Plein diesel</h3>
  </div>
</div>
```

### 5. Bottom sheet

```tsx
<Sheet open={open} onClose={close} title="Filtrer" footer={<Button block>Appliquer</Button>}>
  …
</Sheet>
```

---

## PWA

Le kit fournit :

- `manifest.webmanifest` avec `id`, `scope`, `display_override`, icônes.
- `head.snippet.html` : meta iOS/Android, fonts, script anti-flash de thème.
- `vite-plugin-pwa.snippet.ts.txt` : configuration Vite (à renommer en `.ts`
  une fois copiée dans le projet).
- `next-manifest.ts.txt` : manifest Next.js App Router.
- `offline.html` autonome.
- `icons/aura-icon.svg` + maskable, à convertir en PNG :

```bash
npx @vite-pwa/assets-generator --preset minimal public/aura-icon.svg
```

Détails : `kit/pwa/README.md`.

---

## Authentification (module opt-in)

`kit/auth/` fournit le parcours complet : inscription, connexion, code OTP par
email, mot de passe oublié, session et profil.

```bash
node cli/aura.mjs add auth --dir <projet>
# ou
node cli/aura.mjs init --dir <projet> --stack vite --auth
```

- **Serveur** : zéro dépendance. `crypto.scrypt`, tokens HMAC, `node:sqlite`,
  mailer pluggable (Resend fourni, ou ta propre fonction). Adaptateurs
  **Express**, **Web standard** (Next, Hono, Bun, Workers) et **node:http**.
- **Écrans** : `AuthScreen` + `AuthProvider` + `useAuth`, dans le style Aura.
- **Sécurité** : cookie `httpOnly` par défaut, révocation des sessions au
  changement de mot de passe, OTP hashé, rate limit, anti-énumération.

```tsx
import "./aura/auth/auth.css"
import { AuthProvider, AuthScreen, createHttpAuthClient } from "./aura/auth/react"

const client = createHttpAuthClient({ baseUrl: "/api/auth" })

<AuthProvider client={client}>
  <AuthScreen appName="Mon App" />
</AuthProvider>
```

Détails, contrat d'API et limites : `kit/auth/README.md`.

---

## Motion

- Courbes : `--aura-ease-out`, `--aura-ease-spring`.
- Entrées : `.aura-reveal`, `.aura-stagger`.
- Tactile : `.aura-press` (scale 0.975).
- Transitions de page : `withViewTransition(() => navigate(...))`.
- Toujours respecter `prefers-reduced-motion` (déjà géré).

Règle : **une** animation principale par écran. Le reste doit être silencieux.

---

## Accessibilité

- Cibles tactiles ≥ 44 px (`--aura-tap`).
- Focus visible global, jamais supprimé.
- `Sheet` : rôle dialog, focus trap, Échap, restitution du focus.
- Contraste : `--aura-accent-strong` pour le texte, `--aura-accent-solid` pour
  les fonds de bouton.
- Formulaires : label lié, `aria-invalid`, `aria-describedby`.
- Ne jamais transmettre une information uniquement par la couleur.

---

## Check-list avant livraison

- [ ] Testé à 360 px, 390 px, 430 px et desktop.
- [ ] Safe areas (encoche + barre gestuelle) vérifiées.
- [ ] Manifest + icônes + mode avion.
- [ ] Aucune couleur hexadécimale dans les écrans.
- [ ] Une seule carte héro, un seul accent.
- [ ] `prefers-reduced-motion` vérifié.
- [ ] Auth (si utilisée) : `AUTH_SECRET` fort, mailer réel, cookie `Secure`.
- [ ] Lighthouse : PWA installable, contraste OK.
- [ ] Build + typecheck + tests verts.

---

## Projet pilote : Drivly

Aura est dogfoodé sur **Drivly** (`Workspace/Perso/Drivly/drivly`), un carnet de
bord automobile local-first :

- direction **Precision / instrument**, accent teal ;
- carte héro mensuelle avec sparkline ;
- timeline affinée, tab bar à capsule glissante ;
- `src/aura/` copié par le CLI, tokens pontés vers Tailwind v4 dans
  `src/index.css` ;
- thème forcé en clair tant que le mode sombre n'est pas audité.

C'est la référence de ce à quoi doit ressembler une app Aura.

---

## Feuille de route

- [ ] Thème « liquid glass » avancé (réfraction, highlights).
- [ ] Tableaux de données responsive.
- [ ] Composants de graphes (sparkline, barres).
- [ ] Générateur de captures d'écran pour le manifest.
- [ ] Variante React Native / NativeWind.

---

## Licence

MIT — voir [LICENSE](./LICENSE). Réutilisation libre, y compris commerciale,
avec conservation de la mention de copyright.
