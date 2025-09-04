// =============================================================================
// FIREBASE - CONFIGURACIÓN Y SERVICIOS DE FIREBASE
// =============================================================================

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getMessaging, isSupported } from 'firebase/messaging';

// =============================================================================
// CONFIGURACIÓN DE FIREBASE
// =============================================================================

/**
 * Configuración de Firebase
 * Las claves se deben configurar en el archivo .env.local
 */
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// =============================================================================
// INICIALIZACIÓN DE FIREBASE
// =============================================================================

/**
 * Inicializa la aplicación de Firebase
 * @returns {Object} Instancia de la aplicación de Firebase
 */
function initializeFirebase() {
  try {
    // Debug: Mostrar información sobre entorno
    console.log('🔍 Inicializando Firebase');
    
    // Variables de entorno necesarias para Firebase
    const requiredEnvVars = [
      'FIREBASE_API_KEY',
      'FIREBASE_AUTH_DOMAIN',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_STORAGE_BUCKET',
      'FIREBASE_MESSAGING_SENDER_ID',
      'FIREBASE_APP_ID'
    ];
    
    // Definición de configuración manual para desarrollo si las variables faltan
    const devConfig = {
      apiKey: "AIzaSyBWVAa7sQU0CV79hU9quNYnAHa4rBmMXsQ",
      authDomain: "a2cuentas.firebaseapp.com",
      projectId: "a2cuentas",
      storageBucket: "a2cuentas.firebasestorage.app",
      messagingSenderId: "551271044147",
      appId: "1:551271044147:web:6e3965f29c6f38e1243f46c"
    };
    
    // Debug: Mostrar valores de variables de Firebase
    console.log('🔍 Variables de Firebase:');
    requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      console.log(`  ${varName}:`, value ? `Configurado` : 'No configurado');
    });
    
    // Verificar si falta alguna variable de entorno
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    // Si faltan variables, usamos la configuración de desarrollo
    if (missingVars.length > 0) {
      console.warn('⚠️ Algunas variables de Firebase no están disponibles:', missingVars);
      console.warn('⚠️ Usando configuración de desarrollo');
      
      // Actualizar la configuración con valores de desarrollo
      firebaseConfig.apiKey = devConfig.apiKey;
      firebaseConfig.authDomain = devConfig.authDomain;
      firebaseConfig.projectId = devConfig.projectId;
      firebaseConfig.storageBucket = devConfig.storageBucket;
      firebaseConfig.messagingSenderId = devConfig.messagingSenderId;
      firebaseConfig.appId = devConfig.appId;
    }
    
    // Debug: Mostrar configuración final
    console.log('🔍 Configuración de Firebase:');
    console.log('  apiKey:', firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'undefined');
    console.log('  projectId:', firebaseConfig.projectId);
    
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);

    // Inicializar App Check (opcional) si hay clave configurada
    try {
      if (process.env.NODE_ENV === 'development' && process.env.FIREBASE_APP_CHECK_DEBUG === 'true') {
        // @ts-ignore
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      const siteKey = process.env.FIREBASE_APP_CHECK_SITE_KEY;
      if (siteKey) {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
        console.log('✅ App Check inicializado');
      } else {
        console.log('ℹ️ App Check no configurado (FIREBASE_APP_CHECK_SITE_KEY ausente)');
      }
    } catch (e) {
      console.warn('⚠️ No se pudo inicializar App Check:', e?.message || e);
    }
    
    console.log('✅ Firebase inicializado correctamente');
    console.log('📍 Proyecto:', firebaseConfig.projectId);
    
    return app;
    
  } catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
    throw error;
  }
}

// =============================================================================
// SERVICIOS DE FIREBASE
// =============================================================================

/**
 * Obtiene la instancia de la aplicación de Firebase
 */
let firebaseApp = null;

/**
 * Inicializa Firebase si no está inicializado
 * @returns {Object} Instancia de la aplicación de Firebase
 */
function getFirebaseApp() {
  if (!firebaseApp) {
    firebaseApp = initializeFirebase();
  }
  return firebaseApp;
}

/**
 * Obtiene el servicio de autenticación
 * @returns {Object} Servicio de autenticación de Firebase
 */
function getAuthService() {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  
  // Conectar al emulador en desarrollo
  const isDev = process.env.NODE_ENV === 'development';
  const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
  
  if (isDev && useEmulator) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
      console.log('🔧 Conectado al emulador de Auth en localhost:9099');
    } catch (error) {
      // El emulador ya está conectado
      console.log('⚠️ Emulador de Auth ya conectado');
    }
  }
  
  return auth;
}

/**
 * Obtiene el servicio de Firestore
 * @returns {Object} Servicio de Firestore
 */
function getFirestoreService() {
  const app = getFirebaseApp();
  const db = getFirestore(app);
  
  // Conectar al emulador en desarrollo
  const isDev = process.env.NODE_ENV === 'development';
  const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
  
  if (isDev && useEmulator) {
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('🔧 Conectado al emulador de Firestore en localhost:8080');
    } catch (error) {
      // El emulador ya está conectado
      console.log('⚠️ Emulador de Firestore ya conectado');
    }
  }
  
  return db;
}

/**
 * Obtiene el servicio de Storage
 * @returns {Object} Servicio de Storage
 */
function getStorageService() {
  const app = getFirebaseApp();
  const storage = getStorage(app);
  
  // Conectar al emulador en desarrollo
  const isDev = process.env.NODE_ENV === 'development';
  const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
  
  if (isDev && useEmulator) {
    try {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('🔧 Conectado al emulador de Storage en localhost:9199');
    } catch (error) {
      // El emulador ya está conectado
      console.log('⚠️ Emulador de Storage ya conectado');
    }
  }
  
  return storage;
}

/**
 * Obtiene el servicio de Cloud Functions
 * @returns {Object} Servicio de Cloud Functions
 */
function getFunctionsService() {
  const app = getFirebaseApp();
  // Forzar región explícita para callable functions desplegadas en us-central1
  const functions = getFunctions(app, 'us-central1');
  
  // Conectar al emulador en desarrollo
  const isDev = process.env.NODE_ENV === 'development';
  const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
  
  if (isDev && useEmulator) {
    try {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('🔧 Conectado al emulador de Functions en localhost:5001');
    } catch (error) {
      // El emulador ya está conectado
      console.log('⚠️ Emulador de Functions ya conectado');
    }
  }
  
  return functions;
}

/**
 * Obtiene el servicio de Messaging (FCM)
 * @returns {Promise<Object|null>} Servicio de Messaging o null si no es compatible
 */
async function getMessagingService() {
  try {
    // Verificar si el navegador soporta FCM
    const isMessagingSupported = await isSupported();
    
    if (!isMessagingSupported) {
      console.warn('⚠️ FCM no es compatible con este navegador');
      return null;
    }
    
    const app = getFirebaseApp();
    const messaging = getMessaging(app);
    
    console.log('✅ Servicio de Messaging inicializado');
    return messaging;
    
  } catch (error) {
    console.error('❌ Error al inicializar Messaging:', error);
    return null;
  }
}

// =============================================================================
// CONFIGURACIÓN DE FIRESTORE
// =============================================================================

/**
 * Configuración de Firestore
 */
const firestoreConfig = {
  // Configuración de caché
  cacheSizeBytes: 50 * 1024 * 1024, // 50MB
  
  // Configuración de persistencia
  experimentalForceLongPolling: false,
  useFetchStreams: false
};

/**
 * Obtiene Firestore con configuración personalizada
 * @returns {Object} Instancia de Firestore configurada
 */
function getConfiguredFirestore() {
  const db = getFirestoreService();
  
  // Aquí se pueden aplicar configuraciones adicionales si es necesario
  // Por ahora, usamos la configuración por defecto
  
  return db;
}

// =============================================================================
// CONFIGURACIÓN DE STORAGE
// =============================================================================

/**
 * Configuración de Storage
 */
const storageConfig = {
  // Límites de archivos
  maxFileSize: 1 * 1024 * 1024, // 1MB
  maxFilesPerEvent: 2,
  
  // Tipos de archivo permitidos
  allowedFileTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf'
  ],
  
  // Estructura de carpetas
  folderStructure: {
    events: 'events/{eventoId}',
    avatars: 'avatars/{userId}',
    temp: 'temp/{userId}'
  }
};

/**
 * Obtiene Storage con configuración personalizada
 * @returns {Object} Instancia de Storage configurada
 */
function getConfiguredStorage() {
  const storage = getStorageService();
  
  // Aquí se pueden aplicar configuraciones adicionales si es necesario
  
  return storage;
}

// =============================================================================
// UTILIDADES DE FIREBASE
// =============================================================================

/**
 * Verifica si Firebase está inicializado
 * @returns {boolean} True si Firebase está inicializado
 */
function isFirebaseInitialized() {
  return firebaseApp !== null;
}

/**
 * Obtiene la configuración actual de Firebase
 * @returns {Object} Configuración de Firebase
 */
function getFirebaseConfig() {
  return { ...firebaseConfig };
}

/**
 * Obtiene información del proyecto de Firebase
 * @returns {Object} Información del proyecto
 */
function getProjectInfo() {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID
  };
}

/**
 * Verifica si se está usando el emulador
 * @returns {boolean} True si se está usando el emulador
 */
function isUsingEmulator() {
  const isDev = process.env.NODE_ENV === 'development';
  const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
  return isDev && useEmulator;
}

/**
 * Obtiene la URL del emulador según el servicio
 * @param {string} service - Servicio ('auth', 'firestore', 'storage', 'functions')
 * @returns {string} URL del emulador
 */
function getEmulatorUrl(service) {
  const emulatorUrls = {
    auth: 'http://localhost:9099',
    firestore: 'http://localhost:8080',
    storage: 'http://localhost:9199',
    functions: 'http://localhost:5001'
  };
  
  return emulatorUrls[service] || null;
}

// =============================================================================
// INICIALIZACIÓN AUTOMÁTICA
// =============================================================================

/**
 * Inicializa todos los servicios de Firebase
 * @returns {Promise<Object>} Objeto con todos los servicios inicializados
 */
async function initializeAllServices() {
  try {
    console.log('🚀 Inicializando servicios de Firebase...');
    
    // Inicializar servicios básicos
    const auth = getAuthService();
    const db = getConfiguredFirestore();
    const storage = getConfiguredStorage();
    const functions = getFunctionsService();
    
    // Inicializar Messaging de forma asíncrona
    const messaging = await getMessagingService();
    
    const services = {
      auth,
      db,
      storage,
      functions,
      messaging
    };
    
    console.log('✅ Todos los servicios de Firebase inicializados');
    
    // Log de información del proyecto
    const projectInfo = getProjectInfo();
    console.log('📋 Información del proyecto:', projectInfo);
    
    if (isUsingEmulator()) {
      console.log('🔧 Modo emulador activado');
    }
    
    return services;
    
  } catch (error) {
    console.error('❌ Error al inicializar servicios de Firebase:', error);
    throw error;
  }
}

// =============================================================================
// EXPORTACIONES
// =============================================================================

export {
  // Inicialización
  initializeFirebase,
  initializeAllServices,
  
  // Servicios
  getAuthService as getAuth,
  getConfiguredFirestore as getFirestore,
  getConfiguredStorage as getStorage,
  getFunctionsService as getFunctions,
  getMessagingService as getMessaging,
  
  // Utilidades
  isFirebaseInitialized,
  getFirebaseConfig,
  getProjectInfo,
  isUsingEmulator,
  getEmulatorUrl,
  
  // Configuraciones
  firestoreConfig,
  storageConfig
};

// =============================================================================
// INICIALIZACIÓN AUTOMÁTICA EN DESARROLLO
// =============================================================================

// En desarrollo, inicializar automáticamente
const NODE_ENV = process.env.NODE_ENV || 'development';
if (NODE_ENV === 'development') {
  // Inicializar Firebase cuando se importe el módulo
  try {
    setTimeout(() => {
      getFirebaseApp();
      console.log('🔧 Firebase inicializado automáticamente en desarrollo');
    }, 0);
  } catch (error) {
    console.warn('⚠️ No se pudo inicializar Firebase automáticamente:', error.message);
  }
}
