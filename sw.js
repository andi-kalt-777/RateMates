// Ersetzt den alten RateMates-Service-Worker: löscht seine Zwischenspeicher,
// meldet sich ab und lädt offene Fenster neu, damit sie zur neuen Adresse weiterleiten.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
