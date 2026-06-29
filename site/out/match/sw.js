/* ASTRO Match — service worker */
const CACHE = "astro-match-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "SHOW_NOTIFICATION") return;
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/astro/logo-icon.png",
      badge: "/astro/logo-icon.png",
      data: { url: data.url },
      tag: data.title,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/match/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if (url && "navigate" in client) client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "ASTRO Match", body: "Nueva actividad" };
  try {
    payload = event.data?.json() ?? payload;
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/astro/logo-icon.png",
    })
  );
});
