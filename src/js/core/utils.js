// =============================================================================
// UTILS - UTILIDADES GENERALES DE LA APLICACIÓN
// =============================================================================

// =============================================================================
// MANIPULACIÓN DE FECHAS
// =============================================================================

/**
 * Formatea una fecha para mostrar en la UI
 * @param {Date|string|number} date - Fecha a formatear
 * @param {string} format - Formato deseado ('short', 'long', 'relative')
 * @returns {string} Fecha formateada
 */
export function formatDate(date, format = 'short') {
  try {
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida';
    }
    
    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
      case 'long':
        return dateObj.toLocaleDateString('es-AR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
      case 'relative':
        return getRelativeTimeString(dateObj);
        
      default:
        return dateObj.toLocaleDateString('es-AR');
    }
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return 'Fecha inválida';
  }
}

/**
 * Obtiene una representación relativa del tiempo
 * @param {Date} date - Fecha a comparar
 * @returns {string} Tiempo relativo
 */
function getRelativeTimeString(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'hace un momento';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `hace ${diffInWeeks} semana${diffInWeeks > 1 ? 's' : ''}`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `hace ${diffInMonths} mes${diffInMonths > 1 ? 'es' : ''}`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `hace ${diffInYears} año${diffInYears > 1 ? 's' : ''}`;
}

/**
 * Convierte una fecha a timestamp de Firestore
 * @param {Date|string|number} date - Fecha a convertir
 * @returns {Object} Timestamp de Firestore
 */
export function toFirestoreTimestamp(date) {
  // En el navegador, usamos Date directamente
  // En Node.js se usaría admin.firestore.Timestamp
  return new Date(date);
}

/**
 * Verifica si una fecha es válida
 * @param {Date|string|number} date - Fecha a verificar
 * @returns {boolean} True si la fecha es válida
 */
export function isValidDate(date) {
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
}

// =============================================================================
// MANIPULACIÓN DE MONEDAS
// =============================================================================

/**
 * Formatea un monto monetario
 * @param {number} amount - Monto a formatear
 * @param {string} currency - Moneda ('ARS', 'USD')
 * @returns {string} Monto formateado
 */
export function formatCurrency(amount, currency = 'ARS') {
  try {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '0,00';
    }
    
    const formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return formatter.format(amount);
  } catch (error) {
    console.error('Error al formatear moneda:', error);
    return amount.toFixed(2);
  }
}

/**
 * Convierte un string de moneda a número
 * @param {string} currencyString - String de moneda (ej: "$1.234,56")
 * @returns {number} Número extraído
 */
export function parseCurrency(currencyString) {
  try {
    if (typeof currencyString !== 'string') {
      return 0;
    }
    
    // Remover símbolos de moneda y espacios
    const cleanString = currencyString.replace(/[^\d,.-]/g, '');
    
    // Convertir coma decimal a punto
    const normalizedString = cleanString.replace(',', '.');
    
    const number = parseFloat(normalizedString);
    return isNaN(number) ? 0 : number;
  } catch (error) {
    console.error('Error al parsear moneda:', error);
    return 0;
  }
}

/**
 * Valida que un monto sea válido
 * @param {number} amount - Monto a validar
 * @returns {boolean} True si el monto es válido
 */
export function isValidAmount(amount) {
  return typeof amount === 'number' && 
         !isNaN(amount) && 
         amount > 0 && 
         amount < Number.MAX_SAFE_INTEGER;
}

// =============================================================================
// VALIDACIONES
// =============================================================================

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} True si el email es válido
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida una contraseña
 * @param {string} password - Contraseña a validar
 * @returns {Object} Resultado de la validación
 */
export function validatePassword(password) {
  if (typeof password !== 'string') {
    return { isValid: false, errors: ['La contraseña debe ser un string'] };
  }
  
  const errors = [];
  
  if (password.length < 6) {
    errors.push('La contraseña debe tener al menos 6 caracteres');
  }
  
  if (password.length > 128) {
    errors.push('La contraseña no puede tener más de 128 caracteres');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida un título de evento
 * @param {string} title - Título a validar
 * @returns {Object} Resultado de la validación
 */
export function validateEventTitle(title) {
  if (typeof title !== 'string') {
    return { isValid: false, errors: ['El título debe ser un string'] };
  }
  
  const errors = [];
  
  if (title.trim().length === 0) {
    errors.push('El título no puede estar vacío');
  }
  
  if (title.length > 80) {
    errors.push('El título no puede tener más de 80 caracteres');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// =============================================================================
// MANIPULACIÓN DE ARCHIVOS
// =============================================================================

/**
 * Obtiene la extensión de un archivo
 * @param {string} filename - Nombre del archivo
 * @returns {string} Extensión del archivo
 */
export function getFileExtension(filename) {
  if (typeof filename !== 'string') return '';
  
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  
  return filename.substring(lastDotIndex + 1).toLowerCase();
}

/**
 * Obtiene el tipo MIME de un archivo
 * @param {string} filename - Nombre del archivo
 * @returns {string} Tipo MIME
 */
export function getMimeType(filename) {
  const extension = getFileExtension(filename);
  
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Valida un archivo según los criterios de la aplicación
 * @param {File} file - Archivo a validar
 * @returns {Object} Resultado de la validación
 */
export function validateFile(file) {
  if (!(file instanceof File)) {
    return { isValid: false, errors: ['Archivo inválido'] };
  }
  
  const errors = [];
  const maxSize = 1 * 1024 * 1024; // 1MB
  
  // Validar tamaño
  if (file.size > maxSize) {
    errors.push(`El archivo no puede ser mayor a ${formatFileSize(maxSize)}`);
  }
  
  // Validar tipo
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF) y PDFs');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Formatea el tamaño de un archivo
 * @param {number} bytes - Bytes del archivo
 * @returns {string} Tamaño formateado
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============================================================================
// MANIPULACIÓN DE STRINGS
// =============================================================================

/**
 * Capitaliza la primera letra de un string
 * @param {string} str - String a capitalizar
 * @returns {string} String capitalizado
 */
export function capitalize(str) {
  if (typeof str !== 'string') return '';
  
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Trunca un string si excede la longitud máxima
 * @param {string} str - String a truncar
 * @param {number} maxLength - Longitud máxima
 * @param {string} suffix - Sufijo a agregar si se trunca
 * @returns {string} String truncado
 */
export function truncate(str, maxLength = 50, suffix = '...') {
  if (typeof str !== 'string') return '';
  
  if (str.length <= maxLength) return str;
  
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Genera un slug a partir de un string
 * @param {string} str - String a convertir
 * @returns {string} Slug generado
 */
export function generateSlug(str) {
  if (typeof str !== 'string') return '';
  
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// =============================================================================
// MANIPULACIÓN DE ARRAYS Y OBJETOS
// =============================================================================

/**
 * Agrupa elementos de un array por una propiedad
 * @param {Array} array - Array a agrupar
 * @param {string} key - Propiedad por la cual agrupar
 * @returns {Object} Objeto con los grupos
 */
export function groupBy(array, key) {
  if (!Array.isArray(array)) return {};
  
  return array.reduce((groups, item) => {
    const group = item[key];
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {});
}

/**
 * Ordena un array por múltiples criterios
 * @param {Array} array - Array a ordenar
 * @param {Array} sortCriteria - Criterios de ordenamiento
 * @returns {Array} Array ordenado
 */
export function sortBy(array, sortCriteria) {
  if (!Array.isArray(array)) return [];
  
  return [...array].sort((a, b) => {
    for (const criterion of sortCriteria) {
      const { key, order = 'asc' } = criterion;
      
      let aVal = a[key];
      let bVal = b[key];
      
      // Manejar valores nulos/undefined
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      
      // Comparar valores
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
    }
    
    return 0;
  });
}

/**
 * Remueve elementos duplicados de un array
 * @param {Array} array - Array del cual remover duplicados
 * @param {string} key - Propiedad para identificar duplicados (opcional)
 * @returns {Array} Array sin duplicados
 */
export function removeDuplicates(array, key = null) {
  if (!Array.isArray(array)) return [];
  
  if (key) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
  
  return [...new Set(array)];
}

// =============================================================================
// UTILIDADES DE NAVEGACIÓN
// =============================================================================

/**
 * Obtiene parámetros de la URL
 * @returns {Object} Parámetros de la URL
 */
export function getUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const params = {};
  
  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }
  
  return params;
}

/**
 * Construye una URL con parámetros
 * @param {string} baseUrl - URL base
 * @param {Object} params - Parámetros a agregar
 * @returns {string} URL completa
 */
export function buildUrl(baseUrl, params = {}) {
  const url = new URL(baseUrl, window.location.origin);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, value);
    }
  });
  
  return url.pathname + url.search;
}

// =============================================================================
// UTILIDADES DE DEBUGGING
// =============================================================================

/**
 * Log con timestamp para debugging
 * @param {string} message - Mensaje a loguear
 * @param {string} level - Nivel del log ('info', 'warn', 'error')
 * @param {*} data - Datos adicionales
 */
export function debugLog(message, level = 'info', data = null) {
  if (process.env.NODE_ENV !== 'development') return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  switch (level) {
    case 'warn':
      console.warn(prefix, message, data || '');
      break;
    case 'error':
      console.error(prefix, message, data || '');
      break;
    default:
      console.log(prefix, message, data || '');
  }
}

/**
 * Mide el tiempo de ejecución de una función
 * @param {Function} fn - Función a medir
 * @param {string} label - Etiqueta para el log
 * @returns {*} Resultado de la función
 */
export async function measureTime(fn, label = 'Función') {
  const start = performance.now();
  
  try {
    const result = await fn();
    const end = performance.now();
    debugLog(`${label} ejecutada en ${(end - start).toFixed(2)}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    debugLog(`${label} falló después de ${(end - start).toFixed(2)}ms`, 'error', error);
    throw error;
  }
}

// =============================================================================
// UTILIDADES DE LOCAL STORAGE
// =============================================================================

/**
 * Guarda datos en localStorage
 * @param {string} key - Clave
 * @param {*} value - Valor a guardar
 */
export function saveToLocalStorage(key, value) {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error('Error al guardar en localStorage:', error);
  }
}

/**
 * Obtiene datos de localStorage
 * @param {string} key - Clave
 * @param {*} defaultValue - Valor por defecto si no existe
 * @returns {*} Valor guardado o valor por defecto
 */
export function getFromLocalStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    
    return JSON.parse(item);
  } catch (error) {
    console.error('Error al obtener de localStorage:', error);
    return defaultValue;
  }
}

/**
 * Remueve datos de localStorage
 * @param {string} key - Clave a remover
 */
export function removeFromLocalStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error al remover de localStorage:', error);
  }
}

/**
 * Limpia todo el localStorage
 */
export function clearLocalStorage() {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error al limpiar localStorage:', error);
  }
}

// =============================================================================
// UTILIDADES DE VALIDACIÓN DE FORMULARIOS
// =============================================================================

/**
 * Valida un formulario completo
 * @param {Object} formData - Datos del formulario
 * @param {Object} validationRules - Reglas de validación
 * @returns {Object} Resultado de la validación
 */
export function validateForm(formData, validationRules) {
  const errors = {};
  let isValid = true;
  
  for (const [field, rules] of Object.entries(validationRules)) {
    const value = formData[field];
    const fieldErrors = [];
    
    // Validar cada regla
    for (const rule of rules) {
      const { test, message } = rule;
      
      if (!test(value)) {
        fieldErrors.push(message);
        isValid = false;
      }
    }
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  }
  
  return { isValid, errors };
}

/**
 * Crea reglas de validación comunes
 * @returns {Object} Reglas de validación predefinidas
 */
export function createValidationRules() {
  return {
    required: (value) => value !== null && value !== undefined && value !== '',
    email: (value) => isValidEmail(value),
    minLength: (min) => (value) => typeof value === 'string' && value.length >= min,
    maxLength: (max) => (value) => typeof value === 'string' && value.length <= max,
    positiveNumber: (value) => typeof value === 'number' && value > 0,
    url: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }
  };
}
