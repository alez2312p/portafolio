# Catálogo de Apps Offline-First con React Native + SQLite

> **Objetivo:** Guía y especificación técnica de aplicaciones móviles de alta demanda con arquitectura **Offline-First**, base de datos local SQLite, colas de sincronización en segundo plano y conexión resiliente a servidores remotos (PostgreSQL / Supabase / APIs personalizadas).

---

## 📑 Tabla de Contenidos
1. [Por qué Offline-First es una ventaja competitiva brutal](#1-por-qué-offline-first-es-una-ventaja-competitiva-brutal)
2. [La Arquitectura Técnica Base (El Estándar Profesional)](#2-la-arquitectura-técnica-base-el-estándar-profesional)
3. [🎯 Sección Especial: Apps de Gym, Fitness y Salud (Para impresionar a tu colega)](#3--sección-especial-apps-de-gym-fitness-y-salud)
   - 3.1 [IronTrack Pro: Tracker de Sobrecarga Progresiva y Rutinas en Sótanos](#31-irontrack-pro-tracker-de-sobrecarga-progresiva-y-rutinas)
   - 3.2 [CoachSync: App de Piso para Entrenadores Personales (Multi-alumno)](#32-coachsync-app-de-piso-para-entrenadores-personales)
   - 3.3 [MacroLocal: Contador de Macros con Búsqueda Instantánea FTS5](#33-macrolocal-contador-de-macros-y-nutrición-instantáneo)
   - 3.4 [RehabMotion: Seguimiento de Terapia Física y Lesiones](#34-rehabmotion-seguimiento-de-terapia-física-y-lesiones)
4. [🏢 Apps B2B, Logística e Industria](#4-apps-b2b-logística-e-industria)
   - 4.1 [FieldInspector: Auditorías e Inspecciones de Obra](#41-fieldinspector-auditorías-e-inspecciones-de-obra)
   - 4.2 [PocketSales: Preventa y Toma de Pedidos Móvil (Ruta de Calle)](#42-pocketsales-preventa-y-toma-de-pedidos-móvil)
   - 4.3 [DropProof: Envíos de Última Milla con Firma y GPS Offline](#43-dropproof-envíos-de-última-milla-con-firma-y-gps-offline)
   - 4.4 [StockScanner: Conteo y Auditoría de Almacén con Códigos de Barra](#44-stockscanner-conteo-y-auditoría-de-almacén)
5. [💼 Apps de Consumo y Productividad](#5-apps-de-consumo-y-productividad)
   - 5.1 [CashPulse: Gastos de Bolsillo de Cero Latencia](#51-cashpulse-gastos-de-bolsillo-de-cero-latencia)
   - 5.2 [VaultNotes: Bitácora Encriptada con Full-Text Search](#52-vaultnotes-bitácora-encriptada-con-full-text-search)
6. [Cómo venderle el proyecto a tu conocido de la app de rutinas](#6-cómo-venderle-el-proyecto-a-tu-conocido-de-la-app-de-rutinas)
7. [Stack Recomendado y Hoja de Ruta](#7-stack-recomendado-y-hoja-de-ruta)

---

## 1. Por qué Offline-First es una ventaja competitiva brutal

La mayoría de desarrolladores júnior o intermedios construyen aplicaciones móviles como si fueran páginas web: cada botón lanza un `fetch()` o un `axios.post()` mostrando un spinner (`ActivityIndicator`). Si el usuario entra a un sótano, a un ascensor o se queda sin datos, la app se rompe, se congela o pierde información.

**Una app Offline-First profesional invierte este flujo:**
1. **Latencia 0 ms en la UI:** El usuario toca un botón y el estado cambia en 1 frame (16 ms / 120 FPS) porque escribe en SQLite local de inmediato.
2. **Confiabilidad del 100%:** No existe el error *"Sin conexión a internet. Intenta de nuevo"*. Todo se guarda localmente.
3. **Sincronización Transparente (*Background Sync*):** Cuando el sistema operativo detecta conexión (`NetInfo`), un motor de sincronización sube los cambios pendientes en lotes y descarga las novedades del servidor.

---

## 2. La Arquitectura Técnica Base (El Estándar Profesional)

```
┌────────────────────────────────────────────────────────┐
│                   React Native UI                      │
│            (React Native + Expo Router)                │
└───────────┬────────────────────────────────┬───────────┘
            │ 1. Mutación local inmediata    │ 2. Encola mutación
            ▼                                ▼
┌───────────────────────────┐    ┌───────────────────────┐
│     SQLite Database       │    │     sync_queue        │
│   (expo-sqlite / OP)      │    │  (Outbox Pattern)     │
└───────────────────────────┘    └───────────┬───────────┘
                                             │
                       ┌─────────────────────┴───────────────┐
                       │ NetInfo: ¿Conexión establecida?     │
                       └─────────────────────┬───────────────┘
                                             ▼
                               ┌───────────────────────────┐
                               │       Sync Engine         │
                               │  - Batch payload          │
                               │  - Exponential Backoff    │
                               │  - Conflict Resolution    │
                               └─────────────┬─────────────┘
                                             ▼
                               ┌───────────────────────────┐
                               │     Servidor Remoto       │
                               │ (Supabase / PostgreSQL)   │
                               └───────────────────────────┘
```

### Tabla Clave: La Cola de Sincronización (`sync_queue`)
```sql
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  table_name TEXT NOT NULL,           -- Ej: 'workout_logs'
  record_id TEXT NOT NULL,            -- UUID del registro
  action TEXT NOT NULL,               -- 'INSERT' | 'UPDATE' | 'DELETE'
  payload TEXT NOT NULL,              -- JSON con los datos
  status TEXT DEFAULT 'pending',      -- 'pending' | 'syncing' | 'failed'
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at INTEGER NOT NULL
);
```

---

## 3. 🎯 Sección Especial: Apps de Gym, Fitness y Salud

> **Contexto para tu conocido:** Muchas apps de gym fallan porque dependen de internet en sitios donde la señal es pésima (sótanos de pesas, bodegas de CrossFit, parques al aire libre). Si le muestras una app que responde instantáneamente entre series, sin trabarse, le vas a volar la cabeza.

---

### 3.1. IronTrack Pro: Tracker de Sobrecarga Progresiva y Rutinas
*La app de entrenamiento definitiva para levantadores y atletas de fuerza.*

#### El Problema Real
Cuando estás en la banca levantando 100 kg, tienes 90 segundos de descanso. Quieres abrir la app, ver cuánto levantaste la semana pasada, apuntar `100 kg x 8 reps`, tocar "Listo" y que el cronómetro de descanso arranque solo. Si la app se queda en un spinner esperando internet, la experiencia es frustrante y el atleta la desinstala.

#### Modelo en SQLite
* `exercises` (`id`, `name`, `muscle_group`, `equipment`, `demo_animation_path`)
* `workout_templates` (`id`, `title`, `description`, `split_type`, `version`)
* `template_exercises` (`id`, `template_id`, `exercise_id`, `target_sets`, `order_index`)
* `workout_sessions` (`id`, `template_id`, `start_time`, `end_time`, `notes`, `synced`)
* `set_logs` (`id`, `session_id`, `exercise_id`, `set_number`, `weight`, `reps`, `rpe`, `is_warmup`, `created_at`)
* `sync_queue`

#### Retos Técnicos y Características Estrella
1. **Cálculo de 1RM Offline:** Al escribir el peso y las repeticiones, calcula al vuelo la repetición máxima estimada con la fórmula Brzycki/Epley directamente en una query de SQLite:
   ```sql
   -- Consulta rápida de récord personal histórico para un ejercicio:
   SELECT MAX(weight * (1 + reps / 30.0)) AS estimated_1rm, MAX(weight) AS max_weight 
   FROM set_logs WHERE exercise_id = ?;
   ```
2. **Historial de la última sesión en vivo:** Mientras haces el ejercicio, la pantalla te muestra en gris tenue lo que hiciste en cada serie en tu entrenamiento anterior para que superes la marca (sobrecarga progresiva real).
3. **Timer de descanso en segundo plano con audio:** Timer que suena con la app minimizada usando `expo-notifications` o audio local.
4. **Sincronización con el Coach:** Al salir del gym y detectar WiFi, todas las series del día se suben a PostgreSQL/Supabase para que el entrenador vea el volumen total semanal en su panel web.

---

### 3.2. CoachSync: App de Piso para Entrenadores Personales
*Diseñada para el entrenador que supervisa a 5 alumnos a la vez en la sala de pesas.*

#### El Problema Real
Un entrenador personal en el gimnasio va rotando entre alumnos. No tiene tiempo de escribir en un cuaderno ni de esperar a que una web app cargue. Necesita cambiar de alumno con un gesto, marcar series completadas, corregir pesos y tomar notas técnicas (*"Cuidar lordosis en la 3ra serie"*).

#### Modelo en SQLite
* `trainees` (`id`, `name`, `photo_uri`, `phone`, `current_split`)
* `active_sessions` (`id`, `trainee_id`, `status`, `started_at`)
* `session_exercises` (`id`, `session_id`, `exercise_name`, `prescribed_weight`, `actual_weight`, `prescribed_reps`, `actual_reps`, `notes`)
* `sync_queue`

#### Retos Técnicos y Características Estrella
* **Pestañas de Alumnos en Vivo:** Selector horizontal de alumnos activos con avatares y barra de progreso de su sesión.
* **Ajuste de Cargas con Stepper Háptico:** Botones de `+2.5 kg` / `-2.5 kg` con vibración háptica (`expo-haptics`) para ajuste rápido con una sola mano.
* **Firma digital del alumno al terminar:** Si el gimnasio cobra por sesión firmada, el alumno firma en la pantalla del móvil del coach con `react-native-signature-canvas` (guardado local en base64 y sincronizado al servidor para facturación).

---

### 3.3. MacroLocal: Contador de Macros y Nutrición Instantáneo
*Alternativa rápida y privada a MyFitnessPal.*

#### El Problema Real
Apps como MyFitnessPal o Yazio son pesadas, lentas, llenas de anuncios y requieren conexión continua para buscar una manzana o un huevo en su base de datos.

#### Modelo en SQLite
* `food_items` (`id`, `name`, `serving_size`, `calories`, `protein`, `carbs`, `fats`, `barcode`)
* `food_fts` (Tabla virtual SQLite **FTS5** para búsqueda de texto completo instantánea en < 3ms)
* `daily_logs` (`id`, `date`, `water_ml`, `calorie_target`)
* `meal_entries` (`id`, `log_id`, `meal_type`, `food_id`, `servings`, `created_at`)
* `sync_queue`

#### Retos Técnicos y Características Estrella
1. **SQLite FTS5 (Full-Text Search):** Pre-cargar un catálogo de 2,000 alimentos comunes en una base de datos SQLite empaquetada con el build. La búsqueda por texto autocompleta al instante mientras el usuario escribe sin tocar la red.
2. **Escaneo de Código de Barras Offline:** Escanear el código del producto con la cámara (`expo-camera`); si está en el SQLite local se añade de inmediato; si no, se consulta la API de OpenFoodFacts cuando haya internet.
3. **Gráficos de Macros Offline:** Barras circulares de calorías y macronutrientes renderizadas con `react-native-svg` calculadas directamente desde queries locales.

---

### 3.4. RehabMotion: Seguimiento de Fisioterapia y Rehabilitación
*App para pacientes con lesiones musculares o articulares prescrita por terapeutas.*

#### El Problema Real
Los pacientes que hacen ejercicios de rehabilitación en casa o en clínicas a menudo no recuerdan la técnica exacta y se desmotivan. Necesitan videos demostrativos que no consuman datos cada vez que los ven, y un registro diario de nivel de dolor.

#### Modelo en SQLite
* `rehab_programs` (`id`, `diagnosis`, `therapist_name`, `duration_weeks`)
* `rehab_exercises` (`id`, `name`, `description`, `local_video_path`, `frequency_per_day`)
* `patient_feedback` (`id`, `exercise_id`, `pain_level_eva`, `rpe`, `completed_at`, `notes`)
* `sync_queue`

#### Retos Técnicos y Características Estrella
* **Descarga y Caché de Videos Cortos:** Videos en bucle de 5-10 segundos guardados en el almacenamiento del teléfono (`expo-file-system`) para reproducirse sin buffering ni internet.
* **Escala Visual Analógica (EVA) de Dolor:** Selector interactivo del 1 al 10 con alerta visual si el dolor supera el umbral prescrito.
* **Sincronización Bidireccional Segura:** El fisioterapeuta ajusta la rutina en el backend web, y el paciente la recibe cuando su teléfono se conecta.

---

## 4. 🏢 Apps B2B, Logística e Industria

---

### 4.1. FieldInspector: Auditorías e Inspecciones de Obra
*Perfecta para hacer sinergia con tu proyecto web ConstructTrack.*

* **Caso de Uso:** Supervisores de construcción civil que bajan a sótanos, minas o puentes para revisar listas de control de seguridad industrial y calidad estructural.
* **Entidades SQLite:** `projects`, `checklists`, `checklist_questions`, `answers`, `photos`, `sync_queue`.
* **Reto Técnico:** Captura de fotos con fecha/hora y coordenadas GPS estampadas sobre la imagen, compresión WebP antes de guardar localmente y subida diferida a un bucket S3/Supabase Storage.

---

### 4.2. PocketSales: Preventa y Toma de Pedidos Móvil
*El estándar de la industria de consumo masivo y distribuidoras.*

* **Caso de Uso:** Vendedores ruteros que visitan 30 tiendas al día en zonas urbanas y rurales con mala cobertura para levantar pedidos mayoristas.
* **Entidades SQLite:** `customers`, `price_lists`, `products`, `orders`, `order_lines`, `sync_queue`.
* **Reto Técnico:** Manejo de reglas de negocio complejas en SQL local (descuentos por volumen, límite de crédito del cliente, impuestos locales).

---

### 4.3. DropProof: Envíos de Última Milla con Firma y GPS Offline
*Herramienta para transportistas y mensajeros.*

* **Caso de Uso:** Choferes de reparto que entregan paquetes en estacionamientos subterráneos o edificios blindados donde se corta la red.
* **Entidades SQLite:** `manifest_deliveries`, `packages`, `proof_of_delivery` (firma SVG, foto de fachada, timestamp, lat/long).
* **Reto Técnico:** Cola de eventos transaccionales con reintentos basados en `Backoff Exponencial` (1s, 2s, 4s, 8s...) para no drenar la batería reintentando si no hay señal estable.

---

### 4.4. StockScanner: Conteo y Auditoría de Almacén
*Control físico de inventario para almacenes.*

* **Caso de Uso:** Operarios recorriendo pasillos de bodegas metálicas (que actúan como jaula de Faraday bloqueando la señal móvil) haciendo recuento de stock.
* **Entidades SQLite:** `warehouse_zones`, `aisles`, `stock_items`, `counted_batches`.
* **Reto Técnico:** Integración con escáner de hardware o cámara en modo ráfaga (`beep` auditivo + feedback háptico en cada escaneo sin recargar pantalla).

---

## 5. 💼 Apps de Consumo y Productividad

---

### 5.1. CashPulse: Gastos de Bolsillo de Cero Latencia
*El compañero móvil de tu proyecto web Moneto.*

* **Caso de Uso:** Registrar un gasto en efectivo en el instante exacto en que sacas el dinero de la billetera (en un puesto callejero o peaje).
* **Entidades SQLite:** `accounts`, `categories`, `transactions`, `sync_queue`.
* **Reto Técnico:** Widget de acceso rápido para Android/iOS o widget flotante que abre la ventana de agregar gasto en menos de 300 ms.

---

### 5.2. VaultNotes: Bitácora Encriptada con Full-Text Search
*Notas privadas offline estilo Obsidian/Bear.*

* **Caso de Uso:** Libreta personal con notas Markdown, grabaciones de voz y listas de verificación totalmente privadas.
* **Entidades SQLite:** `notebooks`, `notes`, `note_tags`, `voice_memos`.
* **Reto Técnico:** Uso de **SQLCipher** para cifrar toda la base de datos local con AES-256 en el dispositivo y sincronización opcional a un endpoint privado con cifrado punto a punto (*E2EE*).

---

## 6. Cómo venderle el proyecto a tu conocido de la app de rutinas

Si quieres que tu conocido quede convencido de tu nivel con React Native, **IronTrack Pro (3.1)** o **CoachSync (3.2)** son las mejores cartas de presentación. Aquí tienes los argumentos exactos para la conversación:

### 1. El argumento del "Sótano de pesas"
> *"La gran mayoría de apps de gimnasio fallan en lo más básico: en el 80% de los gimnasios de pesas la cobertura de internet es pésima porque están en plantas bajas o sótanos. Si tu app depende de la nube para registrar cada serie, el usuario se frustra porque se le queda cargando. La solución que yo implemento es **Offline-First**: toda la rutina se guarda en una base de datos SQLite en el dispositivo a 120 FPS sin internet. Y en cuanto el teléfono detecta WiFi al salir del gym, todo se sincroniza en segundo plano al servidor."*

### 2. La función de "Sobrecarga Progresiva Instantánea"
> *"Para que una app de rutinas realmente retenga a los usuarios, tiene que mostrarle al atleta lo que levantó la semana anterior mientras descansa. Con SQLite local, hago una consulta instantánea en 2 milisegundos que le dice: 'La semana pasada hiciste 8 repeticiones con 60kg. Hoy intenta 9'. Eso crea hábito y fidelización."*

### 3. La demostración en vivo (El efecto "Modo Avión")
Cuando le enseñes la demo:
1. Abre la app delante de él.
2. **Activa el Modo Avión en el teléfono.**
3. Registra ejercicios, cambia pesos, inicia el cronómetro, completa la sesión.
4. Muestra cómo todo responde al milisegundo sin un solo error ni spinner.
5. **Desactiva el Modo Avión.**
6. Muestra cómo un indicador discreto pasa de *'Pendiente de sincronizar'* a *'Sincronizado con la nube'* y abre el navegador en tu laptop mostrando los datos recién llegados en PostgreSQL/Supabase.
*(Esa demostración convence a cualquier cliente o reclutador al instante).*

---

## 7. Stack Recomendado y Hoja de Ruta

| Capa | Tecnología recomendada | Por qué |
| :--- | :--- | :--- |
| **Framework Móvil** | React Native con **Expo (SDK 51+)** | Expo Router v3, excelente DX, compilación nativa limpia. |
| **Base de Datos Local** | `expo-sqlite` (nueva API moderna) | Soporte nativo de transacciones asíncronas, consultas preparadas y hooks reactivos (`useSQLiteContext`). |
| **Manejo de Estado** | `Zustand` | Ligero, sin boilerplate, se integra perfecto con almacenamiento local. |
| **Detección de Conexión** | `@react-native-community/netinfo` | Detecta transiciones online/offline en tiempo real. |
| **Backend & Nube** | `Supabase` (PostgreSQL + Auth + Storage) | PostgreSQL gestionado, soporte de Row Level Security (RLS) y APIs REST/GraphQL automáticas. |
| **UI Kit & Estilos** | `NativeWind` (Tailwind CSS para RN) | Mantiene el mismo sistema de diseño que usas en tu portafolio web. |
| **Hápticos & Sonido** | `expo-haptics` y `expo-av` | Feedback táctil al completar series o tocar botones. |

---

### Siguiente Paso
Puedes elegir **IronTrack Pro** o cualquiera de las opciones B2B para crear un prototipo funcional mínimo (*PoC*) con Expo y SQLite que puedas instalar en tu teléfono mediante **Expo Go** o compilar a APK para presentarlo.
