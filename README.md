# APU Presupuestos (Vite + React + TS + Tailwind)

[![CI](https://github.com/franciscogalazs-cloud/pres/actions/workflows/ci.yml/badge.svg)](https://github.com/franciscogalazs-cloud/pres/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/franciscogalazs-cloud/pres/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/franciscogalazs-cloud/pres/actions/workflows/deploy-pages.yml)

Prod: https://franciscogalazs-cloud.github.io/pres/

Aplicación de gestión de APU y presupuestos de construcción. Stack: Vite + React 18 + TypeScript + Tailwind.

## Estructura del proyecto

```
.
├─ src/
│  ├─ App.tsx                # Lógica principal, estado global y modales
│  ├─ components/
│  │  ├─ BudgetTable.tsx     # Tabla (desktop) de capítulos/partidas
│  │  ├─ Row.tsx             # Filas de partidas y subpartidas
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

## Scripts

```bash
# Desarrollo con hot reload
npm run dev

# Build de producción
npm run build

# Pre-visualización del build
npm run preview
```

## Desarrollo local

```bash
npm ci             # o npm install
npm run dev        # abre http://localhost:5173
```

## Funcionalidades clave

- Biblioteca de APU con secciones A–D (Materiales, Equipos, Mano de Obra, Varios) y “extras” personalizadas.
- Modal de detalle APU: edición de filas, totales por sección, observaciones y secciones extra.
- Presupuesto por capítulos/partidas, con subpartidas y asignación de múltiples APUs por partida/subpartida.
- Abrir modal de APU directamente desde Presupuesto haciendo clic en el nombre del APU (desktop y móvil).
- Quitar APU desde Presupuesto con confirmación:
  - Papelera visible siempre en móvil.
  - En desktop, la papelera aparece solo al pasar el mouse (hover).
- Totales (directo, GG, Utilidad, IVA) con parámetros ajustables.
- Formato CLP coherente (es-CL) en toda la UI.

### Exportación e impresión (flujo real)
- Vista “Imprimir” genera un HTML A4 con:
  - Cabecera por PARTIDA en MAYÚSCULAS destacada en gris.
  - Subpartidas listadas con sus cantidades, P.Unit y P.Total.
  - Subtotales por sección (Materiales, Mano de Obra, Equipos, Varios) cuando corresponda.
  - Fila “COSTO DIRECTO partida …” donde solo “COSTO DIRECTO” va en mayúsculas; resto en minúsculas.
  - Resumen final sin IVA con “COSTO DIRECTO” en mayúsculas y el resto en minúsculas.
- Exportación a Excel replica la estructura anterior con estilos (cabeceras grises, subtotales en negrita, costo directo con realce sutil). Fallback a SheetJS si ExcelJS no está disponible.

### Persistencia (qué guardamos y dónde)
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

## Buenas prácticas del repo

- No versionar `dist/` (está en `.gitignore`).
- Validar build antes de publicar (TypeScript y Vite ambos OK).

## Troubleshooting

- 404 al desplegar: confirma `base=/pres/` y que existe `dist/404.html`.
- Paths rotos en producción: revisa el origen configurado en Pages (Actions vs gh-pages) y el `base` de Vite.

## Notas de dominio (resumen)

- APU y Presupuestos con precios en CLP, formato chileno.
- Recursos estáticos, APUs con secciones A–D y extras; cálculo unitario por suma de secciones.
- Estructura típica: Gastos generales + Utilidad + IVA.

---

Licencia: MIT (o la que definas).

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
- Se añadieron pruebas básicas (Vitest) para utilidades críticas:
  - Normalización de unidades (`normUnit`).
  - Cálculo de costos unitarios (`unitCost`).
- Ejecuta con `npm run test` (requiere instalar dependencias de dev).
