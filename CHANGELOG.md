# Journal

## 0.2.0 — 2026-11-01

- Nouveau module `kit/auth/` (opt-in) : inscription, connexion, code OTP par
  email, mot de passe oublié, session et profil.
- Serveur **zéro dépendance** : scrypt natif, JWT HS256 maison, OTP HMAC,
  `node:sqlite`, mailer pluggable (Resend fourni).
- Adaptateurs **Express** et **Web standard** (Next, Hono, Bun, Workers).
- Client React : `AuthProvider`, `useAuth`, `AuthScreen`, client HTTP typé,
  mode cookie httpOnly ou bearer.
- CLI : `aura add auth`, `aura init --auth`, `aura list` affiche les modules.
- Sécurité : révocation des sessions par `token_version`, anti-énumération,
  rate limit, mot de passe 8 caractères minimum, OTP hashé.
- Corrige l'encodage UTF-8 du CLI (accents et flèches).

## 0.1.2 — 2026-11-01

- `BottomTabs` reçoit `variant="capsule"` : une pastille pleine glisse sous
  l'onglet actif, pilotée par `--aura-tab-index` / `--aura-tab-count`.
- Nouvelle primitive `.aura-tabbar__pill` (accent-soft + filet interne).
- Drivly : barre du bas refondue — capsule au doigt avec ressort, CTA central
  en squircle 40 px qui dépasse de 6 px, libellés alignés sur une seule ligne.
  Le halo lumineux SVG est retiré (un seul effet porteur).
- `.aura-tabbar` reste à 62 px de haut : la barre gagne en lisibilité sans
  prendre plus de place au contenu.

## 0.1.1 — 2026-11-01

- Corrige `AppBarProps` (conflit de type sur `title` avec `HTMLAttributes`).
- Les snippets PWA sont livrés en `.ts.txt` : ils ne cassent plus le typecheck
  du projet hôte.
- Le CLI n'écrit plus `public/manifest.webmanifest` pour Vite et Next (le
  plugin ou `app/manifest.ts` s'en charge).
- Contraste : `--aura-ink-3` passe à 52 % de luminosité (≥ 4,5:1 sur surface).
- Ajout de `--aura-ink-3` corrigé, `.aura-spinner`, `.aura-skeleton--short`,
  `.aura-appbar--floating`, `.aura-tab__label`.
- Intégration Drivly terminée : coquille, héro, timeline, tab bar, formulaires,
  onboarding, rapports, rappels, PWA.

## 0.1.0 — 2026-11-01

- Première version.
- Tokens clair/sombre, 8 accents.
- 18 primitives React accessibles.
- CLI `init` / `add` / `list` / `theme`.
- PWA : manifest, head, icônes SVG, offline, snippets Vite et Next.
- Skill `aura-mobile`.
- Intégration pilote : Drivly.
