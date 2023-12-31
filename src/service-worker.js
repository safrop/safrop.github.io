/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') return false;
    if (url.pathname.startsWith('/_')) return false;
    if (url.pathname.match(fileExtensionRegexp)) return false;
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);
registerRoute(({ url }) => url.origin === self.location.origin && url.pathname.endsWith('.png'), new StaleWhileRevalidate({ cacheName: 'images', plugins: [new ExpirationPlugin({ maxEntries: 50 })] }));
self.addEventListener('message', (event) => event.data && event.data.type === 'SKIP_WAITING' && self.skipWaiting())
self.addEventListener('fetch', e => {
  if (e.request.method !== "POST") {
    e.respondWith(fetch(e.request));
    return;
  } else {
    switch (new URL(e.request.url).pathname) {
      case '/share':
        e.waitUntil((async () => await self.clients.get(e.resultingClientId).then(c => e.request.formData().then((f) => c.postMessage({ files: f.getAll('image') }))))());
        return e.respondWith(Response.redirect('/'));
      default:
        return
    }
  }
});
