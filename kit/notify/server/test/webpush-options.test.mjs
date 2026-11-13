import assert from "node:assert/strict"
import test from "node:test"
import {
  endpointHost,
  isAppleEndpoint,
  pushSendOptions,
} from "../index.mjs"

const APPLE = "https://web.push.apple.com/QFWBbMP1mYqv4E64TgLoqliT0n3OjQCeR"
const FCM = "https://fcm.googleapis.com/fcm/send/abc:APA91bHm-nB1"

test("endpointHost : hôte ou null", () => {
  assert.equal(endpointHost(APPLE), "web.push.apple.com")
  assert.equal(endpointHost(FCM), "fcm.googleapis.com")
  assert.equal(endpointHost("pas une url"), null)
  assert.equal(endpointHost(null), null)
})

test("isAppleEndpoint : détecte APNs", () => {
  assert.equal(isAppleEndpoint(APPLE), true)
  assert.equal(isAppleEndpoint(FCM), false)
  assert.equal(isAppleEndpoint(null), false)
})

test("pushSendOptions : options par défaut", () => {
  assert.deepEqual(pushSendOptions(), { TTL: 86_400, urgency: "high" })
})

test("pushSendOptions : topic accepté hors Apple", () => {
  assert.deepEqual(pushSendOptions({ topic: "matchday", endpoint: FCM }), {
    TTL: 86_400,
    urgency: "high",
    topic: "matchday",
  })
})

test("pushSendOptions : topic retiré pour Apple (limite de 16 caractères)", () => {
  const options = pushSendOptions({
    topic: "matchday-reminder",
    endpoint: APPLE,
  })
  assert.deepEqual(options, { TTL: 86_400, urgency: "high" })
  assert.equal("topic" in options, false)
})

test("pushSendOptions : topic invalide rejeté", () => {
  assert.throws(
    () => pushSendOptions({ topic: "topic avec espaces" }),
    /topic invalide/,
  )
  assert.throws(
    () => pushSendOptions({ topic: "x".repeat(33) }),
    /topic invalide/,
  )
})
