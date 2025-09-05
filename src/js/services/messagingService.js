// =============================================================================
// MESSAGING SERVICE - Firebase Cloud Messaging (FCM)
// =============================================================================

import { getMessaging } from '../core/firebase.js';
import { getFirestore } from '../core/firebase.js';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { ui } from '../ui/ui.js';

class MessagingService {
  constructor() {
    this.messaging = null;
    this.db = null;
    this.currentToken = null;
    this.swRegistration = null;
    this.initialized = false;
    this._hostingInitAvailable = null;
  }

  async initialize() {
    if (this.initialized) return;
    try {
      this.messaging = await getMessaging();
      this.db = getFirestore();
      const hostingOk = await this._canUseFirebaseHostingInit();
      // Registrar Service Worker (si aún no está registrado)
      if (hostingOk && 'serviceWorker' in navigator) {
        try {
          this.swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          // Asegurar que esté activo
          await navigator.serviceWorker.ready;
          console.log('✓ SW FCM registrado');
        } catch (e) {
          console.warn('⚠ No se pudo registrar el SW de FCM:', e?.message || e);
        }
      } else {
        console.warn('⚠ Service Workers no soportados en este navegador');
      }

      // Suscripción a mensajes en foreground
      try {
        onMessage(this.messaging, (payload) => {
          const title = payload?.notification?.title || 'Notificación';
          const body = payload?.notification?.body || '';
          ui.showNotification(`${title}: ${body}`, 'info');
          console.log('FCM foreground message:', payload);
        });
      } catch (e) {
        console.warn('⚠ No se pudo suscribir a onMessage:', e?.message || e);
      }

      this.initialized = true;
    } catch (e) {
      console.error('❌ Error inicializando Messaging:', e);
    }
  }

  async enableForUser(user) {
    try {
      await this.initialize();
      // Evitar registro de token en dev local si __/firebase no está disponible
      try {
        const canUse = await this._canUseFirebaseHostingInit();
        if (!canUse) {
          console.info('FCM deshabilitado en dev local (sin __/firebase). Usa Hosting Emulador o despliega para probar push.');
          return null;
        }
      } catch (_) {}

      // Validar VAPID key
      const vapidKey = process.env.FCM_VAPID_KEY;
      if (!vapidKey || vapidKey === 'tu_vapid_key_aqui') {
        console.warn('⚠ FCM_VAPID_KEY no configurado. FCM deshabilitado.');
        return null;
      }

      // Solicitar permiso
      if (!('Notification' in window)) {
        console.warn('⚠ Notifications API no soportada');
        return null;
      }

      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') {
        console.log('ℹ Permiso de notificaciones no concedido');
        return null;
      }

      // Obtener token
      const token = await getToken(this.messaging, {
        vapidKey,
        serviceWorkerRegistration: this.swRegistration || undefined,
      });

      if (!token) {
        console.warn('⚠ No se obtuvo token FCM');
        return null;
      }

      this.currentToken = token;

      // Guardar/activar token en Firestore
      const ref = doc(this.db, 'fcm_tokens', token);
      await setDoc(ref, {
        token,
        userId: user.uid,
        active: true,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      }, { merge: true });

      console.log('✓ Token FCM registrado');
      return token;
    } catch (e) {
      console.error('❌ Error habilitando FCM:', e);
      return null;
    }
  }

  async disableForUser() {
    try {
      await this.initialize();
      // Marcar token como inactivo en Firestore si existe
      if (this.currentToken) {
        try {
          const ref = doc(this.db, 'fcm_tokens', this.currentToken);
          await updateDoc(ref, { active: false, updated_at: serverTimestamp() });
        } catch (_) {}
      }
      // Opcional: borrar token del dispositivo
      try {
        if (this.messaging && this.currentToken) {
          await deleteToken(this.messaging);
        }
      } catch (e) {
        console.warn('⚠ No se pudo borrar el token local:', e?.message || e);
      }
      this.currentToken = null;
    } catch (e) {
      console.error('❌ Error deshabilitando FCM:', e);
    }
  }

  // Detecta si el auto-init de Firebase Hosting está disponible en este origen
  async _canUseFirebaseHostingInit() {
    if (this._hostingInitAvailable !== null) return this._hostingInitAvailable;
    try {
      const res = await fetch('/__/firebase/init.js', { method: 'GET', cache: 'no-store' });
      this._hostingInitAvailable = !!res && res.ok;
    } catch (e) {
      this._hostingInitAvailable = false;
    }
    return this._hostingInitAvailable;
  }
}

export const messagingService = new MessagingService();
