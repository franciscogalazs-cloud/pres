# APU Presupuestos (Vite + React + TS + Tailwind)

Aplicación de gestión de APU y presupuestos de construcción. Stack: Vite + React 18 + TypeScript + Tailwind.

## Estructura del proyecto

```
.
├─ public/
├─ src/
│  ├─ App.tsx
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

## Despliegue

La app está preparada para GitHub Pages. Se usan dos flujos: el “oficial” con Actions (recomendado para producción) y uno alternativo vía rama `gh-pages` (útil para demos desde features).

### A) GitHub Pages (oficial con Actions)

- Workflow: `.github/workflows/deploy-pages.yml`
- Características:
   - Construye con `npm ci` y `vite build --base=/pres/`.
   - Copia `dist/index.html` a `dist/404.html` para fallback SPA.
   - Publica usando `actions/deploy-pages` (entorno `github-pages`).
   - Regla: despliega solo desde `main`.

Pasos en el repo:
1) Settings → Pages → Build and deployment → Source: “GitHub Actions”.
2) Hacer merge a `main`. El workflow construye y publica automáticamente.
3) URL: `https://<usuario>.github.io/pres/`

Notas:
- El parámetro `--base=/pres/` es necesario porque el nombre del repo es `pres`.
- Si sale “Branch 'X' is not allowed to deploy…”, el environment `github-pages` está protegido para `main`.

### B) gh-pages (alternativo para demos)

- Workflow: `.github/workflows/deploy-gh-pages.yml`
- Características:
   - Construye con `npm ci` y `vite build --base=/pres/`.
   - Copia `dist/index.html` a `dist/404.html` (SPA).
   - Publica `./dist` a la rama `gh-pages` con `peaceiris/actions-gh-pages`.
   - Puede dispararse en `main` y/o en ramas de feature.

Pasos en el repo:
1) Settings → Pages → Build and deployment → Source: “Deploy from a branch”.
2) Branch: `gh-pages`, Folder: `/` (root) → Guardar.
3) Al hacer push, el workflow publica en `gh-pages` y queda disponible en `https://<usuario>.github.io/pres/`.

### Cambiar entre flujos

- Para producción estable: usar flujo A (Actions) y dejar Pages en “GitHub Actions”.
- Para demos rápidas desde features: usar flujo B (gh-pages) y dejar Pages en “Deploy from a branch: gh-pages”.
- Evita tener ambos activos a la vez para no confundir el origen de la publicación.

## Buenas prácticas del repo

- `dist/` no se versiona (está en `.gitignore`).
- El build lo genera CI en cada despliegue.

## Troubleshooting

- 404 al desplegar: confirma `--base=/pres/` y que existe `dist/404.html`.
- “Failed to create deployment (404)”: habilita Pages en Settings → Pages.
- “Branch 'X' is not allowed to deploy…”: el environment `github-pages` solo permite `main`. Usa gh-pages o mergea a `main`.
- Activos sin estilo/ruta rota en producción: revisa que Pages apunte al origen correcto (Actions vs gh-pages) y el `base` de Vite.

## Notas de dominio (resumen)

- APU y Presupuestos con precios en CLP, formato chileno.
- Recursos estáticos, APUs con secciones A–D y extras, cálculo unitario coherente.
- Seeding incluido: “APU vacío (ejemplo)” y estructura mínima de presupuesto; botón “Ejemplo (APU vacío)”.

---

Licencia: MIT (o la que definas).
