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

// Cargar datos al iniciar
window.addEventListener('DOMContentLoaded', () => {
  if (allData.length === 0) {
    loadData();
  }
});

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
