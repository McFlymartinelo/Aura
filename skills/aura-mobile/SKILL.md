---
name: aura-mobile
description: Construire ou refondre une application web mobile / PWA avec le design system Aura (tokens, composants React, motion, manifest). À utiliser dès qu'on parle de PWA, d'app mobile web, de refonte visuelle, de design system, de bottom sheet, de tab bar, de "rendre ça plus joli", ou de cohérence UI entre plusieurs projets.
license: MIT
compatibility: opencode, claude-code
metadata:
  version: "0.1.0"
  framework: aura
---

# Aura — design system mobile-first

Aura vit dans `C:\Users\alex-\Workspace\Perso\Aura`. C'est un kit **copy-in** :
on copie `src/aura/` dans le projet, puis on personnalise. Aucun package npm.

## Quand l'utiliser

- Nouvelle app web mobile ou PWA.
- Refonte / « polish » d'une interface existante.
- Ajout d'un shell mobile (app bar, tab bar, bottom sheet).
- Besoin de cohérence entre plusieurs projets (Drivly, MartyVTC, Matchday…).
- Mise en place du manifest, des icônes, du mode hors ligne.

## Procédure

### 1. Inspecter avant de toucher

- Lire `package.json` (framework, React, Tailwind, PWA).
- Lire le CSS global et 2–3 écrans représentatifs.
- Identifier les tokens existants et les couleurs codées en dur.
- Vérifier `git status` : ne jamais écraser du travail non commité.

### 2. Choisir une direction (une seule)

Lire `Aura/DESIGN.md` :

- **Paper / editorial** : chaleureux, typographie forte.
- **Precision / instrument** : dense, chiffres tabulaires, accent technique.
- **Soft / lifestyle** : rond, lumineux, photos.

Annoncer la direction en une phrase avant de coder.

### 3. Installer le kit

```bash
node C:\Users\alex-\Workspace\Perso\Aura\cli\aura.mjs init \
  --dir <projet> --stack vite|next|astro|nuxt|html --name "<Nom>"
```

Si `src/aura` existe déjà, utiliser `add` pour un composant :

```bash
node C:\Users\alex-\Workspace\Perso\Aura\cli\aura.mjs add Sheet,Segmented --dir <projet>
```

### 4. Brancher les tokens

1. Importer `aura.css` **avant** les styles de l'app.
2. Mapper les anciens tokens sur les nouveaux (`--color-app` → `--aura-bg`, etc.).
3. Passer `data-theme` / `data-accent` sur `<html>`.
4. Remplacer les couleurs en dur par des tokens, écran par écran.

### 5. Construire avec les primitives

```tsx
import {
  AppBar, BottomTabs, Button, Card, Screen, Sheet, Stat,
} from "./aura/react"
```

Règles :

- Une seule `Card variant="hero"` par écran.
- Un seul accent. Les états utilisent `--aura-success/warn/danger`.
- Cibles ≥ 44 px, safe areas (`env(safe-area-inset-*)`).
- `Sheet` pour les actions secondaires, pas une nouvelle route.
- `withViewTransition` pour les changements d'écran.
- Pas de couleur hexadécimale dans un écran.

### 6. PWA

- `public/manifest.webmanifest` (copié par le CLI).
- Icônes : `npx @vite-pwa/assets-generator --preset minimal public/aura-icon.svg`.
- Vite : `kit/pwa/vite-plugin-pwa.snippet.ts.txt`.
- Next : `kit/pwa/next-manifest.ts.txt` + `@serwist/next`.
- `PwaInstallCard` sur l'accueil, jamais en overlay bloquant.
- Tester en mode avion après installation.

### 7. Vérifier

```bash
npm run build
npm run typecheck   # si présent
npm test            # si présent
```

Puis dans le navigateur :

- 360 px, 390 px, 430 px, desktop.
- Clavier : focus visible, Échap ferme les sheets.
- Lighthouse : PWA installable, contraste.
- `prefers-reduced-motion`.

## Règles dures

1. Ne jamais réécrire un écran entier sans avoir lu son code.
2. Ne pas introduire de dépendance UI (shadcn, MUI…) en plus d'Aura.
3. Ne pas changer la logique métier en même temps que le style.
4. Ne pas mettre de glassmorphism sur du contenu.
5. Ne pas utiliser plus de 2 polices.
6. Ne pas livrer sans build vert.
7. Si un composant manque, l'ajouter à `Aura/kit/react` **et** au projet.

## Références

- `Aura/README.md` — installation, composants, check-list.
- `Aura/DESIGN.md` — direction artistique, anti-patterns.
- `Aura/kit/aura.css` — tokens et classes.
- `Aura/kit/pwa/README.md` — check-list PWA.
