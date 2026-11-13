import { useState } from "react"
import { Badge, Button, Card } from "../../react"
import type { BadgeTone } from "../../react"
import { usePush, type UsePushOptions } from "./usePush"
import type { PushEnableResult, PushStatus } from "./push"

export interface PushCardProps extends UsePushOptions {
  appName?: string
  title?: string
  description?: string
  /** Affiche la ligne de diagnostic (iOS, standalone, HTTPS, API). */
  showDiagnostics?: boolean
  className?: string
  onEnabled?: () => void
  onDisabled?: () => void
}

function badgeFor(status: PushStatus | null): {
  label: string
  tone: BadgeTone
} {
  if (!status) return { label: "Vérification…", tone: "neutral" }
  if (status.reason !== "ok") return { label: "Indisponible", tone: "warn" }
  if (status.permission === "denied") return { label: "Refusées", tone: "danger" }
  if (status.enabled && status.subscribed) {
    return { label: "Activées", tone: "success" }
  }
  if (status.subscribed) return { label: "Abonné", tone: "accent" }
  return { label: "Désactivées", tone: "neutral" }
}

function enableFailureLabel(result: PushEnableResult): string {
  switch (result.reason) {
    case "vapid":
      return "Serveur push non configuré : clés VAPID manquantes."
    case "denied":
      return "Permission refusée. Autorise les notifications dans les réglages du système."
    case "insecure":
      return "Les push exigent HTTPS."
    case "ios-outdated":
      return "iOS 16.4 ou plus est requis."
    case "ios-install":
      return "Installe l’app sur l’écran d’accueil d’abord."
    case "unsupported":
      return "Ce navigateur ne gère pas les push."
    default:
      return result.error ?? "Abonnement push impossible."
  }
}

/**
 * Carte de réglages « Notifications push » prête à poser dans un écran de
 * préférences. Gère l’activation, le test, la désactivation et le diagnostic
 * iOS / HTTPS / navigateur.
 */
export function PushCard({
  appName = "cette application",
  title = "Notifications",
  description = "Rappels et alertes, même quand l’app est fermée.",
  showDiagnostics = true,
  className,
  onEnabled,
  onDisabled,
  ...pushOptions
}: PushCardProps) {
  const {
    status,
    loading,
    error,
    hint,
    summary,
    enable,
    disable,
    test,
    refresh,
  } = usePush(pushOptions)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState<"enable" | "disable" | "test" | null>(null)

  const badge = badgeFor(status)
  const unavailable = status != null && status.reason !== "ok"
  const enabled = Boolean(status?.enabled && status?.subscribed)

  async function handleEnable() {
    setBusy("enable")
    setFeedback(null)
    const result = await enable()
    setFeedback(result.ok ? "Notifications activées." : enableFailureLabel(result))
    if (result.ok) onEnabled?.()
    setBusy(null)
  }

  async function handleDisable() {
    setBusy("disable")
    setFeedback(null)
    await disable()
    setFeedback("Notifications désactivées.")
    onDisabled?.()
    setBusy(null)
  }

  async function handleTest() {
    setBusy("test")
    setFeedback(null)
    const result = await test()
    if (!result) {
      setFeedback("Envoi du test impossible.")
    } else if (result.sent > 0) {
      setFeedback("Notification test envoyée.")
    } else if (result.skipped) {
      setFeedback(result.reason ?? "Aucun abonnement actif.")
    } else {
      setFeedback("Push non délivré. Réactive les notifications.")
    }
    setBusy(null)
  }

  return (
    <Card variant="soft" className={className}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div className="aura-empty__icon" style={{ width: 44, height: 44 }}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
            <path d="M10.3 21a2 2 0 0 0 3.4 0" />
          </svg>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p className="aura-h3">{title}</p>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
          <p className="aura-small" style={{ marginTop: 2 }}>
            {description}
          </p>
          <p className="aura-hint" style={{ marginTop: 6 }}>
            {appName}
          </p>
          {hint && (
            <p
              className="aura-hint"
              style={{ marginTop: 8, color: "var(--aura-warn)" }}
            >
              {hint}
            </p>
          )}
          {showDiagnostics && summary && (
            <p className="aura-hint" style={{ marginTop: 6 }}>
              Contexte : {summary}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {unavailable ? (
          <Button
            size="sm"
            variant="ghost"
            loading={loading}
            onClick={() => void refresh()}
          >
            Revérifier
          </Button>
        ) : enabled ? (
          <>
            <Button
              size="sm"
              variant="soft"
              loading={busy === "test"}
              onClick={() => void handleTest()}
            >
              Tester
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={busy === "disable"}
              onClick={() => void handleDisable()}
            >
              Désactiver
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            loading={busy === "enable" || loading}
            onClick={() => void handleEnable()}
          >
            Activer
          </Button>
        )}
      </div>

      <p
        className="aura-hint"
        aria-live="polite"
        style={{ marginTop: 8, minHeight: 16 }}
      >
        {error ?? feedback ?? ""}
      </p>
    </Card>
  )
}
