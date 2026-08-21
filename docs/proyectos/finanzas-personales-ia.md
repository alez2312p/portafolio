# Finanzas Personales con IA

> Dashboard financiero inteligente: conecta tus cuentas, categoriza gastos con IA, recibe alertas y visualiza dónde se va tu dinero.

---

## 1. Propósito

Construir una aplicación que resuelva un problema real: **"¿En qué gasté mi dinero este mes?"**. La mayoría de las apps de finanzas son genéricas o requieren integraciones bancarias complejas. Esta app permite:

- Registrar gastos e ingresos manualmente (o vía CSV bancario)
- Categorización automática con IA (OpenAI) — en lugar de etiquetar cada gasto a mano
- Dashboard visual: gráficos, trends, comparativa mes a mes
- Alertas: "Llevas gastado 80% de tu presupuesto en restaurantes"
- Multi-moneda y multi-cuenta

---

## 2. ¿Por qué este proyecto?

| Criterio | Por qué cumple |
|----------|---------------|
| **Muestra stack completo** | Next.js + DB + IA + UI compleja (charts) + auth |
| **Tiene componente visual atractivo** | Gráficos interactivos (Recharts), dashboard, cards |
| **Resuelve un problema real** | Finanzas personales es un dolor universal |
| **Genera conversación en entrevistas** | "¿Cómo integraste OpenAI?", "¿Cómo manejas datos sensibles?" |
| **Se puede mostrar con datos dummy** | Demo con seed data, sin necesidad de cuentas bancarias reales |
| **Escalable** | Se puede extender: multi-moneda, recurrencia, reports PDF |

---

## 3. Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| Framework | Next.js 16 (App Router) | Routing, SSR, API routes, Server Actions |
| Lenguaje | TypeScript | Tipado estricto |
| Estilos | Tailwind CSS + Shadcn UI | UI system |
| Base de datos | Supabase (PostgreSQL) | DB + Auth + Realtime |
| ORM | Drizzle | Type-safe queries |
| IA | OpenAI API (GPT-4o) | Categorización automática |
| Charts | Recharts | Gráficos interactivos |
| Forms | React Hook Form + Zod | Validación |
| Deploy | Vercel | Serverless |

---

## 4. Arquitectura

```
┌─────────────────────────────────────────────────┐
│                    Cliente                        │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ Dashboard│  │  Gestión  │  │  Insights IA  │ │
│  │ (Charts) │  │ Gastos    │  │  (Análisis)   │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
└─────────────────────┬───────────────────────────┘
                      │
           ┌──────────┴──────────┐
           │   Server Actions     │
           │   API Routes         │
           └──────────┬──────────┘
                      │
     ┌────────────────┼────────────────┐
     │                │                │
┌────┴────┐    ┌──────┴──────┐   ┌────┴────┐
│Supabase │    │   OpenAI    │   │ Recharts│
│ Auth+DB │    │  GPT-4o     │   │ (client)│
└─────────┘    └─────────────┘   └─────────┘
```

### 4.1 Estructura de directorios

```
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── login/
│   │   │   └── page.tsx          # Landing
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx        # Sidebar + Navbar
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx      # Overview con charts
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx      # Lista + filtros
│   │   │   │   └── new/page.tsx  # Formulario
│   │   │   ├── budgets/
│   │   │   │   └── page.tsx      # Presupuestos por categoría
│   │   │   ├── insights/
│   │   │   │   └── page.tsx      # Análisis IA
│   │   │   └── settings/
│   │   │       └── page.tsx      # Perfil + moneda
│   │   └── api/
│   │       ├── categorize/route.ts   # IA categorización
│   │       └── insights/route.ts     # IA análisis
│   ├── components/
│   │   ├── ui/                   # Shadcn
│   │   ├── charts/
│   │   │   ├── SpendingChart.tsx
│   │   │   ├── CategoryPieChart.tsx
│   │   │   └── MonthlyTrend.tsx
│   │   ├── transactions/
│   │   │   ├── TransactionList.tsx
│   │   │   ├── TransactionForm.tsx
│   │   │   └── TransactionRow.tsx
│   │   ├── budgets/
│   │   │   ├── BudgetCard.tsx
│   │   │   └── BudgetProgress.tsx
│   │   └── insights/
│   │       ├── AIInsightCard.tsx
│   │       └── SpendingAdvice.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   ├── openai.ts
│   │   └── utils.ts
│   ├── db/
│   │   ├── schema.ts
│   │   └── queries/
│   └── hooks/
│       ├── useTransactions.ts
│       ├── useBudgets.ts
│       └── useAIInsights.ts
├── drizzle.config.ts
├── seed.ts                     # Datos dummy para demo
└── README.md
```

---

## 5. Modelo de Datos

### 5.1 transactions

```sql
CREATE TABLE transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  amount      DECIMAL(12,2) NOT NULL,          -- siempre positivo
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category    TEXT NOT NULL,                    -- 'food', 'transport', 'salary', etc.
  description TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  currency    TEXT DEFAULT 'USD',
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 categories

```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT,                    -- emoji o nombre de icono
  color       TEXT,                    -- hex color para charts
  budget      DECIMAL(12,2),          -- presupuesto mensual
  type        TEXT DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);
```

### 5.3 monthly_summary (vista materializada, opcional)

```sql
CREATE TABLE monthly_summary (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_income  DECIMAL(12,2) DEFAULT 0,
  total_expense DECIMAL(12,2) DEFAULT 0,
  category_breakdown JSONB,            -- {"food": 150.00, "transport": 80.00}
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year, month)
);
```

---

## 6. Flujos Clave

### 6.1 Registro de gasto manual

```
Usuario → Dashboard → Nueva transacción
                  ↓
        Formulario: monto, tipo, fecha, descripción
                  ↓
        Al escribir descripción → llamada a POST /api/categorize
                  ↓
        IA devuelve categoría sugerida + confianza
                  ↓
        Usuario confirma o cambia categoría
                  ↓
        Guardar en DB (Server Action)
                  ↓
        Dashboard se actualiza (Revalidar ruta)
```

### 6.2 Categorización con IA

```
POST /api/categorize
  Body: { description: "Uber al aeropuerto" }

  → Prompt a GPT-4o:
    "Categoriza este gasto en: food, transport, entertainment,
     shopping, health, education, bills, salary, other.
     Responde solo con: { category: string, confidence: number }"

  → Respuesta: { category: "transport", confidence: 0.95 }

  → Se muestra al usuario como sugerencia
```

### 6.3 Insights mensuales

```
Usuario va a /insights
                  ↓
  GET /api/insights?month=7&year=2026
                  ↓
  Server:
    1. Query a DB: total_income, total_expense, top categories
    2. Construye prompt con datos del mes
    3. GPT-4o analiza y devuelve:
       - Resumen: "Gastaste $450 más que el mes pasado"
       - Alertas: "Restaurantes es tu mayor gasto ($320)"
       - Recomendación: "Podrías ahorrar $100 cocinando más"
    4. Caché: guarda resultado en DB (no llamar IA cada vez)
                  ↓
  Renderiza AIInsightCards
```

### 6.4 Presupuestos por categoría

```
Usuario configura presupuesto mensual en categorías
                  ↓
  Al agregar gasto → server calcula % usado
                  ↓
  Si supera 80%: alerta suave (badge amarillo)
  Si supera 100%: alerta roja + notificación
                  ↓
  BudgetCard muestra barra de progreso animada
```

---

## 7. Features MVP

### Core
- [ ] Auth (magic links + OAuth)
- [ ] CRUD de transacciones (monto, tipo, fecha, descripción)
- [ ] Categorización automática con OpenAI
- [ ] Dashboard: balance, gasto total, ingreso total (mes actual)
- [ ] Gráfico de gastos por categoría (PieChart)
- [ ] Gráfico de tendencia mensual (LineChart)
- [ ] Seed data para demo (100+ transacciones ficticias)
- [ ] Multi-moneda (USD, COP, EUR)
- [ ] Presupuestos por categoría con barra de progreso

### Post-MVP
- [ ] Importar CSV bancario
- [ ] Insights IA con recomendaciones
- [ ] Alertas por email cuando se excede presupuesto
- [ ] Historial de meses anteriores (select mes/año)
- [ ] Exportar reports en PDF
- [ ] Tags personalizados
- [ ] Transacciones recurrentes (suscripciones)
- [ ] Modo oscuro/claro
- [ ] PWA para mobile

---

## 8. Consideraciones de Seguridad

- **RLS en Supabase**: cada query filtra por `auth.uid()` — un usuario solo ve sus datos
- **OpenAI**: nunca enviar datos personales identificables en el prompt (solo montos y categorías)
- **Rate limiting**: en `/api/categorize` para evitar abuso de API de OpenAI
- **Caché de insights**: el análisis IA se cachea en DB y se refresca cada 24h o al agregar 5+ transacciones nuevas
- **Validación**: Zod en todas las Server Actions y API routes
- **CSV import**: sanitizar y validar columnas antes de insertar

---

## 9. Prompts para Desarrollo con IA

### 9.1 Setup inicial — Proyecto + Auth + DB

**Objetivo**: Crear el proyecto base con Next.js 16, App Router, auth con Supabase y schema de base de datos.

**Archivos**: `setup inicial` (Next.js + Tailwind + Shadcn + Supabase + Drizzle)

**Prompt**:

```
Crea un proyecto Next.js 16 con App Router, TypeScript y Tailwind CSS.

1. Inicializa con `create-next-app` usando App Router y TypeScript.
2. Configura Tailwind CSS con dark mode por clase. Colores personalizados: primary (emerald), accent (violet).
3. Instala y configura Shadcn UI. Agrega: Button, Card, Input, Select, Badge, Avatar, Sheet, Separator, Progress, Tabs.
4. Instala @supabase/ssr. Crea los clients de Supabase (browser, server, middleware) con cookie-based auth.
5. Configura middleware.ts: rutas públicas (/, /login, /register), protegidas (/dashboard, /transactions, /insights, /settings).
6. Instala drizzle-orm + drizzle-kit + postgres + @supabase/postgrest-js.
7. Crea schema de DB en src/db/schema.ts con las tablas:
   - users: id (uuid pk), email, name, avatar_url, currency (text default 'USD'), created_at
   - transactions: id (uuid pk), user_id (fk), amount (decimal), type (income/expense), category (text), description (text), date (date), currency (text), created_at
   - categories: id (uuid pk), user_id (fk), name, icon, color, budget (decimal nullable), type (income/expense), unique(user_id, name)
   - ai_insights: id (uuid pk), user_id (fk), year (int), month (int), content (jsonb), created_at, unique(user_id, year, month)
8. Crea .env.example con: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, NEXT_PUBLIC_APP_URL.
9. Configura el layout raíz: metadata, fonts, providers.
```

### 9.2 Landing page

**Objetivo**: Landing atractiva que muestre el producto.

**Prompt**:

```
Crea una landing page para una app de finanzas personales con IA.

1. Hero: "¿Sabes realmente en qué gastas tu dinero?", subtítulo "Conecta tus cuentas, categoriza con IA, visualiza tus finanzas en tiempo real." Dos CTAs: "Empezar gratis" y "Ver demo".
2. Features section (3 columnas):
   - "Categorización IA": Describe un gasto y la IA lo clasifica automáticamente
   - "Dashboard visual": Gráficos interactivos de tus hábitos de gasto
   - "Alertas inteligentes": Presupuestos por categoría con notificaciones
3. Demo preview: screenshot o mockup del dashboard (puede ser placeholder)
4. CTA final: "Toma el control de tus finanzas"
5. Footer minimalista
```

### 9.3 Dashboard principal con charts

**Objetivo**: Vista principal del dashboard con resumen financiero y gráficos.

**Archivos**: `src/app/(dashboard)/dashboard/page.tsx`, `src/components/charts/SpendingChart.tsx`, `src/components/charts/CategoryPieChart.tsx`, `src/components/charts/MonthlyTrend.tsx`

**Prompt**:

```
Crea el dashboard principal de finanzas personales.

1. Layout protegido en `src/app/(dashboard)/layout.tsx`:
   - Sidebar con links: Dashboard, Transacciones, Presupuestos, Insights, Configuración
   - Navbar superior con nombre del usuario y avatar
   - Responsive: sidebar se oculta en mobile, se abre con Sheet

2. Página principal `src/app/(dashboard)/dashboard/page.tsx`:
   - Server component que consulta DB:
     - Balance total (ingresos - gastos del mes actual)
     - Total gastos este mes
     - Total ingresos este mes
     - Top 5 categorías con mayor gasto
     - Transacciones recientes (últimas 5)
   - Muestra:
     - 3 StatsCards: Balance, Gastos, Ingresos (con variación vs mes anterior)
     - PieChart de gastos por categoría
     - LineChart de tendencia mensual (últimos 6 meses)
     - Tabla de últimas transacciones

3. `src/components/charts/CategoryPieChart.tsx` ('use client'):
   - Props: data (array de { name, value, color })
   - Usa Recharts <PieChart> + <Pie> + <Cell> + <Legend>
   - Muestra tooltip al hover
   - Responsive container

4. `src/components/charts/MonthlyTrend.tsx` ('use client'):
   - Props: data (array de { month, income, expense })
   - Usa Recharts <LineChart> con dos líneas: income (verde), expense (rojo)
   - Tooltip con formato de moneda

5. `src/components/charts/SpendingChart.tsx` ('use client'):
   - Props: data (array de { category, amount, budget })
   - BarChart horizontal comparando gasto vs presupuesto
   - Barra roja si excede el presupuesto
```

### 9.4 CRUD de transacciones + categorización IA

**Objetivo**: Página para gestionar transacciones con formulario que usa IA para sugerir categoría.

**Archivos**: `src/app/(dashboard)/transactions/page.tsx`, `src/app/(dashboard)/transactions/new/page.tsx`, `src/components/transactions/TransactionForm.tsx`, `src/lib/openai.ts`, `src/app/api/categorize/route.ts`

**Prompt**:

```
Crea la gestión de transacciones con categorización IA.

1. `src/lib/openai.ts`:
   - Inicializa OpenAI con `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`
   - Exporta función `categorizeTransaction(description: string)` que:
     - Construye prompt: "Categoriza este gasto en una de estas categorías: food, transport, entertainment, shopping, health, education, bills, services, salary, other. Responde SOLO con JSON: { category: string, confidence: number }"
     - Llama a GPT-4o-mini (más barato, suficiente para esto)
     - Parsea la respuesta JSON
     - Retorna { category, confidence }

2. `src/app/api/categorize/route.ts`:
   - POST handler
   - Body: { description: string }
   - Llama a categorizeTransaction
   - Retorna { category, confidence }
   - Maneja errores: si OpenAI falla, retorna category "other" con confidence 0

3. `src/app/(dashboard)/transactions/page.tsx`:
   - Lista de transacciones del mes actual
   - Columnas: Fecha, Descripción, Categoría (con badge de color), Monto, Tipo (income/expense)
   - Filtros: por mes, por categoría, por tipo
   - Ordenado por fecha descendente
   - Paginación (20 por página)
   - Botón "Nueva transacción" → link a /transactions/new

4. `src/components/transactions/TransactionForm.tsx` ('use client'):
   - Campos: tipo (income/expense), monto, fecha, descripción, categoría
   - AI Assist: mientras escribe la descripción (debounce 500ms), llama a /api/categorize y autoselecciona la categoría sugerida
   - Muestra badge con nivel de confianza de la IA
   - Categoría se puede cambiar manualmente si la IA falla
   - Validación con Zod: monto > 0, fecha válida, descripción requerida
   - Submit via Server Action que inserta en DB
   - Después de guardar: revalida ruta y redirige a /transactions

5. Crea seed.ts con 100+ transacciones dummy para demo:
   - 3 meses de datos (mayo, junio, julio 2026)
   - Categorías variadas: food, transport, rent, entertainment, salary, health
   - Mezcla de income y expense
   - Script que inserta en Supabase via service_role
```

### 9.5 Presupuestos con progreso visual

**Objetivo**: Configurar presupuestos por categoría con barras de progreso y alertas.

**Archivos**: `src/app/(dashboard)/budgets/page.tsx`, `src/components/budgets/BudgetCard.tsx`, `src/components/budgets/BudgetProgress.tsx`

**Prompt**:

```
Crea la página de presupuestos por categoría.

1. `src/app/(dashboard)/budgets/page.tsx`:
   - Server component que consulta categories con budget > 0
   - Para cada categoría, calcula gasto del mes actual (SUM de transactions del mes)
   - Muestra grid de BudgetCards

2. `src/components/budgets/BudgetCard.tsx`:
   - Props: category (name, icon, color), budget (number), spent (number), percentage (number)
   - Card con: icono + nombre, monto gastado / presupuesto
   - BudgetProgress bar
   - Badge de estado:
     - < 50%: verde "Vas bien"
     - 50-80%: amarillo "Cuidado"
     - 80-100%: naranja "Casi llegas"
     - > 100%: rojo "Excediste"

3. `src/components/budgets/BudgetProgress.tsx`:
   - Barra horizontal animada
   - Color según porcentaje (verde → amarillo → rojo)
   - Muestra porcentaje al final de la barra
   - Animación de relleno al montar el componente (CSS transition)

4. Modal o inline form para editar presupuesto de cada categoría.
```

### 9.6 Insights con IA

**Objetivo**: Página de análisis mensual generado por IA con recomendaciones.

**Archivos**: `src/app/(dashboard)/insights/page.tsx`, `src/app/api/insights/route.ts`, `src/components/insights/AIInsightCard.tsx`

**Prompt**:

```
Crea la página de insights financieros con IA.

1. `src/app/api/insights/route.ts`:
   - GET handler, query params: year, month
   - Busca en tabla ai_insights si ya existe análisis para ese mes
   - Si existe y está actualizado (menos de 24h): retorna cached
   - Si no existe o expiró:
     a) Query a DB: total_income, total_expense, top 5 categories con montos, comparativa con mes anterior
     b) Construye prompt de análisis:
       "Eres un asesor financiero. Analiza estos datos del usuario:
        - Ingresos: $X
        - Gastos: $Y
        - Top categorías: [food: $Z, transport: $W...]
        - vs mes anterior: +$V
        Genera:
        1. Resumen de 1-2 oraciones
        2. Una alerta sobre el mayor gasto
        3. Una recomendación accionable
        Responde SOLO con JSON: { summary: string, alert: string, recommendation: string }"
     c) Llama a GPT-4o-mini
     d) Guarda resultado en ai_insights (cache)
     e) Retorna { summary, alert, recommendation }

2. `src/app/(dashboard)/insights/page.tsx`:
   - Selector de mes/año (default: mes actual)
   - Al cambiar mes: fetch a /api/insights?month=X&year=Y
   - Muestra 3 AIInsightCards
   - Loading skeleton mientras la IA responde

3. `src/components/insights/AIInsightCard.tsx`:
   - Props: icon, title, content (string), variant ("summary" | "alert" | "recommendation")
   - Variant summary: borde azul, icon info
   - Variant alert: borde amarillo/rojo, icon alerta
   - Variant recommendation: borde verde, icon bulb
   - Animación de entrada escalonada (fade in con delay)
```

### 9.7 Seed data para demo

**Objetivo**: Crear datos ficticios realistas para que el dashboard se vea funcional desde el primer deploy.

**Prompt**:

```
Crea un script seed.ts que genere datos dummy para la app de finanzas.

1. Crea `seed.ts` en la raíz del proyecto.

2. El script debe:
   a) Conectarse a Supabase usando service_role key (desde .env)
   b) Crear un usuario demo si no existe (email: demo@example.com)
   c) Insertar categorías con presupuestos:
      - Rent ($1200/mes), Food ($600), Transport ($200), Entertainment ($150),
        Health ($100), Shopping ($300), Bills ($250), Salary (income, $4500),
        Freelance (income, $0)
   d) Generar transacciones para los últimos 3 meses:
      - ~30 transacciones por mes (mezcla income/expense)
      - Descripciones realistas: "Alquiler apto", "Compra en Éxito", "Uber viaje",
        "Netflix", "Gym mensualidad", "Pago proyecto freelance", etc.
      - Montos coherentes con la categoría
      - Fechas distribuidas aleatoriamente en el mes
   e) Insertar un monthly_summary para cada mes

3. El script debe ser ejecutable con: npx tsx seed.ts
4. Loggear progreso en consola: "Insertando transacciones mayo... 28/30"
5. Al final: "Seed completado: 1 usuario, 8 categorías, 90 transacciones, 3 summaries"
```

### 9.8 Deploy y CI/CD

**Objetivo**: Preparar para producción en Vercel.

**Prompt**:

```
Prepara el proyecto para deploy en Vercel.

1. Crea README.md con:
   - Descripción del proyecto y screenshot
   - Stack tecnológico
   - Quick start: git clone, cp .env.example, npm install, npm run dev, npx tsx seed.ts
   - Variables de entorno necesarias
   - Deploy en Vercel: paso a paso

2. Crea .github/workflows/ci.yml:
   - Trigger: push y PR a main
   - Jobs: lint, typecheck, build

3. Configura next.config.js:
   - images: { remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }] }
   - experimental: { serverActions: { bodySizeLimit: '2mb' } }
```

---

## 10. Roadmap

| Fase | Duración | Entregable |
|------|----------|-----------|
| 1. Setup + Auth + DB | 2 días | Proyecto base funcional |
| 2. Landing page | 1 día | Página pública |
| 3. Dashboard + charts | 3 días | Overview con gráficos |
| 4. CRUD transacciones | 2 días | Formulario + lista + IA categorización |
| 5. Presupuestos | 2 días | Budget cards + progreso |
| 6. Insights IA | 2 días | Análisis mensual con GPT |
| 7. Seed data + polish | 2 días | Demo data, responsive, deploy |
| **Total** | **~14 días** | **App funcional lista para mostrar** |

---

## 11. Lo que este proyecto demuestra

| Habilidad | Cómo se evidencia |
|-----------|------------------|
| **Frontend complejo** | Dashboard con 3 tipos de gráficos interactivos, filtros, tabs |
| **Integración con IA** | OpenAI para categorización + insights, manejo de caché y errores |
| **Arquitectura fullstack** | Server Components, Server Actions, API routes, DB queries optimizadas |
| **UX thinking** | AI assist en formulario, loading skeletons, alertas progresivas |
| **Datos realistas** | Seed data que hace el demo creíble desde el primer deploy |
| **Seguridad** | RLS, rate limiting, validación Zod, sanitización de prompts |
| **TypeScript** | Tipado end-to-end desde DB schema hasta UI |
