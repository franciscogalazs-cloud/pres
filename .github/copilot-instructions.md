# APU Presupuestos - Instrucciones para IA

## Arquitectura del Proyecto

Esta es una aplicación React para gestión de APU (Análisis de Precios Unitarios) y presupuestos de construcción, con stack moderno: **Vite + React 18 + TypeScript + Tailwind**.

### Estructura Principal
```
src/
  App.tsx          - Componente único que contiene toda la lógica
  main.tsx         - Entry point estándar de React
  index.css        - Setup de Tailwind + font Inter
```

## Patrones Específicos del Proyecto

### Sistema de Recursos y APU
- **Recursos (`resources`)**: Catálogo estático de materiales, mano de obra, equipo y servicios con precios fijos
- **APU (`apus`)**: Análisis de Precios Unitarios que definen cómo usar recursos con coeficientes o rendimientos
- **Dos tipos de items en APU**:
  - `ApuItemCoef`: Consumo directo (ej: 1m³ hormigón + 3% merma)
  - `ApuItemRend`: Por rendimiento (ej: 1 jornal/8m³ excavados)

### Cálculo de Costos
```typescript
// Coeficiente: recurso * coef * (1 + merma)
total += (it.coef ?? 0) * r.precio * (1 + (it.merma ?? 0))

// Rendimiento: precio_recurso / rendimiento 
total += r.precio / (it.rendimiento || 1)
```

### Estado y UI
- **Single-file component**: Todo en `App.tsx` usando hooks de React
- **Tabs simples**: `'apu' | 'presupuesto'` con estado local
- **Formularios controlados**: Todos los inputs usan `value` + `onChange`
- **Metrados asistidos**: Calculator de cantidad × largo × ancho

## Convenciones de Código

### Styling
- **Tailwind exclusivo**: No CSS custom, usar clases utility-first
- **Theme oscuro**: Palette slate (`bg-slate-900`, `text-slate-100`)
- **Componentes redondeados**: `rounded-2xl` para cards, `rounded-xl` para inputs
- **Grid responsivo**: `grid md:grid-cols-2 lg:grid-cols-3`

### Formateo y Utils
```typescript
const fmt = (n:number) => new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0
}).format(n||0)

const normUnit = (u:string) => u.replace("²","2").replace("³","3").toLowerCase()
```

### TypeScript
- Interfaces explícitas para `ApuItem`, `Apu`, recursos
- Union types para discriminated unions (`ApuItemCoef | ApuItemRend`)
- Record types para catálogos estáticos

### Datos y Estado
- **Recursos hardcodeados**: Catálogo fijo en `resources` con precios chilenos realistas
- **APUs de ejemplo**: 7 partidas predefinidas desde topografía hasta radier
- **Estado local**: `useState` para tab, selección APU, metrados, y parámetros financieros
- **Cálculos reactivos**: `useMemo` para costos unitarios y totales

## Comandos de Desarrollo

```bash
npm run dev     # Desarrollo con hot reload
npm run build   # Build para producción (tsc + vite)
npm run preview # Preview del build
```

## Contexto del Dominio

**APU (Análisis de Precios Unitarios)**: Metodología de construcción que descompone el costo de una partida (ej: "1m³ de hormigón") en recursos básicos (materiales, mano de obra, equipos).

- **Códigos de partida**: Formato `XX-YYY` (ej: `03-020` = estructuras/hormigón)
- **Unidades chilenas**: m², m³, kg, jornal, día, hora
- **Precios en CLP**: Formato chileno con separadores de miles
- **Gastos generales + Utilidad + IVA**: Estructura típica de presupuestos chilenos

Cuando modifiques APUs, mantén coherencia en unidades y precios realistas del mercado chileno 2024.