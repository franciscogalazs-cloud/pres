import type { Resource, Apu, Templates } from '../types';

// ====== Recursos base - valores por defecto ======

export const defaultResources: Record<string, Resource> = {
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
};

// ====== APUs predefinidos ======

export const apus: Apu[] = [
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
];

// ====== Plantillas predefinidas ======

export const defaultTemplates: Templates = {
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