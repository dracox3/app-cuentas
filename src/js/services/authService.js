// =============================================================================
// AUTH SERVICE - SERVICIO DE AUTENTICACIÓN CON FIREBASE
// =============================================================================

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithCredential,
  unlink,
  updatePassword
} from 'firebase/auth';
import { getAuth } from '../core/firebase.js';
import { state } from '../core/state.js';

// =============================================================================
// CLASE DEL SERVICIO DE AUTENTICACIÓN
// =============================================================================

class AuthService {
  constructor() {
    this.auth = null;
    this.currentUser = null;
    this.authStateListeners = new Set();
    this.isInitialized = false;
    
    // Bindear métodos
    this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
    this.initialize = this.initialize.bind(this);
  }
  
  /**
   * Inicializa el servicio de autenticación
   */
  async initialize() {
    try {
      console.log('🔐 Inicializando servicio de autenticación...');
      
      // Obtener instancia de Auth
      this.auth = getAuth();
      
      // Configurar listener de cambios de estado
      onAuthStateChanged(this.auth, this.handleAuthStateChange);
      
      this.isInitialized = true;
      console.log('✅ Servicio de autenticación inicializado');
      
    } catch (error) {
      console.error('❌ Error al inicializar servicio de autenticación:', error);
      throw error;
    }
  }
  
  /**
   * Maneja los cambios en el estado de autenticación
   * @param {Object} user - Usuario de Firebase o null
   */
  handleAuthStateChange(user) {
    try {
      console.log('🔄 Cambio en estado de autenticación:', user ? 'Usuario autenticado' : 'Usuario no autenticado');
      
      this.currentUser = user;
      
      // Actualizar estado global
      state.setUser(user);
      
      // Notificar a todos los listeners
      this.authStateListeners.forEach(listener => {
        try {
          listener(user);
        } catch (error) {
          console.error('❌ Error en listener de autenticación:', error);
        }
      });
      
    } catch (error) {
      console.error('❌ Error al manejar cambio de estado de autenticación:', error);
    }
  }
  
  /**
   * Registra un listener para cambios en el estado de autenticación
   * @param {Function} callback - Función a ejecutar cuando cambie el estado
   * @returns {Function} Función para remover el listener
   */
  onAuthStateChanged(callback) {
    if (typeof callback !== 'function') {
      console.warn('⚠️ onAuthStateChanged requiere una función como callback');
      return () => {};
    }
    
    this.authStateListeners.add(callback);
    
    // Ejecutar callback inmediatamente si ya hay un usuario
    if (this.currentUser) {
      callback(this.currentUser);
    }
    
    // Retornar función para remover el listener
    return () => {
      this.authStateListeners.delete(callback);
    };
  }
  
  /**
   * Inicia sesión con email y contraseña
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<Object>} Usuario autenticado
   */
  async signInWithEmailAndPassword(email, password) {
    try {
      if (!this.isInitialized) {
        throw new Error('Servicio de autenticación no inicializado');
      }
      
      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }
      
      console.log('🔑 Iniciando sesión con email:', email);
      
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Sesión iniciada correctamente:', user.email);
      
      return user;
      
    } catch (error) {
      console.error('❌ Error al iniciar sesión:', error);
      
      // Traducir errores de Firebase a mensajes en español
      const errorMessage = this.translateFirebaseError(error.code);
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Crea una nueva cuenta con email y contraseña
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @param {string} displayName - Nombre para mostrar (opcional)
   * @returns {Promise<Object>} Usuario creado
   */
  async createUserWithEmailAndPassword(email, password, displayName = null) {
    try {
      if (!this.isInitialized) {
        throw new Error('Servicio de autenticación no inicializado');
      }
      
      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }
      
      console.log('👤 Creando nueva cuenta con email:', email);
      
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      // Actualizar perfil si se proporciona displayName
      if (displayName) {
        await updateProfile(user, { displayName });
        console.log('✅ Perfil actualizado con displayName:', displayName);
      }
      
      // Enviar email de verificación
      await sendEmailVerification(user);
      console.log('📧 Email de verificación enviado');
      
      console.log('✅ Cuenta creada correctamente:', user.email);
      
      return user;
      
    } catch (error) {
      console.error('❌ Error al crear cuenta:', error);
      
      // Traducir errores de Firebase a mensajes en español
      const errorMessage = this.translateFirebaseError(error.code);
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Cierra la sesión del usuario actual
   * @returns {Promise<void>}
   */
  async signOut() {
    try {
      if (!this.isInitialized) {
        throw new Error('Servicio de autenticación no inicializado');
      }
      
      if (!this.currentUser) {
        console.log('ℹ️ No hay usuario autenticado para cerrar sesión');
        return;
      }
      
      console.log('🚪 Cerrando sesión de:', this.currentUser.email);
      
      await signOut(this.auth);
      
      console.log('✅ Sesión cerrada correctamente');
      
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      
      const errorMessage = this.translateFirebaseError(error.code);
      throw new Error(errorMessage);
    }
  }

  /**
   * Actualiza el nombre a mostrar del usuario actual
   * @param {string} displayName
   */
  async updateDisplayName(displayName) {
    try {
      if (!this.isInitialized) throw new Error('Servicio de autenticación no inicializado');
      if (!this.currentUser) throw new Error('No hay usuario');
      await updateProfile(this.currentUser, { displayName: displayName || '' });
      // Refrescar referencia local y estado global
      this.currentUser = { ...this.currentUser, displayName };
      state.setUser(this.currentUser);
      console.log('✅ Display name actualizado');
    } catch (error) {
      console.error('❌ Error al actualizar display name:', error);
      throw error;
    }
  }

  /**
   * Inicia sesión con Google
   * @returns {Promise<Object>} Usuario autenticado
   */
  async signInWithGoogle() {
    try {
      if (!this.isInitialized) {
        throw new Error('Servicio de autenticación no inicializado');
      }
      
      console.log('🔑 Iniciando sesión con Google...');
      
      const provider = new GoogleAuthProvider();
      
      // Configurar scopes adicionales si es necesario
      provider.addScope('email');
      provider.addScope('profile');
      
      const userCredential = await signInWithPopup(this.auth, provider);
      const user = userCredential.user;
      
      console.log('✅ Sesión iniciada con Google:', user.email);
      
      return user;
      
    } catch (error) {
      console.error('❌ Error al iniciar sesión con Google:', error);
      
      const errorMessage = this.translateFirebaseError(error.code);
      throw new Error(errorMessage);
    }
  }

  /**
   * Cambia la contraseña del usuario actual (requiere login reciente)
   * @param {string} newPassword
   */
  async changePassword(newPassword) {
    try {
      if (!this.isInitialized) throw new Error('Servicio de autenticación no inicializado');
      if (!this.currentUser) throw new Error('No hay usuario');
      if (!newPassword || newPassword.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
      await updatePassword(this.currentUser, newPassword);
      console.log('✅ Contraseña actualizada');
    } catch (error) {
      console.error('❌ Error al cambiar contraseña:', error);
      throw error;
    }
  }

  /**
   * Envía email de restablecimiento de contraseña al usuario actual
   */
  async sendPasswordReset() {
    try {
      if (!this.isInitialized) throw new Error('Servicio de autenticación no inicializado');
      if (!this.currentUser || !this.currentUser.email) throw new Error('No hay email asociado');
      await sendPasswordResetEmail(this.auth, this.currentUser.email);
      console.log('📧 Email de restablecimiento enviado');
    } catch (error) {
      console.error('❌ Error al enviar email de restablecimiento:', error);
      throw error;
    }
  }
  
  /**
   * Envía email para restablecer contraseña
   * @param {string} email - Email del usuario
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmail(email) {
    try {
      if (!this.isInitialized) {
        throw new Error('Servicio de autenticación no inicializado');
      }
      
      if (!email) {
        throw new Error('Email es requerido');
      }
      
      console.log('📧 Enviando email de restablecimiento de contraseña a:', email);
      
      await sendPasswordResetEmail(this.auth, email);
      
      console.log('✅ Email de restablecimiento enviado');
      
    } catch (error) {
      console.error('❌ Error al enviar email de restablecimiento:', error);
      
      const errorMessage = this.translateFirebaseError(error.code);
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Envía email de verificación
   * @returns {Promise<void>}
   */
  async sendEmailVerification() {
    try {
      if (!this.isInitialized) {
        throw new Error('Servicio de autenticación no inicializado');
      }
      
      if (!this.currentUser) {
        throw new Error('No hay usuario autenticado');
      }
      
      console.log('📧 Enviando email de verificación a:', this.currentUser.email);
      
      await sendEmailVerification(this.currentUser);
      
      console.log('✅ Email de verificación enviado');
      
    } catch (error) {
      console.error('❌ Error al enviar email de verificación:', error);
      
      const errorMessage = this.translateFirebaseError(error.code);
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Actualiza el perfil del usuario
   * @param {Object} profileData - Datos del perfil a actualizar
   * @returns {Promise<void>}
   */
  async updateProfile(profileData) {
    try {
      if (!this.isInitialized) {
        throw new Error('Servicio de autenticación no inicializado');
      }
      
      if (!this.currentUser) {
        throw new Error('No hay usuario autenticado');
      }
      
      if (!profileData || typeof profileData !== 'object') {
        throw new Error('Datos del perfil inválidos');
      }
      
      console.log('✏️ Actualizando perfil del usuario:', this.currentUser.email);
      
      await updateProfile(this.currentUser, profileData);
      
      console.log('✅ Perfil actualizado correctamente');
      
    } catch (error) {
      console.error('❌ Error al actualizar perfil:', error);
      
      const errorMessage = this.translateFirebaseError(error.code);
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Obtiene el usuario actual
   * @returns {Object|null} Usuario actual o null
   */
  getCurrentUser() {
    return this.currentUser;
  }
  
  /**
   * Verifica si hay un usuario autenticado
   * @returns {boolean} True si hay usuario autenticado
   */
  isAuthenticated() {
    return this.currentUser !== null;
  }
  
  /**
   * Verifica si el usuario actual está verificado
   * @returns {boolean} True si el usuario está verificado
   */
  isEmailVerified() {
    return this.currentUser ? this.currentUser.emailVerified : false;
  }
  
  /**
   * Obtiene el token de ID del usuario actual
   * @returns {Promise<string|null>} Token de ID o null
   */
  async getIdToken() {
    try {
      if (!this.currentUser) {
        return null;
      }
      
      return await this.currentUser.getIdToken();
      
    } catch (error) {
      console.error('❌ Error al obtener token de ID:', error);
      return null;
    }
  }
  
  /**
   * Obtiene el token de ID con refresh forzado
   * @param {boolean} forceRefresh - Forzar refresh del token
   * @returns {Promise<string|null>} Token de ID o null
   */
  async getIdTokenResult(forceRefresh = false) {
    try {
      if (!this.currentUser) {
        return null;
      }
      
      return await this.currentUser.getIdTokenResult(forceRefresh);
      
    } catch (error) {
      console.error('❌ Error al obtener resultado del token de ID:', error);
      return null;
    }
  }
  
  /**
   * Traduce errores de Firebase a mensajes en español
   * @param {string} errorCode - Código de error de Firebase
   * @returns {string} Mensaje de error traducido
   */
  translateFirebaseError(errorCode) {
    const errorMessages = {
      // Errores de autenticación
      'auth/user-not-found': 'No existe una cuenta con este email',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
      'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde',
      'auth/operation-not-allowed': 'Esta operación no está permitida',
      'auth/weak-password': 'La contraseña es demasiado débil',
      'auth/email-already-in-use': 'Ya existe una cuenta con este email',
      'auth/invalid-credential': 'Credenciales inválidas',
      'auth/account-exists-with-different-credential': 'Ya existe una cuenta con credenciales diferentes',
      'auth/credential-already-in-use': 'Estas credenciales ya están en uso',
      'auth/operation-not-supported-in-this-environment': 'Operación no soportada en este entorno',
      'auth/timeout': 'Tiempo de espera agotado',
      'auth/network-request-failed': 'Error de red. Verifica tu conexión',
      
      // Errores de popup
      'auth/popup-closed-by-user': 'Ventana de autenticación cerrada por el usuario',
      'auth/popup-blocked': 'Ventana de autenticación bloqueada por el navegador',
      'auth/cancelled-popup-request': 'Solicitud de popup cancelada',
      
      // Errores de verificación
      'auth/requires-recent-login': 'Se requiere un login reciente para esta operación',
      'auth/user-token-expired': 'Token de usuario expirado',
      
      // Errores generales
      'auth/internal-error': 'Error interno del servidor',
      'auth/invalid-api-key': 'Clave de API inválida',
      'auth/app-not-authorized': 'Aplicación no autorizada',
      'auth/key-expired': 'Clave expirada',
      'auth/invalid-user-token': 'Token de usuario inválido',
      'auth/user-mismatch': 'Usuario no coincide',
      'auth/invalid-tenant-id': 'ID de inquilino inválido',
      'auth/unsupported-tenant-operation': 'Operación de inquilino no soportada',
      'auth/invalid-verification-code': 'Código de verificación inválido',
      'auth/invalid-verification-id': 'ID de verificación inválido',
      'auth/missing-verification-code': 'Código de verificación faltante',
      'auth/missing-verification-id': 'ID de verificación faltante',
      'auth/quota-exceeded': 'Cuota excedida',
      'auth/retry-limit-exceeded': 'Límite de reintentos excedido',
      'auth/invalid-phone-number': 'Número de teléfono inválido',
      'auth/missing-phone-number': 'Número de teléfono faltante',
      'auth/invalid-recaptcha-token': 'Token de reCAPTCHA inválido',
      'auth/missing-recaptcha-token': 'Token de reCAPTCHA faltante',
      'auth/invalid-recaptcha-action': 'Acción de reCAPTCHA inválida',
      'auth/missing-recaptcha-action': 'Acción de reCAPTCHA faltante',
      'auth/invalid-recaptcha-score': 'Puntuación de reCAPTCHA inválida',
      'auth/missing-recaptcha-score': 'Puntuación de reCAPTCHA faltante',
      'auth/invalid-recaptcha-response': 'Respuesta de reCAPTCHA inválida',
      'auth/missing-recaptcha-response': 'Respuesta de reCAPTCHA faltante',
      'auth/invalid-recaptcha-secret': 'Secreto de reCAPTCHA inválido',
      'auth/missing-recaptcha-secret': 'Secreto de reCAPTCHA faltante',
      'auth/invalid-recaptcha-version': 'Versión de reCAPTCHA inválida',
      'auth/missing-recaptcha-version': 'Versión de reCAPTCHA faltante',
      'auth/invalid-recaptcha-site-key': 'Clave del sitio de reCAPTCHA inválida',
      'auth/missing-recaptcha-site-key': 'Clave del sitio de reCAPTCHA faltante',
      'auth/invalid-recaptcha-domain': 'Dominio de reCAPTCHA inválido',
      'auth/missing-recaptcha-domain': 'Dominio de reCAPTCHA faltante',
      'auth/invalid-recaptcha-action': 'Acción de reCAPTCHA inválida',
      'auth/missing-recaptcha-action': 'Acción de reCAPTCHA faltante',
      'auth/invalid-recaptcha-score': 'Puntuación de reCAPTCHA inválida',
      'auth/missing-recaptcha-score': 'Puntuación de reCAPTCHA faltante',
      'auth/invalid-recaptcha-response': 'Respuesta de reCAPTCHA inválida',
      'auth/missing-recaptcha-response': 'Respuesta de reCAPTCHA faltante',
      'auth/invalid-recaptcha-secret': 'Secreto de reCAPTCHA inválido',
      'auth/missing-recaptcha-secret': 'Secreto de reCAPTCHA faltante',
      'auth/invalid-recaptcha-version': 'Versión de reCAPTCHA inválida',
      'auth/missing-recaptcha-version': 'Versión de reCAPTCHA faltante',
      'auth/invalid-recaptcha-site-key': 'Clave del sitio de reCAPTCHA inválida',
      'auth/missing-recaptcha-site-key': 'Clave del sitio de reCAPTCHA faltante',
      'auth/invalid-recaptcha-domain': 'Dominio de reCAPTCHA inválido',
      'auth/missing-recaptcha-domain': 'Dominio de reCAPTCHA faltante'
    };
    
    return errorMessages[errorCode] || `Error de autenticación: ${errorCode}`;
  }
  
  /**
   * Limpia el servicio y remueve todos los listeners
   */
  destroy() {
    try {
      this.authStateListeners.clear();
      this.isInitialized = false;
      this.currentUser = null;
      
      console.log('🗑️ Servicio de autenticación destruido');
      
    } catch (error) {
      console.error('❌ Error al destruir servicio de autenticación:', error);
    }
  }
}

// =============================================================================
// INSTANCIA SINGLETON DEL SERVICIO
// =============================================================================

// Crear instancia única del servicio
const authService = new AuthService();

// Exportar la instancia
export { authService };
