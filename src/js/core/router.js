// =============================================================================
// ROUTER - SISTEMA DE RUTEO PARA LA APLICACIÓN
// =============================================================================

/**
 * Router simple para Single Page Application
 * Maneja la navegación entre páginas sin recargar la página
 */
class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = '/';
    this.routeChangeCallbacks = [];
    this.isInitialized = false;
    
    // Bindear métodos
    this.handlePopState = this.handlePopState.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }
  
  /**
   * Inicializa el router
   */
  init() {
    if (this.isInitialized) return;
    
    // Configurar listener para cambios de historial del navegador
    window.addEventListener('popstate', this.handlePopState);
    
    // Configurar listener para clicks en enlaces
    document.addEventListener('click', this.handleClick);
    
    // Obtener ruta inicial
    this.currentRoute = this.getCurrentPath();
    
    this.isInitialized = true;
    console.log('✅ Router inicializado con ruta:', this.currentRoute);
  }
  
  /**
   * Registra una ruta con su callback de renderizado
   * @param {string} path - Ruta a registrar
   * @param {Function} callback - Función a ejecutar cuando se navegue a esta ruta
   */
  register(path, callback) {
    this.routes.set(path, callback);
    console.log('📍 Ruta registrada:', path);
  }
  
  /**
   * Navega a una ruta específica
   * @param {string} path - Ruta a la que navegar
   * @param {Object} options - Opciones adicionales
   */
  navigateTo(path, options = {}) {
    try {
      console.log('🧭 Navegando a:', path);
      
      // Validar que la ruta existe
      if (!this.routes.has(path)) {
        console.warn('⚠️ Ruta no registrada:', path);
        // Redirigir a la ruta por defecto
        path = '/';
      }
      
      // Actualizar historial del navegador
      if (options.replace) {
        window.history.replaceState({ path }, '', path);
      } else {
        window.history.pushState({ path }, '', path);
      }
      
      // Actualizar ruta actual
      this.currentRoute = path;
      
      // Ejecutar callback de la ruta
      const callback = this.routes.get(path);
      if (callback && typeof callback === 'function') {
        callback();
      }
      
      // Notificar cambio de ruta
      this.notifyRouteChange(path);
      
      // Actualizar navegación activa
      this.updateActiveNavigation(path);
      
      console.log('✅ Navegación completada a:', path);
      
    } catch (error) {
      console.error('❌ Error al navegar a:', path, error);
    }
  }
  
  /**
   * Obtiene la ruta actual del navegador
   * @returns {string} Ruta actual
   */
  getCurrentPath() {
    return window.location.pathname || '/';
  }
  
  /**
   * Obtiene los parámetros de la URL
   * @returns {Object} Parámetros de la URL
   */
  getQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    
    for (const [key, value] of urlParams.entries()) {
      params[key] = value;
    }
    
    return params;
  }
  
  /**
   * Obtiene un parámetro específico de la URL
   * @param {string} key - Clave del parámetro
   * @returns {string|null} Valor del parámetro o null si no existe
   */
  getQueryParam(key) {
    const params = this.getQueryParams();
    return params[key] || null;
  }
  
  /**
   * Construye una URL con parámetros
   * @param {string} path - Ruta base
   * @param {Object} params - Parámetros a agregar
   * @returns {string} URL completa con parámetros
   */
  buildUrl(path, params = {}) {
    const url = new URL(path, window.location.origin);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
    
    return url.pathname + url.search;
  }
  
  /**
   * Navega a una ruta con parámetros
   * @param {string} path - Ruta base
   * @param {Object} params - Parámetros a agregar
   * @param {Object} options - Opciones de navegación
   */
  navigateToWithParams(path, params = {}, options = {}) {
    const fullPath = this.buildUrl(path, params);
    this.navigateTo(fullPath, options);
  }
  
  /**
   * Maneja el evento popstate (navegación con botones del navegador)
   * @param {PopStateEvent} event - Evento popstate
   */
  handlePopState(event) {
    try {
      const path = this.getCurrentPath();
      console.log('🔄 PopState - Navegando a:', path);
      
      this.currentRoute = path;
      
      // Ejecutar callback de la ruta
      const callback = this.routes.get(path);
      if (callback && typeof callback === 'function') {
        callback();
      }
      
      // Notificar cambio de ruta
      this.notifyRouteChange(path);
      
      // Actualizar navegación activa
      this.updateActiveNavigation(path);
      
    } catch (error) {
      console.error('❌ Error al manejar popstate:', error);
    }
  }
  
  /**
   * Maneja clicks en enlaces para interceptar navegación
   * @param {MouseEvent} event - Evento de click
   */
  handleClick(event) {
    const target = event.target.closest('a');
    
    if (target && target.href && target.href.startsWith(window.location.origin)) {
      event.preventDefault();
      
      const path = target.pathname;
      console.log('🔗 Click en enlace interno:', path);
      
      this.navigateTo(path);
    }
  }
  
  /**
   * Registra un callback para ser ejecutado cuando cambie la ruta
   * @param {Function} callback - Función a ejecutar
   */
  onRouteChange(callback) {
    if (typeof callback === 'function') {
      this.routeChangeCallbacks.push(callback);
      console.log('📝 Callback de cambio de ruta registrado');
    }
  }
  
  /**
   * Notifica a todos los callbacks registrados sobre un cambio de ruta
   * @param {string} path - Nueva ruta
   */
  notifyRouteChange(path) {
    this.routeChangeCallbacks.forEach(callback => {
      try {
        callback(path);
      } catch (error) {
        console.error('❌ Error en callback de cambio de ruta:', error);
      }
    });
  }
  
  /**
   * Actualiza la navegación activa en la UI
   * @param {string} path - Ruta activa
   */
  updateActiveNavigation(path) {
    try {
      // Remover clase activa de todos los enlaces
      const navLinks = document.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        link.classList.remove('active');
      });
      
      // Agregar clase activa al enlace correspondiente
      const activeLink = document.querySelector(`[data-route="${path}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
      }
      
    } catch (error) {
      console.error('❌ Error al actualizar navegación activa:', error);
    }
  }
  
  /**
   * Obtiene la ruta actual
   * @returns {string} Ruta actual
   */
  getCurrentRoute() {
    return this.currentRoute;
  }
  
  /**
   * Verifica si una ruta está activa
   * @param {string} path - Ruta a verificar
   * @returns {boolean} True si la ruta está activa
   */
  isActive(path) {
    return this.currentRoute === path;
  }
  
  /**
   * Verifica si la ruta actual coincide con un patrón
   * @param {string} pattern - Patrón a verificar (puede incluir wildcards)
   * @returns {boolean} True si la ruta coincide con el patrón
   */
  matches(pattern) {
    // Implementación simple de coincidencia de patrones
    if (pattern === '*') return true;
    if (pattern === this.currentRoute) return true;
    
    // Patrón con parámetros dinámicos (ej: /evento/:id)
    const patternParts = pattern.split('/');
    const routeParts = this.currentRoute.split('/');
    
    if (patternParts.length !== routeParts.length) return false;
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) continue; // Parámetro dinámico
      if (patternParts[i] !== routeParts[i]) return false;
    }
    
    return true;
  }
  
  /**
   * Extrae parámetros dinámicos de la ruta actual
   * @param {string} pattern - Patrón con parámetros (ej: /evento/:id)
   * @returns {Object} Parámetros extraídos
   */
  extractParams(pattern) {
    const params = {};
    const patternParts = pattern.split('/');
    const routeParts = this.currentRoute.split('/');
    
    if (patternParts.length !== routeParts.length) return params;
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const paramName = patternParts[i].substring(1);
        params[paramName] = routeParts[i];
      }
    }
    
    return params;
  }
  
  /**
   * Limpia el router y remueve todos los listeners
   */
  destroy() {
    if (!this.isInitialized) return;
    
    window.removeEventListener('popstate', this.handlePopState);
    document.removeEventListener('click', this.handleClick);
    
    this.routes.clear();
    this.routeChangeCallbacks = [];
    this.isInitialized = false;
    
    console.log('🗑️ Router destruido');
  }
}

// =============================================================================
// INSTANCIA SINGLETON DEL ROUTER
// =============================================================================

// Crear instancia única del router
const router = new Router();

// Exportar la instancia
export { router };
