# APU Presupuestos (Vite + React + TS + Tailwind)

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

## Datos iniciales y presets

- Catálogo de recursos “hardcodeado”.
- APUs de ejemplo ampliados (incluye partidas para piscina y red hidráulica en conjunto).
- Botones “Cargar preset Casa 10×10” y “Cargar preset piscina” para poblar un presupuesto de ejemplo.

## Despliegue (GitHub Pages)

El proyecto está preparado para publicarse en GitHub Pages. Puedes usar:

- GitHub Actions para publicar desde `main` (recomendado para producción).
- Rama `gh-pages` para demos rápidas desde features.

Notas importantes:
- Configura `base` de Vite en `/pres/` para rutas correctas al publicar en Pages.
- Incluye `404.html` como fallback de SPA (copia de `index.html`).

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
