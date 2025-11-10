# APU Presupuestos (Vite + React + TypeScript + Tailwind)

[![CI](https://github.com/franciscogalazs-cloud/pres/actions/workflows/ci.yml/badge.svg)](https://github.com/franciscogalazs-cloud/pres/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/franciscogalazs-cloud/pres/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/franciscogalazs-cloud/pres/actions/workflows/deploy-pages.yml)

Prod: https://franciscogalazs-cloud.github.io/pres/

Aplicación para gestión de APU (Análisis de Precios Unitarios) y presupuestos de construcción. Stack: Vite + React 18 + TypeScript + Tailwind.

> Estado actual (Nov 2025): se han incorporado reemplazo masivo de APUs con verificación de unidad, costeo directo visible en subpartidas, badges de “incompleto”, unificación de tooltips, y refinamiento de la toolbar de capítulos (stick con etiqueta clickeable para renombrar).

## Estructura del proyecto

```
.
├─ src/
│  ├─ App.tsx                # Lógica principal: estado global, modales, reemplazo masivo, impresión
│  ├─ components/
│  │  ├─ BudgetTable.tsx     # Tabla de capítulos / render de filas
│  │  ├─ Row.tsx             # Partidas, subpartidas y lista de APUs con costo directo
│  │  ├─ CurrencyInput.tsx   # Input monetario con formato CLP
│  │  └─ Glitch*.css/tsx     # Efectos visuales puntuales
│  ├─ main.tsx
│  └─ index.css
├─ package.json
├─ tsconfig.json
├─ tailwind.config.js
├─ postcss.config.js
└─ vite.config.ts
```

## Requisitos

- Node.js >= 20
- npm (o pnpm/yarn si prefieres; aquí usamos npm)

## Scripts básicos

```bash
# Desarrollo con hot reload
npm run dev

# Build de producción
npm run build

# Pre-visualización del build
npm run preview
```

## Desarrollo local rápido

```bash
npm ci             # o npm install
npm run dev        # abre http://localhost:5173
```

## Funcionalidades clave

### APU y Biblioteca
* Biblioteca con secciones A–D (Materiales, Equipos, Mano de Obra, Varios) + extras dinámicas.
* Detección de APUs incompletos (sin unidad, PU=0, sección vacía) con badge y tooltip de razones.
* Reemplazo masivo: listar usos de un APU y sustituirlo en todas las partidas/subpartidas (con confirmación si las unidades no coinciden tras normalizar `m²/m³` → `m2/m3`).

### Presupuesto
* Capítulos, partidas y subpartidas con múltiples APUs asignables.
* Costo directo unitario visible en cada APU dentro de la subpartida (pill con color según estado: incompleto / PU=0 / OK).
* Etiqueta “Nombre del capítulo” clickeable (renombrar rápido) junto al select de capítulos.
* Botones unificados estilo pill: agregar capítulo, renombrar, eliminar, agregar partida.
* Prevención de auto‑creación de APU al eliminar el último (flag `_noAutoApu`).

### UI / Accesibilidad
* Tooltips y `aria-label` homogéneos en acciones (ver, editar, eliminar, ocultar/mostrar, mover capítulo, costo directo).
* Desactivación opcional de toasts.
* Normalización de unidades para búsquedas y reemplazos.

### Cálculo y Totales
* Se suman costos unitarios de cada APU (recursos coeficientes / rendimiento / subAPUs) y se propagan a subpartida y partida.
* Parámetros: Gastos Generales (GG), Utilidad (Util), IVA configurables; base costo directo igual a suma de secciones.

### Exportación e impresión
- Vista “Imprimir” genera un HTML A4 con:
  - Cabecera por PARTIDA en MAYÚSCULAS destacada en gris.
  - Subpartidas listadas con sus cantidades, P.Unit y P.Total.
  - Subtotales por sección (Materiales, Mano de Obra, Equipos, Varios) cuando corresponda.
  - Fila “COSTO DIRECTO partida …” donde solo “COSTO DIRECTO” va en mayúsculas; resto en minúsculas.
  - Resumen final sin IVA con “COSTO DIRECTO” en mayúsculas y el resto en minúsculas.
- Exportación a Excel replica la estructura anterior con estilos (cabeceras grises, subtotales en negrita, costo directo con realce sutil). Fallback a SheetJS si ExcelJS no está disponible.

### Persistencia (localStorage)
- Biblioteca de APUs, alias de fusión, proyectos (stick), usuarios simples y notas del presupuesto en `localStorage`.
- Alias: al limpiar duplicados se crean equivalencias id→id canónico y se respetan al buscar/usar APUs.
- Plantillas: `defaults` incluye catálogos y APUs base; se normalizan unidades (m²/m³ → m2/m3) para mejorar coincidencias.
- Usuarios: registros mínimos de prueba (email, nombre) para etiquetar presupuestos. Se pueden limpiar desde la UI.

### Notificaciones (toasts)
- Habilitadas por defecto. Se pueden desactivar con:
  - `VITE_DISABLE_TOASTS=true` (en build) o
  - `localStorage['apu-toasts-disabled']='1'` (en runtime).

## Datos iniciales y presets

- Catálogo de recursos “hardcodeado”.
- APUs de ejemplo ampliados (incluye partidas para piscina y red hidráulica en conjunto).
- Botones “Cargar preset Casa 10×10” y “Cargar preset piscina” para poblar un presupuesto de ejemplo.

Notas de encoding: Las cadenas se normalizan a Unicode NFC y las unidades con superíndices (m²/m³) se convierten a forma plana (m2/m3) para evitar errores en búsquedas y similitudes.

## Despliegue (GitHub Pages)

El proyecto se publica automáticamente a GitHub Pages usando el workflow oficial de Actions:

- Workflow: `.github/workflows/deploy-pages.yml` (se ejecuta en cada push a `main`).
- Entorno: `github-pages` (sin rama `gh-pages`).
- URL: https://franciscogalazs-cloud.github.io/pres/

Notas importantes:
- `vite.config.ts` ya define `base: '/pres/'` para rutas correctas en Pages.
- Se copia `dist/index.html` a `dist/404.html` como fallback de SPA.

## Buenas prácticas

- No versionar `dist/` (está en `.gitignore`).
- Validar build antes de publicar (TypeScript y Vite ambos OK).

## Troubleshooting rápido

- 404 al desplegar: confirma `base=/pres/` y que existe `dist/404.html`.
- Paths rotos en producción: revisa el origen configurado en Pages (Actions vs gh-pages) y el `base` de Vite.

## Notas de dominio

- APU y Presupuestos con precios en CLP, formato chileno.
- Recursos estáticos, APUs con secciones A–D y extras; cálculo unitario por suma de secciones.
- Estructura típica: Gastos generales + Utilidad + IVA.

---

## Licencia
MIT (o ajusta según políticas internas).

## Módulos alternativos y flags
Actualmente la app usa una sola variante (`App.tsx`). Se retiraron variantes legacy no utilizadas del build para simplificar el código.

## Hooks de offline y almacenamiento
- `src/hooks/offline.ts` concentra hooks de conexión, cache, backup y datos offline.
- Unificación: se reutiliza `useLocalStorage` central y se evita duplicar implementaciones. Importa desde `src/hooks`:
  - `useOnlineStatus`, `useOfflineData`, `useAutoBackup`.

## Dependencias y carpetas auxiliares
- Directorios `api/` y `frontend/` son placeholders de experimentos/prototipos y no participan del build de la SPA.
  - Si pasan a producción, documenta su propósito y pipeline; si no, considera limpiarlos para reducir ruido.

## Tests
## Próximos pasos sugeridos

1. Migrar botones sueltos al wrapper accesible común (componentes de `accessibility.tsx`).
2. Añadir pruebas unitarias a cálculo de secciones y reemplazo masivo (mock de biblioteca + presupuesto).
3. Code-split del modal grande de APU y del export avanzado para reducir bundle (>500 kB warning actual).
4. Agregar soporte de i18n simple (ES/EN) usando lazy dictionary.
5. Implementar hash de integridad en exportaciones “profesional” (campo verificación con firma ligera).

- Se añadieron pruebas básicas (Vitest) para utilidades críticas:
  - Normalización de unidades (`normUnit`).
  - Cálculo de costos unitarios (`unitCost`).
- Ejecuta con `npm run test` (requiere instalar dependencias de dev).

## Contextos y Providers

La app se envuelve típicamente en los siguientes providers (orden recomendado):

```tsx
<ThemeProvider>
  <AnimationProvider>
    <ShortcutProvider>
      <AnalyticsProvider>
        <App />
      </AnalyticsProvider>
    </ShortcutProvider>
  </AnimationProvider>
</ThemeProvider>
```

Resumen de cada contexto:

| Contexto | Archivo | Propósito | Hooks principales |
|----------|---------|-----------|-------------------|
| Theme | `contexts/ThemeContext.tsx` | Tema claro/oscuro + colores en CSS vars | `useTheme()` |
| Animation | `contexts/AnimationContext.tsx` | Variants `framer-motion` reutilizables + reduced motion | `useAnimation()` |
| Shortcut | `contexts/ShortcutContext.tsx` | Registro dinámico de atajos agrupados | `useShortcuts()`, `useRegisterShortcuts()` |
| Analytics | `hooks/analytics.tsx` | Registro de eventos locales (budget/export/ui) | `useAnalytics()` |

### ShortcutContext
Permite registrar grupos de atajos por componente (ej: filas de presupuesto). Cada fila activa (hover/focus) registra su grupo y se desregistra al desmontar. Evita colisiones porque sólo grupos habilitados se evalúan de forma centralizada. El modal de ayuda (`ShortcutHelpModal`) lista grupos y su estado.

### ThemeProvider
Persistencia en `localStorage['apu-theme']`. Expone `colors` con paletas para generar clases dinámicas y aplicar CSS custom properties. Toggle rápido `dark`/`light`.

### AnimationProvider
Centraliza variantes (`fadeInUp`, `staggerContainer`, etc.) y respeta `prefers-reduced-motion`. Si el usuario prefiere reducir animaciones se renderiza layout estático.

### AnalyticsProvider
Almacena hasta 200 eventos (`localStorage['apu-analytics-log']`). Categorías: `budget`, `project`, `export`, `offline`, `notification`, `ui`, `custom`. Incluye `trackTiming` para envolver operaciones y medir duración. Export JSON y limpieza desde `AnalyticsPanel`.

## Performance y Optimización

Componentes y hooks clave:

- `hooks/performance.ts`: utilidades como `useStableMemo` (memo manual por lista de deps), `useOptimizedDebounce` (leading/trailing + maxWait), `useVirtualList` (renderiza sólo ítems visibles), `useExpensiveOperation` (timeout + fallback), `useCacheWithTTL` (map en memoria con limpieza periódica), `withRenderOptimization` (HOC para `React.memo` configurable), `useIntersectionObserver` (lazy mount de secciones).
- Virtualización sugerida para tablas extensas de APUs (actualmente se renderizan completas; se puede integrar `useVirtualList` en `BudgetTable`).
- Cálculo unitario memoizado por APU vía `Map` en `unitCost` y `unitCostBySection` evita recomputaciones profundas.
- Estrategias futuras: dividir `App.tsx` (>7000 líneas) en módulos (Project/Users/Library/Calculator), cargar modal APU y export avanzado con `dynamic import()`.

## Offline, Cache y Backups

Hooks:
- `useOnlineStatus`: listener de eventos `online/offline`.
- `useOfflineData(key, initial, syncFn?)`: combina `localStorage` + sync condicional (si la conexión vuelve y pasaron ≥5 min).
- `useCache(key, expirationMinutes)`: wrapper para persistir caché con expiración (clave `cache_${key}`) y limpieza al leer.
- `useAutoBackup(data, key, intervalMinutes)`: snapshots cada N minutos en claves `key_backup_YYYY-MM-DD`. Recuperables con `getBackups()` y `restoreBackup()`.

Claves relevantes de `localStorage` (prefijo `apu-*`):
`apu-library`, `apu-projects`, `apu-projects-list`, `apu-active-project-id`, `apu-users`, `apu-active-user-email`, `apu-gg`, `apu-util`, `apu-iva`, `apu-budget-notes`, `apu-theme`, `apu-analytics-log`.

## Exportación Avanzada

Hook `useAdvancedExport` soporta formatos: HTML, CSV, JSON (PDF/Excel marcados como próximos). Opciones:
- Encabezado (cliente, proyecto, fecha, versión).
- Plantillas: `standard`, `detailed`, `summary`, `professional`.
- Firma digital (campos de firmantes, nombres y cargos).
- Logo embebido (`DataURL`).
- Marca de agua (`watermark`).
- Anexos: lista de `{ title, href }`.
- Verificación: bloque con código, etiqueta y placeholder QR (`showVerificationQR`).
- Jerarquía APUs: render recursivo hasta `hierarchyDepth` (1–3) mostrando recursos y subAPUs con coef/rendimiento.
- Barra de progreso (`exportProgress`) y estado (`isExporting`).

## Modelo de Datos y Validación

Tipos (`src/types/index.ts`):
- `Resource { id, tipo, nombre, unidad, precio }`.
- `ApuItemCoef { resourceId, coef, merma }`.
- `ApuItemRend { resourceId, rendimiento }`.
- `ApuItemSubApu { apuRefId, coef | rendimiento }`.
- `Apu { id, descripcion, unidadSalida, items[] }` (se extiende con `secciones` en runtime para modo moderno).
- `MetradoCalculator`: gran conjunto de presets (1D/2D/3D/kg) para cálculos asistidos.
- `FinancialParams { gg, util, iva }`.
- `CostBreakdown` y entidades de proyecto/usuario.

Validación (`utils/validations.ts`): esquemas Zod para recursos, ítems, APU (mín 1 item), metrados, parámetros financieros (todos en rango 0–1), plantillas. Utilidades `validateNumber`, `validateString` para casos simples. Se retornan arrays de mensajes normalizados.

## Motor de Cálculo

`unitCost(apu, resources, apusIndex, memo, stack)`:
- Ruta secciones: si el APU tiene filas en `secciones` (A–D + extras/heredadas), suma `cantidad*pu` evitando interferencia de `items` legacy.
- Ruta legacy: recorre `items` discriminados por `tipo` (`coef`/`rendimiento`/`subapu`).
- Sub-APU: evita ciclos con `stack` y usa `memo` para caching; coef vs rendimiento (si hay `rendimiento` se usa `1/rendimiento`).
- Devuelve `{ unit, desglose[] }`.

`unitCostBySection` agrega costos por categoría (materiales, manoObra, equipos, varios) propagando composición de subAPUs.

`calculateCostBreakdown` aplica GG, Utilidad, IVA sobre costo directo y `calculateBudgetTotals` multiplica por metrados de filas.

Prevención de bucles: si detecta ciclo devuelve costo 0 con marca `Ciclo en <id>`.

## Proyectos y Usuarios

Persistencia:
- Proyectos (snapshots) en `apu-projects-list` + activo `apu-active-project-id` y detalle `apu-project`.
- Usuarios simples en `apu-users`; selección activa `apu-active-user-email`.
- Modales rápidos: `ProjectInfoModal`, `UserQuickModal` permiten creación/edición básica con confirmaciones.
- Eliminación rápida con confirm y limpieza de selección activa.

## Accesibilidad y Atajos

- Tooltips y `aria-label` consistentes en todos los iconos (Eliminar, Duplicar, Ocultar/Mostrar, Renombrar, Mover a capítulo, Costo directo, Quitar APU).
- Shortcut por fila de partida: al hover/focus registra grupo con `Delete` (eliminar) y `Ctrl+D` (duplicar si disponible).
- `ShortcutHelpModal`: overlay con tabla de grupos y estado (deshabilitado si no activo).
- Uso de `kbd` estilizado para mostrar combinaciones (Ctrl + S, etc.).

## Seguridad / Integridad de Datos

- Sin backend: todo `localStorage`, NO cifrado (recomendación: futuro export cifrado + checksum SHA‑256).
- Limpieza de duplicados crea `alias` (map id→id canónico) preservando referencias antiguas.
- Normalización Unicode (NFC/NFKC) y unidades (superíndices ²/³ → 2/3) para evitar “m²” vs “m2” inconsistencias.
- Prevención de ciclos en subAPUs para impedir recursión infinita.
- Flags como `_noAutoApu` evitan creación automática al retirar el último APU.

## APU Incompletos y Pills de Costo

`isApuIncompleteDetail(apu)` evalúa unidad salida, presencia de filas con `pu>0` y requisitos mínimos por sección. Resultado usado para:
- Pill color ámbar: incompleto (tooltip con razones únicas).
- Pill rosa: costo directo = 0 (sin recursos ni filas).
- Pill neutro: OK.
Se muestra en cada APU dentro de subpartida con formato moneda (`fmt`).

## Troubleshooting Ampliado

| Caso | Causa | Acción |
|------|-------|--------|
| Costo directo pill = $0 | APU sin filas con `pu>0` o ciclo subapu | Revisar secciones, evitar referencias cruzadas |
| Unidad reemplazo masivo advierte incompatibilidad | `normUnit` distinto entre origen y destino | Editar unidad origen/destino o confirmar reemplazo manual |
| Eventos analytics no persisten | Límite 200 o storage bloqueado | Limpiar (`AnalyticsPanel` → Limpiar) y reintentar |
| Backup no aparece | Intervalo no transcurrió o clave errónea | Verificar clave `*_backup_*` y esperar intervalo configurado |
| Alias no aplica | `aliasMap` no actualizado tras fusión | Ejecutar limpieza duplicados manual o revisar `localStorage['apu-alias-map']` |
| Atajo Delete no funciona | Fila no activa | Hacer hover/focus en la fila |

## Directorios Auxiliares

- `api/` y `frontend/`: prototipos independientes del build actual. Se sugiere: (a) documentar su pipeline si se integran, (b) remover si quedan obsoletos para reducir ruido.

## Roadmap Extendido

1. Code splitting de `App.tsx` y modales pesados (`ApuEditModal`, export avanzado) vía lazy + suspense.
2. Worker para cálculos masivos (unitCost de grandes árboles) y sustituciones.
3. i18n ES/EN con diccionario ligero y lazy load.
4. Firma hash en export HTML (bloque Verificación con SHA‑256 + QR real).
5. Tests de regresión (Vitest + Playwright) para reemplazo masivo y pills de costo.
6. Almacenamiento cifrado opcional (AES-GCM) en backups.
7. Integración de un motor de plantillas PDF (Puppeteer o Print API externa, detrás de flag).

## Snippet Root Providers

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { AnimationProvider } from './contexts/AnimationContext';
import { ShortcutProvider } from './contexts/ShortcutContext';
import { AnalyticsProvider } from './hooks/analytics';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <AnimationProvider>
      <ShortcutProvider>
        <AnalyticsProvider>
          <App />
        </AnalyticsProvider>
      </ShortcutProvider>
    </AnimationProvider>
  </ThemeProvider>
);
```

---
Fin README ampliado.
