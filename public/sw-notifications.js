/// <reference lib="webworker" />

// Service Worker for DEX ERP — handles notification display in background tabs
// and notification click routing.

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

// Show notification when the app posts a message
sw.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, url } = event.data;
        sw.registration.showNotification(title, {
            body: body || '',
            icon: '/images/logo.png',
            badge: '/images/logo.png',
            tag: 'dex-notification-' + Date.now(),
            data: { url: url || '/' },
            requireInteraction: false,
            silent: false,
        });
    }
});

// Handle notification click — focus existing tab or open new one
sw.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Try to focus an existing tab
            for (const client of clients) {
                if (client.url.includes(sw.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // No existing tab — open a new one
            return sw.clients.openWindow(targetUrl);
        })
    );
});

// Activate immediately (skip waiting)
sw.addEventListener('install', () => sw.skipWaiting());
sw.addEventListener('activate', (event) => event.waitUntil(sw.clients.claim()));
