/**
 * Envoi Web Push via `web-push` (dépendance optionnelle de l'application hôte).
 *
 *   const sender = await createWebPushSender({
 *     publicKey: process.env.VAPID_PUBLIC_KEY,
 *     privateKey: process.env.VAPID_PRIVATE_KEY,
 *     subject: "mailto:admin@exemple.fr",
 *   })
 */

const APPLE_PUSH_HOST = "web.push.apple.com"
const TOPIC_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

/** Hôte d'un endpoint push (`null` si l'URL est invalide). */
export function endpointHost(endpoint) {
  try {
    return new URL(String(endpoint)).host
  } catch {
    return null
  }
}

/** Vrai pour un endpoint APNs (Safari / PWA iPhone, iPad, Mac). */
export function isAppleEndpoint(endpoint) {
  const host = endpointHost(endpoint)
  return host === APPLE_PUSH_HOST || Boolean(host?.endsWith(`.${APPLE_PUSH_HOST}`))
}

/**
 * Options d'envoi compatibles avec tous les services.
 *
 * Piège Apple : `web.push.apple.com` renvoie `400 BadWebPushTopic` dès que
 * l'en-tête `Topic` dépasse **16 caractères** (le RFC 8030 en autorise 32).
 * On ne l'envoie donc jamais à Apple ; ailleurs il reste utile pour remplacer
 * une notification non délivrée portant le même topic.
 */
export function pushSendOptions({
  ttl = 86_400,
  urgency = "high",
  topic = null,
  endpoint = null,
} = {}) {
  const options = { TTL: ttl, urgency }

  if (topic != null) {
    const value = String(topic)
    if (!TOPIC_PATTERN.test(value)) {
      throw new Error(
        "pushSendOptions : topic invalide (1 à 32 caractères [A-Za-z0-9_-]).",
      )
    }
    if (!isAppleEndpoint(endpoint)) options.topic = value
  }

  return options
}

export async function createWebPushSender({
  publicKey,
  privateKey,
  subject = "mailto:admin@example.com",
  ttl = 86_400,
  urgency = "high",
  topic = null,
} = {}) {
  if (!publicKey || !privateKey) {
    throw new Error("createWebPushSender : clés VAPID manquantes")
  }

  let webpush
  try {
    const module = await import("web-push")
    webpush = module.default ?? module
  } catch {
    throw new Error(
      "createWebPushSender : installe « web-push » dans l'application hôte.",
    )
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  return {
    async send(subscription, payload) {
      const options = pushSendOptions({
        ttl,
        urgency,
        topic,
        endpoint: subscription.endpoint,
      })

      try {
        return await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
          options,
        )
      } catch (error) {
        if (error && typeof error === "object") {
          error.host = endpointHost(subscription.endpoint)
        }
        throw error
      }
    },
  }
}

/** Génère une paire VAPID (à faire une fois, puis mettre dans .env). */
export async function generateVapidKeys() {
  let webpush
  try {
    const module = await import("web-push")
    webpush = module.default ?? module
  } catch {
    throw new Error("generateVapidKeys : installe « web-push » d'abord.")
  }
  return webpush.generateVAPIDKeys()
}
