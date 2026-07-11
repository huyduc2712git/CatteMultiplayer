// Simple Service Worker to satisfy Chrome PWA installation requirements
const CACHE_NAME = 'catte-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let browser handle fetch normally
  return;
});
