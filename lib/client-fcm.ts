// lib/client-fcm.ts
import { getToken } from "firebase/messaging";
import { messaging } from "./firebase-client";

export async function subscribeTopic(topic: string) {
  if (!messaging) throw new Error("Messaging not supported on this browser.");

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "";

  const res = await fetch(`${baseUrl}/api/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, topics: [topic] }),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function subscribeSymbol(symbol: string) {
  return subscribeTopic(`sym-${symbol}`);
}



