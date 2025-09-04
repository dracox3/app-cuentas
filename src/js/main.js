// =============================================================================
// GASTOS COMPARTIDOS - ARCHIVO PRINCIPAL DE LA APLICACIÓN
// =============================================================================

import { onAuthStateChanged } from 'firebase/auth';
import { getAuth } from './core/firebase.js';
import { authService } from './services/authService.js';
import { eventsService } from './services/eventsService.js';
import { userService } from './services/userService.js';
import { router } from './core/router.js';
import { state } from './core/state.js';
import { ui } from './ui/ui.js';

// =============================================================================
// CONFIGURACIÓN DE FIREBASE
// =============================================================================

// Obtener instancia de Auth desde nuestro wrapper centralizado
const auth = getAuth();

// =============================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =============================================================================

class GastosCompartidosApp {
  constructor() {
    this.isInitialized = false;
    this.currentUser = null;
    this.currentRoute = '/';
    
    // Bindear métodos
    this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
    this.handleRouteChange = this.handleRouteChange.bind(this);
    this.initializeApp = this.initializeApp.bind(this);
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.initializeApp);
    } else {
      this.initializeApp();
    }
  }
  
  /**
   * Inicializa la aplicación
   */
  async initializeApp() {
    try {
      console.log('🚀 Inicializando Gastos Compartidos...');
      
      // Mostrar página de carga
      ui.showLoadingPage();

      // Capturar invitación desde URL si presente
      this.captureInviteFromUrl();
      
      // Inicializar servicios
      await this.initializeServices();
      
      // Configurar listeners de autenticación
      this.setupAuthListeners();
      
      // Configurar routing
      this.setupRouting();
      
      // Configurar eventos de UI
      this.setupUIEvents();
      
      // Marcar como inicializada
      this.isInitialized = true;
      
      console.log('✅ Aplicación inicializada correctamente');
      
    } catch (error) {
      console.error('❌ Error al inicializar la aplicación:', error);
      ui.showError('Error al inicializar la aplicación. Por favor, recarga la página.');
    }
  }
  
  /**
   * Inicializa todos los servicios necesarios
   */
  async initializeServices() {
    try {
      // Inicializar servicios en paralelo
      await Promise.all([
        authService.initialize(),
        eventsService.initialize?.() || Promise.resolve(),
        userService.initialize?.() || Promise.resolve(),
        // Otros servicios se pueden inicializar aquí
      ]);
      
      console.log('✅ Servicios inicializados');
      
    } catch (error) {
      console.error('❌ Error al inicializar servicios:', error);
      throw error;
    }
  }
  
  /**
   * Configura los listeners de autenticación
   */
  setupAuthListeners() {
    // Escuchar cambios en el estado de autenticación
    onAuthStateChanged(auth, this.handleAuthStateChange);
    
    console.log('✅ Listeners de autenticación configurados');
  }
  
  /**
   * Configura el sistema de routing
   */
  setupRouting() {
    // Configurar router
    router.init();
    // Registrar rutas principales para que navigateTo no rebote a '/'
    const routes = ['/', '/balances', '/ajustes', '/auth', '/evento'];
    routes.forEach(path => router.register(path, () => this.handleRouteChange(path)));
    
    // Escuchar cambios de ruta
    router.onRouteChange(this.handleRouteChange);
    
    console.log('✅ Sistema de routing configurado');
  }
  
  /**
   * Configura los eventos de la interfaz de usuario
   */
  setupUIEvents() {
    // Botones de autenticación
    const btnIniciarSesion = document.getElementById('btnIniciarSesion');
    const btnRegistrarse = document.getElementById('btnRegistrarse');
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    
    if (btnIniciarSesion) {
      btnIniciarSesion.addEventListener('click', () => {
        ui.showAuthPage('login');
      });
    }
    
    if (btnRegistrarse) {
      btnRegistrarse.addEventListener('click', () => {
        ui.showAuthPage('register');
      });
    }
    
    if (btnCerrarSesion) {
      btnCerrarSesion.addEventListener('click', () => {
        this.handleLogout();
      });
    }
    
    // Botón crear evento
    const btnCrearEvento = document.getElementById('btnCrearEvento');
    if (btnCrearEvento) {
      btnCrearEvento.addEventListener('click', () => {
        this.handleCrearEvento();
      });
    }

    // Mi perfil -> Ajustes
    const btnPerfil = document.getElementById('btnPerfil');
    if (btnPerfil) {
      btnPerfil.addEventListener('click', () => {
        router.navigateTo('/ajustes');
      });
    }
    
    // Botón crear primer evento
    const btnCrearPrimerEvento = document.getElementById('btnCrearPrimerEvento');
    if (btnCrearPrimerEvento) {
      btnCrearPrimerEvento.addEventListener('click', () => {
        this.handleCrearEvento();
      });
    }

    // Formulario de autenticación (login/registro)
    const authForm = document.getElementById('authForm');
    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const displayNameInput = document.getElementById('displayName');
        const mode = authForm.dataset.mode || 'login';

        const email = emailInput && 'value' in emailInput ? emailInput.value.trim() : '';
        const password = passwordInput && 'value' in passwordInput ? passwordInput.value : '';
        const displayName = displayNameInput && 'value' in displayNameInput ? displayNameInput.value.trim() : '';

        if (!email || !password) {
          ui.showError('Email y contraseña son requeridos');
          return;
        }

        if (mode === 'register' && password.length < 6) {
          ui.showError('La contraseña debe tener al menos 6 caracteres');
          return;
        }

        try {
          ui.showLoadingOverlay(mode === 'register' ? 'Creando cuenta...' : 'Iniciando sesión...');
          if (mode === 'register') {
            await authService.createUserWithEmailAndPassword(email, password, displayName || null);
          } else {
            await authService.signInWithEmailAndPassword(email, password);
          }
          // El listener de onAuthStateChanged se encargará de la UI posterior
        } catch (error) {
          console.error('❌ Error en autenticación:', error);
          const message = error && error.message ? error.message : 'Error de autenticación';
          ui.showError(message);
        } finally {
          ui.hideLoadingOverlay();
        }
      });
    }

    // Cambiar entre login y registro
    const btnCambiarRegistro = document.getElementById('btnCambiarRegistro');
    if (btnCambiarRegistro) {
      btnCambiarRegistro.addEventListener('click', () => {
        const mode = (authForm && authForm.dataset.mode) || 'login';
        const nextMode = mode === 'login' ? 'register' : 'login';
        ui.showAuthPage(nextMode);
      });
    }
    
    // Navegación
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        if (route) {
          router.navigateTo(route);
        }
      });
    });
    
    // Botón hamburguesa para móvil
    const navToggle = document.getElementById('navToggle');
    if (navToggle) {
      navToggle.addEventListener('click', () => {
        this.toggleMobileMenu();
      });
    }
    
    console.log('✅ Eventos de UI configurados');
  }

  // Captura invitación desde la URL y la persiste temporalmente
  captureInviteFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const invite = urlParams.get('invite');
    const id = urlParams.get('id');
    if (invite && id) {
      try {
        localStorage.setItem('pendingInvite', JSON.stringify({ invite, id }));
        console.log('🔗 Invitación capturada en localStorage');
      } catch (_) {}
    }
  }
  
  /**
   * Maneja los cambios en el estado de autenticación
   */
  async handleAuthStateChange(user) {
    try {
      console.log('🔄 Cambio en estado de autenticación:', user ? 'Usuario autenticado' : 'Usuario no autenticado');
      
      this.currentUser = user;
      
      // Actualizar estado global
      state.setUser(user);
      
      // Actualizar UI según el estado de autenticación
      if (user) {
        await this.handleUserAuthenticated(user);
      } else {
        await this.handleUserUnauthenticated();
      }
      
    } catch (error) {
      console.error('❌ Error al manejar cambio de autenticación:', error);
    }
  }
  
  /**
   * Maneja cuando un usuario se autentica
   */
  async handleUserAuthenticated(user) {
    try {
      console.log('👤 Usuario autenticado:', user.email);

      // Ocultar página de autenticación
      ui.hideAuthPage();

      // Mostrar menú de usuario
      ui.showUserMenu(user);

      // Ocultar botones de autenticación
      ui.hideAuthButtons();

      // Navegar al dashboard si no hay ruta específica
      if (this.currentRoute === '/auth' || this.currentRoute === '/') {
        router.navigateTo('/');
      }

      // Cargar datos del usuario
      await this.loadUserData(user);
      // Guardar perfil básico en Firestore (si faltara)
      try { await userService.saveProfile({ displayName: user.displayName || '' }); } catch (_) {}

      // Intentar unirse a un evento si hay invitación pendiente
      await this.tryJoinPendingInvite();

    } catch (error) {
      console.error('❌ Error al manejar usuario autenticado:', error);
    }
  }
  
  /**
   * Maneja cuando un usuario no está autenticado
   */
  async handleUserUnauthenticated() {
    try {
      console.log('🚪 Usuario no autenticado');
      
      // Limpiar estado del usuario
      state.clearUser();
      
      // Ocultar menú de usuario
      ui.hideUserMenu();
      
      // Mostrar botones de autenticación
      ui.showAuthButtons();
      
      // Mostrar página de autenticación
      ui.showAuthPage('login');
      
      // Limpiar datos de la aplicación
      this.clearAppData();
      
    } catch (error) {
      console.error('❌ Error al manejar usuario no autenticado:', error);
    }
  }
  
  /**
   * Carga los datos del usuario autenticado
   */
  async loadUserData(user) {
    try {
      console.log('📊 Cargando datos del usuario...');
      
      // Aquí se pueden cargar datos adicionales del usuario
      // como preferencias, configuración, etc.
      
      console.log('✅ Datos del usuario cargados');
      
    } catch (error) {
      console.error('❌ Error al cargar datos del usuario:', error);
    }
  }
  
  /**
   * Limpia los datos de la aplicación
   */
  clearAppData() {
    try {
      console.log('🧹 Limpiando datos de la aplicación...');
      
      // Limpiar estado global
      state.clear();
      
      // Limpiar caché de datos
      // Aquí se pueden limpiar otros datos almacenados
      
      console.log('✅ Datos de la aplicación limpiados');
      
    } catch (error) {
      console.error('❌ Error al limpiar datos de la aplicación:', error);
    }
  }
  
  /**
   * Maneja el cambio de ruta
   */
  async handleRouteChange(route) {
    try {
      console.log('🔄 Cambio de ruta:', route);
      
      this.currentRoute = route;
      
      // Verificar si la ruta requiere autenticación
      if (this.requiresAuth(route) && !this.currentUser) {
        console.log('🔒 Ruta requiere autenticación, redirigiendo...');
        router.navigateTo('/auth');
        return;
      }
      
      // Actualizar navegación activa
      ui.updateActiveNavigation(route);
      
      // Cargar página correspondiente
      await this.loadPage(route);
      
    } catch (error) {
      console.error('❌ Error al manejar cambio de ruta:', error);
    }
  }
  
  /**
   * Verifica si una ruta requiere autenticación
   */
  requiresAuth(route) {
    const publicRoutes = ['/auth'];
    return !publicRoutes.includes(route);
  }
  
  /**
   * Carga la página correspondiente a la ruta
   */
  async loadPage(route) {
    try {
      console.log('📄 Cargando página:', route);
      
      // Ocultar todas las páginas
      ui.hideAllPages();
      
      // Mostrar página de carga
      ui.showLoadingOverlay('Cargando...');
      
      // Cargar página según la ruta
      switch (route) {
        case '/':
          await this.loadDashboard();
          break;
        case '/evento':
          await this.loadEventoPage();
          break;
        case '/balances':
          await this.loadBalancesPage();
          break;
        case '/ajustes':
          await this.loadAjustesPage();
          break;
        case '/auth':
          ui.showAuthPage('login');
          break;
        default:
          await this.loadDashboard();
          break;
      }
      
      // Ocultar loading
      ui.hideLoadingOverlay();
      
    } catch (error) {
      console.error('❌ Error al cargar página:', error);
      ui.showError('Error al cargar la página');
      ui.hideLoadingOverlay();
    }
  }
  
  /**
   * Carga la página del dashboard
   */
  async loadDashboard() {
    try {
      console.log('🏠 Cargando dashboard...');
      
      // Mostrar página del dashboard
      ui.showPage('dashboardPage');
      
      // Cargar eventos del usuario
      await this.loadUserEventos();
      
    } catch (error) {
      console.error('❌ Error al cargar dashboard:', error);
      throw error;
    }
  }
  
  /**
   * Carga los eventos del usuario
   */
  async loadUserEventos() {
    try {
      console.log('📋 Cargando eventos del usuario...');
      const eventos = await eventsService.listMine();
      state.setEventos(eventos);
      this.renderEventosList(eventos);
      
    } catch (error) {
      console.error('❌ Error al cargar eventos:', error);
      throw error;
    }
  }

  renderEventosList(eventos) {
    const list = document.getElementById('eventosList');
    const empty = document.getElementById('emptyState');
    if (!list) return;
    list.innerHTML = '';
    if (!eventos || eventos.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    const frag = document.createDocumentFragment();
    eventos.forEach(evt => {
      const invited = Array.isArray(evt.participantesUids) ? evt.participantesUids.length : (Array.isArray(evt.participantes) ? evt.participantes.length : 0);
      const def = Number(evt.participantes_definidos || 0);
      const n = invited > 0 ? invited : (def > 0 ? def : 1);
      const share = Number(evt.monto || 0) / n;
      const owner = this.currentUser && evt.creado_por === this.currentUser.uid;
      const div = document.createElement('div');
      div.className = 'col-12 col-md-6 col-lg-4';
      div.innerHTML = `
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <h5 class="card-title mb-1">${evt.titulo || 'Evento'}</h5>
              <span class="badge ${evt.estado === 'cerrado' ? 'bg-secondary' : 'bg-success'}">${evt.estado || 'abierto'}${owner ? ' 👑' : ''}</span>
            </div>
            <p class="card-text text-muted mb-2">${(evt.moneda || '')} ${Number(evt.monto || 0).toFixed(2)}</p>
            <p class="card-text"><small class="text-muted">Tu parte aprox.: ${(evt.moneda || '')} ${share.toFixed(2)}</small></p>
            <button class="btn btn-outline-primary btn-sm" data-evento-id="${evt.id}">Ver</button>
          </div>
        </div>`;
      frag.appendChild(div);
    });
    list.appendChild(frag);

    // Wire up buttons
    list.querySelectorAll('button[data-evento-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-evento-id');
        const url = `/evento?id=${encodeURIComponent(id)}`;
        history.pushState({}, '', url);
        this.loadEventoPage();
      });
    });
  }

  async tryJoinPendingInvite() {
    try {
      let pending = null;
      try { pending = JSON.parse(localStorage.getItem('pendingInvite') || 'null'); } catch (_) {}
      if (!pending || !pending.id || !pending.invite) return;
      ui.showLoadingOverlay('Uniéndose al evento...');
      await eventsService.joinByInvite(pending.id, pending.invite);
      eventsService.clearPendingInvite();
      ui.hideLoadingOverlay();
      ui.showNotification('Te uniste al evento', 'success');
      // Actualizar dashboard
      await this.loadUserEventos();
      // Navegar al evento
      history.replaceState({}, '', '/');
      const url = `/evento?id=${encodeURIComponent(pending.id)}`;
      history.pushState({}, '', url);
      await this.loadEventoPage();
    } catch (e) {
      ui.hideLoadingOverlay();
      console.error('❌ Error al unirse por invitación:', e);
      ui.showError('No se pudo unir al evento con la invitación');
    }
  }
  
  /**
   * Carga la página de evento individual
   */
  async loadEventoPage() {
    try {
      console.log('📄 Cargando página de evento...');
      
      // Mostrar página de evento
      ui.showPage('eventoPage');
      
      // Obtener ID del evento de la URL
      const eventoId = this.getEventoIdFromUrl();
      if (eventoId) {
        await this.loadEventoData(eventoId);
      }
      
    } catch (error) {
      console.error('❌ Error al cargar página de evento:', error);
      throw error;
    }
  }
  
  /**
   * Carga la página de balances
   */
  async loadBalancesPage() {
    try {
      console.log('💰 Cargando página de balances...');
      
      // Mostrar página de balances
      ui.showPage('balancesPage');
      
      // Cargar balances del usuario
      await this.loadUserBalances();
      
    } catch (error) {
      console.error('❌ Error al cargar balances:', error);
      throw error;
    }
  }
  
  /**
   * Carga la página de ajustes
   */
  async loadAjustesPage() {
    try {
      console.log('⚙️ Cargando página de ajustes...');
      
      // Mostrar página de ajustes
      ui.showPage('ajustesPage');
      
      // Cargar configuración del usuario
      await this.loadUserSettings();
      
    } catch (error) {
      console.error('❌ Error al cargar ajustes:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene el ID del evento de la URL
   */
  getEventoIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
  }
  
  /**
   * Carga los datos de un evento específico
   */
  async loadEventoData(eventoId) {
    try {
      console.log('📄 Cargando datos del evento:', eventoId);
      ui.showLoadingOverlay('Cargando evento...');
      const evt = await eventsService.getEvento(eventoId);
      const titleEl = document.getElementById('eventoTitle');
      const contentEl = document.getElementById('eventoContent');
      if (!evt) {
        if (titleEl) titleEl.textContent = 'Evento no encontrado';
        if (contentEl) contentEl.innerHTML = '<div class="alert alert-warning">No tienes acceso o el evento no existe.</div>';
        ui.hideLoadingOverlay();
        return;
      }

      if (titleEl) titleEl.textContent = evt.titulo || 'Evento';
      if (contentEl) {
        const participantesCount = Array.isArray(evt.participantesUids) ? evt.participantesUids.length : (Array.isArray(evt.participantes) ? evt.participantes.length : 1);
        const share = participantesCount > 0 ? Number(evt.monto || 0) / participantesCount : 0;
        const creado = evt.creado_en && evt.creado_en.toDate ? evt.creado_en.toDate() : null;
        const creadoStr = creado ? creado.toLocaleString() : '';
        const shareUrl = `${window.location.origin}/?invite=${encodeURIComponent(evt.token_invitacion || '')}&id=${encodeURIComponent(evt.id)}`;
        const esCreador = this.currentUser && evt.creado_por === this.currentUser.uid;
        const partDef = Number(evt.participantes_definidos || 0);
        const shareEstimado = partDef > 0 ? Number(evt.monto || 0) / partDef : 0;
        contentEl.innerHTML = `
          <div class="row g-3">
            <div class="col-12 col-lg-8">
              <div class="card mb-3">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start">
                    <h5 class="card-title mb-1">Detalles</h5>
                    <span class="badge ${evt.estado === 'cerrado' ? 'bg-secondary' : 'bg-success'}">${evt.estado || 'abierto'}</span>
                  </div>
                  <ul class="list-unstyled mb-2 mt-2">
                    <li><strong>Monto:</strong> ${(evt.moneda || '')} ${Number(evt.monto || 0).toFixed(2)}</li>
                    <li><strong>Repetición:</strong> ${evt.repeticion || 'unico'}</li>
                    <li><strong>Participantes por invitación:</strong> ${participantesCount}</li>
                    ${partDef > 0 ? `<li><strong>Participantes definidos:</strong> ${partDef} <span class="text-muted">(estimación)</span></li>` : ''}
                    <li><strong>Tu parte (1/n):</strong> ${(evt.moneda || '')} ${share.toFixed(2)}</li>
                    ${partDef > 0 ? `<li><strong>Parte estimada (definidos):</strong> ${(evt.moneda || '')} ${shareEstimado.toFixed(2)}</li>` : ''}
                    ${creadoStr ? `<li><strong>Creado:</strong> ${creadoStr}</li>` : ''}
                  </ul>
                  ${evt.detalle ? `<div class="mt-2"><strong>Detalle:</strong><div class="border rounded p-2 mt-1">${evt.detalle.replace(/</g,'&lt;')}</div></div>` : ''}
                </div>
              </div>
              <div class="card mb-3">
                <div class="card-body">
                  <h5 class="card-title mb-2">Participantes</h5>
                  <div id="participantsList"></div>
                </div>
              </div>
              ${evt.estado !== 'cerrado' && esCreador ? `
              <div class="mt-3">
                <button class="btn btn-danger" id="btnCerrarEvento">Cerrar evento</button>
              </div>` : ''}
            </div>
            <div class="col-12 col-lg-4">
              <div class="card mb-3">
                <div class="card-body">
                  <h6 class="card-subtitle mb-2 text-muted">Invitar</h6>
                  <div class="input-group">
                    <input type="text" class="form-control" id="eventoShareLink" value="${shareUrl}" readonly>
                    <button class="btn btn-outline-primary" id="btnCopyInvite">Copiar</button>
                  </div>
                </div>
              </div>
              ${esCreador && evt.estado !== 'cerrado' ? `
              <div class="card">
                <div class="card-body">
                  <h6 class="card-subtitle mb-2 text-muted">Configuración</h6>
                  <div class="mb-2">
                    <label class="form-label" for="cfg_partdef">Participantes esperados</label>
                    <input type="number" class="form-control" id="cfg_partdef" min="1" value="${partDef || ''}">
                  </div>
                  <div class="mb-2">
                    <label class="form-label" for="cfg_detalle">Detalle</label>
                    <textarea class="form-control" id="cfg_detalle" rows="2">${evt.detalle ? evt.detalle.replace(/</g,'&lt;') : ''}</textarea>
                  </div>
                  <div class="d-grid">
                    <button class="btn btn-primary" id="btnGuardarCfg">Guardar</button>
                  </div>
                </div>
              </div>` : ''}
            </div>
          </div>
        `;

        const copyBtn = document.getElementById('btnCopyInvite');
        const linkInput = document.getElementById('eventoShareLink');
        if (copyBtn && linkInput) {
          copyBtn.addEventListener('click', async () => {
            try {
              if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(linkInput.value);
              } else {
                linkInput.removeAttribute('readonly');
                linkInput.select();
                linkInput.setSelectionRange(0, linkInput.value.length);
                document.execCommand('copy');
                linkInput.setAttribute('readonly', '');
              }
              ui.showNotification('Enlace copiado', 'success');
            } catch (e) {
              ui.showError('No se pudo copiar el enlace');
            }
          });
        }

        // Render participantes y pagos
        const plist = document.getElementById('participantsList');
        if (plist) {
          const uids = Array.isArray(evt.participantesUids) ? evt.participantesUids : [];
          if (uids.length === 0) {
            plist.innerHTML = '<div class="text-muted">Sin participantes aún.</div>';
          } else {
            const pagos = evt.pagos || {};
            const aliases = evt.aliases || {};
            const profiles = await userService.getProfiles(uids).catch(() => ({}));
            const isOwner = esCreador && evt.estado !== 'cerrado';
            const frag = document.createDocumentFragment();
            uids.forEach(uid => {
              const row = document.createElement('div');
              row.className = 'd-flex align-items-center justify-content-between border-bottom py-2';
              const isMe = this.currentUser && uid === this.currentUser.uid;
              const prof = profiles[uid] || {};
              const profName = prof.displayName || prof.email || '';
              const display = isMe ? 'Tú' : (aliases[uid] || profName || (uid.length > 10 ? uid.slice(0,6) + '…' + uid.slice(-4) : uid));
              const parte = (evt.monto && (participantesCount > 0 ? (Number(evt.monto)/participantesCount) : 0)) || 0;
              row.innerHTML = `
                <div class="me-2 flex-grow-1">
                  <div class="fw-semibold" title="${profName}">${display}</div>
                  <small class="text-muted">Parte: ${(evt.moneda||'')} ${parte.toFixed(2)}</small>
                </div>
                <div class="d-flex align-items-center gap-3">
                  ${isOwner ? `<div class="form-check form-switch m-0">
                    <input class="form-check-input" type="checkbox" id="paid_${uid}" ${pagos[uid] ? 'checked' : ''}>
                    <label class="form-check-label" for="paid_${uid}">Pagado</label>
                  </div>` : `${pagos[uid] ? '<span class="badge bg-success">Pagado</span>' : '<span class="badge bg-warning text-dark">Pendiente</span>'}`}
                  ${isOwner ? `<div class="input-group input-group-sm" style="width: 220px;">
                    <input type="text" class="form-control" id="alias_${uid}" placeholder="Alias" value="${aliases[uid] || ''}">
                    <button class="btn btn-outline-secondary" type="button" id="save_alias_${uid}">Guardar</button>
                  </div>` : ''}
                </div>`;
              frag.appendChild(row);
            });
            plist.appendChild(frag);

            if (isOwner) {
              uids.forEach(uid => {
                const input = document.getElementById(`paid_${uid}`);
                if (input) {
                  input.addEventListener('change', async () => {
                    try {
                      await eventsService.setPago(evt.id, uid, input.checked);
                      ui.showNotification('Pago actualizado', 'success');
                    } catch (e) {
                      ui.showError('No se pudo actualizar el pago');
                      input.checked = !input.checked;
                    }
                  });
                }
                const aliasInput = document.getElementById(`alias_${uid}`);
                const aliasBtn = document.getElementById(`save_alias_${uid}`);
                if (aliasBtn && aliasInput) {
                  aliasBtn.addEventListener('click', async () => {
                    try {
                      await eventsService.setAlias(evt.id, uid, aliasInput.value.trim());
                      ui.showNotification('Alias actualizado', 'success');
                    } catch (e) {
                      ui.showError('No se pudo actualizar el alias');
                    }
                  });
                }
              });
            }
          }
        }

        // Guardar configuración del evento (propietario)
        const btnGuardarCfg = document.getElementById('btnGuardarCfg');
        if (btnGuardarCfg) {
          btnGuardarCfg.addEventListener('click', async () => {
            const partdefEl = document.getElementById('cfg_partdef');
            const detalleEl = document.getElementById('cfg_detalle');
            const updates = {};
            const val = partdefEl && partdefEl.value ? Number(partdefEl.value) : null;
            if (val && val > 0) updates.participantes_definidos = val; else updates.participantes_definidos = null;
            if (detalleEl) updates.detalle = detalleEl.value;
            try {
              ui.showLoadingOverlay('Guardando...');
              await eventsService.updateEvento(evt.id, updates);
              ui.showNotification('Configuración guardada', 'success');
              await this.loadEventoData(evt.id);
            } catch (e) {
              ui.showError('No se pudo guardar la configuración');
            } finally {
              ui.hideLoadingOverlay();
            }
          });
        }
      }

      // Volver al dashboard
      const backBtn = document.getElementById('btnVolverEvento');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          history.pushState({}, '', '/');
          this.loadDashboard();
        });
      }

      // Cerrar evento (solo creador y si está abierto)
      const btnCerrar = document.getElementById('btnCerrarEvento');
      if (btnCerrar) {
        btnCerrar.addEventListener('click', async () => {
          if (!confirm('¿Seguro que deseas cerrar el evento?')) return;
          try {
            ui.showLoadingOverlay('Cerrando evento...');
            await eventsService.closeEvento(evt.id, this.currentUser?.uid);
            ui.showNotification('Evento cerrado', 'success');
            await this.loadEventoData(evt.id);
            await this.loadUserEventos();
          } catch (e) {
            console.error('❌ Error al cerrar evento:', e);
            ui.showError('No se pudo cerrar el evento');
          } finally {
            ui.hideLoadingOverlay();
          }
        });
      }

      ui.hideLoadingOverlay();
    } catch (error) {
      console.error('❌ Error al cargar datos del evento:', error);
      throw error;
    }
  }
  
  /**
   * Carga los balances del usuario
   */
  async loadUserBalances() {
    try {
      console.log('💰 Cargando balances del usuario...');
      const eventos = await eventsService.listMine();
      const closed = eventos.filter(e => e.estado === 'cerrado');
      const me = this.currentUser?.uid;
      const balancesByKey = new Map(); // key: otherUid|moneda -> amount (positivo: me cobra)

      closed.forEach(e => {
        const uids = Array.isArray(e.participantesUids) ? e.participantesUids : [];
        const def = Number(e.participantes_definidos || 0);
        const n = uids.length > 0 ? uids.length : (def > 0 ? def : 1);
        const share = Number(e.monto || 0) / n;
        const payer = e.quien_pago;
        const moneda = e.moneda || '';
        if (!me || !payer) return;
        if (!uids.includes(me)) return; // por reglas, debería incluirme

        if (me === payer) {
          // Cada otro me debe una parte
          uids.forEach(uid => {
            if (uid === me) return;
            const key = `${uid}|${moneda}`;
            balancesByKey.set(key, (balancesByKey.get(key) || 0) + share);
          });
        } else {
          // Yo debo al pagador
          const key = `${payer}|${moneda}`;
          balancesByKey.set(key, (balancesByKey.get(key) || 0) - share);
        }
      });

      const container = document.getElementById('balancesContent');
      if (!container) return;
      container.innerHTML = '';
      if (balancesByKey.size === 0) {
        container.innerHTML = '<div class="alert alert-info">No hay balances pendientes.</div>';
        return;
      }

      const list = document.createElement('div');
      list.className = 'list-group';
      balancesByKey.forEach((amount, key) => {
        const [otherUid, moneda] = key.split('|');
        const short = otherUid.length > 10 ? otherUid.slice(0,6) + '…' + otherUid.slice(-4) : otherUid;
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';
        const who = amount < 0 ? `Tú debes a ${short}` : `${short} te debe`;
        item.innerHTML = `
          <div>${who}</div>
          <div><strong>${moneda} ${Math.abs(amount).toFixed(2)}</strong></div>
        `;
        list.appendChild(item);
      });
      container.appendChild(list);
      
    } catch (error) {
      console.error('❌ Error al cargar balances:', error);
      throw error;
    }
  }
  
  /**
   * Carga la configuración del usuario
   */
  async loadUserSettings() {
    try {
      console.log('⚙️ Cargando configuración del usuario...');
      const content = document.getElementById('ajustesContent');
      const user = this.currentUser;
      if (!content || !user) return;
      const profile = await userService.getProfile().catch(() => null);
      const displayName = (profile && profile.displayName) || user.displayName || '';
      content.innerHTML = `
        <div class="card">
          <div class="card-body">
            <h5 class="card-title mb-3">Mi Perfil</h5>
            <div class="mb-3">
              <label class="form-label" for="pf_displayName">Nombre a mostrar</label>
              <input type="text" id="pf_displayName" class="form-control" value="${displayName}">
              <div class="form-text">Este nombre puede mostrarse a otros participantes.</div>
            </div>
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" value="${user.email || ''}" readonly>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-primary" id="pf_save">Guardar</button>
            </div>
          </div>
        </div>
        <div class="card mt-3">
          <div class="card-body">
            <h5 class="card-title mb-3">Seguridad</h5>
            <div class="row g-2">
              <div class="col-12 col-md-6">
                <label class="form-label" for="pf_newpass">Nueva contraseña</label>
                <input type="password" id="pf_newpass" class="form-control" placeholder="••••••••">
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label" for="pf_confirmpass">Confirmar contraseña</label>
                <input type="password" id="pf_confirmpass" class="form-control" placeholder="••••••••">
              </div>
            </div>
            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-outline-primary" id="pf_changepass">Cambiar contraseña</button>
              <button class="btn btn-outline-secondary" id="pf_resetemail">Enviar email de restablecimiento</button>
            </div>
            <div class="form-text mt-2">Si aparece un error de sesión reciente, usa el email de restablecimiento.</div>
          </div>
        </div>`;

      const btn = document.getElementById('pf_save');
      const input = document.getElementById('pf_displayName');
      if (btn && input) {
        btn.addEventListener('click', async () => {
          try {
            const name = input.value.trim();
            ui.showLoadingOverlay('Guardando perfil...');
            await authService.updateDisplayName(name);
            await userService.saveProfile({ displayName: name });
            ui.showNotification('Perfil actualizado', 'success');
          } catch (e) {
            ui.showError('No se pudo actualizar el perfil');
          } finally {
            ui.hideLoadingOverlay();
          }
        });
      }

      const changeBtn = document.getElementById('pf_changepass');
      const resetBtn = document.getElementById('pf_resetemail');
      const newPass = document.getElementById('pf_newpass');
      const confirmPass = document.getElementById('pf_confirmpass');
      if (changeBtn && newPass && confirmPass) {
        changeBtn.addEventListener('click', async () => {
          const np = newPass.value || '';
          const cp = confirmPass.value || '';
          if (!np || np.length < 6) return ui.showError('La contraseña debe tener al menos 6 caracteres');
          if (np !== cp) return ui.showError('Las contraseñas no coinciden');
          try {
            ui.showLoadingOverlay('Actualizando contraseña...');
            await authService.changePassword(np);
            ui.showNotification('Contraseña actualizada', 'success');
            newPass.value = '';
            confirmPass.value = '';
          } catch (e) {
            if (e && e.code === 'auth/requires-recent-login') {
              ui.showError('Requiere iniciar sesión nuevamente. Usa el email de restablecimiento.');
            } else {
              ui.showError('No se pudo cambiar la contraseña');
            }
          } finally {
            ui.hideLoadingOverlay();
          }
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
          try {
            ui.showLoadingOverlay('Enviando email...');
            await authService.sendPasswordReset();
            ui.showNotification('Email de restablecimiento enviado', 'success');
          } catch (e) {
            ui.showError('No se pudo enviar el email');
          } finally {
            ui.hideLoadingOverlay();
          }
        });
      }
    } catch (error) {
      console.error('❌ Error al cargar configuración:', error);
      throw error;
    }
  }
  
  /**
   * Maneja la creación de un nuevo evento
   */
  async handleCrearEvento() {
    try {
      console.log('➕ Creando nuevo evento...');
      
      // Verificar que el usuario esté autenticado
      if (!this.currentUser) {
        ui.showAuthPage('login');
        return;
      }
      
      // Mostrar modal de creación de evento
      const modal = ui.showModal(`
        <form id="createEventForm">
          <div class="mb-3">
            <label for="ce_titulo" class="form-label">Título</label>
            <input type="text" id="ce_titulo" name="titulo" class="form-control" required placeholder="Ej: Cena de cumpleaños">
          </div>
          <div class="row g-2">
            <div class="col-6">
              <label for="ce_monto" class="form-label">Monto</label>
              <input type="number" id="ce_monto" name="monto" step="0.01" min="0" class="form-control" required placeholder="0.00">
            </div>
            <div class="col-6">
              <label for="ce_moneda" class="form-label">Moneda</label>
              <select id="ce_moneda" name="moneda" class="form-select" required>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div class="row g-2 mt-2">
            <div class="col-6">
              <label for="ce_participantes_def" class="form-label">Participantes esperados</label>
              <input type="number" id="ce_participantes_def" name="participantes_definidos" min="1" class="form-control" placeholder="Ej: 4">
            </div>
          </div>
          <div class="mt-2">
            <label for="ce_detalle" class="form-label">Detalle (opcional)</label>
            <textarea id="ce_detalle" name="detalle" class="form-control" rows="2" placeholder="Notas para participantes"></textarea>
          </div>
          <div class="mt-3">
            <label for="ce_repeticion" class="form-label">Repetición</label>
            <select id="ce_repeticion" name="repeticion" class="form-select" required>
              <option value="unico">Único</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>
          <div class="mt-4 d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" id="ce_cancelar">Cancelar</button>
            <button type="submit" class="btn btn-primary">Crear</button>
          </div>
        </form>
      `, { title: 'Crear evento' });

      const form = modal.querySelector('#createEventForm');
      const cancelBtn = modal.querySelector('#ce_cancelar');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => ui.hideModal(modal));
      }
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const titulo = form.titulo.value.trim();
          const monto = parseFloat(form.monto.value);
          const moneda = form.moneda.value;
          const repeticion = form.repeticion.value;
          const participantes_definidos = form.participantes_definidos && form.participantes_definidos.value ? Number(form.participantes_definidos.value) : null;
          const detalle = form.detalle && form.detalle.value ? form.detalle.value.trim() : '';

          if (!titulo) return ui.showError('El título es requerido');
          if (!monto || monto <= 0) return ui.showError('El monto debe ser mayor a 0');
          if (!['ARS','USD'].includes(moneda)) return ui.showError('Moneda inválida');
          if (!['unico','mensual'].includes(repeticion)) return ui.showError('Repetición inválida');

          try {
            ui.showLoadingOverlay('Creando evento...');
            const result = await eventsService.createEvento({ titulo, monto, moneda, repeticion, participantes_definidos, detalle });
            ui.hideModal(modal);
            ui.showNotification('Evento creado correctamente', 'success');
            if (result && result.token && result.id) {
              const shareUrl = `${window.location.origin}/?invite=${encodeURIComponent(result.token)}&id=${encodeURIComponent(result.id)}`;
              const shareModal = ui.showModal(`
                <div class="mb-2">Comparte este enlace para invitar participantes:</div>
                <div class="input-group">
                  <input type="text" class="form-control" id="shareLink" value="${shareUrl}" readonly>
                  <button type="button" class="btn btn-primary" id="btnCopyLink">Copiar</button>
                </div>
                <div class="form-text mt-1">El enlace permite unirse al evento con login.</div>
              `, { title: 'Enlace de invitación' });

              const copyBtn = shareModal.querySelector('#btnCopyLink');
              const linkInput = shareModal.querySelector('#shareLink');
              if (copyBtn && linkInput) {
                copyBtn.addEventListener('click', async () => {
                  try {
                    if (navigator.clipboard && window.isSecureContext) {
                      await navigator.clipboard.writeText(linkInput.value);
                    } else {
                      linkInput.removeAttribute('readonly');
                      linkInput.select();
                      linkInput.setSelectionRange(0, linkInput.value.length);
                      document.execCommand('copy');
                      linkInput.setAttribute('readonly', '');
                    }
                    ui.showNotification('Enlace copiado al portapapeles', 'success');
                  } catch (e) {
                    ui.showError('No se pudo copiar. Copia manualmente el enlace.');
                  }
                });
              }
            }
            // refrescar lista en dashboard
            try { await this.loadUserEventos(); } catch (_) {}
          } catch (err) {
            console.error('❌ Error al crear evento:', err);
            const msg = err && err.message ? err.message : 'No se pudo crear el evento';
            ui.showError(msg);
          } finally {
            ui.hideLoadingOverlay();
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error al crear evento:', error);
      ui.showError('Error al crear evento');
    }
  }
  
  /**
   * Maneja el cierre de sesión
   */
  async handleLogout() {
    try {
      console.log('🚪 Cerrando sesión...');
      
      // Cerrar sesión en Firebase
      await authService.signOut();
      
      // Limpiar estado local
      this.currentUser = null;
      
      // Redirigir a autenticación
      router.navigateTo('/auth');
      
      console.log('✅ Sesión cerrada correctamente');
      
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      ui.showError('Error al cerrar sesión');
    }
  }
  
  /**
   * Alterna el menú móvil
   */
  toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    const navToggle = document.getElementById('navToggle');
    
    if (navMenu && navToggle) {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      
      navToggle.setAttribute('aria-expanded', !isExpanded);
      navMenu.classList.toggle('nav-menu--open');
    }
  }
}

// =============================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =============================================================================

// Crear instancia de la aplicación
const app = new GastosCompartidosApp();

// Exportar para uso global (desarrollo)
if (process.env.NODE_ENV === 'development') {
  window.app = app;
}

// Exportar por defecto
export default app;
