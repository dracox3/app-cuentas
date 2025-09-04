// =============================================================================
// UI - UTILIDADES DE INTERFAZ DE USUARIO
// =============================================================================

class UI {
  constructor() {
    this.notifications = [];
    this.modals = [];
  }

  // Mostrar/ocultar elementos
  show(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    if (element) {
      element.style.display = 'block';
    }
  }

  hide(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    if (element) {
      element.style.display = 'none';
    }
  }

  // Mostrar notificaciones
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <span class="notification__message">${message}</span>
      <button class="notification__close">&times;</button>
    `;

    // Estilos básicos
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 16px',
      borderRadius: '4px',
      color: 'white',
      zIndex: '1000',
      maxWidth: '300px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    });

    // Colores según tipo
    const colors = {
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FF9800',
      info: '#2196F3'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    // Botón de cerrar
    const closeBtn = notification.querySelector('.notification__close');
    closeBtn.style.marginLeft = '10px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.fontSize = '18px';

    closeBtn.addEventListener('click', () => {
      this.hideNotification(notification);
    });

    document.body.appendChild(notification);
    this.notifications.push(notification);

    // Auto-ocultar después de la duración especificada
    if (duration > 0) {
      setTimeout(() => {
        this.hideNotification(notification);
      }, duration);
    }

    return notification;
  }

  hideNotification(notification) {
    if (notification && notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        notification.parentNode.removeChild(notification);
        this.notifications = this.notifications.filter(n => n !== notification);
      }, 300);
    }
  }

  // Mostrar error (alias para showNotification con tipo error)
  showError(message, duration = 5000) {
    return this.showNotification(message, 'error', duration);
  }

  // Mostrar página de carga (usa #loadingPage del DOM)
  showLoadingPage(message = 'Cargando...') {
    const loadingPage = document.getElementById('loadingPage');
    if (loadingPage) {
      loadingPage.style.display = 'block';
      const msg = loadingPage.querySelector('p');
      if (msg) msg.textContent = message;
    }
  }

  // Ocultar página de carga (usa #loadingPage)
  hideLoadingPage() {
    const loadingPage = document.getElementById('loadingPage');
    if (loadingPage) loadingPage.style.display = 'none';
  }

  // Páginas
  hideAllPages() {
    const pages = ['authPage', 'dashboardPage', 'eventoPage', 'balancesPage', 'ajustesPage'];
    pages.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  showPage(id) {
    this.hideLoadingPage();
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
  }

  // Auth UI
  showAuthPage(mode = 'login') {
    this.hideLoadingPage();
    const authPage = document.getElementById('authPage');
    if (authPage) {
      authPage.style.display = 'block';
      const title = authPage.querySelector('.auth-title');
      if (title) title.textContent = mode === 'register' ? 'Registrarse' : 'Iniciar Sesión';
      const form = document.getElementById('authForm');
      if (form) {
        form.dataset.mode = mode;
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.textContent = mode === 'register' ? 'Crear Cuenta' : 'Iniciar Sesión';
        }
        const displayNameGroup = document.getElementById('displayNameGroup');
        if (displayNameGroup) displayNameGroup.style.display = mode === 'register' ? 'block' : 'none';
      }
      const toggleBtn = document.getElementById('btnCambiarRegistro');
      if (toggleBtn) {
        toggleBtn.textContent = mode === 'register' ? 'Inicia sesión aquí' : 'Regístrate aquí';
      }
    }
    this.showAuthButtons();
  }

  hideAuthPage() {
    const authPage = document.getElementById('authPage');
    if (authPage) authPage.style.display = 'none';
  }

  // User menu / Auth buttons
  showUserMenu(user) {
    const userMenu = document.getElementById('userMenu');
    const authButtons = document.getElementById('authButtons');
    if (authButtons) authButtons.style.display = 'none';
    if (userMenu) {
      userMenu.style.display = 'block';
      const avatar = document.getElementById('userAvatar');
      const avatarText = avatar ? avatar.querySelector('.avatar-text') : null;
      if (avatarText) {
        const letter = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();
        avatarText.textContent = letter;
      }
    }
  }

  hideUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) userMenu.style.display = 'none';
  }

  showAuthButtons() {
    const authButtons = document.getElementById('authButtons');
    if (authButtons) authButtons.style.display = 'block';
  }

  hideAuthButtons() {
    const authButtons = document.getElementById('authButtons');
    if (authButtons) authButtons.style.display = 'none';
  }

  // Navegación activa
  updateActiveNavigation(route) {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
      const r = link.getAttribute('data-route');
      if (r === route) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Overlays de carga
  showLoadingOverlay(message = 'Cargando...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      const msg = document.getElementById('loadingMessage');
      if (msg) msg.textContent = message;
    }
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  // Estados vacíos
  showEmptyState() {
    const el = document.getElementById('emptyState');
    if (el) el.style.display = 'block';
  }

  // Mostrar modal
  showModal(content, options = {}) {
    // Evitar conflicto con Bootstrap: usar prefijo gc-
    const modal = document.createElement('div');
    modal.className = 'gc-modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="gc-modal__overlay"></div>
      <div class="gc-modal__content">
        <div class="gc-modal__header">
          <h3 class="gc-modal__title">${options.title || ''}</h3>
          <button class="gc-modal__close">&times;</button>
        </div>
        <div class="gc-modal__body">
          ${content}
        </div>
      </div>
    `;

    // Estilos básicos
    const overlay = modal.querySelector('.gc-modal__overlay');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: '1050'
    });

    const modalContent = modal.querySelector('.gc-modal__content');
    Object.assign(modalContent.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '0',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: '1055',
      maxWidth: '500px',
      width: '90%'
    });

    const modalHeader = modal.querySelector('.gc-modal__header');
    Object.assign(modalHeader.style, {
      padding: '16px 20px',
      borderBottom: '1px solid #eee',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    });

    const modalTitle = modal.querySelector('.gc-modal__title');
    modalTitle.style.margin = '0';

    const closeBtn = modal.querySelector('.gc-modal__close');
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#666'
    });

    const modalBody = modal.querySelector('.gc-modal__body');
    modalBody.style.padding = '20px';

    // Eventos
    overlay.addEventListener('click', () => this.hideModal(modal));
    closeBtn.addEventListener('click', () => this.hideModal(modal));

    document.body.appendChild(modal);
    this.modals.push(modal);

    return modal;
  }

  hideModal(modal) {
    if (modal && modal.parentNode) {
      modal.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        modal.parentNode.removeChild(modal);
        this.modals = this.modals.filter(m => m !== modal);
      }, 300);
    }
  }

  // Utilidades para formularios
  clearForm(form) {
    if (typeof form === 'string') {
      form = document.querySelector(form);
    }
    if (form && form.tagName === 'FORM') {
      form.reset();
    }
  }

  serializeForm(form) {
    if (typeof form === 'string') {
      form = document.querySelector(form);
    }
    if (!form || form.tagName !== 'FORM') return {};

    const data = {};
    const formData = new FormData(form);

    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }

    return data;
  }

  // Loading states
  showLoading(element, text = 'Cargando...') {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    if (!element) return;

    element.innerHTML = `
      <div class="loading">
        <div class="loading__spinner"></div>
        <span class="loading__text">${text}</span>
      </div>
    `;

    const spinner = element.querySelector('.loading__spinner');
    Object.assign(spinner.style, {
      width: '20px',
      height: '20px',
      border: '2px solid #f3f3f3',
      borderTop: '2px solid #3498db',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      display: 'inline-block',
      marginRight: '8px'
    });

    // Agregar keyframes para la animación
    if (!document.getElementById('loading-keyframes')) {
      const style = document.createElement('style');
      style.id = 'loading-keyframes';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  hideLoading(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    if (element) {
      element.innerHTML = '';
    }
  }

  // Utilidades generales
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }
}

// Crear instancia única
const ui = new UI();

export { ui };
