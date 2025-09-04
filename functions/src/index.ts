// =============================================================================
// GASTOS COMPARTIDOS - CLOUD FUNCTIONS
// =============================================================================

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicializar Firebase Admin
admin.initializeApp();

// Referencias a servicios
const db = admin.firestore();
const storage = admin.storage();
const messaging = admin.messaging();

// =============================================================================
// TIPOS Y INTERFACES
// =============================================================================

interface Participante {
  uid: string;
  alias: string;
  participacion: number;
}

interface Evento {
  id: string;
  titulo: string;
  moneda: 'ARS' | 'USD';
  monto: number;
  repeticion: 'unico' | 'mensual';
  estado: 'abierto' | 'cerrado';
  forma_pago: string;
  vence_el?: admin.firestore.Timestamp;
  creado_por: string;
  creado_en: admin.firestore.Timestamp;
  quien_pago?: string;
  fecha_pago?: admin.firestore.Timestamp;
  participantes: Participante[];
  token_invitacion: string;
  adjuntos: Array<{
    path: string;
    tipo: string;
    bytes: number;
    subido_por: string;
    subido_en: admin.firestore.Timestamp;
  }>;
}

interface Balance {
  key: string;
  entre: [string, string];
  moneda: 'ARS' | 'USD';
  saldo: number;
  actualizado_en: admin.firestore.Timestamp;
}

interface Invitacion {
  evento_id: string;
  token: string;
  creado_por: string;
  creado_en: admin.firestore.Timestamp;
  expira_en?: admin.firestore.Timestamp;
  usos: number;
  max_usos: number;
}

// =============================================================================
// FUNCIÓN: CÁLCULO DE BALANCES AL CERRAR EVENTO
// =============================================================================

/**
 * Trigger que se ejecuta cuando se cierra un evento
 * Calcula balances y crea evento recurrente si es necesario
 */
export const onEventoUpdate_cierre = functions.region('us-central1').firestore
  .document('eventos/{eventoId}')
  .onUpdate(async (change, context) => {
    const eventoId = context.params.eventoId;
    const before = change.before.data() as Evento;
    const after = change.after.data() as Evento;
    
    try {
      console.log(`🔄 Procesando cierre de evento: ${eventoId}`);
      
      // Solo procesar si el evento cambió de abierto a cerrado
      if (before.estado === 'abierto' && after.estado === 'cerrado') {
        console.log(`✅ Evento ${eventoId} cerrado, calculando balances...`);
        
        // Validar que quien_pago esté en participantes
        if (after.quien_pago && !after.participantes.find(p => p.uid === after.quien_pago)) {
          throw new Error(`Usuario ${after.quien_pago} no es participante del evento`);
        }
        
        // Calcular y actualizar balances
        await calcularBalances(after);
        
        // Crear evento recurrente si es mensual
        if (after.repeticion === 'mensual') {
          await crearEventoRecurrente(after);
        }
        
        // Enviar notificaciones push
        await enviarNotificacionesCierre(after);
        
        console.log(`✅ Evento ${eventoId} procesado correctamente`);
      }
      
    } catch (error) {
      console.error(`❌ Error procesando evento ${eventoId}:`, error);
      
      // Revertir el estado del evento si hay error
      await change.after.ref.update({
        estado: 'abierto',
        quien_pago: admin.firestore.FieldValue.delete(),
        fecha_pago: admin.firestore.FieldValue.delete()
      });
      
      throw error;
    }
  });

// =============================================================================
// FUNCIÓN: UNIRSE A EVENTO POR TOKEN
// =============================================================================

/**
 * Función callable para unirse a un evento usando un token de invitación
 */
export const joinByToken = functions.https.onCall(async (data, context) => {
  try {
    // Verificar autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    
    const { token } = data;
    const userId = context.auth.uid;
    
    if (!token) {
      throw new functions.https.HttpsError('invalid-argument', 'Token de invitación requerido');
    }
    
    console.log(`🔗 Usuario ${userId} intentando unirse con token: ${token}`);
    
    // Buscar invitación válida
    const invitacionRef = await db.collection('invitaciones')
      .where('token', '==', token)
      .limit(1)
      .get();
    
    if (invitacionRef.empty) {
      throw new functions.https.HttpsError('not-found', 'Token de invitación inválido');
    }
    
    const invitacion = invitacionRef.docs[0].data() as Invitacion;
    
    // Verificar que la invitación no haya expirado
    if (invitacion.expira_en && invitacion.expira_en.toDate() < new Date()) {
      throw new functions.https.HttpsError('deadline-exceeded', 'Token de invitación expirado');
    }
    
    // Verificar límite de usos
    if (invitacion.usos >= invitacion.max_usos) {
      throw new functions.https.HttpsError('resource-exhausted', 'Token de invitación agotado');
    }
    
    // Obtener evento
    const eventoRef = db.collection('eventos').doc(invitacion.evento_id);
    const eventoDoc = await eventoRef.get();
    
    if (!eventoDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Evento no encontrado');
    }
    
    const evento = eventoDoc.data() as Evento;
    
    // Verificar que el evento esté abierto
    if (evento.estado !== 'abierto') {
      throw new functions.https.HttpsError('failed-precondition', 'Evento ya cerrado');
    }
    
    // Verificar que el usuario no sea ya participante
    if (evento.participantes.find(p => p.uid === userId)) {
      throw new functions.https.HttpsError('already-exists', 'Usuario ya es participante del evento');
    }
    
    // Obtener información del usuario
    const userDoc = await db.collection('usuarios').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const alias = userData?.displayName || userData?.email?.split('@')[0] || 'Usuario';
    
    // Calcular nueva participación
    const nuevaParticipacion = 1 / (evento.participantes.length + 1);
    
    // Actualizar participaciones existentes
    const participantesActualizados = evento.participantes.map(p => ({
      ...p,
      participacion: nuevaParticipacion
    }));
    
    // Agregar nuevo participante
    participantesActualizados.push({
      uid: userId,
      alias,
      participacion: nuevaParticipacion
    });
    
    // Actualizar evento
    await eventoRef.update({
      participantes: participantesActualizados
    });
    
    // Incrementar contador de usos de la invitación
    await db.collection('invitaciones').doc(invitacionRef.docs[0].id).update({
      usos: admin.firestore.FieldValue.increment(1)
    });
    
    // Registrar auditoría
    await registrarAuditoria({
      tipo: 'INVITAR',
      evento_id: evento.id,
      actor: userId,
      en: admin.firestore.Timestamp.now(),
      payload: { token, alias }
    });
    
    // Enviar notificación al creador
    await enviarNotificacionNuevoParticipante(evento, alias);
    
    console.log(`✅ Usuario ${userId} agregado al evento ${evento.id}`);
    
    return {
      success: true,
      evento: {
        id: evento.id,
        titulo: evento.titulo,
        participantes: participantesActualizados.length
      }
    };
    
  } catch (error) {
    console.error('❌ Error en joinByToken:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Error interno del servidor');
  }
});

// =============================================================================
// FUNCIÓN: VALIDAR ADJUNTOS AL SUBIR
// =============================================================================

/**
 * Trigger que se ejecuta cuando se sube un archivo a Storage
 * Valida límites y tipos de archivo
 */
export const onStorageFinalize_validarAdjuntos = functions.region('us-central1').storage
  .object()
  .onFinalize(async (object) => {
    try {
      const filePath = object.name;
      const fileSize = object.size || 0;
      const contentType = object.contentType || '';
      
      console.log(`📁 Archivo subido: ${filePath}, tamaño: ${fileSize}, tipo: ${contentType}`);
      
      // Solo procesar archivos de eventos
      if (!filePath?.startsWith('events/')) {
        return;
      }
      
      // Extraer ID del evento del path
      const pathParts = filePath.split('/');
      if (pathParts.length < 3) {
        console.log('⚠️ Path de archivo inválido:', filePath);
        return;
      }
      
      const eventoId = pathParts[1];
      
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(contentType)) {
        console.log(`❌ Tipo de archivo no permitido: ${contentType}`);
        await eliminarArchivo(filePath);
        return;
      }
      
      // Validar tamaño (1MB máximo)
      const maxSize = 1 * 1024 * 1024;
      if (fileSize > maxSize) {
        console.log(`❌ Archivo demasiado grande: ${fileSize} bytes`);
        await eliminarArchivo(filePath);
        return;
      }
      
      // Contar archivos existentes en el evento
      const archivosExistentes = await contarArchivosEvento(eventoId);
      
      if (archivosExistentes >= 2) {
        console.log(`❌ Evento ${eventoId} ya tiene 2 archivos, eliminando: ${filePath}`);
        await eliminarArchivo(filePath);
        
        // Registrar auditoría
        await registrarAuditoria({
          tipo: 'SUBIR_ADJUNTO_RECHAZADO',
          evento_id: eventoId,
          actor: 'system',
          en: admin.firestore.Timestamp.now(),
          payload: { 
            filePath, 
            fileSize, 
            contentType, 
            motivo: 'Límite de archivos excedido' 
          }
        });
        
        return;
      }
      
      console.log(`✅ Archivo ${filePath} validado correctamente`);
      
    } catch (error) {
      console.error('❌ Error validando archivo:', error);
    }
  });

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

/**
 * Calcula los balances para un evento cerrado
 */
async function calcularBalances(evento: Evento): Promise<void> {
  try {
    console.log(`💰 Calculando balances para evento: ${evento.id}`);
    
    const quienPago = evento.quien_pago || evento.creado_por;
    const participantes = evento.participantes;
    
    // Calcular deudas por participante
    for (const participante of participantes) {
      if (participante.uid === quienPago) continue; // No hay deuda para quien pagó
      
      const deuda = evento.monto * participante.participacion;
      
      // Crear o actualizar balance
      await actualizarBalance(participante.uid, quienPago, evento.moneda, deuda);
    }
    
    console.log(`✅ Balances calculados para evento: ${evento.id}`);
    
  } catch (error) {
    console.error('❌ Error calculando balances:', error);
    throw error;
  }
}

/**
 * Actualiza un balance entre dos usuarios
 */
async function actualizarBalance(deudor: string, acreedor: string, moneda: string, deuda: number): Promise<void> {
  try {
    // Crear key ordenada alfabéticamente para idempotencia
    const [uidA, uidB] = [deudor, acreedor].sort();
    const key = `${uidA}_${uidB}_${moneda}`;
    
    const balanceRef = db.collection('balances').doc(key);
    
    // Obtener balance existente o crear uno nuevo
    const balanceDoc = await balanceRef.get();
    
    if (balanceDoc.exists) {
      const balance = balanceDoc.data() as Balance;
      let nuevoSaldo = balance.saldo;
      
      // Ajustar saldo según quién debe a quién
      if (uidA === deudor) {
        // deudor < acreedor, saldo -= deuda
        nuevoSaldo -= deuda;
      } else {
        // acreedor < deudor, saldo += deuda
        nuevoSaldo += deuda;
      }
      
      await balanceRef.update({
        saldo: nuevoSaldo,
        actualizado_en: admin.firestore.Timestamp.now()
      });
      
    } else {
      // Crear nuevo balance
      let saldoInicial = 0;
      
      if (uidA === deudor) {
        saldoInicial = -deuda;
      } else {
        saldoInicial = deuda;
      }
      
      await balanceRef.set({
        key,
        entre: [uidA, uidB],
        moneda,
        saldo: saldoInicial,
        actualizado_en: admin.firestore.Timestamp.now()
      });
    }
    
  } catch (error) {
    console.error('❌ Error actualizando balance:', error);
    throw error;
  }
}

/**
 * Crea un evento recurrente para el próximo mes
 */
async function crearEventoRecurrente(eventoOriginal: Evento): Promise<void> {
  try {
    console.log(`🔄 Creando evento recurrente para: ${eventoOriginal.titulo}`);
    
    // Calcular fecha del próximo mes
    const fechaActual = eventoOriginal.creado_en.toDate();
    const proximoMes = new Date(fechaActual);
    proximoMes.setMonth(proximoMes.getMonth() + 1);
    
    // Ajustar título
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const mesActual = meses[fechaActual.getMonth()];
    const mesProximo = meses[proximoMes.getMonth()];
    
    const tituloRecurrente = eventoOriginal.titulo.replace(
      new RegExp(mesActual, 'i'), 
      mesProximo
    );
    
    // Crear nuevo evento
    const nuevoEvento: Omit<Evento, 'id'> = {
      ...eventoOriginal,
      titulo: tituloRecurrente,
      creado_en: admin.firestore.Timestamp.now(),
      estado: 'abierto',
      quien_pago: undefined,
      fecha_pago: undefined,
      adjuntos: [],
      token_invitacion: generarTokenInvitacion()
    };
    
    // Ajustar fecha de vencimiento si existe
    if (eventoOriginal.vence_el) {
      const vencimientoOriginal = eventoOriginal.vence_el.toDate();
      const nuevoVencimiento = new Date(vencimientoOriginal);
      nuevoVencimiento.setMonth(nuevoVencimiento.getMonth() + 1);
      nuevoEvento.vence_el = admin.firestore.Timestamp.fromDate(nuevoVencimiento);
    }
    
    // Guardar en Firestore
    const nuevoEventoRef = await db.collection('eventos').add(nuevoEvento);
    
    console.log(`✅ Evento recurrente creado: ${nuevoEventoRef.id}`);
    
    // Crear invitación para el nuevo evento
    await crearInvitacion(nuevoEventoRef.id, eventoOriginal.creado_por);
    
  } catch (error) {
    console.error('❌ Error creando evento recurrente:', error);
    throw error;
  }
}

/**
 * Genera un token único para invitaciones
 */
function generarTokenInvitacion(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Crea una invitación para un evento
 */
async function crearInvitacion(eventoId: string, creadorUid: string): Promise<void> {
  try {
    const token = generarTokenInvitacion();
    
    await db.collection('invitaciones').add({
      evento_id: eventoId,
      token,
      creado_por: creadorUid,
      creado_en: admin.firestore.Timestamp.now(),
      expira_en: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
      ),
      usos: 0,
      max_usos: 50
    });
    
    console.log(`✅ Invitación creada para evento: ${eventoId}`);
    
  } catch (error) {
    console.error('❌ Error creando invitación:', error);
    throw error;
  }
}

/**
 * Envía notificaciones cuando se cierra un evento
 */
async function enviarNotificacionesCierre(evento: Evento): Promise<void> {
  try {
    console.log(`🔔 Enviando notificaciones de cierre para evento: ${evento.id}`);
    
    const participantes = evento.participantes;
    const quienPago = evento.quien_pago || evento.creado_por;
    
    for (const participante of participantes) {
      if (participante.uid === quienPago) continue; // No notificar a quien pagó
      
      const deuda = evento.monto * participante.participacion;
      const mensaje = `Evento "${evento.titulo}" cerrado. Debes ${deuda} ${evento.moneda}`;
      
      await enviarNotificacionPush(participante.uid, {
        titulo: 'Evento Cerrado',
        cuerpo: mensaje,
        datos: {
          tipo: 'EVENTO_CERRADO',
          evento_id: evento.id
        }
      });
    }
    
    console.log(`✅ Notificaciones de cierre enviadas`);
    
  } catch (error) {
    console.error('❌ Error enviando notificaciones de cierre:', error);
  }
}

/**
 * Envía notificación cuando se agrega un nuevo participante
 */
async function enviarNotificacionNuevoParticipante(evento: Evento, alias: string): Promise<void> {
  try {
    console.log(`🔔 Notificando nuevo participante: ${alias}`);
    
    await enviarNotificacionPush(evento.creado_por, {
      titulo: 'Nuevo Participante',
      cuerpo: `${alias} se unió al evento "${evento.titulo}"`,
      datos: {
        tipo: 'NUEVO_PARTICIPANTE',
        evento_id: evento.id
      }
    });
    
  } catch (error) {
    console.error('❌ Error enviando notificación de nuevo participante:', error);
  }
}

/**
 * Envía una notificación push a un usuario
 */
async function enviarNotificacionPush(userId: string, notificacion: {
  titulo: string;
  cuerpo: string;
  datos?: Record<string, string>;
}): Promise<void> {
  try {
    // Obtener token FCM del usuario
    const tokenDoc = await db.collection('fcm_tokens')
      .where('userId', '==', userId)
      .where('active', '==', true)
      .limit(1)
      .get();
    
    if (tokenDoc.empty) {
      console.log(`⚠️ No se encontró token FCM activo para usuario: ${userId}`);
      return;
    }
    
    const token = tokenDoc.docs[0].data().token;
    
    // Enviar notificación
    await messaging.send({
      token,
      notification: {
        title: notificacion.titulo,
        body: notificacion.cuerpo
      },
      data: notificacion.datos || {},
      android: {
        priority: 'high'
      },
      apns: {
        payload: {
          aps: {
            sound: 'default'
          }
        }
      }
    });
    
    console.log(`✅ Notificación enviada a usuario: ${userId}`);
    
  } catch (error) {
    console.error(`❌ Error enviando notificación a usuario ${userId}:`, error);
  }
}

/**
 * Elimina un archivo de Storage
 */
async function eliminarArchivo(filePath: string): Promise<void> {
  try {
    await storage.bucket().file(filePath).delete();
    console.log(`🗑️ Archivo eliminado: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error eliminando archivo ${filePath}:`, error);
  }
}

/**
 * Cuenta los archivos existentes en un evento
 */
async function contarArchivosEvento(eventoId: string): Promise<number> {
  try {
    const [files] = await storage.bucket().getFiles({
      prefix: `events/${eventoId}/`
    });
    
    return files.length;
    
  } catch (error) {
    console.error(`❌ Error contando archivos del evento ${eventoId}:`, error);
    return 0;
  }
}

/**
 * Registra una auditoría en Firestore
 */
async function registrarAuditoria(auditoria: {
  tipo: string;
  evento_id: string;
  actor: string;
  en: admin.firestore.Timestamp;
  payload?: any;
}): Promise<void> {
  try {
    await db.collection('auditorias').add(auditoria);
    console.log(`📝 Auditoría registrada: ${auditoria.tipo}`);
  } catch (error) {
    console.error('❌ Error registrando auditoría:', error);
  }
}

// =============================================================================
// EXPORTACIONES
// =============================================================================

export {
  onEventoUpdate_cierre,
  joinByToken,
  onStorageFinalize_validarAdjuntos
};
// =============================================================================
// FUNCIÓN: CREAR EVENTO (callable - POST)
// =============================================================================

export const createEvento = functions.region('us-central1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe estar autenticado.');
  }

  const userId = context.auth.uid;
  const titulo = (data?.titulo || '').toString().trim();
  const monto = Number(data?.monto || 0);
  const moneda = (data?.moneda || '').toString();
  const repeticion = (data?.repeticion || '').toString();

  if (!titulo) {
    throw new functions.https.HttpsError('invalid-argument', 'El título es requerido');
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Monto inválido');
  }
  if (!['ARS', 'USD'].includes(moneda)) {
    throw new functions.https.HttpsError('invalid-argument', 'Moneda inválida');
  }
  if (!['unico', 'mensual'].includes(repeticion)) {
    throw new functions.https.HttpsError('invalid-argument', 'Repetición inválida');
  }

  const now = admin.firestore.Timestamp.now();
  const eventoRef = db.collection('eventos').doc();
  const token = generarTokenInvitacion();

  const participantes: Participante[] = [
    {
      uid: userId,
      alias: 'Creador',
      participacion: 1,
    },
  ];

  const evento: Evento = {
    id: eventoRef.id,
    titulo,
    moneda: moneda as 'ARS' | 'USD',
    monto,
    repeticion: repeticion as 'unico' | 'mensual',
    estado: 'abierto',
    forma_pago: 'desconocida',
    creado_por: userId,
    creado_en: now,
    participantes,
    token_invitacion: token,
    adjuntos: [],
  } as any;

  await eventoRef.set(evento);

  // Crear invitación asociada para joinByToken
  const invitacion: Invitacion = {
    evento_id: evento.id,
    token,
    creado_por: userId,
    creado_en: now,
    usos: 0,
    max_usos: 100,
  };
  await db.collection('invitaciones').doc(token).set(invitacion);

  return { id: evento.id, token };
});

function generarTokenInvitacion(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
