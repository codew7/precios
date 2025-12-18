// ========== SISTEMA DE GEOLOCALIZACIÓN ==========
const LOCATION_CONFIG = {
  // IMPORTANTE: Reemplaza estas coordenadas con las de tu showroom
  // Para obtenerlas: abre Google Maps, click derecho en tu ubicación -> "¿Qué hay aquí?"
  latitude: -34.5331,    // Ejemplo: Buenos Aires
  longitude: -58.5115,   // Ejemplo: Buenos Aires
  radius: 200,           // Radio en metros (100m = 1 cuadra aprox)
  sessionDuration: 8 * 60 * 60 * 1000,  // 8 horas
  maxSessionTime: 60 * 60 * 1000  // 60 minutos antes de cerrar
};

// Elementos del DOM para bloqueo
const accessBlock = document.getElementById('accessBlock');
const blockMessage = document.getElementById('blockMessage');

// Timer para cerrar la página
let autoCloseTimer = null;

// Verificar acceso al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  validateAccess();
});

// Función principal de validación
function validateAccess() {
  // Verificar si hay una sesión válida
  const session = localStorage.getItem('showroomSession');
  
  if (session) {
    const sessionData = JSON.parse(session);
    const sessionAge = Date.now() - sessionData.timestamp;
    
    if (sessionAge < LOCATION_CONFIG.sessionDuration) {
      // Sesión válida, permitir acceso
      allowAccess();
      return;
    }
  }
  
  // No hay sesión válida, solicitar ubicación
  requestLocationAccess();
}

// Solicitar acceso a la ubicación
function requestLocationAccess() {
  if (!navigator.geolocation) {
    blockAccess('Tu dispositivo no soporta geolocalización.');
    return;
  }

  blockMessage.innerHTML = '<div class="spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: #fff;"></div><br>Verificando ubicación...';
  accessBlock.classList.add('active');

  navigator.geolocation.getCurrentPosition(
    handleLocationSuccess,
    handleLocationError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

// Manejar éxito en obtener ubicación
function handleLocationSuccess(position) {
  const userLat = position.coords.latitude;
  const userLng = position.coords.longitude;
  const accuracy = position.coords.accuracy;

  // Calcular distancia al showroom
  const distance = calculateDistance(
    userLat,
    userLng,
    LOCATION_CONFIG.latitude,
    LOCATION_CONFIG.longitude
  );

  console.log(`Distancia al showroom: ${distance.toFixed(2)}m (precisión: ${accuracy.toFixed(2)}m)`);

  // Verificar si está dentro del radio permitido
  if (distance <= LOCATION_CONFIG.radius) {
    // Crear sesión válida
    localStorage.setItem('showroomSession', JSON.stringify({
      timestamp: Date.now(),
      location: { lat: userLat, lng: userLng }
    }));
    
    allowAccess();
  } else {
    blockAccess(
      `Esta aplicación solo está disponible en nuestro showroom.<br><br>` +
      `<small style="opacity: 0.8;">Distancia: ${distance.toFixed(0)}m del showroom</small>`
    );
  }
}

// Manejar error en obtener ubicación
function handleLocationError(error) {
  let message = '';
  let showSettingsButton = false;
  
  switch(error.code) {
    case error.PERMISSION_DENIED:
      message = 'Debes permitir el acceso a tu ubicación para usar esta aplicación.';
      showSettingsButton = true;
      break;
    case error.POSITION_UNAVAILABLE:
      message = 'No se pudo obtener tu ubicación.<br><br>' +
               '<small>Asegúrate de tener el GPS activado</small>';
      break;
    case error.TIMEOUT:
      message = 'Tiempo de espera agotado al obtener ubicación.<br><br>' +
               '<small>Intenta de nuevo</small>';
      break;
    default:
      message = 'Error desconocido al obtener ubicación.';
  }
  
  blockAccess(message, showSettingsButton);
}

// Calcular distancia entre dos puntos (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}

// Permitir acceso a la aplicación
function allowAccess() {
  accessBlock.classList.remove('active');
  
  // Iniciar timer de cierre automático
  startAutoCloseTimer();
  
  // Continuar con la carga normal de la aplicación
  if (!navigator.onLine) {
    document.body.classList.add('offline');
    showStatus('Sin conexión a Internet', 'empty');
  } else if (allData.length === 0) {
    loadData();
  }
}

// Bloquear acceso a la aplicación
function blockAccess(message, showSettingsButton = false) {
  blockMessage.innerHTML = message;
  accessBlock.classList.add('active');
  
  const buttonContainer = document.getElementById('buttonContainer');
  const helpText = document.getElementById('helpText');
  
  // Restaurar botón de reintentar
  buttonContainer.innerHTML = '<button onclick="retryLocationCheck()">Reintentar</button>';
  
  // Agregar botón de configuración si es necesario
  if (showSettingsButton) {
    buttonContainer.innerHTML += '<button class="secondary" onclick="openLocationSettings()">⚙️ Ir a Configuración</button>';
    
    // Mostrar texto de ayuda
    helpText.style.display = 'block';
    helpText.innerHTML = getSettingsInstructions();
  } else {
    helpText.style.display = 'none';
  }
}

// Reintentar verificación de ubicación
function retryLocationCheck() {
  requestLocationAccess();
}

// Abrir configuración de ubicación
function openLocationSettings() {
  const userAgent = navigator.userAgent.toLowerCase();
  const url = window.location.href;
  
  // Detectar navegador y sistema operativo
  if (/android/i.test(userAgent)) {
    // Android
    if (/chrome/i.test(userAgent)) {
      // Chrome en Android: abrir configuración del sitio
      alert('Para permitir la ubicación:\n\n' +
            '1. Toca el ícono 🔒 o ℹ️ junto a la URL\n' +
            '2. Toca "Permisos"\n' +
            '3. Activa "Ubicación"\n' +
            '4. Recarga la página');
    } else {
      // Otros navegadores Android
      alert('Para permitir la ubicación:\n\n' +
            '1. Ve a Configuración del navegador\n' +
            '2. Busca "Permisos de sitios"\n' +
            '3. Encuentra este sitio\n' +
            '4. Activa "Ubicación"\n' +
            '5. Recarga la página');
    }
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    // iOS
    if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
      // Safari en iOS
      alert('Para permitir la ubicación:\n\n' +
            '1. Abre Ajustes de iOS\n' +
            '2. Busca "Safari"\n' +
            '3. Toca "Ubicación"\n' +
            '4. Selecciona "Preguntar" o "Permitir"\n' +
            '5. Vuelve aquí y toca "Reintentar"');
    } else {
      // Chrome u otros en iOS
      alert('Para permitir la ubicación:\n\n' +
            '1. Abre Ajustes de iOS\n' +
            '2. Busca el nombre del navegador\n' +
            '3. Activa "Ubicación"\n' +
            '4. Vuelve aquí y toca "Reintentar"');
    }
  } else {
    // Desktop u otros
    alert('Para permitir la ubicación:\n\n' +
          '1. Busca el ícono 🔒 en la barra de direcciones\n' +
          '2. Busca "Ubicación" en permisos\n' +
          '3. Cambia a "Permitir"\n' +
          '4. Recarga la página');
  }
}

// Obtener instrucciones según el dispositivo
function getSettingsInstructions() {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/android/i.test(userAgent)) {
    return '💡 Toca el ícono 🔒 junto a la URL arriba y permite la ubicación';
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    return '💡 Ve a Ajustes de iOS > Safari/Navegador > Ubicación';
  } else {
    return '💡 Haz clic en el ícono 🔒 en la barra de direcciones';
  }
}

// ========== SISTEMA DE CIERRE AUTOMÁTICO ==========

// Iniciar timer de cierre automático
function startAutoCloseTimer() {
  // Limpiar timer anterior si existe
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
  }
  
  console.log('Sesión iniciada. Se cerrará automáticamente en 30 minutos.');
  
  // Configurar timer para 30 minutos
  autoCloseTimer = setTimeout(() => {
    expireSession();
  }, LOCATION_CONFIG.maxSessionTime);
}

// Expirar sesión y cerrar página
function expireSession() {
  console.log('Sesión expirada. Cerrando aplicación...');
  
  // Limpiar sesión
  localStorage.removeItem('showroomSession');
  
  // Mostrar pantalla de sesión expirada
  showSessionExpired();
  
  // Intentar cerrar la ventana después de 2 segundos
  setTimeout(() => {
    attemptToClose();
  }, 2000);
}

// Mostrar pantalla de sesión expirada
function showSessionExpired() {
  const buttonContainer = document.getElementById('buttonContainer');
  const helpText = document.getElementById('helpText');
  
  // Cambiar ícono y mensaje
  document.querySelector('#accessBlock .icon').textContent = '⏰';
  document.querySelector('#accessBlock h1').textContent = 'Sesión Expirada';
  blockMessage.innerHTML = 'La sesión ha expirado después de 30 minutos.<br><br>La aplicación se cerrará automáticamente.';
  
  // Ocultar botones
  buttonContainer.innerHTML = '';
  helpText.style.display = 'none';
  
  // Mostrar pantalla de bloqueo
  accessBlock.classList.add('active');
}

// Intentar cerrar la ventana/pestaña
function attemptToClose() {
  // Método 1: Intentar cerrar la ventana directamente
  window.close();
  
  // Método 2: Si no se puede cerrar, redirigir a página en blanco
  setTimeout(() => {
    // Si la ventana todavía está abierta después de 500ms
    // (window.close() no funcionó), mostrar instrucciones
    blockMessage.innerHTML = 'La sesión ha expirado.<br><br>' +
      '<small style="opacity: 0.8;">Por favor, cierra esta pestaña manualmente.</small>';
    
    // Opcional: Redirigir a about:blank después de 3 segundos
    setTimeout(() => {
      window.location.href = 'about:blank';
    }, 3000);
  }, 500);
}

// ========== FIN SISTEMA DE CIERRE AUTOMÁTICO ==========

// ========== FIN SISTEMA DE GEOLOCALIZACIÓN ==========

// Configuración de la API
const API_KEY = 'AIzaSyDwiZWDc66tv4usDIA-IreiJMLFuk0236Q';
const SPREADSHEET_ID = '1cD50d0-oSTogEe9tYo9ABUSP1ONCy3SAV92zsYYIG84';
const RANGO = 'PriceDisplay!A2:I';

// Variables globales
let allData = [];
let searchTimer = null;
let isLoading = false;

// Elementos del DOM
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('resultsContainer');
const statusMessage = document.getElementById('statusMessage');

// Prevenir teclado del sistema
searchInput.addEventListener('focus', (e) => {
  e.target.blur();
  e.preventDefault();
});

// Manejo de conexión
function handleConnectionChange() {
  if (navigator.onLine) {
    document.body.classList.remove('offline');
    if (allData.length === 0) {
      loadData();
    }
  } else {
    document.body.classList.add('offline');
  }
}

window.addEventListener('online', handleConnectionChange);
window.addEventListener('offline', handleConnectionChange);

// La carga de datos ahora se maneja después de validar la ubicación
// Ver función allowAccess() arriba

// Cargar datos del Google Sheets
async function loadData() {
  if (isLoading) return;
  
  isLoading = true;
  showStatus('<div class="spinner"></div>', 'searching');

  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGO}?key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Error al cargar datos');
    }

    const data = await response.json();
    allData = data.values || [];
    
    // Cachear imágenes automáticamente al cargar datos
    cacheProductImages();
    
    if (searchInput.value.trim()) {
      performSearch(searchInput.value.trim());
    } else {
      showStatus('Ingrese código o nombre del producto', 'empty');
    }
  } catch (error) {
    console.error('Error:', error);
    showStatus('❌ Error al cargar los datos. Verifique su conexión.', 'empty');
  } finally {
    isLoading = false;
  }
}

// Función para cachear todas las imágenes de productos
async function cacheProductImages() {
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    console.log('Service Worker no disponible');
    return;
  }

  // Extraer todas las URLs de imágenes
  const imageUrls = [];
  allData.forEach(row => {
    if (row[1]) {
      const images = row[1].split(',');
      images.forEach(img => {
        const url = img.trim();
        if (url && !imageUrls.includes(url)) {
          imageUrls.push(url);
        }
      });
    }
  });

  if (imageUrls.length === 0) return;

  // Enviar mensaje al service worker para cachear imágenes
  const messageChannel = new MessageChannel();
  
  return new Promise((resolve, reject) => {
    messageChannel.port1.onmessage = (event) => {
      if (event.data.success) {
        console.log('Imágenes cacheadas exitosamente');
        resolve();
      } else {
        console.error('Error al cachear imágenes:', event.data.error);
        reject(event.data.error);
      }
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'CACHE_IMAGES', imageUrls: imageUrls },
      [messageChannel.port2]
    );
  });
}

// Función para actualizar caché de imágenes (borrar y volver a descargar)
async function updateImageCache() {
  if (!confirm('¿Desea actualizar todas las imágenes de productos? Esto puede tardar un momento.')) {
    return;
  }

  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    alert('Service Worker no disponible');
    return;
  }

  const originalStatus = statusMessage.innerHTML;
  showStatus('Actualizando imágenes... <div class="spinner"></div>', 'searching');

  try {
    // Limpiar caché de imágenes
    const clearChannel = new MessageChannel();
    await new Promise((resolve, reject) => {
      clearChannel.port1.onmessage = (event) => {
        if (event.data.success) resolve();
        else reject(event.data.error);
      };
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_IMAGE_CACHE' },
        [clearChannel.port2]
      );
    });

    // Volver a cachear todas las imágenes
    await cacheProductImages();

    alert('✅ Imágenes actualizadas correctamente');
    
    // Restaurar el estado original
    if (searchInput.value.trim()) {
      performSearch(searchInput.value.trim());
    } else {
      showStatus('Ingrese código o nombre del producto', 'empty');
    }
  } catch (error) {
    console.error('Error al actualizar imágenes:', error);
    alert('❌ Error al actualizar las imágenes');
    showStatus(originalStatus, 'empty');
  }
}

// Manejar clics en el teclado virtual
document.querySelectorAll('.key').forEach(key => {
  key.addEventListener('click', (e) => {
    const keyValue = e.target.dataset.key;
    
    if (!keyValue) return;

    if (keyValue === 'Backspace') {
      searchInput.value = searchInput.value.slice(0, -1);
    } else {
      searchInput.value += keyValue;
    }

    handleSearchInput();
  });
});

// Manejar entrada de búsqueda
function handleSearchInput() {
  clearTimeout(searchTimer);
  
  const query = searchInput.value.trim();

  if (query.length === 0) {
    clearResults();
    showStatus('Ingrese código o nombre del producto', 'empty');
    return;
  }

  showStatus('Buscando...', 'searching');
  
  searchTimer = setTimeout(() => {
    performSearch(query);
  }, 300);
}

// Realizar búsqueda
function performSearch(query) {
  if (allData.length === 0) {
    loadData();
    return;
  }

  const lowerQuery = query.toLowerCase();
  
  // Buscar en columnas C (índice 2), D (3), G (6), H (7)
  const results = allData.filter(row => {
    return (
      (row[2] && row[2].toString().toLowerCase().includes(lowerQuery)) ||
      (row[3] && row[3].toString().toLowerCase().includes(lowerQuery)) ||
      (row[6] && row[6].toString().toLowerCase().includes(lowerQuery)) ||
      (row[7] && row[7].toString().toLowerCase().includes(lowerQuery))
    );
  });

  displayResults(results);
}

// Mostrar resultados
function displayResults(results) {
  clearResults();

  if (results.length === 0) {
    showStatus('😕 No se encontraron resultados', 'empty');
    return;
  }

  hideStatus();

  results.forEach(row => {
    const card = createResultCard(row);
    resultsContainer.appendChild(card);
  });
}

// Crear tarjeta de resultado
function createResultCard(row) {
  const card = document.createElement('div');
  card.className = 'result-card';

  // Imagen
  const imageDiv = document.createElement('div');
  imageDiv.className = 'result-image';
  
  if (row[1]) {
    const imageLinks = row[1].split(',');
    const firstImageLink = imageLinks[0].trim();
    
    if (firstImageLink) {
      const img = document.createElement('img');
      img.src = firstImageLink;
      img.alt = row[3] || 'Producto';
      img.onerror = () => {
        imageDiv.classList.add('no-image');
        imageDiv.textContent = 'Sin imagen';
      };
      imageDiv.appendChild(img);
    } else {
      imageDiv.classList.add('no-image');
      imageDiv.textContent = 'Sin imagen';
    }
  } else {
    imageDiv.classList.add('no-image');
    imageDiv.textContent = 'Sin imagen';
  }

  // Información del producto
  const infoDiv = document.createElement('div');
  infoDiv.className = 'result-info';

  // Código del producto (columna C - índice 2 o columna G - índice 6)
  const code = row[2] || row[6] || 'S/C';
  const codeDiv = document.createElement('div');
  codeDiv.className = 'result-code';
  codeDiv.textContent = `Código: ${code}`;

  // Nombre del producto (columna D - índice 3)
  const name = row[3] || 'Sin nombre';
  const nameDiv = document.createElement('div');
  nameDiv.className = 'result-name';
  nameDiv.textContent = name;

  // Precio (columna F - índice 5, precio mayorista)
  const price = row[5] || 'Consultar';
  const priceDiv = document.createElement('div');
  priceDiv.className = 'result-price';
  priceDiv.textContent = price;

  infoDiv.appendChild(codeDiv);
  infoDiv.appendChild(nameDiv);
  infoDiv.appendChild(priceDiv);

  card.appendChild(imageDiv);
  card.appendChild(infoDiv);

  return card;
}

// Mostrar mensaje de estado
function showStatus(message, className) {
  // Solo mostrar logo si no es mensaje de búsqueda o spinner
  if (className === 'searching' || message.includes('spinner') || message.includes('Buscando')) {
    statusMessage.innerHTML = message;
  } else {
    statusMessage.innerHTML = message + '<br><img id="statusLogo" src="logo.png" alt="Distribuidora HomePoint" onclick="updateImageCache()">';
  }
  statusMessage.className = className;
  statusMessage.style.display = 'block';
}

// Ocultar mensaje de estado
function hideStatus() {
  statusMessage.style.display = 'none';
}

// Limpiar resultados
function clearResults() {
  const cards = resultsContainer.querySelectorAll('.result-card');
  cards.forEach(card => card.remove());
}

// Nueva búsqueda
function newSearch() {
  searchInput.value = '';
  clearResults();
  showStatus('Ingrese código o nombre del producto', 'empty');
}

// Registro del service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(err => 
    console.error('Service Worker error:', err)
  );
}

// Timer de inactividad (2 minutos)
let inactivityTimer = null;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    location.reload();
  }, 120000);
}

['click', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, resetInactivityTimer, true);
});

resetInactivityTimer();

// Función para ajustar altura del viewport
function fixViewportHeight() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

window.addEventListener('resize', fixViewportHeight);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) fixViewportHeight();
});
fixViewportHeight();
