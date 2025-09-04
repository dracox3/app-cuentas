// =============================================================================
// STATE - MANEJO DEL ESTADO GLOBAL DE LA APLICACIÓN
// =============================================================================

/**
 * Sistema de estado global para la aplicación
 * Implementa un patrón Observer para notificar cambios
 */
class State {
  constructor() {
    this.state = {
      user: null,
      eventos: [],
      balances: [],
      settings: {},
      ui: {
        loading: false,
        currentPage: '/',
        modalOpen: false,
        notifications: []
      }
    };
    
    this.subscribers = new Map();
    this.subscriberId = 0;
    
    // Bindear métodos
    this.notifySubscribers = this.notifySubscribers.bind(this);
  }
  
  /**
   * Obtiene el estado completo
   * @returns {Object} Estado completo de la aplicación
   */
  getState() {
    return { ...this.state };
  }
  
  /**
   * Obtiene una parte específica del estado
   * @param {string} path - Ruta al valor (ej: 'user.email', 'ui.loading')
   * @returns {*} Valor del estado
   */
  get(path) {
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  /**
   * Establece un valor en el estado
   * @param {string} path - Ruta al valor (ej: 'user.email', 'ui.loading')
   * @param {*} value - Valor a establecer
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.state;
    
    // Navegar hasta el objeto padre
    for (const key of keys) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    // Establecer el valor
    target[lastKey] = value;
    
    // Notificar a los suscriptores
    this.notifySubscribers(path, value);
  }
  
  /**
   * Actualiza múltiples valores en el estado
   * @param {Object} updates - Objeto con las actualizaciones
   */
  update(updates) {
    Object.entries(updates).forEach(([path, value]) => {
      this.set(path, value);
    });
  }
  
  /**
   * Establece el usuario autenticado
   * @param {Object|null} user - Usuario de Firebase o null
   */
  setUser(user) {
    this.set('user', user);
    
    if (user) {
      console.log('👤 Usuario establecido en estado:', user.email);
    } else {
      console.log('🚪 Usuario removido del estado');
    }
  }
  
  /**
   * Obtiene el usuario actual
   * @returns {Object|null} Usuario actual o null
   */
  getUser() {
    return this.get('user');
  }
  
  /**
   * Verifica si hay un usuario autenticado
   * @returns {boolean} True si hay usuario autenticado
   */
  isAuthenticated() {
    return this.get('user') !== null;
  }
  
  /**
   * Establece los eventos del usuario
   * @param {Array} eventos - Lista de eventos
   */
  setEventos(eventos) {
    this.set('eventos', eventos);
    console.log('📋 Eventos establecidos en estado:', eventos.length);
  }
  
  /**
   * Obtiene los eventos del usuario
   * @returns {Array} Lista de eventos
   */
  getEventos() {
    return this.get('eventos') || [];
  }
  
  /**
   * Agrega un evento al estado
   * @param {Object} evento - Evento a agregar
   */
  addEvento(evento) {
    const eventos = this.getEventos();
    eventos.unshift(evento);
    this.setEventos(eventos);
  }
  
  /**
   * Actualiza un evento existente
   * @param {string} eventoId - ID del evento
   * @param {Object} updates - Actualizaciones a aplicar
   */
  updateEvento(eventoId, updates) {
    const eventos = this.getEventos();
    const index = eventos.findIndex(e => e.id === eventoId);
    
    if (index !== -1) {
      eventos[index] = { ...eventos[index], ...updates };
      this.setEventos(eventos);
      console.log('✏️ Evento actualizado:', eventoId);
    }
  }
  
  /**
   * Remueve un evento del estado
   * @param {string} eventoId - ID del evento a remover
   */
  removeEvento(eventoId) {
    const eventos = this.getEventos();
    const filteredEventos = eventos.filter(e => e.id !== eventoId);
    this.setEventos(filteredEventos);
    console.log('🗑️ Evento removido:', eventoId);
  }
  
  /**
   * Establece los balances del usuario
   * @param {Array} balances - Lista de balances
   */
  setBalances(balances) {
    this.set('balances', balances);
    console.log('💰 Balances establecidos en estado:', balances.length);
  }
  
  /**
   * Obtiene los balances del usuario
   * @returns {Array} Lista de balances
   */
  getBalances() {
    return this.get('balances') || [];
  }
  
  /**
   * Establece la configuración del usuario
   * @param {Object} settings - Configuración del usuario
   */
  setSettings(settings) {
    this.set('settings', settings);
    console.log('⚙️ Configuración establecida en estado');
  }
  
  /**
   * Obtiene la configuración del usuario
   * @returns {Object} Configuración del usuario
   */
  getSettings() {
    return this.get('settings') || {};
  }
  
  /**
   * Establece el estado de carga
   * @param {boolean} loading - Estado de carga
   */
  setLoading(loading) {
    this.set('ui.loading', loading);
  }
  
  /**
   * Obtiene el estado de carga
   * @returns {boolean} Estado de carga
   */
  isLoading() {
    return this.get('ui.loading') || false;
  }
  
  /**
   * Establece la página actual
   * @param {string} page - Ruta de la página actual
   */
  setCurrentPage(page) {
    this.set('ui.currentPage', page);
  }
  
  /**
   * Obtiene la página actual
   * @returns {string} Ruta de la página actual
   */
  getCurrentPage() {
    return this.get('ui.currentPage') || '/';
  }
  
  /**
   * Establece si hay un modal abierto
   * @param {boolean} modalOpen - Estado del modal
   */
  setModalOpen(modalOpen) {
    this.set('ui.modalOpen', modalOpen);
  }
  
  /**
   * Verifica si hay un modal abierto
   * @returns {boolean} True si hay modal abierto
   */
  isModalOpen() {
    return this.get('ui.modalOpen') || false;
  }
  
  /**
   * Agrega una notificación
   * @param {Object} notification - Notificación a agregar
   */
  addNotification(notification) {
    const notifications = this.get('ui.notifications') || [];
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      ...notification
    };
    
    notifications.unshift(newNotification);
    this.set('ui.notifications', notifications);
    
    console.log('🔔 Notificación agregada:', newNotification);
    
    // Auto-remover notificaciones antiguas (más de 10)
    if (notifications.length > 10) {
      this.set('ui.notifications', notifications.slice(0, 10));
    }
  }
  
  /**
   * Remueve una notificación
   * @param {string} notificationId - ID de la notificación
   */
  removeNotification(notificationId) {
    const notifications = this.get('ui.notifications') || [];
    const filteredNotifications = notifications.filter(n => n.id !== notificationId);
    this.set('ui.notifications', filteredNotifications);
  }
  
  /**
   * Obtiene las notificaciones
   * @returns {Array} Lista de notificaciones
   */
  getNotifications() {
    return this.get('ui.notifications') || [];
  }
  
  /**
   * Suscribe a cambios en el estado
   * @param {string} path - Ruta a observar (opcional)
   * @param {Function} callback - Función a ejecutar cuando cambie el estado
   * @returns {number} ID de la suscripción
   */
  subscribe(path, callback) {
    // Si solo se pasa un callback, observar todo el estado
    if (typeof path === 'function') {
      callback = path;
      path = '*';
    }
    
    const subscriptionId = ++this.subscriberId;
    
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Map());
    }
    
    this.subscribers.get(path).set(subscriptionId, callback);
    
    console.log('📝 Suscripción creada:', { path, id: subscriptionId });
    
    return subscriptionId;
  }
  
  /**
   * Desuscribe de cambios en el estado
   * @param {number} subscriptionId - ID de la suscripción
   */
  unsubscribe(subscriptionId) {
    for (const [path, subscriptions] of this.subscribers.entries()) {
      if (subscriptions.has(subscriptionId)) {
        subscriptions.delete(subscriptionId);
        
        // Remover el path si no hay más suscripciones
        if (subscriptions.size === 0) {
          this.subscribers.delete(path);
        }
        
        console.log('📝 Suscripción removida:', { path, id: subscriptionId });
        break;
      }
    }
  }
  
  /**
   * Notifica a los suscriptores sobre cambios en el estado
   * @param {string} path - Ruta que cambió
   * @param {*} value - Nuevo valor
   */
  notifySubscribers(path, value) {
    // Notificar a suscriptores específicos del path
    if (this.subscribers.has(path)) {
      this.subscribers.get(path).forEach(callback => {
        try {
          callback(value, path);
        } catch (error) {
          console.error('❌ Error en callback de suscripción:', error);
        }
      });
    }
    
    // Notificar a suscriptores globales (*)
    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach(callback => {
        try {
          callback(value, path);
        } catch (error) {
          console.error('❌ Error en callback de suscripción global:', error);
        }
      });
    }
  }
  
  /**
   * Limpia todo el estado
   */
  clear() {
    this.state = {
      user: null,
      eventos: [],
      balances: [],
      settings: {},
      ui: {
        loading: false,
        currentPage: '/',
        modalOpen: false,
        notifications: []
      }
    };
    
    // Notificar a todos los suscriptores
    this.notifySubscribers('*', this.state);
    
    console.log('🧹 Estado limpiado');
  }
  
  /**
   * Limpia solo los datos del usuario
   */
  clearUser() {
    this.setUser(null);
    this.setEventos([]);
    this.setBalances([]);
    this.setSettings({});
    
    console.log('👤 Datos del usuario limpiados');
  }
  
  /**
   * Obtiene un resumen del estado actual
   * @returns {Object} Resumen del estado
   */
  getSummary() {
    return {
      user: this.isAuthenticated() ? 'Autenticado' : 'No autenticado',
      eventos: this.getEventos().length,
      balances: this.getBalances().length,
      loading: this.isLoading(),
      currentPage: this.getCurrentPage(),
      modalOpen: this.isModalOpen(),
      notifications: this.getNotifications().length
    };
  }
  
  /**
   * Exporta el estado para debugging
   * @returns {Object} Estado exportado
   */
  export() {
    return {
      state: this.getState(),
      summary: this.getSummary(),
      subscribers: Array.from(this.subscribers.entries()).map(([path, subs]) => ({
        path,
        count: subs.size
      }))
    };
  }
}

// =============================================================================
// INSTANCIA SINGLETON DEL ESTADO
// =============================================================================

// Crear instancia única del estado
const state = new State();

// Exportar la instancia
export { state };
