import { ASTRO_CONFIG } from "@/config/astro-config";
import { loadMatchPreferences } from "@/lib/match-settings";
import type { PushPlatform } from "@/types/match";

const API_URL = process.env.NEXT_PUBLIC_INSFORGE_API_URL ?? "/api/insforge";
const PROJECT_ID = ASTRO_CONFIG.project.id;
const SW_PATH = "/match/sw.js";
const SCOPE = "/match/";

export async function registerMatchServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: SCOPE });
  } catch {
    return null;
  }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function showSystemNotification(
  title: string,
  body: string,
  options?: { tag?: string; url?: string }
): void {
  if (!loadMatchPreferences().push) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  const notification = new Notification(title, {
    body,
    icon: "/astro/logo-icon.png",
    badge: "/astro/logo-icon.png",
    tag: options?.tag,
    data: { url: options?.url },
  });

  notification.onclick = () => {
    window.focus();
    if (options?.url) window.location.href = options.url;
    notification.close();
  };
}

export async function notifyViaServiceWorker(
  title: string,
  body: string,
  url?: string
): Promise<void> {
  if (!loadMatchPreferences().push) return;
  const reg = await navigator.serviceWorker?.getRegistration(SCOPE);
  if (reg?.active) {
    reg.active.postMessage({ type: "SHOW_NOTIFICATION", title, body, url });
    return;
  }
  showSystemNotification(title, body, { url, tag: title });
}

export async function savePushToken(
  userId: string,
  token: string,
  platform: PushPlatform
): Promise<void> {
  try {
    await fetch(`${API_URL}/match_push_tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([
        {
          id: `${userId}-${platform}-${token.slice(0, 24)}`,
          project_id: PROJECT_ID,
          user_id: userId,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
      ]),
    });
  } catch {
    /* optional cloud sync */
  }
}

export async function subscribeWebPush(userId: string): Promise<boolean> {
  const permission = await requestPushPermission();
  if (permission !== "granted") return false;

  const reg = await registerMatchServiceWorker();
  if (!reg) return false;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (vapidKey && "pushManager" in reg) {
    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await savePushToken(userId, JSON.stringify(sub), "web");
      return true;
    } catch {
      /* fall through */
    }
  }

  await savePushToken(userId, `web-${userId}-${Date.now()}`, "web");
  return true;
}

export async function initNativePush(userId: string): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;

    await PushNotifications.register();
    PushNotifications.addListener("registration", (token) => {
      const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
      void savePushToken(userId, token.value, platform);
    });
  } catch {
    /* plugin optional */
  }
}

function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64Safe);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
}
