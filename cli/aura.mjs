#!/usr/bin/env node
/**
 * Aura CLI â€” installe le kit dans un projet, sans build ni dÃ©pendance.
 *
 *   node cli/aura.mjs init --dir ./mon-app --stack vite --name "Mon App"
 *   node cli/aura.mjs add Button,Card,Sheet --dir ./mon-app
 *   node cli/aura.mjs list
 *   node cli/aura.mjs theme 265 --name violet
 */

import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const KIT = path.join(ROOT, "kit")
const VERSION = "0.1.1"

const STACKS = new Set(["vite", "next", "astro", "nuxt", "html"])

function parseArgs(argv) {
  const flags = { _: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith("--")) {
      flags._.push(arg)
      continue
    }
    const [rawKey, inline] = arg.slice(2).split("=")
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    if (inline != null) {
      flags[key] = inline
      continue
    }
    const next = argv[i + 1]
    if (next && !next.startsWith("--")) {
      flags[key] = next
      i += 1
    } else {
      flags[key] = true
    }
  }
  return flags
}

function slug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function log(message) {
  process.stdout.write(`${message}\n`)
}

function fail(message) {
  process.stderr.write(`\n  âœ– ${message}\n\n`)
  process.exit(1)
}

async function copyFile(from, to) {
  await mkdir(path.dirname(to), { recursive: true })
  await cp(from, to, { force: true })
}

async function renderTemplate(from, to, values) {
  let content = await readFile(from, "utf8")
  for (const [key, value] of Object.entries(values)) {
    content = content.replaceAll(`__${key}__`, value)
  }
  await mkdir(path.dirname(to), { recursive: true })
  await writeFile(to, content, "utf8")
}

function auraDir(target, stack) {
  return stack === "html"
    ? path.join(target, "aura")
    : path.join(target, "src", "aura")
}

async function init(flags) {
  const target = path.resolve(flags.dir ?? process.cwd())
  const stack = flags.stack ?? "vite"
  const name = flags.name ?? path.basename(target)
  const force = Boolean(flags.force)
  const theme = flags.theme ?? "#0B1220"
  const accent = flags.accent ?? "teal"

  if (!STACKS.has(stack)) {
    fail(`Stack inconnue Â« ${stack} Â». Valeurs : ${[...STACKS].join(", ")}.`)
  }
  if (!existsSync(target)) {
    fail(`Le dossier cible n'existe pas : ${target}`)
  }

  const dest = auraDir(target, stack)
  if (existsSync(dest) && !force) {
    fail(
      `${path.relative(target, dest)} existe dÃ©jÃ . Utilise --force pour remplacer, ou "add" pour un composant.`,
    )
  }

  await mkdir(dest, { recursive: true })

  // CSS
  await copyFile(path.join(KIT, "aura.css"), path.join(dest, "aura.css"))

  // Composants React
  const reactSource = path.join(KIT, "react")
  const reactDest = path.join(dest, "react")
  await cp(reactSource, reactDest, { recursive: true, force: true })

  // PWA (manifest, head, icÃ´nes)
  const pwaDest = path.join(dest, "pwa")
  await cp(path.join(KIT, "pwa"), pwaDest, { recursive: true, force: true })

  // Manifest personnalisÃ© â€” inutile avec Vite (plugin PWA) ou Next (app/manifest.ts).
  if (stack === "html" || stack === "astro" || stack === "nuxt") {
    const manifestSource = path.join(pwaDest, "manifest.webmanifest")
    if (existsSync(manifestSource)) {
      const publicDir = stack === "html" ? target : path.join(target, "public")
      await renderTemplate(
        manifestSource,
        path.join(publicDir, "manifest.webmanifest"),
        {
          APP_NAME: name,
          SHORT_NAME: name.length > 12 ? name.slice(0, 12) : name,
          SLUG: slug(name),
          THEME_COLOR: theme,
        },
      )
    }
  }

  const usage = `# Aura dans ${name}

## 1. Importer le CSS

\`\`\`ts
import "./aura/aura.css"
\`\`\`

## 2. Envelopper l'application

\`\`\`tsx
import { ThemeProvider, Screen, AppBar, BottomTabs } from "./aura/react"

export function Root() {
  return (
    <ThemeProvider defaultTheme="system" defaultAccent="${accent}">
      <div className="aura-app">
        <div className="aura-frame">
          <AppBar title="${name}" />
          <Screen>{/* Ã©crans */}</Screen>
        </div>
      </div>
    </ThemeProvider>
  )
}
\`\`\`

## 3. PWA

- Manifest : voir \`src/aura/pwa/README.md\` (la config dÃ©pend de la stack).
- IcÃ´nes : \`src/aura/pwa/icons/\` + \`npx @vite-pwa/assets-generator\`.
- Config Vite : voir \`src/aura/pwa/vite-plugin-pwa.snippet.ts.txt\`.
- Config Next : voir \`src/aura/pwa/next-manifest.ts.txt\`.

## RÃ¨gles

1. Jamais de couleur en dur dans un Ã©cran : utiliser les tokens \`--aura-*\`.
2. Une seule carte hÃ©ro par Ã©cran.
3. Cibles tactiles â‰¥ 44 px, safe areas respectÃ©es.
4. \`prefers-reduced-motion\` respectÃ© (dÃ©jÃ  gÃ©rÃ© par le CSS).
`;

  await writeFile(path.join(dest, "README.md"), usage, "utf8")

  log("")
  log(`  Aura ${VERSION} installÃ© dans ${path.relative(process.cwd(), dest) || "."}`)
  log("")
  log("  Fichiers :")
  log(`    ${path.relative(target, path.join(dest, "aura.css"))}`)
  log(`    ${path.relative(target, path.join(dest, "react", "index.ts"))}`)
  if (stack !== "vite" && stack !== "next") {
    log(`    public/manifest.webmanifest`)
  }
  log("")
  log("  Ã€ faire :")
  if (stack === "next") {
    log(`    1. app/layout.tsx  â†’  import "./aura/aura.css"`)
    log(`    2. Copier src/aura/pwa/next-manifest.ts.txt vers app/manifest.ts`)
    log(`    3. Lire src/aura/README.md`)
  } else if (stack === "html") {
    log(`    1. <link rel="stylesheet" href="/aura/aura.css">`)
    log(`    2. <html data-theme="light" data-accent="${accent}">`)
    log(`    3. Lire aura/README.md`)
  } else {
    log(`    1. src/main.tsx (ou App)  â†’  import "./aura/aura.css"`)
    log(`    2. Envelopper dans <ThemeProvider>`)
    log(`    3. Lire src/aura/README.md`)
  }
  log("")
}

async function add(flags) {
  const target = path.resolve(flags.dir ?? process.cwd())
  const stack = flags.stack ?? "vite"
  const dest = auraDir(target, stack)
  const names = (flags._[0] ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)

  if (names.length === 0) fail("Indique au moins un composant : aura add Button,Card")

  if (!existsSync(dest)) {
    fail(`Aura n'est pas installÃ© dans ${target}. Lance d'abord "init".`)
  }

  await copyFile(path.join(KIT, "react", "cn.ts"), path.join(dest, "react", "cn.ts"))
  await copyFile(path.join(KIT, "react", "icons.tsx"), path.join(dest, "react", "icons.tsx"))

  for (const name of names) {
    const file = `${name}.tsx`
    const source = path.join(KIT, "react", file)
    if (!existsSync(source)) fail(`Composant inconnu : ${name}`)
    await copyFile(source, path.join(dest, "react", file))
    log(`  + react/${file}`)
  }
}

async function list() {
  const files = (await readdir(path.join(KIT, "react")))
    .filter((file) => file.endsWith(".tsx") && !file.startsWith("icons"))
    .map((file) => file.replace(/\.tsx$/, ""))
    .sort()
  log("")
  log("  Composants Aura :")
  log(`    ${files.join(", ")}`)
  log("")
}

async function theme(flags) {
  const hue = Number(flags._[0] ?? 230)
  const name = flags.name ?? `custom-${hue}`
  if (!Number.isFinite(hue)) fail("La teinte doit Ãªtre un nombre (0-360).")
  log("")
  log("  Ajoute ce bloc dans ton CSS, aprÃ¨s aura.css :")
  log("")
  log(`  [data-accent="${name}"] {`)
  log(`    --aura-accent-h: ${hue};`)
  log(`    --aura-accent-c: 0.145;`)
  log(`  }`)
  log("")
  log(`  Puis : <html data-accent="${name}">`)
  log("")
}

function help() {
  log(`
  Aura ${VERSION} â€” design system mobile-first

  Usage :
    aura init   --dir <projet> [--stack vite|next|astro|nuxt|html] [--name "Mon App"] [--force]
    aura add    Button,Card,Sheet [--dir <projet>]
    aura list
    aura theme  265 [--name violet]

  Exemples :
    node ${path.relative(process.cwd(), path.join(ROOT, "cli", "aura.mjs"))} init --dir . --stack vite
`)
}

const flags = parseArgs(process.argv.slice(2))
const command = flags._.shift() ?? "help"

try {
  if (command === "init") await init(flags)
  else if (command === "add") await add(flags)
  else if (command === "list") await list()
  else if (command === "theme") await theme(flags)
  else if (command === "version" || command === "--version") log(VERSION)
  else help()
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
