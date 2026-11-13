/**
 * Push Web (VAPID) côté client.
 *
 * Le serveur expose :
 *   GET  {apiBase}/push/vapid        -> { configured, publicKey }
 *   POST {apiBase}/push/subscribe    -> { ok }
 *   POST {apiBase}/push/unsubscribe  -> { ok }
 *   POST {apiBase}/push/test         -> { sent, failed, skipped }
 *
 * Sur iPhone, le push n'existe que dans la PWA installée (iOS 16.4+).
 */

export type PushReason =
  | "ok"
  | "ios-install"
  | "ios-outdated"
  | "insecure"
  | "unsupported"

export interface IosVersion {
  major: number
  minor: number
}

export interface PushContext {
  ios: boolean
  standalone: boolean
  /** Contexte sécurisé (HTTPS ou localhost). */
  secure: boolean
  iosVersion: IosVersion | null
  /** Push + Notification disponibles dans un contexte sécurisé. */
  supported: boolean
  hasPush: boolean
  hasNotification: boolean
  needsInstall: boolean
  permission: NotificationPermission | "unsupported"
  /** Cause exacte quand le push n'est pas disponible. */
  reason: PushReason
}

export interface PushStatus extends PushContext {
  enabled: boolean
  subscribed: boolean
  vapidConfigured: boolean
}

export interface PushEnableResult {
  ok: boolean
  reason?:
    | PushReason
    | "vapid"
    | "denied"
    | "error"
  error?: string
}

export interface PushClientOptions {
  /** Base de l'API, par défaut `/api`. */
  apiBase?: string
  /** URL du service worker généré par la PWA. */
  swUrl?: string
  /** En-têtes additionnels (Authorization pour une session). */
  getHeaders?: () => Record<string, string>
  subscribePath?: string
  unsubscribePath?: string
  vapidPath?: string
  testPath?: string
  storageKey?: string
  fetch?: typeof fetch
}

export interface PushTestResult {
  sent: number
  failed?: number
  skipped?: boolean
  reason?: string
}

export interface PushClient {
  context: () => PushContext
  status: () => Promise<PushStatus>
  enable: () => Promise<PushEnableResult>
  disable: () => Promise<void>
  sync: () => Promise<void>
  test: () => Promise<PushTestResult>
  showLocal: (title: string, body: string, url?: string) => Promise<boolean>
  isEnabled: () => boolean
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index)
  }
  return bytes
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isSecure(): boolean {
  if (typeof window === "undefined") return true
  return window.isSecureContext !== false
}

function parseIosVersion(): IosVersion | null {
  if (typeof navigator === "undefined") return null
  const match = navigator.userAgent.match(/OS (\d+)[_.](\d+)/)
  if (!match) return null
  return { major: Number(match[1]), minor: Number(match[2]) }
}

export function formatIosVersion(version: IosVersion | null): string | null {
  return version ? `${version.major}.${version.minor}` : null
}

/** Message actionnable expliquant pourquoi le push est indisponible. */
export function describePushContext(context: PushContext): string | null {
  const version = formatIosVersion(context.iosVersion)

  switch (context.reason) {
    case "insecure":
      return "Les push exigent HTTPS : ouvre l’app depuis son adresse https:// (pas une IP locale)."
    case "ios-install":
      return "Sur iPhone, Safari ne gère pas les push. Ajoute l’app à l’écran d’accueil (Partager → Sur l’écran d’accueil), puis ouvre-la depuis l’icône."
    case "ios-outdated":
      return `Les push iPhone demandent iOS 16.4 ou plus${version ? ` (ton iPhone : iOS ${version})` : ""}. Mets à jour iOS dans Réglages → Général → Mise à jour logicielle.`
    case "unsupported":
      return context.ios
        ? "L’app ne reçoit pas encore les push. Ferme-la complètement, rouvre-la depuis l’icône de l’écran d’accueil, puis réessaie."
        : "Ce navigateur ne gère pas les push. Utilise Chrome, Edge, Firefox ou Safari à jour."
    default:
      return null
  }
}

/** Ligne de diagnostic courte, à afficher dans les réglages. */
export function pushContextSummary(context: PushContext): string {
  return [
    context.ios ? `iOS ${formatIosVersion(context.iosVersion) ?? "?"}` : "hors iOS",
    context.standalone ? "écran d’accueil" : "navigateur",
    context.secure ? "HTTPS" : "HTTP",
    context.supported ? "Push API ok" : "Push API absente",
  ].join(" · ")
}

function keyMatches(
  subscription: PushSubscription,
  publicKey: string,
): boolean {
  const actual = subscription.options?.applicationServerKey
  if (!actual) return true
  const expected = urlBase64ToUint8Array(publicKey)
  const bytes = new Uint8Array(actual)
  if (bytes.length !== expected.length) return false
  return bytes.every((value, index) => value === expected[index])
}

export function createPushClient(
  options: PushClientOptions = {},
): PushClient {
  const apiBase = (options.apiBase ?? "/api").replace(/\/+$/, "")
  const swUrl = options.swUrl ?? "/sw.js"
  const subscribePath = options.subscribePath ?? "/push/subscribe"
  const unsubscribePath = options.unsubscribePath ?? "/push/unsubscribe"
  const vapidPath = options.vapidPath ?? "/push/vapid"
  const testPath = options.testPath ?? "/push/test"
  const storageKey = options.storageKey ?? "aura_push_enabled"
  const getHeaders = options.getHeaders ?? (() => ({}))
  const doFetch = options.fetch ?? globalThis.fetch

  function context(): PushContext {
    const hasPush =
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      typeof window !== "undefined" &&
      "PushManager" in window
    const hasNotification =
      typeof window !== "undefined" && "Notification" in window
    const permission: NotificationPermission | "unsupported" =
      typeof Notification === "undefined"
        ? "unsupported"
        : Notification.permission
    const ios = isIosDevice()
    const standalone = isStandalone()
    const secure = isSecure()
    const iosVersion = ios ? parseIosVersion() : null
    const supported = secure && hasPush && hasNotification
    const needsInstall = ios && !standalone

    let reason: PushReason = "ok"
    if (!secure) {
      reason = "insecure"
    } else if (ios && !standalone) {
      reason = "ios-install"
    } else if (
      ios &&
      iosVersion &&
      (iosVersion.major < 16 ||
        (iosVersion.major === 16 && iosVersion.minor < 4))
    ) {
      reason = "ios-outdated"
    } else if (!supported) {
      reason = "unsupported"
    }

    return {
      ios,
      standalone,
      secure,
      iosVersion,
      supported,
      hasPush,
      hasNotification,
      needsInstall,
      permission,
      reason,
    }
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await doFetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...getHeaders(),
        ...((init.headers as Record<string, string> | undefined) ?? {}),
      },
    })

    const data = (await response.json().catch(() => ({}))) as
      | { error?: string }
      | T
    if (!response.ok) {
      throw new Error(
        (data as { error?: string }).error ?? `Erreur ${response.status}`,
      )
    }
    return data as T
  }

  async function registration(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration("/")
    if (existing) {
      await navigator.serviceWorker.ready
      return existing
    }
    const reg = await navigator.serviceWorker.register(swUrl)
    await navigator.serviceWorker.ready
    return reg
  }

  async function vapid(): Promise<{ configured: boolean; publicKey?: string }> {
    return request(vapidPath)
  }

  async function ensureSubscription(
    reg: ServiceWorkerRegistration,
    publicKey: string,
  ): Promise<PushSubscription> {
    let subscription = await reg.pushManager.getSubscription()
    if (!subscription || !keyMatches(subscription, publicKey)) {
      if (subscription) await subscription.unsubscribe()
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })
    }
    return subscription
  }

  function isEnabled(): boolean {
    if (typeof localStorage === "undefined") return false
    return localStorage.getItem(storageKey) === "1"
  }

  async function status(): Promise<PushStatus> {
    const ctx = context()
    let subscribed = false
    let vapidConfigured = false

    if (ctx.supported && ctx.permission === "granted") {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/")
        subscribed = Boolean(await reg?.pushManager?.getSubscription())
      } catch {
        subscribed = false
      }
    }

    try {
      vapidConfigured = Boolean((await vapid()).configured)
    } catch {
      vapidConfigured = false
    }

    return { ...ctx, enabled: isEnabled(), subscribed, vapidConfigured }
  }

  async function enable(): Promise<PushEnableResult> {
    const ctx = context()
    if (ctx.reason !== "ok") return { ok: false, reason: ctx.reason }

    try {
      const keys = await vapid()
      if (!keys.configured || !keys.publicKey) {
        return { ok: false, reason: "vapid" }
      }

      const permission = await Notification.requestPermission()
      if (permission !== "granted") return { ok: false, reason: "denied" }

      const reg = await registration()
      const subscription = await ensureSubscription(reg, keys.publicKey)

      await request(subscribePath, {
        method: "POST",
        body: JSON.stringify(subscription.toJSON()),
      })

      localStorage.setItem(storageKey, "1")
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        reason: "error",
        error:
          error instanceof Error ? error.message : "Abonnement refusé.",
      }
    }
  }

  async function disable(): Promise<void> {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/")
      const subscription = await reg?.pushManager?.getSubscription()
      if (subscription) {
        await request(unsubscribePath, {
          method: "POST",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
    } catch {
      // On désactive quand même côté client.
    } finally {
      localStorage.removeItem(storageKey)
    }
  }

  async function sync(): Promise<void> {
    if (!isEnabled()) return
    const ctx = context()
    // Sur iPhone hors PWA ou iOS trop ancien : on garde le réglage, rien à
    // synchroniser. Il reprendra quand l’app sera ouverte au bon endroit.
    if (ctx.reason === "ios-install" || ctx.reason === "ios-outdated") return
    if (ctx.reason !== "ok" || ctx.permission !== "granted") {
      localStorage.removeItem(storageKey)
      return
    }

    try {
      const keys = await vapid()
      if (!keys.configured || !keys.publicKey) return
      const reg = await registration()
      const subscription = await ensureSubscription(reg, keys.publicKey)
      await request(subscribePath, {
        method: "POST",
        body: JSON.stringify({ ...subscription.toJSON(), quiet: true }),
      })
    } catch {
      // Silencieux : la prochaine ouverture réessaiera.
    }
  }

  async function test(): Promise<PushTestResult> {
    return request(testPath, { method: "POST" })
  }

  async function showLocal(
    title: string,
    body: string,
    url = "/",
  ): Promise<boolean> {
    if (typeof Notification === "undefined") return false
    if (Notification.permission !== "granted") return false

    try {
      const reg = await registration()
      await reg.showNotification(title, {
        body,
        tag: `aura-local-${Date.now()}`,
        data: { url },
      })
      return true
    } catch {
      return false
    }
  }

  return {
    context,
    status,
    enable,
    disable,
    sync,
    test,
    showLocal,
    isEnabled,
  }
}
