// Service Worker for Push Notifications
const CACHE_NAME = 'expense-tracker-v1';
const urlsToCache = [
  '/'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients immediately
  return self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).catch(() => {
          // Return a fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
      .catch((error) => {
        console.error('Fetch failed:', error);
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: 'Expense Tracker',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png'
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        title: pushData.title || notificationData.title,
        body: pushData.body || pushData.message || notificationData.body,
        icon: pushData.icon || notificationData.icon,
        badge: pushData.badge || notificationData.badge,
        data: pushData.data || {}
      };
    } catch (e) {
      console.error('Error parsing push data:', e);
      // Try to get text data
      try {
        notificationData.body = event.data.text() || notificationData.body;
      } catch (textError) {
        console.error('Error getting text data:', textError);
      }
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.data?.tag || 'expense-tracker',
    data: notificationData.data,
    actions: [
      {
        action: 'view',
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .catch((error) => {
        console.error('Error showing notification:', error);
      })
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Handle notification click
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const notificationData = event.notification.data || {};
        
        // Determine the URL to open based on notification type
        let targetUrl = '/';
        
        if (notificationData.type === 'budget_warning' || notificationData.type === 'budget_exceeded') {
          targetUrl = '/budgets';
        } else if (notificationData.type === 'expense') {
          targetUrl = '/expenses';
        } else if (notificationData.type === 'analytics') {
          targetUrl = '/analytics';
        }

        // Check if there's already a window open
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: notificationData,
              targetUrl: targetUrl
            });
            return;
          }
        }

        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(self.location.origin + targetUrl);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'expense-sync') {
    event.waitUntil(syncExpenses());
  }
});

// Sync expenses when back online
async function syncExpenses() {
  try {
    // Get pending expenses from IndexedDB or localStorage
    const pendingExpenses = await getPendingExpenses();
    
    for (const expense of pendingExpenses) {
      try {
        // Attempt to sync with server
        await fetch('/api/v1/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${expense.token}`
          },
          body: JSON.stringify(expense.data)
        });
        
        // Remove from pending list on success
        await removePendingExpense(expense.id);
      } catch (error) {
        console.error('Failed to sync expense:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for offline storage
async function getPendingExpenses() {
  // Implementation would depend on chosen storage method
  return [];
}

async function removePendingExpense(id) {
  // Implementation would depend on chosen storage method
}

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Always respond to messages to prevent port closure errors
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({ success: true });
  }
});