// =============================================================================
// EVENTS SERVICE - CREACIÓN Y GESTIÓN DE EVENTOS (Firestore directo)
// =============================================================================

import { collection, doc, setDoc, serverTimestamp, query, where, getDocs, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { getFirestore, getAuth } from '../core/firebase.js';

class EventsService {
  constructor() {
    this.db = null;
    this.auth = null;
  }

  initialize() {
    if (!this.db) this.db = getFirestore();
    if (!this.auth) this.auth = getAuth();
  }

  /**
   * Crea un evento escribiendo en Firestore
   * @param {Object} payload
   * @param {string} payload.titulo
   * @param {number} payload.monto
   * @param {('ARS'|'USD')} payload.moneda
   * @param {('unico'|'mensual')} payload.repeticion
   * @returns {Promise<{id:string, token:string}>}
   */
  async createEvento(payload) {
    this.initialize();

    const required = ['titulo', 'monto', 'moneda', 'repeticion'];
    for (const k of required) {
      if (payload[k] === undefined || payload[k] === null || payload[k] === '') {
        throw new Error(`Falta el campo requerido: ${k}`);
      }
    }

    const user = this.auth.currentUser;
    if (!user) throw new Error('Debe iniciar sesión');

    const { titulo } = payload;
    const monto = Number(payload.monto);
    const moneda = String(payload.moneda);
    const repeticion = String(payload.repeticion);
    const participantes_definidos = payload.participantes_definidos ? Number(payload.participantes_definidos) : null;
    const detalle = (payload.detalle || '').toString();

    if (!Number.isFinite(monto) || monto <= 0) throw new Error('Monto inválido');
    if (!['ARS', 'USD'].includes(moneda)) throw new Error('Moneda inválida');
    if (!['unico', 'mensual'].includes(repeticion)) throw new Error('Repetición inválida');

    // Precrear ID de evento y token
    const eventoRef = doc(collection(this.db, 'eventos'));
    const token = this._genToken();

    // Datos del evento (deben cumplir reglas: incluir participantesUids con el UID actual)
    const aliasCreador = user.displayName || (user.email ? user.email.split('@')[0] : 'Creador');
    const eventoData = {
      id: eventoRef.id,
      titulo,
      moneda,
      monto,
      repeticion,
      estado: 'abierto',
      forma_pago: 'desconocida',
      creado_por: user.uid,
      creado_en: serverTimestamp(),
      participantes: [
        { uid: user.uid, alias: aliasCreador, participacion: 1 }
      ],
      participantesUids: [user.uid],
      aliases: { [user.uid]: aliasCreador },
      token_invitacion: token,
      adjuntos: [],
      detalle: detalle,
      pagos: {},
      ...(Number.isFinite(participantes_definidos) && participantes_definidos > 0 ? { participantes_definidos } : {})
    };

    // Crear evento
    await setDoc(eventoRef, eventoData, { merge: false });

    // Crear invitación con el token como ID
    const invitacionRef = doc(this.db, 'invitaciones', token);
    const invitacionData = {
      evento_id: eventoRef.id,
      token,
      creado_por: user.uid,
      creado_en: serverTimestamp(),
      usos: 0,
      max_usos: 100
    };
    await setDoc(invitacionRef, invitacionData, { merge: false });

    return { id: eventoRef.id, token };
  }

  /**
   * Lista eventos donde el usuario actual es participante
   * @returns {Promise<Array>} lista de eventos
   */
  async listMine() {
    this.initialize();
    const user = this.auth.currentUser;
    if (!user) throw new Error('Debe iniciar sesión');

    const colRef = collection(this.db, 'eventos');
    const q = query(colRef, where('participantesUids', 'array-contains', user.uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  /**
   * Obtiene un evento por ID (requiere ser participante)
   * @param {string} eventoId
   * @returns {Promise<Object|null>}
   */
  async getEvento(eventoId) {
    this.initialize();
    if (!eventoId) throw new Error('ID de evento requerido');
    const ref = doc(this.db, 'eventos', eventoId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }

  /**
   * Unirse a un evento usando token de invitación (sin Functions)
   * @param {string} eventoId
   * @param {string} token
   */
  async joinByInvite(eventoId, token) {
    this.initialize();
    const user = this.auth.currentUser;
    if (!user) throw new Error('Debe iniciar sesión');

    const eventoRef = doc(this.db, 'eventos', eventoId);
    // Es suficiente actualizar el array de UIDs; reglas verifican token y cambios limitados
    await updateDoc(eventoRef, {
      participantesUids: arrayUnion(user.uid),
      // campo auxiliar para validación de reglas
      last_join_token: token
    });
    return true;
  }

  /**
   * Cierra un evento (marca estado=cerrado, quien_pago y fecha_pago)
   * @param {string} eventoId
   * @param {string} quienPagoUid
   */
  async closeEvento(eventoId, quienPagoUid) {
    this.initialize();
    const user = this.auth.currentUser;
    if (!user) throw new Error('Debe iniciar sesión');
    if (!eventoId) throw new Error('ID de evento requerido');
    const eventoRef = doc(this.db, 'eventos', eventoId);
    await updateDoc(eventoRef, {
      estado: 'cerrado',
      quien_pago: quienPagoUid || user.uid,
      fecha_pago: serverTimestamp()
    });
    return true;
  }

  /**
   * Actualiza campos del evento (solo creador)
   */
  async updateEvento(eventoId, updates) {
    this.initialize();
    if (!eventoId) throw new Error('ID de evento requerido');
    const ref = doc(this.db, 'eventos', eventoId);
    await updateDoc(ref, updates);
  }

  /**
   * Marca pago de un participante (solo creador)
   */
  async setPago(eventoId, uid, pagado) {
    this.initialize();
    if (!eventoId || !uid) throw new Error('Datos requeridos');
    const ref = doc(this.db, 'eventos', eventoId);
    const field = `pagos.${uid}`;
    await updateDoc(ref, { [field]: !!pagado });
  }

  /**
   * Establece alias (nombre/identificador visible) para un participante (solo creador)
   */
  async setAlias(eventoId, uid, alias) {
    this.initialize();
    if (!eventoId || !uid) throw new Error('Datos requeridos');
    const ref = doc(this.db, 'eventos', eventoId);
    const field = `aliases.${uid}`;
    await updateDoc(ref, { [field]: alias || '' });
  }

  /**
   * Limpia el pendiente de invitación almacenado
   */
  clearPendingInvite() {
    try { localStorage.removeItem('pendingInvite'); } catch (_) {}
  }

  _genToken(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
  }
}

export const eventsService = new EventsService();
