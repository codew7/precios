// filepath: vscode-vfs://github/codew7/PriceDisplay/service-worker.js
const CACHE_NAME = "price-display-cache-v2";
const IMAGES_CACHE_NAME = "price-display-images-v2";
const urlsToCache = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./logo.png",
  "./icon-192x192.png",
  "./icon-512x512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  
  // Cachear imágenes de productos (drive.google.com o cualquier imagen)
  if (event.request.destination === 'image' || 
      url.hostname.includes('drive.google.com') ||
      url.hostname.includes('googleusercontent.com')) {
    
    event.respondWith(
      caches.open(IMAGES_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            return response;
          }
          
          return fetch(event.request).then(fetchResponse => {
            // Cachear solo respuestas válidas
            if (fetchResponse && fetchResponse.status === 200) {
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => {
            // Retornar imagen placeholder si falla la descarga
            return response;
          });
        });
      })
    );
  } else {
    // Para otros recursos, usar la estrategia normal
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});

// Manejar mensajes para actualizar la caché de imágenes
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_IMAGES') {
    event.waitUntil(
      cacheAllImages(event.data.imageUrls).then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch(error => {
        event.ports[0].postMessage({ success: false, error: error.message });
      })
    );
  } else if (event.data && event.data.type === 'CLEAR_IMAGE_CACHE') {
    event.waitUntil(
      caches.delete(IMAGES_CACHE_NAME).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});

// Función para cachear todas las imágenes
async function cacheAllImages(imageUrls) {
  const cache = await caches.open(IMAGES_CACHE_NAME);
  const promises = imageUrls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (response && response.status === 200) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.log('Error caching image:', url, error);
    }
  });
  
  await Promise.all(promises);
}