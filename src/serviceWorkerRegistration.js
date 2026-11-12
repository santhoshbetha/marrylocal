export default function registerServiceWorker() {
  // Only register service worker in production
  if (!import.meta.env.PROD) {
    return;
  }

  // Check if the serviceWorker Object exists in the navigator object
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                console.log('New service worker available, reloading...');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch(error => {
        console.error('Service worker registration failed:', error);
      });
  }
}

// Utility function to unregister service worker (can be called from browser console)
export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister().then(() => {
          console.log('Service Worker unregistered successfully');
        });
      });
    });
  }
}
