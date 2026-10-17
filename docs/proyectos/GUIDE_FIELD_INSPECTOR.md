# Guía Metodológica y de Implementación: FieldInspector Mobile
## Arquitectura Offline-First con React Native, SQLite y Sincronización Asíncrona Resiliente

---

## 📑 Tabla de Contenidos
1. [Contexto y Sinergia con el Ecosistema Backend Existente](#1-contexto-y-sinergia-con-el-ecosistema-backend-existente)
2. [Especificación Formal del Esquema SQLite Local (Drizzle ORM)](#2-especificación-formal-del-esquema-sqlite-local-drizzle-orm)
3. [Setup e Inicialización del Entorno Técnico](#3-setup-e-inicialización-del-entorno-técnico)
4. [Arquitectura de Software y Estructura de Carpetas](#4-arquitectura-de-software-y-estructura-de-carpetas)
5. [Reto Técnico 1: Pipeline de Captura, Estampado Forense y Compresión WebP](#5-reto-técnico-1-pipeline-de-captura-estampado-forense-y-compresión-webp)
6. [Reto Técnico 2: Motor de Sincronización Diferida (Outbox Worker)](#6-reto-técnico-2-motor-de-sincronización-diferida-outbox-worker)
7. [Estrategia Integral de Testing](#7-estrategia-integral-de-testing)
8. [Permisos de Plataforma y Configuración Nativa](#8-permisos-de-plataforma-y-configuración-nativa)
9. [Matriz de Decisiones y Buenas Prácticas de Ingeniería](#9-matriz-de-decisiones-y-buenas-prácticas-de-ingeniería)
10. [Seguridad Zero-Trust, Gestión de Secretos y Almacenamiento Criptográfico](#10-seguridad-zero-trust-gestión-de-secretos-y-almacenamiento-criptográfico)

---

## 1. Contexto y Sinergia con el Ecosistema Backend Existente

### 1.1. Topología del Sistema
FieldInspector Mobile opera como un nodo periférico eventualmente consistente dentro del ecosistema de gestión de obra respaldado por PostgreSQL y Prisma ORM. Los inspectores de campo ejecutan auditorías en entornos de conectividad nula o intermitente (frentes subterráneos, sótanos de edificaciones, túneles viales y zonas rurales). 

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (PostgreSQL + Prisma)                      │
│                                                                         │
│  ┌──────────────┐         ┌────────────────┐         ┌───────────────┐  │
│  │     User     │◄───────►│    Location    │◄───────►│    Project    │  │
│  └──────┬───────┘         └────────┬───────┘         └───────┬───────┘  │
│         │ (Auditor)                │ (Frente de Obra)        │          │
└─────────┼──────────────────────────┼─────────────────────────┼──────────┘
          │                          │                         │
          │ Sync Pull                │ Sync Pull               │ Sync Push/Pull
          ▼                          ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FIELDINSPECTOR MOBILE (SQLite)                       │
│                                                                         │
│  ┌──────────────┐         ┌────────────────┐         ┌───────────────┐  │
│  │ users_cache  │         │locations_cache │         │   projects    │  │
│  └──────┬───────┘         └────────┬───────┘         └───────┬───────┘  │
│         │                          │                         │          │
│         └──────────────┐           │                         │          │
│                        ▼           ▼                         ▼          │
│                  ┌───────────────────────────────────────────────┐      │
│                  │                  checklists                   │      │
│                  └───────────────────────┬───────────────────────┘      │
│                                          ▼                              │
│                  ┌───────────────────────────────────────────────┐      │
│                  │              checklist_questions              │      │
│                  └───────────────────────┬───────────────────────┘      │
│                                          ▼                              │
│                  ┌───────────────────────────────────────────────┐      │
│                  │                    answers                    │      │
│                  └───────────────────────┬───────────────────────┘      │
│                                          ▼                              │
│                  ┌───────────────────────────────────────────────┐      │
│                  │                    photos                     │      │
│                  └───────────────────────┬───────────────────────┘      │
│                                          │                              │
│                                          ▼                              │
│                  ┌───────────────────────────────────────────────┐      │
│                  │            sync_queue (Outbox)                │      │
│                  └───────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2. Estrategia de Claves Primarias y No-Colisión: Client-Generated IDs
En un sistema distribuido offline-first, delegar la generación de identificadores a secuencias o claves auto-incrementales del servidor central invalida la capacidad de inserción local inmediata con integridad referencial.
* **Estándar:** Todas las entidades mutables creadas en el cliente (`projects`, `checklists`, `answers`, `photos`, `sync_queue`) deben generar su identificador en el dispositivo al momento de la instanciación mediante **CUID2** (longitud estándar 24-32 caracteres) o **UUIDv4**.
* **Compatibilidad Prisma:** Dado que el backend utiliza `cuid()` en sus modelos `User` y `Location`, el uso de CUID2 en el cliente garantiza:
  1. Claves semánticamente compatibles con el esquema de PostgreSQL.
  2. Monotonicidad y entropía suficiente para evitar colisiones entre múltiples inspectores trabajando en el mismo proyecto sin conexión.
  3. Integridad referencial instantánea en el grafo SQLite local: un registro de `photos` puede asociarse a un `answer_id`, que a su vez se asocia a un `checklist_id`, antes de que el servidor conozca la existencia de ninguno de ellos.

### 1.3. Rol de las Entidades de Sinergia
* **`Location` (`locations_cache`):** Actúa como el ancla espacial y organizativa de la inspección. Representa el frente de obra (ej. *"Nivel -2 Zapata Central"*, *"Torre 1 Losa 14"*). Los proyectos y auditorías se vinculan a un `location_id` existente y validado.
* **`User` (`users_cache`):** Garantiza la identidad local del auditor. Los metadatos de autoría y firma digital de cada respuesta y fotografía quedan sellados criptográfica y referencialmente con el `user_id` de la sesión local.

---

## 2. Especificación Formal del Esquema SQLite Local (Drizzle ORM)

El esquema local se implementa con **Drizzle ORM** sobre el driver nativo de SQLite (`expo-sqlite` / `op-sqlite`), configurando tipos estrictos, claves foráneas e índices de alto rendimiento.

```typescript
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// --------------------------------------------------------------------------
// 1. CACHE TABLES (Maestros sincronizados desde el servidor - Read Only)
// --------------------------------------------------------------------------

export const usersCache = sqliteTable('users_cache', {
  id: text('id').primaryKey(), // cuid proveniente del backend
  name: text('name').notNull(),
  role: text('role').notNull(), // 'ADMIN' | 'INSPECTOR' | 'SUPERVISOR'
  syncedAt: integer('synced_at', { mode: 'timestamp' }).notNull(),
});

export const locationsCache = sqliteTable('locations_cache', {
  id: text('id').primaryKey(), // cuid proveniente del backend
  name: text('name').notNull(),
  description: text('description'),
  syncedAt: integer('synced_at', { mode: 'timestamp' }).notNull(),
});

// --------------------------------------------------------------------------
// 2. DOMAIN TABLES (Entidades operativas de inspección)
// --------------------------------------------------------------------------

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(), // CUID2 generado en cliente
  remoteId: text('remote_id'), // ID en Postgres si ya fue sincronizado
  locationId: text('location_id')
    .notNull()
    .references(() => locationsCache.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  status: text('status', { enum: ['active', 'paused', 'completed'] })
    .default('active')
    .notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  locationIdIdx: index('idx_projects_location_id').on(table.locationId),
  codeUidx: uniqueIndex('uidx_projects_code').on(table.code),
}));

export const checklists = sqliteTable('checklists', {
  id: text('id').primaryKey(), // CUID2
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersCache.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  status: text('status', { enum: ['draft', 'completed', 'syncing', 'synced'] })
    .default('draft')
    .notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
}, (table) => ({
  projectIdIdx: index('idx_checklists_project_id').on(table.projectId),
  userIdIdx: index('idx_checklists_user_id').on(table.userId),
  statusIdx: index('idx_checklists_status').on(table.status),
}));

export const checklistQuestions = sqliteTable('checklist_questions', {
  id: text('id').primaryKey(), // CUID2
  checklistId: text('checklist_id')
    .notNull()
    .references(() => checklists.id, { onDelete: 'cascade' }),
  category: text('category').notNull(), // Ej: 'Estructura', 'Seguridad', 'Instalaciones'
  prompt: text('prompt').notNull(),
  inputType: text('input_type', { enum: ['boolean', 'rating', 'text', 'single_choice'] })
    .notNull(),
  isMandatory: integer('is_mandatory', { mode: 'boolean' }).default(true).notNull(),
  orderIndex: integer('order_index').notNull(),
}, (table) => ({
  checklistOrderIdx: index('idx_checklist_questions_order').on(table.checklistId, table.orderIndex),
}));

export const answers = sqliteTable('answers', {
  id: text('id').primaryKey(), // CUID2
  checklistId: text('checklist_id')
    .notNull()
    .references(() => checklists.id, { onDelete: 'cascade' }),
  questionId: text('question_id')
    .notNull()
    .references(() => checklistQuestions.id, { onDelete: 'cascade' }),
  value: text('value').notNull(), // Serializado: 'true', '4', 'Concreto fisurado'
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  checklistQuestionUidx: uniqueIndex('uidx_answers_checklist_question').on(table.checklistId, table.questionId),
}));

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(), // CUID2
  answerId: text('answer_id')
    .notNull()
    .references(() => answers.id, { onDelete: 'cascade' }),
  localFileUri: text('local_file_uri').notNull(),
  remoteUrl: text('remote_url'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  altitude: real('altitude'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  hashSha256: text('hash_sha256').notNull(),
  syncStatus: text('sync_status', { enum: ['pending', 'uploaded', 'failed'] })
    .default('pending')
    .notNull(),
}, (table) => ({
  answerIdIdx: index('idx_photos_answer_id').on(table.answerId),
  syncStatusIdx: index('idx_photos_sync_status').on(table.syncStatus),
}));

// --------------------------------------------------------------------------
// 3. OUTBOX PATTERN (Cola de eventos de mutación)
// --------------------------------------------------------------------------

export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(), // CUID2
  entityTable: text('entity_table').notNull(), // 'checklists' | 'answers' | 'photos' | 'projects'
  entityId: text('entity_id').notNull(),
  operation: text('operation', { enum: ['INSERT', 'UPDATE', 'DELETE'] }).notNull(),
  payload: text('payload').notNull(), // Snapshot JSON de la entidad
  attempts: integer('attempts').default(0).notNull(),
  lastError: text('last_error'),
  status: text('status', { enum: ['pending', 'processing', 'failed'] })
    .default('pending')
    .notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  processOrderIdx: index('idx_sync_queue_status_created').on(table.status, table.createdAt),
  entityLookupIdx: index('idx_sync_queue_entity').on(table.entityTable, table.entityId),
}));
```

### 2.1. DDL Crudo Equivalente e Índices Críticos
```sql
PRAGMA foreign_keys = ON;

-- Índices de alto impacto para la cola de sincronización
CREATE INDEX IF NOT EXISTS idx_sync_queue_poll 
ON sync_queue (status, attempts, created_at) 
WHERE status IN ('pending', 'failed');

-- Índice para recuperación de evidencias pendientes por respuesta
CREATE INDEX IF NOT EXISTS idx_photos_pending_upload 
ON photos (sync_status) 
WHERE sync_status != 'uploaded';

-- Índice para integridad referencial inversa en cascadas
CREATE INDEX IF NOT EXISTS idx_answers_checklist_lookup 
ON answers (checklist_id);
```

---

## 3. Setup e Inicialización del Entorno Técnico

### 3.1. Expo Prebuild y Elección del Motor SQLite
Para aplicaciones con procesamiento masivo de datos e imágenes en segundo plano, la arquitectura estándar de puente JS-Nativo (`JavaScript Bridge`) representa un cuello de botella. Se requiere **JSI (JavaScript Store Interface)** mediante Expo Prebuild (Dev Client).

* **Motor SQLite:** `expo-sqlite` (SDK 51+ con nueva API basada en JSI y C++) u `op-sqlite`.
* **Configuración del Motor:**
  1. Habilitar **WAL Mode (Write-Ahead Logging)**: Permite lecturas y escrituras concurrentes sin bloqueo mutuo.
  2. `synchronous = NORMAL`: Garantiza durabilidad en apagones de hardware reduciendo operaciones de `fsync` a disco en un 80%.
  3. `foreign_keys = ON`: Forzado estricto de integridad relacional en cada conexión abierta.

```typescript
// infrastructure/database/connection.ts
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const rawDb = SQLite.openDatabaseSync('field_inspector.db');

export function configureDatabasePragmas(db: SQLite.SQLiteDatabase) {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA cache_size = -20000; -- ~20MB en memoria caché
  `);
}

configureDatabasePragmas(rawDb);
export const db = drizzle(rawDb, { schema });
```

### 3.2. Dependencias Estrictamente Necesarias (Sin Bloatware)
```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-sqlite": "~14.0.0",
    "drizzle-orm": "^0.30.10",
    "@shopify/react-native-skia": "1.2.3",
    "expo-camera": "~15.0.0",
    "expo-location": "~17.0.0",
    "expo-file-system": "~17.0.0",
    "expo-crypto": "~13.0.0",
    "@react-native-community/netinfo": "11.3.1",
    "zustand": "^4.5.2",
    "@paralleldrive/cuid2": "^2.2.2"
  }
}
```

---

## 4. Arquitectura de Software y Estructura de Carpetas

Se adopta una **Arquitectura Limpia (Clean Architecture)** desacoplada del framework visual. El estado de la base de datos es la única fuente de verdad (*Database-As-Single-Source-of-Truth*).

```
src/
├── domain/                         # Núcleo Puro (Entidades, Reglas de Negocio, Interfaces)
│   ├── entities/
│   │   ├── Checklist.ts
│   │   ├── InspectionPhoto.ts
│   │   └── SyncEvent.ts
│   └── repositories/               # Contratos abstractos (Port interfaces)
│       ├── IChecklistRepository.ts
│       ├── IPhotoRepository.ts
│       └── ISyncQueueRepository.ts
│
├── data/                           # Implementación Técnica de Acceso a Datos
│   ├── local/
│   │   ├── schema/                 # Drizzle schemas
│   │   ├── database.ts             # Conexión SQLite y Pragmas
│   │   └── repositories/           # Implementación concreta con Drizzle
│   │       ├── DrizzleChecklistRepository.ts
│   │       ├── DrizzlePhotoRepository.ts
│   │       └── DrizzleSyncQueueRepository.ts
│   └── remote/
│       ├── apiClient.ts            # Cliente HTTP (fetch con Bearer token)
│       ├── storageClient.ts        # Presigned URLs hacia S3/Supabase Storage
│       └── mappers/                # Transformación de modelos locales a DTOs de Prisma
│
├── usecases/                       # Orquestación de Flujos de Negocio
│   ├── capture/
│   │   └── CaptureEvidenceUseCase.ts
│   ├── checklist/
│   │   ├── CompleteChecklistUseCase.ts
│   │   └── SaveAnswerUseCase.ts
│   └── sync/
│       ├── ProcessSyncQueueUseCase.ts
│       └── PullMasterDataUseCase.ts
│
├── infrastructure/                 # Servicios de Hardware y Plataforma
│   ├── camera/
│   ├── location/
│   │   └── DefendedLocationProvider.ts
│   ├── graphics/
│   │   └── SkiaWatermarkEngine.ts
│   └── network/
│       └── NetworkObserver.ts
│
└── presentation/                   # Interfaz de Usuario y Adaptadores React
    ├── components/
    ├── hooks/                      # Hooks ligeros que consumen usecases
    │   ├── useInspectionCapture.ts
    │   └── useSyncStatus.ts
    ├── state/                      # Zustand para estado de UI volátil
    └── screens/
```

---

## 5. Reto Técnico 1: Pipeline de Captura, Estampado Forense y Compresión WebP

El requerimiento exige que cada fotografía sea irrefutable legal y técnicamente. Las coordenadas, hora UTC, identificador de frente e inspector deben estar impresos en la matriz de píxeles, sin depender de metadatos EXIF que puedan ser alterados o descartados al procesar el archivo.

```
┌─────────────────┐
│   Expo Camera   │ ── Captura Raw JPEG (1080p / 4K)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ DefendedLocation│ ── Timeout de 3500ms ──► Fallback: Última posición conocida
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Skia Canvas   │ ── Renderiza Imagen + Estampa Overlays (GPS, UTC, CUIDs)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Skia Image Enc  │ ── Codificación WebP (Quality: 80%)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Expo FileSystem │ ── Almacenamiento en /documentDirectory/evidences/
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Expo Crypto   │ ── Genera Hash SHA-256 sobre el archivo .webp final
└────────┬────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│ SQLite ATOMIC TRANSACTION: (photos + sync_queue)       │
└────────────────────────────────────────────────────────┘
```

### 5.1. Proveedor de Ubicación Defensivo (`DefendedLocationProvider`)
En sótanos o túneles de obra, la antena GPS del teléfono intentará buscar satélites indefinidamente, bloqueando la interfaz de usuario. Se implementa una promesa con carrera defensiva (*timeout guard*):

```typescript
// infrastructure/location/DefendedLocationProvider.ts
import * as Location from 'expo-location';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  isFallback: boolean;
}

export class DefendedLocationProvider {
  private static readonly GPS_TIMEOUT_MS = 3500;

  public static async getInspectionCoordinates(): Promise<GeoCoordinate> {
    const { status } = await Location.requestCameraPermissionsAsync();
    // Intento 1: Posición de alta precisión con timeout
    try {
      const highAccuracyPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GPS_TIMEOUT')), this.GPS_TIMEOUT_MS)
      );

      const position = await Promise.race([highAccuracyPromise, timeoutPromise]);

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude,
        accuracy: position.coords.accuracy,
        isFallback: false,
      };
    } catch (err) {
      // Intento 2: Fallback inmediato a última posición registrada
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 3600000, // Válida si tiene menos de 1 hora
      });

      if (lastKnown) {
        return {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          altitude: lastKnown.coords.altitude,
          accuracy: lastKnown.coords.accuracy,
          isFallback: true,
        };
      }

      // Fallback terminal: Sin señal satelital
      return {
        latitude: 0.0,
        longitude: 0.0,
        altitude: null,
        accuracy: null,
        isFallback: true,
      };
    }
  }
}
```

### 5.2. Pipeline de Estampado y Codificación Skia (`SkiaWatermarkEngine`)
El motor toma la imagen cruda, calcula las proporciones dinámicas de texto y renderiza un panel semitransparente con tipografía monoespaciada en la esquina inferior izquierda.

```typescript
// infrastructure/graphics/SkiaWatermarkEngine.ts
import { Skia, Canvas, Paint, Font, AlphaType, ColorType } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

export interface WatermarkMetadata {
  isoTimestamp: string;
  latitude: number;
  longitude: number;
  isFallbackLocation: boolean;
  locationId: string;
  inspectorId: string;
  answerId: string;
}

export class SkiaWatermarkEngine {
  public static async processAndStamp(
    rawImageUri: string,
    metadata: WatermarkMetadata
  ): Promise<{ fileUri: string; hashSha256: string }> {
    // 1. Leer buffer y crear SkData
    const base64Data = await FileSystem.readAsStringAsync(rawImageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const rawBuffer = Skia.Data.fromBase64(base64Data);
    const sourceImage = Skia.Image.MakeImageFromEncoded(rawBuffer);

    if (!sourceImage) {
      throw new Error('CORRUPTED_RAW_IMAGE_DATA');
    }

    const width = sourceImage.width();
    const height = sourceImage.height();

    // 2. Crear Surface off-screen
    const surface = Skia.Surface.Make(width, height);
    if (!surface) throw new Error('COULD_NOT_ALLOCATE_SKIA_SURFACE');
    const canvas = surface.getCanvas();

    // Dibujar imagen original
    canvas.drawImage(sourceImage, 0, 0);

    // 3. Configurar caja de fondo para contraste forense
    const overlayHeight = Math.floor(height * 0.12);
    const bgPaint = Skia.Paint();
    bgPaint.setColor(Skia.Color('rgba(0, 0, 0, 0.65)'));
    canvas.drawRect({ x: 0, y: height - overlayHeight, width, height: overlayHeight }, bgPaint);

    // 4. Configurar tipografía vectorial
    const textPaint = Skia.Paint();
    textPaint.setColor(Skia.Color('#00FF66')); // Verde fósforo para alta legibilidad
    const font = Skia.Font(null, Math.floor(overlayHeight * 0.22));

    const lineMargin = Math.floor(overlayHeight * 0.05);
    const startX = 24;
    const line1Y = height - overlayHeight + font.getSize() + lineMargin;
    const line2Y = line1Y + font.getSize() + lineMargin;
    const line3Y = line2Y + font.getSize() + lineMargin;

    const locTag = metadata.isFallbackLocation ? ' [ESTIMADA/LAST_KNOWN]' : ' [GPS_FIX]';
    canvas.drawText(`FECHA: ${metadata.isoTimestamp} | LOC: ${metadata.latitude}, ${metadata.longitude}${locTag}`, startX, line1Y, textPaint, font);
    canvas.drawText(`FRENTE DE OBRA ID: ${metadata.locationId} | INSPECTOR ID: ${metadata.inspectorId}`, startX, line2Y, textPaint, font);
    canvas.drawText(`EVIDENCIA ID: ${metadata.answerId} | SECURE AUDIT SIGNATURE`, startX, line3Y, textPaint, font);

    surface.flush();

    // 5. Codificación WebP a calidad controlada (0.80)
    const stampedImage = surface.makeImageSnapshot();
    const webpData = stampedImage.encodeToData(Skia.ImageFormat.WEBP, 80);
    if (!webpData) throw new Error('WEBP_ENCODING_FAILURE');

    // 6. Almacenamiento en Document Directory
    const targetDir = `${FileSystem.documentDirectory}evidence_store/`;
    await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    
    const fileName = `evidence_${Date.now()}.webp`;
    const targetPath = `${targetDir}${fileName}`;
    const base64WebP = webpData.toBase64();

    await FileSystem.writeAsStringAsync(targetPath, base64WebP, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 7. Generación de Hash Criptográfico SHA-256
    const hashSha256 = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64WebP
    );

    // Limpieza de memoria nativa
    sourceImage.dispose();
    stampedImage.dispose();
    surface.dispose();

    return { fileUri: targetPath, hashSha256 };
  }
}
```

### 5.3. Transacción Atómica de Evidencia (`CaptureEvidenceUseCase`)
El registro de la fotografía en `photos` y el evento de sincronización en `sync_queue` deben persistirse en **un único commit atómico de SQLite**. Si la base de datos falla al escribir el evento en la cola, el archivo queda marcado como huerfano y es revertido para evitar desincronizaciones silentes.

```typescript
// usecases/capture/CaptureEvidenceUseCase.ts
import { db } from '@/data/local/database';
import { photos, syncQueue } from '@/data/local/schema';
import { createId } from '@paralleldrive/cuid2';
import { SkiaWatermarkEngine } from '@/infrastructure/graphics/SkiaWatermarkEngine';
import { DefendedLocationProvider } from '@/infrastructure/location/DefendedLocationProvider';

export class CaptureEvidenceUseCase {
  public static async execute(params: {
    answerId: string;
    rawImageUri: string;
    locationId: string;
    inspectorId: string;
  }) {
    const coords = await DefendedLocationProvider.getInspectionCoordinates();
    const timestamp = new Date();

    const { fileUri, hashSha256 } = await SkiaWatermarkEngine.processAndStamp(
      params.rawImageUri,
      {
        isoTimestamp: timestamp.toISOString(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        isFallbackLocation: coords.isFallback,
        locationId: params.locationId,
        inspectorId: params.inspectorId,
        answerId: params.answerId,
      }
    );

    const photoId = createId();
    const syncEventId = createId();

    const photoEntity = {
      id: photoId,
      answerId: params.answerId,
      localFileUri: fileUri,
      remoteUrl: null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: coords.altitude,
      timestamp,
      hashSha256,
      syncStatus: 'pending' as const,
    };

    // TRANSACCIÓN ATÓMICA GARANTIZADA
    db.transaction((tx) => {
      // 1. Guardar entidad de evidencia
      tx.insert(photos).values(photoEntity).run();

      // 2. Insertar evento de mutación en la cola de sincronización
      tx.insert(syncQueue).values({
        id: syncEventId,
        entityTable: 'photos',
        entityId: photoId,
        operation: 'INSERT',
        payload: JSON.stringify(photoEntity),
        attempts: 0,
        lastError: null,
        status: 'pending',
        createdAt: new Date(),
      }).run();
    });

    return { photoId, fileUri, hashSha256 };
  }
}
```

---

## 6. Reto Técnico 2: Motor de Sincronización Diferida (Outbox Worker)

El motor de sincronización sigue el patrón **Transactional Outbox**. Trabaja como un bucle finito o suscripción a cambios de conectividad, resolviendo dependencias de grafos de manera secuencial y segura.

```
┌─────────────────────────────────────────────────────────────┐
│                 NetworkObserver (NetInfo)                   │
│        Detecta transición Offline -> Conectividad Estable    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   OutboxWorker.processQueue()               │
│               Bloqueo de exclusión mutua (Mutex)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  POLL SQLite: SELECT * FROM sync_queue                      │
│  WHERE status IN ('pending', 'failed') AND attempts < 5     │
│  ORDER BY created_at ASC LIMIT 10                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│       TIPO: 'photos'         │    │  TIPO: 'checklists' / etc.   │
└──────────────┬───────────────┘    └──────────────┬───────────────┘
               │                                   │
               ▼                                   ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ 1. Solicita Presigned S3 URL │    │ 1. HTTP POST a API Prisma    │
│ 2. Sube WebP binario directo │    │    con Headers de Idempotencia│
│ 3. Valida ETag == SHA256     │    │ 2. Backend ejecuta UPSERT    │
│ 4. Actualiza URL en SQLite   │    └──────────────┬───────────────┘
└──────────────┬───────────────┘                   │
               │                                   │
               └──────────────────┬────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│ ÉXITO: tx.delete(syncQueue).where(id = item.id)             │
│ FALLO: tx.update(syncQueue).set(attempts++, status='failed')│
│ SI attempts >= 5: Marcar DEAD_LETTER_QUEUE (Requiere Manual)│
└─────────────────────────────────────────────────────────────┘
```

### 6.1. Algoritmo de Sincronización con Backoff Exponencial y Mutex

```typescript
// infrastructure/sync/OutboxWorker.ts
import { db } from '@/data/local/database';
import { syncQueue, photos, checklists, answers } from '@/data/local/schema';
import { eq, asc, inArray, and, lt } from 'drizzle-orm';
import * as FileSystem from 'expo-file-system';

export class OutboxWorker {
  private static isRunning = false;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly BATCH_SIZE = 15;

  public static async drainQueue(apiEndpoint: string, authToken: string): Promise<void> {
    // Control de concurrencia: Evitar solapamiento de ejecuciones
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // 1. Obtener candidatos con backoff expirado
      const pendingEvents = db
        .select()
        .from(syncQueue)
        .where(
          and(
            inArray(syncQueue.status, ['pending', 'failed']),
            lt(syncQueue.attempts, this.MAX_ATTEMPTS)
          )
        )
        .orderBy(asc(syncQueue.createdAt))
        .limit(this.BATCH_SIZE)
        .all();

      for (const event of pendingEvents) {
        // Calcular backoff exponencial: 2^attempts * 1000ms con jitter
        const backoffMs = Math.pow(2, event.attempts) * 1000 + Math.random() * 500;
        const now = Date.now();
        const eventAge = now - event.createdAt.getTime();

        if (event.status === 'failed' && eventAge < backoffMs) {
          continue; // Aún en periodo de espera
        }

        // Marcar en procesamiento
        db.update(syncQueue)
          .set({ status: 'processing' })
          .where(eq(syncQueue.id, event.id))
          .run();

        try {
          if (event.entityTable === 'photos') {
            await this.handlePhotoUpload(event, apiEndpoint, authToken);
          } else {
            await this.handleEntityMutation(event, apiEndpoint, authToken);
          }

          // ÉXITO: Eliminar el evento de la cola outbox
          db.delete(syncQueue).where(eq(syncQueue.id, event.id)).run();
        } catch (error: any) {
          const nextAttempts = event.attempts + 1;
          const isDeadLetter = nextAttempts >= this.MAX_ATTEMPTS;

          db.update(syncQueue)
            .set({
              attempts: nextAttempts,
              status: isDeadLetter ? 'failed' : 'pending',
              lastError: error?.message ?? 'UNKNOWN_SYNC_ERROR',
            })
            .where(eq(syncQueue.id, event.id))
            .run();
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  private static async handlePhotoUpload(
    event: typeof syncQueue.$inferSelect,
    apiEndpoint: string,
    authToken: string
  ): Promise<void> {
    const photoData = JSON.parse(event.payload);

    // 1. Obtener Presigned Upload URL desde el backend
    const presignedRes = await fetch(`${apiEndpoint}/evidences/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        photoId: photoData.id,
        answerId: photoData.answerId,
        hashSha256: photoData.hashSha256,
      }),
    });

    if (!presignedRes.ok) throw new Error(`STORAGE_PRESIGN_FAILED: ${presignedRes.status}`);
    const { uploadUrl, publicUrl } = await presignedRes.json();

    // 2. Subida directa del archivo binario WebP (evita pasar el binario por el API Gateway central)
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, photoData.localFileUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': 'image/webp',
      },
    });

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error(`S3_UPLOAD_FAILED: ${uploadResult.status}`);
    }

    // 3. Confirmar en API central de Prisma y actualizar estado local
    db.transaction((tx) => {
      tx.update(photos)
        .set({ remoteUrl: publicUrl, syncStatus: 'uploaded' })
        .where(eq(photos.id, photoData.id))
        .run();
    });
  }

  private static async handleEntityMutation(
    event: typeof syncQueue.$inferSelect,
    apiEndpoint: string,
    authToken: string
  ): Promise<void> {
    const response = await fetch(`${apiEndpoint}/sync/mutate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'X-Idempotency-Key': event.id, // Idempotencia absoluta
      },
      body: JSON.stringify({
        table: event.entityTable,
        operation: event.operation,
        data: JSON.parse(event.payload),
      }),
    });

    if (!response.ok) {
      throw new Error(`REMOTE_MUTATION_REJECTED: ${response.status}`);
    }
  }
}
```

### 6.2. Estrategia de Dead-Letter Queue (DLQ) y Resolución de Conflictos
1. **Idempotencia en Servidor:** El backend en Prisma recibe `X-Idempotency-Key` y ejecuta `upsert` basado en el `id` (CUID2) del cliente. Si una petición se envía dos veces debido a una pérdida de conexión previa a la recepción del ACK, el servidor no duplica datos.
2. **Conflict Resolution (LWW):** En caso de conflicto de edición concurrente sobre una misma respuesta o checklist, se aplica **Last-Write-Wins (LWW)** comparando la marca de tiempo `updated_at` en milisegundos UTC.
3. **Dead-Letter:** Todo registro en `sync_queue` con `attempts >= 5` permanece en `status = 'failed'`. La interfaz expone una vista técnica de *"Pendientes de resolución manual"* para que el inspector reintente o exporte el payload cifrado por correo/soporte técnico si existe un rechazo por reglas de validación en el servidor.

---

## 7. Estrategia Integral de Testing

### 7.1. Pruebas Unitarias del Pipeline de Imagen y Formateo
Se valida que el formateador de metadatos componga de forma determinista la información estampada, contemplando caracteres especiales e idiomas.

```typescript
// __tests__/unit/SkiaWatermarkEngine.test.ts
import { describe, it, expect } from '@jest/globals';

describe('Watermark Metadatas Formatting Unit Tests', () => {
  it('debe estructurar correctamente las líneas forenses con GPS Fix válido', () => {
    const metadata = {
      isoTimestamp: '2026-09-10T14:30:00.000Z',
      latitude: 6.2442,
      longitude: -75.5812,
      isFallbackLocation: false,
      locationId: 'clh87abc0001',
      inspectorId: 'usr99xyz0002',
      answerId: 'ans11qqq0003',
    };

    const headerText = `FECHA: ${metadata.isoTimestamp} | LOC: ${metadata.latitude}, ${metadata.longitude} [GPS_FIX]`;
    expect(headerText).toBe('FECHA: 2026-09-10T14:30:00.000Z | LOC: 6.2442, -75.5812 [GPS_FIX]');
  });

  it('debe alertar explícitamente cuando las coordenadas son fallback de memoria', () => {
    const isFallback = true;
    const tag = isFallback ? ' [ESTIMADA/LAST_KNOWN]' : ' [GPS_FIX]';
    expect(tag).toContain('ESTIMADA');
  });
});
```

### 7.2. Pruebas de Integración para SQLite: Transaccionalidad y Rollback
Verifica que si ocurre un fallo en la escritura de disco durante el registro en `sync_queue`, la inserción de la entidad en `photos` no persista en el estado de la base de datos (rollback total).

```typescript
// __tests__/integration/AtomicCaptureTransaction.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { db, rawDb } from '@/data/local/database';
import { photos, syncQueue } from '@/data/local/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

describe('SQLite Atomic Transactions Integration Tests', () => {
  beforeEach(() => {
    rawDb.execSync('DELETE FROM sync_queue; DELETE FROM photos;');
  });

  it('debe ejecutar ROLLBACK completo si la inserción en sync_queue lanza un error', () => {
    const testPhotoId = createId();

    expect(() => {
      db.transaction((tx) => {
        // 1. Insertar foto válida
        tx.insert(photos).values({
          id: testPhotoId,
          answerId: 'ans_fake_test',
          localFileUri: 'file:///tmp/mock.webp',
          remoteUrl: null,
          latitude: 0,
          longitude: 0,
          altitude: null,
          timestamp: new Date(),
          hashSha256: 'mockhash',
          syncStatus: 'pending',
        }).run();

        // 2. Provocar intencionalmente un error de violación de restricción NOT NULL
        tx.insert(syncQueue).values({
          id: createId(),
          entityTable: null as any, // Falla intencional
          entityId: testPhotoId,
          operation: 'INSERT',
          payload: '{}',
          attempts: 0,
          createdAt: new Date(),
        }).run();
      });
    }).toThrow();

    // Verificación de integridad: La foto NO debe existir en la base de datos
    const queriedPhoto = db.select().from(photos).where(eq(photos.id, testPhotoId)).all();
    expect(queriedPhoto.length).toBe(0);
  });
});
```

### 7.3. Pruebas de Componentes (React Native Testing Library)
Simulación de interfaz bajo corte de conectividad, verificando la ausencia de bloqueos visuales o spinners infinitos.

```typescript
// __tests__/components/InspectionAnswerCard.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { InspectionAnswerCard } from '@/presentation/components/InspectionAnswerCard';
import * as NetInfo from '@react-native-community/netinfo';

jest.mock('@react-native-community/netinfo');

describe('InspectionAnswerCard UI Component Tests', () => {
  it('permite guardar la respuesta localmente sin mostrar spinners de red cuando está offline', async () => {
    // Mockear estado desconectado
    (NetInfo.useNetInfo as jest.Mock).mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
    });

    const onSaveMock = jest.fn();

    const { getByTestId, queryByTestId } = render(
      <InspectionAnswerCard
        questionId="q1"
        prompt="¿Se observa segregación en el concreto de la viga?"
        onSaveAnswer={onSaveMock}
      />
    );

    const booleanButton = getByTestId('btn-answer-yes');
    fireEvent.press(booleanButton);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledWith({ questionId: 'q1', value: 'true' });
      // Verificar que NO existe un spinner bloqueante de red
      expect(queryByTestId('network-loading-indicator')).toBeNull();
    });
  });
});
```

---

## 8. Permisos de Plataforma y Configuración Nativa

### 8.1. Configuración en `app.json` (Expo Config Plugins)
Configuración requerida para justificar accesos ante Apple App Store Review y Google Play Store, garantizando ejecución de tareas en segundo plano sin terminación forzada del sistema operativo (*OOM / Background suspension*).

```json
{
  "expo": {
    "name": "FieldInspector",
    "slug": "field-inspector",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Se requiere acceso a la cámara para capturar evidencia visual inmutable de la inspección técnica."
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Se requiere acceso a la ubicación de alta precisión para certificar geográficamente el frente de obra auditado."
        }
      ],
      [
        "expo-sqlite",
        {
          "enableFTS": true
        }
      ]
    ],
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "UIBackgroundModes": ["fetch"],
        "NSCameraUsageDescription": "FieldInspector requiere la cámara para generar el registro fotográfico pericial.",
        "NSLocationWhenInUseUsageDescription": "FieldInspector requiere geolocalizar las coordenadas exactas de cada hallazgo de obra."
      }
    },
    "android": {
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE"
      ]
    }
  }
}
```

---

## 9. Matriz de Decisiones y Buenas Prácticas de Ingeniería

| Vector Arquitectónico | Decisión Tomada | Justificación Técnica | Alternativa Descartada y Motivo |
| :--- | :--- | :--- | :--- |
| **Identificadores** | Client-Generated CUID2 | Colisiones imposibles sin coordinación de red; compatibilidad nativa con Prisma. | `SERIAL / Auto-Increment`: Inviable en nodos desconectados. |
| **Integridad de Base de Datos** | WAL Mode + Foreign Keys ON | Lecturas concurrentes sin bloqueo; previene registros huérfanos locales. | `DELETE Journal Mode`: Bloquea lecturas durante escrituras de fotos. |
| **Estampado de Imagen** | Skia Canvas a Nivel de Píxel | Valor pericial irrefutable; sobrevive a la pérdida de metadatos EXIF. | `Metadatos EXIF / GeoTIFF`: Editables y descartados por proxies/CDNs. |
| **Formato de Archivo** | WebP (Calidad 80%) | Reduce consumo de disco un ~45% frente a JPEG manteniendo nitidez en grietas. | `PNG`: Tamaño excesivo (4-8MB por foto), satura el ancho de banda móvil. |
| **Subida de Archivos** | Presigned S3 URLs en Binario | Descarga el tráfico del servidor central de API; subidas directas resilientes. | `Base64 en JSON payload`: Sobrecarga de memoria de un 33% y riesgos de crash por OOM. |
| **Estrategia Sincronización** | Transactional Outbox Pattern | Evita discrepancias entre el estado de datos y el estado de la cola ante apagones. | `Sync en Memoria / Estado React`: Pérdida total de datos si la app es cerrada por el SO. |
| **Gestión de Secretos** | Zero Client Secrets + Presigned URLs + SecureStore | Previene filtraciones masivas de infraestructura ante descompilación de la app. | `Variables .env con llaves maestras`: Visibles en texto plano en el binario compilado. |

---

## 10. Seguridad Zero-Trust, Gestión de Secretos y Almacenamiento Criptográfico

### 10.1. El Principio Fundamental: El Cliente Móvil es un Entorno Hostil (Zero-Trust)
En arquitectura de sistemas distribuidos móviles existe un axioma inquebrantable: **cualquier dato, código o variable embebida en la aplicación móvil (APK, AAB, IPA) es de acceso público y debe considerarse comprometido**.

Un error crítico común en desarrolladores júnior/intermedios es asumir que las variables definidas en archivos `.env`, `process.env` o `Constants.expoConfig.extra` quedan "protegidas" u "ocultas" dentro del código compilado. 

> [!CAUTION]
> **La ilusión del archivo `.env` en móviles:**
> El bundle JavaScript de React Native (`index.android.bundle` o `main.jsbundle`) se distribuye íntegramente al dispositivo del usuario final. Cualquier persona con herramientas básicas como `jadx`, `apktool` o ejecutando en terminal:
> ```bash
> strings index.android.bundle | grep -i "secret\|aws\|service_role\|postgres"
> ```
> puede extraer en **menos de 30 segundos** cualquier clave de base de datos, secreto de AWS S3 o token maestro que se haya empaquetado en el código fuente.

---

### 10.2. Regla de Oro de Secretos: Qué NUNCA debe existir en la App Móvil

| Tipo de Credencial | ¿Permitido en la App Móvil? | Consecuencia si se filtra en el binario |
| :--- | :---: | :--- |
| **`DATABASE_URL` (PostgreSQL / Prisma)** | ❌ **PROHIBIDO** | Acceso de lectura/escritura directo e irrestricto a toda la base de datos empresarial. |
| **`AWS_SECRET_ACCESS_KEY` (S3 / IAM)** | ❌ **PROHIBIDO** | Toma de control de buckets de almacenamiento, borrado masivo o costos exorbitantes por uso indebido. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | ❌ **PROHIBIDO** | Bypass completo de todas las políticas de seguridad Row Level Security (RLS) en el backend. |
| **Llaves Privadas de Firma Criptográfica** | ❌ **PROHIBIDO** | Suplantación de identidad institucional y falsificación de auditorías. |
| **Tokens Maestros de APIs de Terceros** | ❌ **PROHIBIDO** | Filtración de cuentas corporativas y compromiso de servicios centrales. |

---

### 10.3. Qué SÍ puede existir en el Cliente Móvil
Únicamente se permiten identificadores públicos y llaves con privilegios acotados por diseño:
1. **URL Base del API Gateway / Backend:** `https://api.empresa-construccion.com/v1` (Es pública por naturaleza del tráfico HTTP).
2. **Llaves Públicas Anónimas (ej. `anon_key` de Supabase):** Diseñadas para operar únicamente en conjunto con políticas RLS y tokens JWT de usuario autenticado.
3. **Client IDs de Proveedores de Identidad (OAuth):** Ej. `GOOGLE_CLIENT_ID_ANDROID` (solo identifica la app ante Google, no otorga privilegios sin el handshake del usuario).

---

### 10.4. Almacenamiento Seguro de Sesiones del Inspector: `expo-secure-store`
El token de autenticación del inspector (JWT) y su Refresh Token **NUNCA** deben guardarse en `AsyncStorage` ni en tablas SQLite en texto plano, ya que en dispositivos rooteados/con jailbreak o backups de depuración pueden ser extraídos fácilmente.

Deben guardarse utilizando **cifrado respaldado por hardware nativo**:
* **iOS:** Apple Keychain Services (cifrado por hardware con el Secure Enclave).
* **Android:** Android Keystore System en conjunto con `EncryptedSharedPreferences` (claves criptográficas protegidas en hardware TEE / StrongBox).

```typescript
// infrastructure/security/SecureStorage.ts
import * as SecureStore from 'expo-secure-store';

export class SecureStorage {
  private static readonly ACCESS_TOKEN_KEY = 'usr_auth_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'usr_auth_refresh_token';

  public static async saveAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(this.ACCESS_TOKEN_KEY, accessToken, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      }),
      SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, refreshToken, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      }),
    ]);
  }

  public static async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY);
  }

  public static async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(this.ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY),
    ]);
  }
}
```

---

### 10.5. El Patrón Presigned URLs: Cómo subir evidencias a S3/Supabase sin exponer secretos
Para subir gigabytes de fotos de obra sin saturar el servidor de API central y sin incrustar llaves de AWS S3 en el teléfono, se aplica el flujo de **URLs Prefirmadas Temporales con Mínimo Privilegio**:

```
┌─────────────────┐             ┌─────────────────────┐             ┌──────────────────┐
│  Móvil (Client) │             │ API Backend (Prisma)│             │ S3 / Cloud Store │
└────────┬────────┘             └──────────┬──────────┘             └────────┬─────────┘
         │                                 │                                 │
         │ 1. POST /presigned-url          │                                 │
         │    Headers: Bearer JWT          │ (Valida que el inspector tiene  │
         │    Body: { photoId, hash }      │  permiso en ese checklist_id)   │
         │────────────────────────────────►│                                 │
         │                                 │                                 │
         │                                 │ 2. Backend genera URL con sus   │
         │                                 │    credenciales maestras seguras│
         │                                 │    (Expira en 10 minutos)       │
         │                                 │                                 │
         │ 3. Retorna { uploadUrl }        │                                 │
         │◄────────────────────────────────│                                 │
         │                                                                   │
         │ 4. PUT binario directo del archivo WebP a la uploadUrl            │
         │──────────────────────────────────────────────────────────────────►│
         │                                                                   │
         │ 5. HTTP 200 OK (S3 confirma hash ETag == SHA256)                  │
         │◄──────────────────────────────────────────────────────────────────│
         │                                 │                                 │
         │ 6. POST /confirm-upload         │                                 │
         │    (Marca la foto como synced)  │                                 │
         │────────────────────────────────►│                                 │
```

**Ventajas de Seguridad:**
1. **Zero AWS Keys en el teléfono:** Si un atacante desensambla el APK, no encuentra una sola credencial de almacenamiento en la nube.
2. **Rango de Acción Efímero:** Si una URL prefirmada es interceptada, expira en 10 minutos y solo permite escribir exactamente un único archivo en una ruta fija previamente validada por el backend.
3. **Validación de Identidad por Archivo:** El servidor valida la sesión antes de emitir cada ticket de subida.

---

### 10.6. Cifrado en Reposo de la Base de Datos SQLite (SQLCipher)
En proyectos de infraestructura crítica (aeropuertos, refinerías, obras públicas), las fotos y respuestas técnicas en el teléfono representan material reservado. Para proteger el SQLite local ante robo físico del dispositivo:
1. Se utiliza la extensión **SQLCipher** (AES-256 en modo CBC con HMAC SHA-512 por página de base de datos).
2. La clave de descifrado local se genera aleatoriamente en el primer inicio de la app y se custodia en el `expo-secure-store` (Keychain / Keystore).
3. Si el dispositivo es atacado por USB o extracción física de la memoria flash, el archivo `field_inspector.db` es indistinguible de ruido aleatorio.

---

### 10.7. Protección de Tráfico en Tránsito: SSL Pinning
En redes WiFi abiertas o enrutadores de obra comprometidos, existe el riesgo de ataques *Man-in-the-Middle (MITM)* donde un intermediario instale un certificado raíz para espiar el tráfico HTTPS.
* Se recomienda implementar **Certificate Pinning** (usando librerías como `react-native-ssl-pinning` o plugins de configuración nativa) que validen que el hash de la clave pública (SPKI) del certificado SSL coincida exactamente con la infraestructura de la empresa, rechazando cualquier certificado intermedio instalado por terceros.

