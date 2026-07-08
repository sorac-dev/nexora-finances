"use client";

import { useState, useEffect, useCallback } from "react";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window);
    setPermission(("Notification" in window ? Notification.permission : "default") as NotificationPermission);
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return false;
    setLoading(true);
    try {
      // Step 1: Ensure notification permission is granted
      let perm = Notification.permission;
      if (perm === "default") {
        // Not yet asked — request permission first
        perm = await Notification.requestPermission();
        setPermission(perm);
      }
      if (perm === "denied") {
        // User blocked notifications at browser level — can't subscribe
        console.warn("[Push] Permission denied — user must enable in browser settings");
        return false; // caller should show a user-friendly message
      }

      // Step 2: Get SW registration and subscribe
      const reg = await navigator.serviceWorker.ready;
      const vapidPublic = process.env.NEXT_PUBLIC_VAPID_KEY;
      if (!vapidPublic) { console.error("VAPID public key not configured"); return false; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic),
      });

      // Step 3: Save subscription to server
      const res = await fetch("/api/push-subscriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) {
        setSubscribed(true);
        setPermission("granted");
        return true;
      }
      return false;
    } catch (e) {
      console.error("Push subscribe error:", e);
      return false;
    } finally { setLoading(false); }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/push-subscriptions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      }
      setSubscribed(false);
    } catch (e) { console.error("Push unsubscribe error:", e); }
    finally { setLoading(false); }
  }, [supported]);

  // Check if already subscribed on mount
  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, [supported]);

  return { permission, subscribed, loading, supported, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
