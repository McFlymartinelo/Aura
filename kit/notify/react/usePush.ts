import { useCallback, useEffect, useRef, useState } from "react"
import {
  createPushClient,
  describePushContext,
  pushContextSummary,
  type PushClient,
  type PushClientOptions,
  type PushEnableResult,
  type PushStatus,
  type PushTestResult,
} from "./push"

export interface UsePushOptions extends PushClientOptions {
  /** Lit le statut au montage. Défaut : true. */
  autoRefresh?: boolean
}

export interface UsePushState {
  client: PushClient
  status: PushStatus | null
  /** Vrai pendant la lecture du statut ou une action. */
  loading: boolean
  error: string | null
  /** Message actionnable quand le push est indisponible. */
  hint: string | null
  /** Ligne de diagnostic (iOS 18.6 · écran d’accueil · HTTPS · …). */
  summary: string | null
  refresh: () => Promise<PushStatus | null>
  enable: () => Promise<PushEnableResult>
  disable: () => Promise<void>
  test: () => Promise<PushTestResult | null>
}

/**
 * Enveloppe React de `createPushClient`.
 *
 * Le client est créé une seule fois : `apiBase`, `swUrl` et les chemins sont
 * lus au montage. `getHeaders` est appelé à chaque requête (donc un token qui
 * change est bien pris en compte).
 */
export function usePush(options: UsePushOptions = {}): UsePushState {
  const { autoRefresh = true, ...clientOptions } = options
  const clientRef = useRef<PushClient | null>(null)

  if (clientRef.current === null) {
    clientRef.current = createPushClient(clientOptions)
  }

  const client = clientRef.current as PushClient
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [loading, setLoading] = useState(autoRefresh)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<PushStatus | null> => {
    setLoading(true)
    setError(null)
    try {
      const next = await client.status()
      setStatus(next)
      return next
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de lire l’état des notifications.",
      )
      return null
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    if (autoRefresh) void refresh()
  }, [autoRefresh, refresh])

  const enable = useCallback(async (): Promise<PushEnableResult> => {
    setLoading(true)
    try {
      const result = await client.enable()
      await refresh()
      return result
    } finally {
      setLoading(false)
    }
  }, [client, refresh])

  const disable = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      await client.disable()
      await refresh()
    } finally {
      setLoading(false)
    }
  }, [client, refresh])

  const test = useCallback(async (): Promise<PushTestResult | null> => {
    try {
      return await client.test()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Envoi du test impossible.",
      )
      return null
    }
  }, [client])

  return {
    client,
    status,
    loading,
    error,
    hint: status ? describePushContext(status) : null,
    summary: status ? pushContextSummary(status) : null,
    refresh,
    enable,
    disable,
    test,
  }
}
