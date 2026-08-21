# Roadmap — Mejoras del Portafolio

> Portafolio de Alejandro Pérez Lezama (alez2312p)
> Fecha: Julio 2026

---

## Tabla de Contenidos

1. [Prioridades Urgentes (HOT)](#1-prioridades-urgentes-hot)
2. [Contenido Personal](#2-contenido-personal)
3. [Proyectos](#3-proyectos)
4. [Diseño y UX](#4-diseño-y-ux)
5. [i18n — Traducciones](#5-i18n--traducciones)
6. [SEO y Technical Polish](#6-seo-y-technical-polish)
7. [Performance y Analytics](#7-performance-y-analytics)
8. [Freelance / Clientes](#8-freelance--clientes)
9. [NowSection y Blog](#9-nowsection-y-blog)
10. [Ideas de Proyectos Nuevos](#10-ideas-de-proyectos-nuevos)
11. [Archivos a Modificar/Crear](#11-archivos-a-modificarcrear)

---

## 1. Prioridades Urgentes (HOT)

| # | Tarea | Archivo | Tipo |
|---|-------|---------|------|
| 1.1 | Arreglar inconsistencia de años: el meta title dice "3 años" pero el Hero dice "5 años" | `src/pages/index.astro:7-8` y `src/pages/en/index.astro:7-8` | ✅ Completado |
| 1.2 | Llenar descripción vacía de E-Commerce en español | ~~`src/i18n/locales/es.json`~~ | ❌ Proyecto eliminado del JSON en reestructuración previa |
| 1.3 | Corregir gramática del inglés en HOME.INTRO ("in front-end..." → "as a front-end...") | `src/i18n/locales/en.json` | ✅ Completado |
| 1.4 | Open Graph / Twitter Card meta tags | `src/layouts/Layout.astro` | ✅ Completado |
| 1.5 | Crear imagen OG (1200×630) | `public/og-image.png` | ✅ Completado |

---

## 2. Contenido Personal

### 2.1 Tagline en el Hero

**Estado**: ✅ Completado

Se agregó la key `HOME.TAGLINE` en ambos JSONs y se renderiza en `HeroSection.astro` justo debajo del h1.

- **Español**: "Fullstack developer. Construyo productos web y móviles — del prototipo a producción."
- **Inglés**: "Fullstack developer. I build web and mobile products — from prototype to production."

### 2.2 Avatar personalizado

**Estado**: ✅ Completado

Se eligió `public/avatar/avatar.png`, se optimizó a 256×256 como `public/avatar-optimized.png` y se integró en `AboutMe.astro` reemplazando las iniciales "AP".

### 2.3 Reescribir AboutMe

**Estado**: ✅ Completado

Se reescribio el ABOUT en ambos idiomas. Ahora vende perfil profesional en lugar de datos personales.

**Archivos**: `src/i18n/locales/es.json` ABOUT, `src/i18n/locales/en.json` ABOUT

---

## 3. Proyectos

### 3.1 Diagnóstico de proyectos actuales

| Proyecto | Estado | Acción recomendada |
|----------|--------|--------------------|
| Barbershop (BarberFlow) | MVP personal con case study completo | ✅ **Conservar** — es el proyecto más sólido |
| ConstructTrack | Proyecto completo con case study | ✅ **Conservar** — segundo más fuerte |
| Blog | ~~Hecho con tutorial, sin case study~~ | ❌ Eliminado del JSON en reestructuración previa |
| E-Commerce | ~~Hecho con tutorial, descripción vacía en español~~ | ❌ Eliminado del JSON en reestructuración previa |
| Buckspay | Proyecto con ex-socio, código actual no propio | ❌ **Eliminar o reescribir descripción** |

### 3.2 Opciones para proyectos débiles

**Opción A — Eliminar**: Reducir a 2-3 proyectos pero que todos tengan case study. Mejor calidad que cantidad.

**Opción B — Refactorizar**:
- **E-Commerce**: Agregar funcionalidad original (Stripe real, dashboard admin, panel de envíos) y documentar el aporte propio.
- **Blog**: Convertirlo en blog técnico personal con artículos de desarrollo (ver sección 9).

**Opción C — Ser honesto**: Cambiar descripción a "Proyecto educativo basado en tutorial, con modificaciones propias en [X]".

### 3.3 Qué hacer con Buckspay

Si ya no trabajas con tu ex-socio y el código actual no es tuyo:

**Opción 1 — Eliminar**: Simplemente sacarlo del portafolio.

**Opción 2 — Reescribir descripción** con contexto honesto:
```
DESCRIPTION: "Co-fundador y desarrollador de la primera versión de Buckspay,
una aplicación de pagos y transferencias. El proyecto evolucionó y la versión
actual no refleja mi trabajo, pero la experiencia de construir un producto
fintech desde cero fue clave en mi formación."
```

**Opción 3 — Mantener solo la landing page**: El repo `buckspay_landing` parece ser tuyo. Cambia la descripción a:
```
"Landing page institucional para Buckspay, una startup fintech de la cual
soy co-fundador. Construida con Next.js y TypeScript."
```

### 3.4 Badge de madurez para proyectos — ✅ Completado

Barbershop y ConstructTrack → **MVP** (badge ámbar), Buckspay → **Archivado** (badge gris). Se muestra en la cabecera de cada ProjectCard.

---

## 4. Diseño y UX

### 4.1 Que no parezca template de Tailwind

| # | Tarea | Dificultad | Archivo |
|---|-------|------------|---------|
| 4.1.1 | Scrollbar personalizado | ✅ Completado | `src/layouts/Layout.astro` |
| 4.1.2 | Fondo con dot grid sutil | ✅ Completado | `src/layouts/Layout.astro` |
| 4.1.3 | Cursor glow en project cards | ✅ Completado | `ProjectCard.astro` |
| 4.1.4 | Display font Outfit para títulos | ✅ Completado | `tailwind.config.mjs`, `Layout.astro` |
| 4.1.5 | Gradientes entre secciones | ✅ Completado | `Home.astro` |
| 4.1.6 | Sticky sidebar con stack actual | ✅ Completado | `StackTracker.astro` |



### 4.2 Niveles en Skills

**Estado**: ✅ Completado

Se agregó `level: "advanced" | "intermediate" | "learning"` a cada tag en `Tags.astro`.
---

**Niveles asignados**: React, Next.js, TypeScript, Tailwind, Node.js, Express, Flutter → `advanced` · Prisma, MongoDB, Firebase, PostgreSQL, Supabase, NestJS, React Native, Angular, Astro → `intermediate` · Ionic → `learning`

**Skills reducidas** (23 → 17). Eliminados de TAGSLIST e iconos: CSS, JavaScript, Shadcn, Cordova, Neon, Vite.

---

## 5. i18n — Traducciones

### 5.1 Inconsistencias encontradas

| Ruta | Español | Inglés | Acción |
|------|---------|--------|--------|
| `HOME.INTRO` | "en desarrollador front-end..." | "as a front-end..." | ✅ Corregido |
| `HOME.YEARS_EXPERIENCE` | Lo usa como prefijo | Lo usa como prefijo | Evaluar si la frase en inglés suena natural |
| `PROJECTS[3].DESCRIPTION` | ~~`""` (vacío)~~ | ~~"Full-stack e-commerce platform..."~~ | ❌ Proyecto eliminado |
| `EXPERIENCE[0].COMPANY` | "Independiente" | "Freelance" | Decidir si unificar (ambos correctos) |
| `EXPERIENCE[2].TITLE` | "Desarrollador flutter" | "Flutter Developer" | Corregir español → "Desarrollador Flutter" (mayúscula) |
| `ABOUT.CONTENT2` | Sin nombres de ciudades | Con "Medellín and Bogotá" | ✅ Agregado en la reescritura |
| `ABOUT.CONTENT3` | "una comunidad enfocados" | "a community focused" | ✅ Corregido en la reescritura |
| Página `/` title | "5+ años" (hardcodeado) | "over 5 years" (hardcodeado) | ✅ Corregido |

### 5.2 Meta tags hardcodeados vs JSON

En `src/pages/index.astro` y `src/pages/en/index.astro`, los props de Layout están hardcodeados:

```astro
<Layout
  title="Alejandro P. Lezama - Desarrollador Front-end y Móvil"
  description="...con más de 3 años de experiencia..."
>
```

Estos NO leen del JSON. Deben actualizarse manualmente para coincidir con "5 años" del HeroSection. Propuesta:

```
title: "Alejandro P. Lezama - Fullstack Developer"
description: "Fullstack developer con 5+ años de experiencia en React, Next.js, Flutter y Node.js. Construyo productos web y móviles de principio a fin."
```

---

## 6. SEO y Technical Polish

### 6.1 Open Graph Tags — ✅ Completado
### 6.2 OG Image — ✅ Completado
### 6.3 Sitemap — ✅ Completado
### 6.4 Robots.txt — ✅ Completado
### 6.5 Página 404 — ✅ Completado (es/en)
### 6.6 Código muerto — ✅ Limpiado (LinkButton.astro eliminado, comentario index.ts, puffy-point)
### 6.7 Preload crítico de fonts — ✅ Completado

---

## 7. Performance y Analytics

### 7.1 Analytics — ✅ Completado

Se agregó script de Plausible en `Layout.astro`. Activo con dominio `alez2312p.dev`.

### 7.2 Performance

| Tarea | Estado |
|-------|--------|
| Lazy loading de imágenes | ✅ Ya implementado |
| Compresión de imágenes (WebP) | ✅ Convertidas: barbershop, constructtrack, buckspay, avatar |
| Verificar Core Web Vitals | ⏳ Pendiente (ejecutar Lighthouse en producción) |
| Minificación | ✅ Astro lo hace en build |

---

## 8. Freelance / Clientes — ✅ Completado

Se agregó sección `Freelance / Consulting` en Home.astro con 4 proyectos ofuscados (Consultoría Técnica eliminada posteriormente):
1. Community Platform for Creators (ex-Wemany) — Next.js, TypeScript, Tailwind, Node.js, PostgreSQL
2. Multi-Role Booking Platform (ex-VeltIA) — Angular, Ionic, Node.js, Express, PostgreSQL
3. Social Discovery App (ex-MyLatinLove) — Flutter, Firebase
4. POS System for Supermarkets (ex-KódigoFuente) — Flutter, Node.js, TypeScript

**Archivos**: `Freelance.astro`, `FreelanceCard.astro`, datos en locale JSONs, StackTracker actualizado.

**Nota**: Booking Platform actualizado con Angular + Ionic según feedback del usuario.

## 9. NowSection y Blog

### 9.1 Mejorar NowSection

**Estado**: ✅ Completado

Cada ítem ahora conecta con un resultado visible o llamado a la acción.

### 9.2 Blog / Writing — ❌ Descartado (por ahora)

El usuario decidió no implementar blog por el momento.

---

## 10. Ideas de Proyectos Nuevos

**Proyecto seleccionado**: Finanzas personales con IA. Documento completo en `docs/proyectos/finanzas-personales-ia.md`. Starter Kit MVP reemplazado.

### 10.1 Criterios para elegir proyecto

- Que use tecnologías en las que ya eres fuerte (Next.js, Supabase, TypeScript)
- Que tenga un componente visual interesante (para la screenshot del portafolio)
- Que resuelva un problema real (aunque sea pequeño)
- Que puedas mostrar métricas ("X usuarios", "Y requests por día")

### 10.2 Ideas

| # | Proyecto | Stack | Tiempo estimado | Por qué funciona |
|---|----------|-------|-----------------|-----------------|
| 1 | **Dashboard DeFi personal** — Conecta wallet (MetaMask), muestra balances, histórico de transacciones, gráficos | Next.js + Wagmi + Viem + Recharts + Alchemy API | 2-3 semanas | Muestra Web3 + frontend complejo con datos reales |
| 2 | **Starter Kit MVP** — Boilerplate Next.js + Supabase + Auth + Stripe + emails | Next.js + Supabase + Stripe + Resend | 2 semanas | Gana estrellas en GitHub, posiciona como dev que piensa en otros |
| 3 | **Finanzas personales con IA** — "¿En qué gasté más este mes?" con análisis GPT | Next.js + OpenAI API + PostgreSQL + Chart.js | 3-4 semanas | Trending (IA) + útil + genera conversación en entrevistas |
| 4 | **Plataforma de mentorías para hackathons** — Matching mentores↔equipos, agenda, recursos | Next.js + Supabase Realtime | 3-4 semanas | Conecta con tu experiencia en comunidad y hackathons |
| 5 | **Status page / Uptime monitor** — App que monitorea sitios web y notifica si caen | Next.js + Cron Jobs + Supabase + Resend (emails) | 1-2 semanas | Técnicamente interesante, fácil de explicar, demo visual atractiva |
| 6 | **API wrapper de datos públicos de Colombia** — Datos abiertos (API Banrepública, DANE, etc) con GraphQL | NestJS + GraphQL + Redis cache | 2 semanas | Nicho, muestra backend puro, útil para comunidad dev colombiana |
| 7 | **CLI tool para iniciar proyectos** — `create-alez-app` que configura Next + Tailwind + Shadcn + Supabase automáticamente | Node.js + CLI (commander/inquirer) | 1 semana | Viral potencial en GitHub, muestra que piensas en DX |

### 10.3 Proyecto recomendado #1: Starter Kit MVP

**Por qué**: Es el que más retorno de inversión da. Un boilerplate bien documentado en GitHub puede:
- Conseguir estrellas y visibilidad
- Mostrar que entiendes el ciclo completo de un proyecto
- Ser útil para otros devs (y para ti mismo en futuros proyectos)
- Ponerlo como "Proyecto destacado" en el portafolio con métricas ("50+ estrellas en GitHub", "usado por X personas")

### 10.4 Proyecto recomendado #2: Dashboard DeFi

**Por qué**: Conecta con tu perfil Web3 (Avalanche, dotlabs__). Incluye:
- Conexión con wallet (Web3)
- Datos en tiempo real (gráficos)
- UI compleja (tablas, charts, filtros)
- Stack moderno (Wagmi, Viem, Recharts)

---

## 11. Archivos a Modificar/Crear

### 11.1 Archivos existentes a modificar

| Archivo | Cambio |
|---------|--------|
| `src/layouts/Layout.astro` | ✅ OG tags + scrollbar + dot grid + display font import |
| `src/pages/index.astro` | ✅ Ya dice 5 años |
| `src/pages/en/index.astro` | ✅ Ya dice 5 years |
| `src/i18n/locales/es.json` | ✅ TAGLINE, ✅ ABOUT reescrito, ⚠️ Blog/e-commerce eliminados en reestructuración |
| `src/i18n/locales/en.json` | ✅ TAGLINE, ✅ ABOUT reescrito, ✅ HOME.INTRO corregido |
| `src/components/HeroSection.astro` | ✅ Tagline agregado |
| `src/components/AboutMe.astro` | ✅ Avatar implementado |
| `src/components/Skills.astro` | ✅ Lógica de niveles, ✅ skills reducidas (23→17), reorden reclutador |
| `src/components/Tags.astro` | ✅ Level en cada tag, ✅ eliminados: CSS, JS, SHADCN, CORDOVA, NEON, VITE |
| `src/components/CaseStudy.astro` | ✅ Modal overlay con traducción |
| `src/components/Projects.astro` | ⚠️ Verificar proyectos restantes |
| `src/components/NowSection.astro` | ✅ Contenido mejorado con enfoque en resultados |
| `src/i18n/index.ts` | ✅ Comentario eliminado |
| `package.json` | ✅ name cambiado a "alez2312p-portfolio" |
| `astro.config.mjs` | ✅ Sitemap integrado |

### 11.2 Archivos nuevos a crear

| Archivo | Propósito |
|---------|-----------|
| `public/og-image.png` | ✅ OG image 1200×630px creada |
| `public/og-image.svg` | ✅ Fuente editable de la OG image |
| `src/components/StackTracker.astro` | ✅ Sticky sidebar con stack actual |
| `public/robots.txt` | ✅ Creado |
| `src/pages/404.astro` | ✅ Creada |
| `src/pages/en/404.astro` | ✅ Creada |
| `src/content/writing/*.md` | Artículos del blog (opcional) |
| `src/components/RecentWritings.astro` | Sección de blog (opcional) |
| `docs/proyectos/finanzas-personales-ia.md` | ✅ Documentación completa del proyecto Finanzas con IA |

---

## Checklist Resumido

### Esta semana (HOT)
- [x] Arreglar inconsistencia años (3→5) en ambas páginas
- [x] Agregar Open Graph tags en Layout
- [x] Crear OG image
- [x] Corregir gramática inglés HOME.INTRO

### Este mes
- [x] Reescribir AboutMe
- [x] Agregar tagline al Hero
- [x] Skills con niveles
- [x] Crear avatar
- [x] Diseño: scrollbar personalizado
- [x] Dot grid background
- [x] Cursor glow en cards
- [x] Display font (Outfit) para títulos
- [x] Gradient dividers entre secciones
- [x] Sticky sidebar (StackTracker)
- [x] CaseStudy modal overlay + traducción i18n
- [x] Buckspay descripción reescrita
- [x] Badge de madurez (3.4) — MVP / Archivado
- [x] Sitemap + robots.txt + 404
- [x] Limpiar código muerto (LinkButton.astro eliminado, comentario index.ts, package.json name)

### Pendiente
- [x] Agregar clientes freelance al portafolio
- [x] Analytics (Plausible)
- [x] Preload crítico de fonts
- [x] Compresión de imágenes a WebP
- [ ] Verificar Core Web Vitals en producción (requiere deploy)
- [x] Skills reducidas (23→17), iconos eliminados
- [x] Orden reclutador en secciones
- [x] Dashboard DeFi / Starter Kit MVP / otros (ideas a futuro, sin prioridad)
- [ ] Blog — ❌ Descartado
