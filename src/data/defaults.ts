import type { Resource, Apu, Templates } from '../types';
import { fixMojibake, toNFC, normUnit } from '../utils/formatters';
// Definición base (sin sanitizar) de recursos por defecto
const baseDefaultResources: Record<string, Resource> = {
  jornal_maestro: { 
    id: "jornal_maestro", 
    tipo: "mano_obra", 
    nombre: "Maestro jornal", 
    unidad: "jornal", 
    precio: 49500 
  },
  jornal_ayudante: { 
    id: "jornal_ayudante", 
    tipo: "mano_obra", 
    nombre: "Ayudante jornal", 
    unidad: "jornal", 
    precio: 29915 
  },
  retro_4x4_hora: { 
    id: "retro_4x4_hora", 
    tipo: "equipo", 
    nombre: "Retroexcavadora 4x4 hora", 
    unidad: "hora", 
    precio: 42000 
  },
  bomba_hora: { 
    id: "bomba_hora", 
    tipo: "equipo", 
    nombre: "Bomba de hormigón hora", 
    unidad: "hora", 
    precio: 31303 
  },
  h25_m3: { 
    id: "h25_m3", 
    tipo: "material", 
    nombre: "Hormigón H-25 (m³)", 
    unidad: "m3", 
    precio: 188836 
  },
  encofrado_m2: { 
    id: "encofrado_m2", 
    tipo: "material", 
    nombre: "Madera encofrado (m²)", 
    unidad: "m2", 
    precio: 28442 
  },
  acero_kg: { 
    id: "acero_kg", 
    tipo: "material", 
    nombre: "Acero A63-42H (kg)", 
    unidad: "kg", 
    precio: 3133 
  },
  topo_dia: { 
    id: "topo_dia", 
    tipo: "servicio", 
    nombre: "Topografía con estación total (día)", 
    unidad: "día", 
    precio: 510000 
  },
  // ==== Recursos adicionales para techumbre, terminaciones e instalaciones ====
  plancha_zinc_m2: {
    id: 'plancha_zinc_m2', tipo: 'material', nombre: 'Plancha Zinc Acanalada (m²)', unidad: 'm2', precio: 8990
  },
  ceramica_piso_m2: {
    id: 'ceramica_piso_m2', tipo: 'material', nombre: 'Cerámica piso (m²)', unidad: 'm2', precio: 5990
  },
  ceramica_muro_m2: {
    id: 'ceramica_muro_m2', tipo: 'material', nombre: 'Cerámica muro (m²)', unidad: 'm2', precio: 6990
  },
  yeso_carton_m2: {
    id: 'yeso_carton_m2', tipo: 'material', nombre: 'Yeso-cartón para cielos (m²)', unidad: 'm2', precio: 12000
  },
  pintura_latex_20l: {
    id: 'pintura_latex_20l', tipo: 'material', nombre: 'Pintura Látex interior (20L)', unidad: '20L', precio: 29990
  },
  pintura_fachada_20l: {
    id: 'pintura_fachada_20l', tipo: 'material', nombre: 'Pintura Fachada (20L)', unidad: '20L', precio: 34990
  },
  fijaciones_zinc_lote: {
    id: 'fijaciones_zinc_lote', tipo: 'material', nombre: 'Fijaciones Techo (lote)', unidad: 'gl', precio: 80000
  },
  mortero_lechada_lote: {
    id: 'mortero_lechada_lote', tipo: 'material', nombre: 'Mortero y lechada (lote)', unidad: 'gl', precio: 120000
  },
  cable_electrico_lote: {
    id: 'cable_electrico_lote', tipo: 'material', nombre: 'Cableado eléctrico (lote)', unidad: 'gl', precio: 250000
  },
  tablero_electrico_un: {
    id: 'tablero_electrico_un', tipo: 'material', nombre: 'Tablero eléctrico (unidad)', unidad: 'un', precio: 80000
  },
  cajas_electricas_un: {
    id: 'cajas_electricas_un', tipo: 'material', nombre: 'Cajas y dispositivos (unidad)', unidad: 'un', precio: 2990
  },
  canaletas_lote: {
    id: 'canaletas_lote', tipo: 'material', nombre: 'Tubería/Canaletas (lote)', unidad: 'gl', precio: 70000
  },
  artefactos_bano_kit: {
    id: 'artefactos_bano_kit', tipo: 'material', nombre: 'Artefactos de baño (kit)', unidad: 'gl', precio: 299990
  },
  artefactos_cocina_kit: {
    id: 'artefactos_cocina_kit', tipo: 'material', nombre: 'Artefactos cocina (kit)', unidad: 'gl', precio: 149990
  },
  ppr_agua_lote: {
    id: 'ppr_agua_lote', tipo: 'material', nombre: 'Tuberías PPR agua (lote)', unidad: 'gl', precio: 220000
  },
  pvc_desague_lote: {
    id: 'pvc_desague_lote', tipo: 'material', nombre: 'Tuberías PVC desagüe (lote)', unidad: 'gl', precio: 180000
  },
  regulador_gas_lote: {
    id: 'regulador_gas_lote', tipo: 'material', nombre: 'Cañería gas y regulador (lote)', unidad: 'gl', precio: 120000
  },
};
// Sanitiza textos y unidades para evitar mojibake y problemas de coincidencia
const cleanText = (s: string) => toNFC(fixMojibake(String(s || ''))).trim();
const sanitizeResource = (r: Resource): Resource => ({
  ...r,
  nombre: cleanText(r.nombre),
  unidad: normUnit(cleanText(r.unidad)),
});
export const defaultResources: Record<string, Resource> = Object.fromEntries(
  Object.entries(baseDefaultResources).map(([k, v]) => [k, sanitizeResource(v)])
);
// Definición base (sin sanitizar) de APUs predefinidos
const baseApus: Apu[] = [
  {
    id: "apu_topografia_inicial",
    descripcion: "Levantamiento topográfico y PRs",
    unidadSalida: "gl",
    items: [{ resourceId: "topo_dia", tipo: "coef", coef: 1, merma: 0 }],
  },
  {
    id: "apu_trazado_niveles",
    descripcion: "Trazado de ejes y niveles en obra",
    unidadSalida: "m²",
    items: [
      { resourceId: "jornal_maestro", tipo: "rendimiento", rendimiento: 75 },
      { resourceId: "jornal_ayudante", tipo: "rendimiento", rendimiento: 150 },
    ],
  },
  {
    id: "apu_excavacion_manual",
    descripcion: "Excavación a mano en zanja",
    unidadSalida: "m³",
    items: [
      { resourceId: "jornal_maestro", tipo: "rendimiento", rendimiento: 8 },
      { resourceId: "jornal_ayudante", tipo: "rendimiento", rendimiento: 16 },
    ],
  },
  {
    id: "apu_h25_fundaciones",
    descripcion: "Hormigón fundaciones H-25",
    unidadSalida: "m³",
    items: [
      { resourceId: "h25_m3", tipo: "coef", coef: 1, merma: 0.03 },
      { resourceId: "bomba_hora", tipo: "coef", coef: 1.5 },
      { resourceId: "jornal_maestro", tipo: "coef", coef: 0.3 },
      { resourceId: "jornal_ayudante", tipo: "coef", coef: 0.3 },
    ],
  },
  {
    id: "apu_h25_muros",
    descripcion: "Hormigón muros H-25",
    unidadSalida: "m³",
    items: [
      { resourceId: "h25_m3", tipo: "coef", coef: 1, merma: 0.03 },
      { resourceId: "bomba_hora", tipo: "coef", coef: 2.0 },
      { resourceId: "jornal_maestro", tipo: "coef", coef: 0.35 },
      { resourceId: "jornal_ayudante", tipo: "coef", coef: 0.45 },
      { resourceId: "encofrado_m2", tipo: "rendimiento", rendimiento: 9 },
      { resourceId: "acero_kg", tipo: "rendimiento", rendimiento: 220 },
    ],
  },
  {
    id: "apu_moldajes_fundaciones",
    descripcion: "Moldajes hormigón fundaciones",
    unidadSalida: "m²",
    items: [
      { resourceId: "encofrado_m2", tipo: "coef", coef: 1 },
      { resourceId: "jornal_maestro", tipo: "rendimiento", rendimiento: 12 },
      { resourceId: "jornal_ayudante", tipo: "rendimiento", rendimiento: 18 },
    ],
  },
  {
    id: "apu_enfierradura",
    descripcion: "Enfierraduras",
    unidadSalida: "kg",
    items: [
      { resourceId: "acero_kg", tipo: "coef", coef: 1, merma: 0.06 },
      { resourceId: "jornal_maestro", tipo: "rendimiento", rendimiento: 400 },
      { resourceId: "jornal_ayudante", tipo: "rendimiento", rendimiento: 600 },
    ],
  },
  {
    id: "apu_radier_10cm",
    descripcion: "Radier 10 cm H-25 con malla",
    unidadSalida: "m²",
    items: [
      { resourceId: "h25_m3", tipo: "coef", coef: 0.10, merma: 0.03 },
      { resourceId: "jornal_maestro", tipo: "rendimiento", rendimiento: 30 },
      { resourceId: "jornal_ayudante", tipo: "rendimiento", rendimiento: 45 },
    ],
  },
  // ==== Pinturas por m² (interior y fachada) ====
  {
    id: 'apu_pintura_interior_m2',
    descripcion: 'Pintura interior (látex) 2 manos',
    unidadSalida: 'm2',
    items: [
      // Cobertura aproximada: 1 tarro 20L ~ 60 m² (2 manos)
      { resourceId: 'pintura_latex_20l', tipo: 'rendimiento', rendimiento: 60 },
      { resourceId: 'jornal_maestro', tipo: 'rendimiento', rendimiento: 120 },
      { resourceId: 'jornal_ayudante', tipo: 'rendimiento', rendimiento: 180 },
    ],
  },
  {
    id: 'apu_pintura_fachada_m2',
    descripcion: 'Pintura fachada 2 manos',
    unidadSalida: 'm2',
    items: [
      // Cobertura aproximada similar a interior
      { resourceId: 'pintura_fachada_20l', tipo: 'rendimiento', rendimiento: 60 },
      { resourceId: 'jornal_maestro', tipo: 'rendimiento', rendimiento: 100 },
      { resourceId: 'jornal_ayudante', tipo: 'rendimiento', rendimiento: 150 },
    ],
  },
  // ==== APUs adicionales: Techumbre y terminaciones (m2) ====
  {
    id: 'apu_cubierta_zinc_m2',
    descripcion: 'Cubierta de zinc acanalado',
    unidadSalida: 'm2',
    items: [
      { resourceId: 'plancha_zinc_m2', tipo: 'coef', coef: 1 },
      { resourceId: 'fijaciones_zinc_lote', tipo: 'rendimiento', rendimiento: 70 }, // 1 lote para ~70 m2
      { resourceId: 'jornal_maestro', tipo: 'rendimiento', rendimiento: 30 },
      { resourceId: 'jornal_ayudante', tipo: 'rendimiento', rendimiento: 45 },
    ],
  },
  {
    id: 'apu_ceramica_piso_m2',
    descripcion: 'Instalación cerámica en piso',
    unidadSalida: 'm2',
    items: [
      { resourceId: 'ceramica_piso_m2', tipo: 'coef', coef: 1 },
      { resourceId: 'mortero_lechada_lote', tipo: 'rendimiento', rendimiento: 60 }, // 1 lote para ~60 m2
      { resourceId: 'jornal_maestro', tipo: 'rendimiento', rendimiento: 18 },
      { resourceId: 'jornal_ayudante', tipo: 'rendimiento', rendimiento: 28 },
    ],
  },
  {
    id: 'apu_ceramica_muro_m2',
    descripcion: 'Instalación cerámica en muro',
    unidadSalida: 'm2',
    items: [
      { resourceId: 'ceramica_muro_m2', tipo: 'coef', coef: 1 },
      { resourceId: 'mortero_lechada_lote', tipo: 'rendimiento', rendimiento: 45 }, // 1 lote para ~45 m2
      { resourceId: 'jornal_maestro', tipo: 'rendimiento', rendimiento: 14 },
      { resourceId: 'jornal_ayudante', tipo: 'rendimiento', rendimiento: 20 },
    ],
  },
  {
    id: 'apu_cielo_yeso_m2',
    descripcion: 'Cielo de yeso-cartón',
    unidadSalida: 'm2',
    items: [
      { resourceId: 'yeso_carton_m2', tipo: 'coef', coef: 1 },
      { resourceId: 'jornal_maestro', tipo: 'rendimiento', rendimiento: 22 },
      { resourceId: 'jornal_ayudante', tipo: 'rendimiento', rendimiento: 35 },
    ],
  },
  // ==== APUs adicionales: Instalaciones (global) ====
  {
    id: 'apu_inst_electrica_gl',
    descripcion: 'Instalaciones eléctricas completas',
    unidadSalida: 'gl',
    items: [
      { resourceId: 'cable_electrico_lote', tipo: 'coef', coef: 1 },
      { resourceId: 'tablero_electrico_un', tipo: 'coef', coef: 1 },
      { resourceId: 'cajas_electricas_un', tipo: 'coef', coef: 20 },
      { resourceId: 'canaletas_lote', tipo: 'coef', coef: 1 },
      { resourceId: 'jornal_maestro', tipo: 'coef', coef: 0.5 },
      { resourceId: 'jornal_ayudante', tipo: 'coef', coef: 0.5 },
    ],
  },
  {
    id: 'apu_inst_sanitaria_gl',
    descripcion: 'Instalaciones sanitarias y gas',
    unidadSalida: 'gl',
    items: [
      { resourceId: 'ppr_agua_lote', tipo: 'coef', coef: 1 },
      { resourceId: 'pvc_desague_lote', tipo: 'coef', coef: 1 },
      { resourceId: 'artefactos_bano_kit', tipo: 'coef', coef: 1 },
      { resourceId: 'artefactos_cocina_kit', tipo: 'coef', coef: 1 },
      { resourceId: 'regulador_gas_lote', tipo: 'coef', coef: 1 },
      { resourceId: 'jornal_maestro', tipo: 'coef', coef: 0.5 },
      { resourceId: 'jornal_ayudante', tipo: 'coef', coef: 0.5 },
    ],
  },
];
const sanitizeApu = (a: Apu): Apu => ({
  ...a,
  descripcion: cleanText(a.descripcion),
  unidadSalida: normUnit(cleanText(a.unidadSalida)),
});
export const apus: Apu[] = baseApus.map(sanitizeApu);
// Definición base (sin sanitizar) de plantillas
const baseTemplates: Templates = {
  'vivienda_basica': {
    name: 'Vivienda Básica (60m²)',
    items: [
      { apuId: 'apu_topografia_inicial', metrados: 1 },
      { apuId: 'apu_trazado_niveles', metrados: 60 },
      { apuId: 'apu_excavacion_manual', metrados: 8 },
      { apuId: 'apu_h25_fundaciones', metrados: 8 },
      { apuId: 'apu_moldajes_fundaciones', metrados: 24 },
      { apuId: 'apu_enfierradura', metrados: 350 },
      { apuId: 'apu_radier_10cm', metrados: 60 }
    ]
  },
  'ampliacion_casa': {
    name: 'Ampliación Casa (30m²)',
    items: [
      { apuId: 'apu_trazado_niveles', metrados: 30 },
      { apuId: 'apu_excavacion_manual', metrados: 4 },
      { apuId: 'apu_h25_fundaciones', metrados: 4 },
      { apuId: 'apu_moldajes_fundaciones', metrados: 12 },
      { apuId: 'apu_radier_10cm', metrados: 30 }
    ]
  }
};
export const defaultTemplates: Templates = Object.fromEntries(
  Object.entries(baseTemplates).map(([k, t]) => [
    k,
    {
      ...t,
      name: cleanText(t.name),
    },
  ])
);