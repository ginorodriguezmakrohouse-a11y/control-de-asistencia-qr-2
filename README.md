# Control de Asistencia QR (LIMONADA)

App React + Vite + Tailwind con backend Supabase. Pensada para correr desde GitHub y desplegarse en Netlify.

## Requisitos

- Node.js 20+
- Un proyecto de [Supabase](https://supabase.com) (plan gratuito basta)

## Configuración

### 1. Base de datos (Supabase)

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor** y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
   El script crea las tablas `employees`, `attendance_records`, `system_config`, índices, triggers y políticas RLS.

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y completa:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-ANON-KEY
```

(Valores en Supabase Dashboard → Project Settings → API.)

En Netlify: **Site configuration → Environment variables** agrega las mismas dos variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

### 3. Ejecutar en local

```bash
npm install --legacy-peer-deps
npm run dev        # http://localhost:3000
npm run build      # genera dist/
npm run lint       # chequeo TypeScript
```

> Nota: si omites las variables de entorno, la app arranca en modo local (datos de ejemplo en localStorage) mostrando un aviso; con credenciales válidas usa Supabase como fuente de verdad y migra automáticamente los datos locales la primera vez.

## Despliegue desde GitHub (Netlify)

1. Sube este repositorio a GitHub.
2. En Netlify: **Add new site → Import an Git repo**.
3. Build command: `npm run build` · Publish directory: `dist` (ver `netlify.toml`).
4. Si el build falla por peer dependencies, cambia el comando a `npm install --legacy-peer-deps && npm run build`.
5. Agrega las variables de entorno y publica.

## Estructura

- `src/lib/supabase.ts` — cliente Supabase + flag `isSupabaseConfigured`
- `src/lib/mappers.ts` — conversión snake_case (DB) ↔ camelCase (TS)
- `src/lib/supabaseService.ts` — CRUD con upserts por lotes
- `src/lib/migrateLocalStorageToSupabase.ts` — migración única localStorage → Supabase
- `supabase/schema.sql` — esquema completo + RLS
