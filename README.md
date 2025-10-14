# APU Presupuestos Monorepo (WIP)

Esta aplicación se construirá por iteraciones rápidas siguiendo la referencia visual entregada. La meta final incluye:
- Frontend React + Vite + Tailwind + TypeScript.
- Backend Node + Express + Prisma (SQLite).
- Pruebas con Vitest y pipeline de lint/format con ESLint + Prettier.

## Estructura actual

```
.
├─ api/         # Backend Express (pendiente de implementación)
└─ frontend/    # Frontend React (pendiente de implementación)
```

## Prerrequisitos generales

- Node.js >= 20
- pnpm o npm (usa el que prefieras, los ejemplos usan `npm`)

## Pasos iniciales

1. **Instalar dependencias**
   ```bash
   npm install --prefix api
   npm install --prefix frontend
   ```

2. **Scripts disponibles**

   | Ubicación | Comando | Descripción |
   |-----------|---------|-------------|
   | `frontend` | `npm run dev` | Arrancará Vite (pendiente de implementación de UI). |
   | `frontend` | `npm run build` | Empaqueta el frontend. |
   | `frontend` | `npm run test` | Ejecutará Vitest. |
   | `frontend` | `npm run lint` | Lint con ESLint. |
   | `frontend` | `npm run format` | Formatea con Prettier. |
   | `api` | `npm run dev` | Arrancará el servidor Express con recarga (lógica pendiente). |
   | `api` | `npm run build` | Compila TypeScript del backend. |
   | `api` | `npm run start` | Levanta el build compilado. |
   | `api` | `npm run test` | Ejecutará pruebas del backend. |
   | `api` | `npm run lint` | Lint del backend. |
   | `api` | `npm run format` | Formateo del backend. |

## Próximos pasos

- Definir tsconfig, eslint y configuración de Tailwind / Vite.
- Implementar vistas iniciales siguiendo las capturas de referencia.
- Levantar API básica con endpoint `/health` y configurar Prisma.

> Cada iteración aportará el mínimo cambio viable para evitar timeouts, según las reglas acordadas.
