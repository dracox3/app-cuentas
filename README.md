# Gastos Compartidos

Aplicación web para gestionar gastos compartidos entre amigos y familiares de forma fácil y transparente.

## 🚀 Características

- **Gestión de eventos**: Crear, editar y cerrar eventos de gastos compartidos
- **Participantes flexibles**: Agregar participantes con participaciones personalizables
- **Monedas soportadas**: ARS (Pesos) y USD (Dólares)
- **Eventos recurrentes**: Creación automática de eventos mensuales
- **Adjuntos**: Subir hasta 2 archivos por evento (imágenes y PDFs)
- **Notificaciones push**: FCM para eventos importantes
- **Balances automáticos**: Cálculo automático de deudas al cerrar eventos
- **Invitaciones por link**: Compartir eventos mediante tokens únicos
- **Responsive design**: Interfaz optimizada para móviles y desktop

## 🛠️ Tecnologías

- **Frontend**: HTML5, SCSS, JavaScript ES6+ (ESM)
- **Build**: Webpack 5 con optimizaciones
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **Notificaciones**: Firebase Cloud Messaging (FCM)
- **Hosting**: Firebase Hosting
- **Base de datos**: Firestore (NoSQL)

## 📋 Requisitos

- Node.js 18+ 
- npm o yarn
- Cuenta de Firebase
- Navegador moderno con soporte para ES6+

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd gastos-compartidos
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Firebase

#### 3.1 Crear proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita los servicios:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage
   - Cloud Functions
   - Hosting

#### 3.2 Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Copiar el archivo de ejemplo
cp .env.local.example .env.local

# Editar con tus valores de Firebase
FIREBASE_API_KEY=tu_api_key_aqui
FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu_proyecto_id
FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

#### 3.3 Inicializar Firebase

```bash
# Instalar Firebase CLI globalmente
npm install -g firebase-tools

# Iniciar sesión en Firebase
firebase login

# Inicializar el proyecto
firebase init

# Seleccionar:
# - Hosting
# - Firestore
# - Storage
# - Functions
```

### 4. Configurar Cloud Functions

```bash
# Instalar dependencias de Functions
npm run functions:install

# Compilar Functions
npm run functions:build

# Desplegar Functions
npm run functions:deploy
```

## 🏃‍♂️ Desarrollo

### Servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Build de producción

```bash
npm run build
```

Los archivos se generarán en la carpeta `dist/`

### Emuladores de Firebase

```bash
# Iniciar emuladores
firebase emulators:start

# Los emuladores estarán disponibles en:
# - Auth: http://localhost:9099
# - Firestore: http://localhost:8080
# - Storage: http://localhost:9199
# - Functions: http://localhost:5001
# - UI: http://localhost:4000
```

## 📁 Estructura del proyecto

```
gastos-compartidos/
├── src/                    # Código fuente
│   ├── html/              # Plantillas HTML
│   ├── scss/              # Estilos SCSS
│   ├── js/                # JavaScript
│   │   ├── core/          # Funcionalidades core
│   │   ├── services/      # Servicios de Firebase
│   │   ├── ui/            # Componentes de UI
│   │   └── pages/         # Páginas de la aplicación
│   └── assets/            # Imágenes, íconos, etc.
├── functions/              # Cloud Functions
├── dist/                   # Build de producción
├── .firebase/              # Configuración de Firebase
├── webpack.config.js       # Configuración de Webpack
├── firebase.json           # Configuración de Firebase
├── firestore.rules         # Reglas de seguridad de Firestore
├── storage.rules           # Reglas de seguridad de Storage
└── package.json            # Dependencias del proyecto
```

## 🔧 Configuración

### Webpack

El proyecto usa Webpack 5 con las siguientes características:

- **SCSS**: Soporte completo para Sass/SCSS
- **ES6+**: Soporte para módulos ES6 y características modernas
- **Assets**: Manejo automático de imágenes, fuentes y archivos
- **Optimización**: Code splitting, minificación y cache busting
- **Dev Server**: Hot reload y source maps

### Firebase

#### Firestore Rules

Las reglas de seguridad implementan:

- Solo usuarios autenticados pueden crear eventos
- Solo participantes pueden leer/editar eventos
- Solo creadores pueden editar después del cierre
- Validaciones de integridad de datos

#### Storage Rules

- Límite de 1MB por archivo
- Solo tipos permitidos: JPG, PNG, GIF, PDF
- Máximo 2 archivos por evento
- Solo participantes pueden subir archivos

#### Cloud Functions

- **onEventoUpdate_cierre**: Calcula balances y crea eventos recurrentes
- **joinByToken**: Permite unirse a eventos mediante tokens
- **onStorageFinalize_validarAdjuntos**: Valida archivos subidos

## 📱 Funcionalidades principales

### 1. Gestión de Eventos

- Crear eventos con título, monto, moneda y participantes
- Configurar participaciones personalizadas
- Establecer fechas de vencimiento
- Configurar eventos recurrentes (mensuales)

### 2. Sistema de Participantes

- Agregar participantes por email
- Participaciones editables (por defecto 1/n)
- Validación de participaciones (suma = 1.0)

### 3. Adjuntos

- Subir hasta 2 archivos por evento
- Tipos permitidos: JPG, PNG, GIF, PDF
- Límite de 1MB por archivo
- Validación automática en Cloud Functions

### 4. Cierre de Eventos

- Establecer quién pagó
- Cálculo automático de balances
- Creación de eventos recurrentes
- Notificaciones push a participantes

### 5. Sistema de Balances

- Cálculo automático de deudas
- Agrupación por pares de usuarios
- Separación por moneda
- Actualización en tiempo real

### 6. Invitaciones

- Tokens únicos por evento
- Links compartibles
- Límite de usos configurable
- Expiración automática

## 🔐 Seguridad

### Autenticación

- Firebase Authentication
- Email/password
- Google Sign-In (opcional)
- Verificación de email

### Autorización

- Reglas de Firestore por usuario
- Reglas de Storage por evento
- Validación en Cloud Functions
- Auditoría de acciones

### Validación de datos

- Validación en frontend
- Validación en backend (Cloud Functions)
- Reglas de Firestore
- Reglas de Storage

## 📊 Modelo de datos

### Colección: eventos

```typescript
interface Evento {
  id: string;
  titulo: string;
  moneda: 'ARS' | 'USD';
  monto: number;
  repeticion: 'unico' | 'mensual';
  estado: 'abierto' | 'cerrado';
  forma_pago: string;
  vence_el?: Timestamp;
  creado_por: string;
  creado_en: Timestamp;
  quien_pago?: string;
  fecha_pago?: Timestamp;
  participantes: Participante[];
  token_invitacion: string;
  adjuntos: Adjunto[];
}
```

### Colección: balances

```typescript
interface Balance {
  key: string; // uidA_uidB_moneda
  entre: [string, string];
  moneda: 'ARS' | 'USD';
  saldo: number; // >0: uidB debe a uidA, <0: uidA debe a uidB
  actualizado_en: Timestamp;
}
```

## 🚀 Despliegue

### 1. Build de producción

```bash
npm run build
```

### 2. Desplegar a Firebase

```bash
# Desplegar todo
firebase deploy

# O desplegar servicios específicos
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
```

### 3. Configurar dominio personalizado

1. Ve a Firebase Console > Hosting
2. Agrega tu dominio
3. Configura los registros DNS según las instrucciones

## 🧪 Testing

### Tests manuales

```bash
# 1. Crear evento ARS y USD
# 2. Cerrar eventos y verificar balances
# 3. Probar eventos recurrentes
# 4. Subir adjuntos (validar límites)
# 5. Probar invitaciones por link
```

### Tests automatizados

```bash
# Tests de Functions
cd functions
npm test

# Tests de UI (cuando se implementen)
npm run test:ui
```

## 📈 Performance

### Optimizaciones implementadas

- **Code splitting**: Separación de bundles por página
- **Lazy loading**: Carga diferida de componentes
- **Cache busting**: Nombres de archivo con hash
- **Minificación**: CSS y JS optimizados
- **Compresión**: Gzip/Brotli en hosting
- **CDN**: Firebase Hosting con edge locations

### Métricas objetivo

- **LCP**: < 2.5s en 4G
- **Bundle inicial**: < 200KB
- **Time to Interactive**: < 3s
- **Cumulative Layout Shift**: < 0.1

## 🔧 Troubleshooting

### Problemas comunes

#### 1. Error de inicialización de Firebase

```bash
# Verificar variables de entorno
cat .env.local

# Verificar configuración en firebase.json
cat firebase.json
```

#### 2. Error de compilación de Functions

```bash
# Limpiar y reinstalar
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 3. Error de permisos en Firestore

```bash
# Verificar reglas
cat firestore.rules

# Probar en emulador
firebase emulators:start
```

#### 4. Error de Storage

```bash
# Verificar reglas
cat storage.rules

# Verificar límites de archivo
# Verificar tipos permitidos
```

## 🤝 Contribución

### 1. Fork del repositorio

### 2. Crear rama de feature

```bash
git checkout -b feature/nueva-funcionalidad
```

### 3. Hacer cambios y commit

```bash
git add .
git commit -m "feat: agregar nueva funcionalidad"
```

### 4. Push y Pull Request

```bash
git push origin feature/nueva-funcionalidad
```

### 5. Revisar y merge

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

### Documentación

- [Firebase Docs](https://firebase.google.com/docs)
- [Webpack Docs](https://webpack.js.org/)
- [SCSS Docs](https://sass-lang.com/documentation)

### Comunidad

- [Firebase Community](https://firebase.google.com/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)

### Issues

Para reportar bugs o solicitar features, usa el sistema de issues de GitHub.

## 🗺️ Roadmap

### v1.1 (Próxima versión)

- [ ] Exportación de balances a PDF/Excel
- [ ] Notificaciones por email
- [ ] Integración con WhatsApp
- [ ] Dashboard de estadísticas

### v1.2

- [ ] Soporte para múltiples monedas
- [ ] Conversión automática de monedas
- [ ] Historial de transacciones
- [ ] Backup automático de datos

### v2.0

- [ ] Aplicación móvil nativa
- [ ] Modo offline
- [ ] Sincronización entre dispositivos
- [ ] API pública para desarrolladores

---

**Desarrollado con ❤️ y Firebase**
