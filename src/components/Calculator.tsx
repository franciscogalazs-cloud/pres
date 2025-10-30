import React from 'react';
import SelectApuModal from './ui/SelectApuModal';
import { applySynonyms } from '../data/synonyms';
import { readAliasMap, similarityScore, normalizeUnitCanonical, jaccardTokens, removeDiacritics } from '../utils/match';
import { unitCost } from '../utils/calculations';
import { normUnit as normalizeUnit } from '../utils/formatters';
import BudgetTable from './BudgetTable';

type PartidaItem = {
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
};

type Partida = {
  id: string;
  nombre: string;
  tipo: 'fija' | 'variable';
  base: number;
  factor?: number;
  items: PartidaItem[];
};

const partidasData: Partida[] = [
  {
    id: 'movimiento_tierras',
    nombre: 'Movimiento de Tierras y Excavación',
    tipo: 'fija',
    base: 275000,
    items: [
      { descripcion: 'Movimiento de tierra (nivelación y excavación)', cantidad: 1, unidad: 'lote', precioUnitario: 150000 },
      { descripcion: 'Material de relleno y compactación (arena, grava)', cantidad: 5, unidad: 'm³', precioUnitario: 25000 },
    ],
  },
  {
    id: 'fundaciones',
    nombre: 'Fundaciones y Estructura',
    tipo: 'variable',
    base: 3789000,
    factor: 63150,
    items: [
      { descripcion: 'Hormigón H20 para fundaciones y losa', cantidad: 15, unidad: 'm³', precioUnitario: 85000 },
      { descripcion: 'Acero de Refuerzo (fierro de construcción)', cantidad: 600, unidad: 'kg', precioUnitario: 1190 },
      { descripcion: 'Madera para encofrado (pino cepillado)', cantidad: 200, unidad: 'm²', precioUnitario: 8500 },
      { descripcion: 'Clavos, alambre de amarre, etc.', cantidad: 1, unidad: 'lote', precioUnitario: 100000 },
    ],
  },
  {
    id: 'albanileria',
    nombre: 'Albañilería (Muros)',
    tipo: 'variable',
    base: 947000,
    factor: 15783,
    items: [
      { descripcion: 'Ladrillo Fiscal (12x24x6 cm)', cantidad: 3000, unidad: 'un', precioUnitario: 199 },
      { descripcion: 'Mortero (Arena, Cemento)', cantidad: 1, unidad: 'lote', precioUnitario: 350000 },
    ],
  },
  {
    id: 'techumbre',
    nombre: 'Techumbre',
    tipo: 'variable',
    // Ajustado para plancha zinc (70% del original 2.223.900 ≈ 1.556.730)
    base: 1556730,
    factor: 37065,
    items: [
      { descripcion: 'Cerchas de Pino para Techo', cantidad: 70, unidad: 'm²', precioUnitario: 15000 },
      { descripcion: 'Plancha Zinc Acanalada', cantidad: 70, unidad: 'm²', precioUnitario: 8990 },
      { descripcion: 'Clavos para tejas, fijaciones', cantidad: 1, unidad: 'lote', precioUnitario: 80000 },
      { descripcion: 'Aislante térmico (Lana de vidrio)', cantidad: 6, unidad: 'rollo', precioUnitario: 7990 },
    ],
  },
  {
    id: 'terminaciones',
    nombre: 'Terminaciones Interiores',
    tipo: 'variable',
    base: 1439130,
    factor: 23986,
    items: [
      { descripcion: 'Pintura Látex para interior', cantidad: 1, unidad: '20L', precioUnitario: 29990 },
      { descripcion: 'Pintura Fachada', cantidad: 1, unidad: '20L', precioUnitario: 34990 },
      { descripcion: 'Cerámica para piso (económica 33x33 cm)', cantidad: 60, unidad: 'm²', precioUnitario: 5990 },
      { descripcion: 'Cerámica para baño/cocina (pared)', cantidad: 25, unidad: 'm²', precioUnitario: 6990 },
      { descripcion: 'Mortero de pega y lechada', cantidad: 1, unidad: 'lote', precioUnitario: 120000 },
      { descripcion: 'Yeso-cartón para cielos', cantidad: 60, unidad: 'm²', precioUnitario: 12000 },
    ],
  },
  {
    id: 'carpinteria',
    nombre: 'Carpintería y Ventanas',
    tipo: 'fija',
    base: 914960,
    items: [
      { descripcion: 'Puerta principal de madera maciza', cantidad: 1, unidad: 'un', precioUnitario: 149990 },
      { descripcion: 'Puertas interiores de honeycomb', cantidad: 3, unidad: 'un', precioUnitario: 44990 },
      { descripcion: 'Ventanas de PVC línea económica', cantidad: 6, unidad: 'un', precioUnitario: 80000 },
      { descripcion: 'Herrajes (bisagras, picaportes, cerraduras)', cantidad: 1, unidad: 'lote', precioUnitario: 150000 },
    ],
  },
  {
    id: 'instalaciones',
    nombre: 'Instalaciones Sanitarias y Gas',
    tipo: 'fija',
    base: 969980,
    items: [
      { descripcion: 'Tuberías de PVC para desagüe', cantidad: 1, unidad: 'lote', precioUnitario: 180000 },
      { descripcion: 'Tuberías de PPR para agua caliente/fría', cantidad: 1, unidad: 'lote', precioUnitario: 220000 },
      { descripcion: 'Artefactos de Baño (inodoro, lavatorio, ducha)', cantidad: 1, unidad: 'kit', precioUnitario: 299990 },
      { descripcion: 'Artefactos de Cocina (llave, lavaplatos)', cantidad: 1, unidad: 'kit', precioUnitario: 149990 },
      { descripcion: 'Cañería para gas y regulador', cantidad: 1, unidad: 'lote', precioUnitario: 120000 },
    ],
  },
  {
    id: 'electricas',
    nombre: 'Instalaciones Eléctricas',
    tipo: 'fija',
    base: 459800,
    items: [
      { descripcion: 'Cable THWN 2,5 mm², 1,5 mm², etc.', cantidad: 1, unidad: 'lote', precioUnitario: 250000 },
      { descripcion: 'Tablero eléctrico, breakers, etc.', cantidad: 1, unidad: 'un', precioUnitario: 80000 },
      { descripcion: 'Cajas, tomacorrientes, interruptores', cantidad: 20, unidad: 'un', precioUnitario: 2990 },
      { descripcion: 'Túbes o Canaletas', cantidad: 1, unidad: 'lote', precioUnitario: 70000 },
    ],
  },
];

const METROS_BASE = 60;
// Mano de obra eliminada del cálculo: todo se computa directo desde partidas/APUs

const fmtCl = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n || 0));

export type CalculatorProps = {
  gg: number;
  util: number;
  iva: number;
  apus?: any[];
  resources?: Record<string, any>;
  onShowApuDetail?: (id: string) => void;
  onCreateApuByName?: (name: string, unit?: string) => string | Promise<string>;
  onChangeGG?: (v: number) => void;
  onChangeUtil?: (v: number) => void;
  onChangeIVA?: (v: number) => void;
};

const Calculator: React.FC<CalculatorProps> = ({ gg, util, iva, apus = [], resources = {}, onShowApuDetail, onCreateApuByName, onChangeGG, onChangeUtil, onChangeIVA }) => {
  const [metros, setMetros] = React.useState<number>(60);
  const [calidad] = React.useState<number>(1.0);
  // Fijos: Económica, Techo Zinc (0.7), Piso Cerámica (1.0)
  const [techo] = React.useState<number>(0.7);
  const [piso] = React.useState<number>(1.0);
  const [justSavedAt, setJustSavedAt] = React.useState<number | null>(null);
  const [justLoadedAt, setJustLoadedAt] = React.useState<number | null>(null);
  const [loadMenuOpen, setLoadMenuOpen] = React.useState<boolean>(false);
  // Nombre del guardado activo (para comportamientos contextuales como vista sólo Fosa al cargar preset "fosa")
  const [activeSaveName, setActiveSaveName] = React.useState<string | null>(null);
  const autoLoadedRef = React.useRef<boolean>(false);
  const [showSaveWarnings, setShowSaveWarnings] = React.useState<boolean>(false);
  const [saveWarnings, setSaveWarnings] = React.useState<Array<{ parentId: string; subId: string; descripcion: string; unit: string; metrados: number; suggestedApuId: string | null }>>([]);
  const [lastSaveEmptyCount, setLastSaveEmptyCount] = React.useState<number>(0);
  const saveWarnsRef = React.useRef<HTMLDivElement | null>(null);
  const [_expanded, _setExpanded] = React.useState<Record<string, boolean>>({});
  const [apuSel] = React.useState<Record<string, string | undefined>>({});
  const [apuQty] = React.useState<Record<string, number>>({});
  // Overrides editables por partida e índice de item
  const [overrides] = React.useState<Record<string, Record<number, { cantidad?: number; precio?: number }>>>({});
  // Overrides de nombres para vista presupuesto
  const [rowDescOverrides, setRowDescOverrides] = React.useState<Record<string, string>>({});
  // Overrides a nivel de subpartida (para asignar APUs creados o unit/total manual)
  const [subOverrides, setSubOverrides] = React.useState<Record<string, Partial<{ apuIds: string[]; overrideUnitPrice: number; overrideTotal: number; unidadSalida: string; metrados: number; descripcion: string }>>>({});
  // Subpartidas creadas por el usuario (no auto-crear APU para estas)
  const [userSubRows, setUserSubRows] = React.useState<Record<string, Array<{
    id: string;
    descripcion: string;
    unidadSalida?: string;
    metrados?: number;
    apuIds?: string[];
    overrideUnitPrice?: number;
    overrideTotal?: number;
  }>>>({});
  // Subpartidas derivadas ocultadas por el usuario (delete)
  const [hiddenSubIds, setHiddenSubIds] = React.useState<Record<string, boolean>>({});
  // Selector de APU (mismo comportamiento que Presupuesto)
  const [selectApuOpen, setSelectApuOpen] = React.useState<{ open: boolean; subId: string | null }>({ open: false, subId: null });

  // currentSub declarado más abajo, después de construir presupuestoRows

  const apusIndex = React.useMemo(() => {
    const idx: Record<string, any> = {};
    // Prioridad: APUs personalizados (pueden sobreescribir defaults)
    for (const a of Array.isArray(apus) ? apus : []) {
      if (a && typeof a.id === 'string') idx[a.id] = a;
    }
    // Mapear alias -> canónico para resolver presencia y costos
    try{
      const aliases = readAliasMap();
      for(const [oldId, canon] of Object.entries(aliases||{})){
        if (!idx[oldId] && idx[canon]) idx[oldId] = idx[canon];
      }
    }catch{}
    return idx;
  }, [apus]);

  // Autoselect del APU de movimiento de tierras si existe
  React.useEffect(() => {
    // Sin autoselect por defecto: priorizamos que los APUs sean modificables vía tabla editable
  }, [apusIndex]);

  const inferQty = React.useCallback((apu: any): number => {
    const un = String(apu?.unidadSalida || '').toLowerCase();
    if (un === 'm2' || un === 'm²') return metros;
    if (un === 'm3' || un === 'm³') return Math.max(1, Math.round((metros * 0.1))); // heurística simple
    return 1;
  }, [metros]);

  const partidasCalc = React.useMemo(() => {
    const partidasCalc = partidasData.map((partida) => {
      // Si hay APU seleccionado para esta partida, usar su costo
      const apuId = apuSel[partida.id];
      let costoPartida = 0;
      let itemsCalculados: Array<PartidaItem & { cantidadCalc: number; precioCalc: number; totalItem: number }> = [];
      if (apuId && apusIndex[apuId]) {
        try {
          const apu = apusIndex[apuId];
          const uc = unitCost(apu, resources as any, apusIndex as any).unit;
          const qty = apuQty[partida.id] && apuQty[partida.id]!>0 ? apuQty[partida.id]! : inferQty(apu);
          costoPartida = uc * qty;
          // Ajustes adicionales por selección de techo/piso
          if (partida.id === 'techumbre') costoPartida *= techo;
          if (partida.id === 'terminaciones') costoPartida *= piso; // factor de piso como aproximación sobre terminaciones
        } catch {
          costoPartida = 0;
        }
      } else {
        // Cálculo detallado por items con posibilidad de override editable
        itemsCalculados = partida.items.map((item, idx) => {
          const ov = overrides[partida.id]?.[idx] || {};
          const baseCantidad = Number.isFinite(ov.cantidad) ? (ov.cantidad as number) : item.cantidad;
          const basePrecio = Number.isFinite(ov.precio) ? (ov.precio as number) : item.precioUnitario;
          let cantidadCalc = baseCantidad;
          if (partida.tipo === 'variable') cantidadCalc = baseCantidad * (metros / METROS_BASE);
          let precioCalc = basePrecio;
          if (partida.id === 'terminaciones' && item.descripcion.toLowerCase().includes('cerámica para piso')) {
            precioCalc = basePrecio * piso;
          }
          const totalItem = cantidadCalc * precioCalc;
          return { ...item, cantidadCalc, precioCalc, totalItem };
        });
        costoPartida = itemsCalculados.reduce((acc, it) => acc + it.totalItem, 0);
        if (partida.id === 'techumbre') costoPartida *= techo;
      }

      costoPartida *= calidad;
      return { ...partida, costo: Math.round(costoPartida), itemsCalculados } as Partida & { costo: number; itemsCalculados: Array<PartidaItem & { cantidadCalc: number; precioCalc: number; totalItem: number }> };
    });

    return partidasCalc;
  }, [metros, calidad, techo, piso, apuSel, apusIndex, inferQty, resources, apuQty, overrides]);

  const [includeIvaInM2, setIncludeIvaInM2] = React.useState<boolean>(true);

  // Adaptador: Partidas -> Capítulos/Filas para vista de Presupuesto
  const presupuestoChapters = React.useMemo(() => {
    if (activeSaveName === 'fosa') {
      return [ { id: 'calc', letter: 'S', title: 'Fosa séptica y drenaje' } ];
    }
    return [ { id: 'calc', letter: 'A', title: 'Presupuesto (Calculadora)' } ];
  }, [activeSaveName]);

  const norm = (s: string) => (s||'').toLowerCase().replace('²','2').replace('³','3').trim();
  const mapUnit = React.useCallback((u: string): string => {
    const n = normalizeUnit(String(u||''));
    if (!n) return '';
    if (n === 'm2' || n === 'm3' || n === 'm' || n === 'ml' || n === 'kg' || n === 'jornal' || n === 'día' || n === 'hora' || n === 'gl' || n === 'u') return n;
    if (n.startsWith('m2')) return 'm2';
    if (n.startsWith('m3')) return 'm3';
    if (n === 'un' || n === 'und' || n === 'unidad' || n === 'unid' || n === 'un.' ) return 'u';
    if (n === 'lote' || n === 'kit' || n === 'set') return 'gl';
    if (n === 'rollo' || n === 'paquete' || n === 'pack') return 'u';
    // Por defecto, colapsamos a 'u' para asegurar opción válida en el selector
    return 'u';
  }, []);
  const matchApuIdsForItem = React.useCallback((desc: string, unidad: string): string[] => {
    // Aplicar sinónimos y normalización
    const d = norm(applySynonyms(desc));
    const u = norm(unidad);
    // Casos que NO deben autoseleccionar APU (se prefiere sugerencia manual):
    // 2.2 Acero de Refuerzo (fierro de construcción) — típico unidad kg
    if ((d.includes('acero') || d.includes('fierro')) && (d.includes('refuerzo') || d.includes('enfier')) && (u === 'kg')) {
      return [];
    }
    // 2.3 Madera para encofrado (pino cepillado) — típico unidad m2
    if ((d.includes('madera') && (d.includes('encofrad') || d.includes('moldaj'))) && (u === 'm2' || u === 'm²')) {
      return [];
    }
    // 4.2 Plancha Zinc Acanalada — típico unidad m2
    if ((d.includes('zinc') && (d.includes('acanal') || d.includes('plancha'))) && (u === 'm2' || u === 'm²')) {
      return [];
    }
    const out: string[] = [];
    // Movimiento de tierras (lote)
    if ((d.includes('movimiento') && d.includes('tierra')) || d.includes('excav')) {
      if (apusIndex['apu_mov_tierras_excavacion_lote']) out.push('apu_mov_tierras_excavacion_lote');
    }
    // Relleno y compactación
    if ((d.includes('relleno') || d.includes('compact'))) {
      if (u === 'm3' || u === 'm³') {
        if (apusIndex['apu_relleno_compact_manual']) out.push('apu_relleno_compact_manual');
      } else if (apusIndex['apu_relleno_compact_manual']) {
        out.push('apu_relleno_compact_manual');
      }
    }
    // Clavos y alambre (lote)
    if (d.includes('clavos') && (d.includes('alambre') || d.includes('amarre'))) {
      if (apusIndex['apu_clavos_alambre_lote']) out.push('apu_clavos_alambre_lote');
    }
    // Ladrillo fiscal (unidad)
    if (d.includes('ladrillo') && d.includes('fiscal')) {
      if (apusIndex['apu_material_ladrillo_fiscal_u']) out.push('apu_material_ladrillo_fiscal_u');
    }
    // Mortero de pega (lote)
    if (d.includes('mortero') || (d.includes('arena') && d.includes('cemento'))) {
      if (apusIndex['apu_mortero_pega_lote']) out.push('apu_mortero_pega_lote');
    }
    // Cerchas/Estructura de techo
    if ((d.includes('cercha') || d.includes('estructura')) && (d.includes('pino') || d.includes('techo'))) {
      if (apusIndex['apu_estructura_techumbre_madera']) out.push('apu_estructura_techumbre_madera');
    }
    // Fijaciones para techumbre
    if ((d.includes('clavos') || d.includes('fijac')) && (d.includes('teja') || d.includes('techo'))) {
      if (apusIndex['apu_fijaciones_techo_lote']) out.push('apu_fijaciones_techo_lote');
    }
    // Herrajes (bisagras, picaportes, cerraduras)
    if (d.includes('herrajes') || d.includes('bisagra') || d.includes('picaporte') || d.includes('cerradura')) {
      if (apusIndex['apu_herrajes_bisagras_picaportes_cerraduras_lote']) out.push('apu_herrajes_bisagras_picaportes_cerraduras_lote');
      else if (apusIndex['apu_herrajes_carpinteria_lote']) out.push('apu_herrajes_carpinteria_lote');
    }
    // Ventanas PVC (unidad)
    if (d.includes('ventana') && d.includes('pvc')) {
      if (apusIndex['apu_ventana_pvc_100x100_instalada']) out.push('apu_ventana_pvc_100x100_instalada');
    }
    // Puerta principal/exterior
    if (d.includes('puerta') && (d.includes('principal') || d.includes('exterior'))) {
      // Preferir madera/maciza si se menciona
      if ((d.includes('madera') || d.includes('maciza')) && apusIndex['apu_puerta_exterior_madera_90x200_instalada']) {
        out.push('apu_puerta_exterior_madera_90x200_instalada');
      } else if (apusIndex['apu_puerta_exterior_acero_90x200_instalada']) {
        out.push('apu_puerta_exterior_acero_90x200_instalada');
      }
    }
    // Puertas interiores (honeycomb) → usar puerta interior MDF como aproximación
    if (d.includes('puertas') && d.includes('interiores')) {
      if (apusIndex['apu_puerta_interior_mdf_70x200_instalada']) out.push('apu_puerta_interior_mdf_70x200_instalada');
    }
    // Aislación térmica (lana de vidrio)
    if (d.includes('aislante') || d.includes('lana')) {
      if (apusIndex['apu_acond_termico_cielo_lana100']) out.push('apu_acond_termico_cielo_lana100');
      else if (apusIndex['apu_acond_termico_muros_lana100_bv']) out.push('apu_acond_termico_muros_lana100_bv');
    }
    // Excavación manual — solo si unidad m3
    if ((d.includes('excav') || d.includes('zanja')) && (u === 'm3' || u === 'm³')) {
      if (apusIndex['apu_excavacion_manual']) out.push('apu_excavacion_manual');
    }
    // Hormigón fundaciones H-25 — preferir m3
    if (d.includes('hormig') && (d.includes('fundac') || d.includes('losa')) && (u === 'm3' || u === 'm³')) {
      if (apusIndex['apu_h25_fundaciones']) out.push('apu_h25_fundaciones');
    }
    // Moldajes fundaciones — m2
    if ((d.includes('moldaje') || d.includes('encofrad')) && (u === 'm2' || u === 'm²')) {
      if (apusIndex['apu_moldajes_fundaciones']) out.push('apu_moldajes_fundaciones');
    }
    // Enfierradura — kg
    if ((d.includes('acero') || d.includes('enfier')) && u === 'kg') {
      if (apusIndex['apu_enfierradura']) out.push('apu_enfierradura');
    }
    // Radier — m2 (si el texto menciona radier)
    if (d.includes('radier') && (u === 'm2' || u === 'm²')) {
      if (apusIndex['apu_radier_10cm']) out.push('apu_radier_10cm');
    }
    // Techumbre zinc — m2
    if ((d.includes('zinc') || d.includes('zinc acan')) && (u === 'm2' || u === 'm²')) {
      if (apusIndex['apu_cubierta_zinc_m2']) out.push('apu_cubierta_zinc_m2');
    }
    // Cerámica piso — m2
    if (d.includes('cerámica') && d.includes('piso') && (u === 'm2' || u === 'm²')) {
      if (apusIndex['apu_ceramica_piso_m2']) out.push('apu_ceramica_piso_m2');
    }
    // Cerámica muro — m2
    if (d.includes('cerámica') && (d.includes('pared') || d.includes('muro')) && (u === 'm2' || u === 'm²')) {
      if (apusIndex['apu_ceramica_muro_m2']) out.push('apu_ceramica_muro_m2');
    }
    // Cielo yeso-cartón — m2
    if ((d.includes('yeso') || d.includes('cielo')) && (u === 'm2' || u === 'm²')) {
      if (apusIndex['apu_cielo_yeso_m2']) out.push('apu_cielo_yeso_m2');
    }
    // Instalaciones eléctricas — gl/kit/lote
    if ((d.includes('eléctr') || d.includes('cable') || d.includes('tablero') || d.includes('canaleta') || d.includes('tomacorriente')) && (u === 'gl' || u === 'kit' || u === 'lote' || u === 'un')) {
      if (apusIndex['apu_inst_electrica_gl']) out.push('apu_inst_electrica_gl');
    }
    // Instalaciones sanitarias y gas — preferir sub-APUs específicos por ítem
    if (u === 'gl' || u === 'kit' || u === 'lote') {
      // PVC desagüe
      if ((d.includes('pvc') && (d.includes('desag') || d.includes('alcantar') || d.includes('sanit')))) {
        if (apusIndex['apu_tuberias_pvc_desague_lote']) out.push('apu_tuberias_pvc_desague_lote');
      }
      // PPR agua
      if (d.includes('ppr') || (d.includes('agua') && (d.includes('caliente') || d.includes('fría') || d.includes('fria')))) {
        if (apusIndex['apu_tuberias_ppr_agua_lote']) out.push('apu_tuberias_ppr_agua_lote');
      }
      // Artefactos baño
      if ((d.includes('artefact') || d.includes('kit')) && (d.includes('baño') || d.includes('bano'))) {
        if (apusIndex['apu_kit_bano_economico_set']) out.push('apu_kit_bano_economico_set');
      }
      // Artefactos cocina
      if ((d.includes('artefact') || d.includes('kit')) && d.includes('cocina')) {
        if (apusIndex['apu_kit_cocina_economico_set']) out.push('apu_kit_cocina_economico_set');
      }
      // Gas
      if (d.includes('gas') || d.includes('regulador')) {
        if (apusIndex['apu_caneria_gas_lote']) out.push('apu_caneria_gas_lote');
      }
      // Fallback genérico si nada específico aplicó pero es sanitario/gas
      if (out.length === 0 && (d.includes('sanit') || d.includes('ppr') || d.includes('pvc') || d.includes('gas') || d.includes('artefact')) && apusIndex['apu_inst_sanitaria_gl']) {
        out.push('apu_inst_sanitaria_gl');
      }
    }
    // Ponderación por unidad: priorizar APUs cuya unidadSalida coincida con la unidad del ítem
    const desiredUnit = mapUnit(u);
    if (out.length > 1 && desiredUnit) {
      out.sort((a,b)=>{
        const ua = String(apusIndex[a]?.unidadSalida||'');
        const ub = String(apusIndex[b]?.unidadSalida||'');
        const ma = ua === desiredUnit ? 0 : 1;
        const mb = ub === desiredUnit ? 0 : 1;
        return ma - mb;
      });
    }
    return out;
  }, [apusIndex, mapUnit]);

  // Fallback: búsqueda por palabra + similitud en la biblioteca si no hubo match por reglas
  const findBestApuId = React.useCallback((desc: string, unidadSalida: string): string | null => {
    // Evitar fallback automático en los casos sensibles (preferir sugerencia manual)
    const d0 = norm(applySynonyms(desc));
    const u0 = normalizeUnitCanonical(String(unidadSalida||''));
    if (((d0.includes('acero') || d0.includes('fierro')) && (d0.includes('refuerzo') || d0.includes('enfier')) && (u0 === 'kg'))
      || ((d0.includes('madera') && (d0.includes('encofrad') || d0.includes('moldaj'))) && (u0 === 'm2'))
      || ((d0.includes('zinc') && (d0.includes('acanal') || d0.includes('plancha'))) && (u0 === 'm2'))) {
      return null;
    }
    const desired = normalizeUnitCanonical(String(unidadSalida||''));
    const q = removeDiacritics(String(applySynonyms(desc)||''));
    let bestId: string | null = null;
    let best = 0;
    for (const apu of Object.values(apusIndex)) {
      if (!apu || typeof (apu as any).id !== 'string') continue;
      const u = normalizeUnitCanonical(String((apu as any).unidadSalida || ''));
      const label = removeDiacritics(String((apu as any).descripcion || ''));
      const kw = jaccardTokens(q, label); // búsqueda por palabra (tokens)
      let sim = similarityScore(q, label); // respaldo por trigramas+tokens
      // Bonus por unidad
      const unitBonus = desired && u === desired ? 0.12 : (desired && u && u[0] === desired[0] ? 0.04 : 0);
      // Priorizar explícitamente coincidencias por palabra: si kw es decente, úsalo como base del puntaje
      const score = Math.max(kw + unitBonus, sim + unitBonus);
      if (score > best) { best = score; bestId = (apu as any).id; }
    }
    // Umbral: si viene por palabra (kw) o similitud total supera corte, aceptamos
    return best >= 0.50 ? bestId : null;
  }, [apusIndex]);

  const presupuestoRows = React.useMemo(() => {
    const ALTURA_MURO = 2.4; // m
    const perimetro = 4 * Math.sqrt(Math.max(metros, 1));
  const _cielosArea = Math.max(0, metros);
    const paredesIntArea = Math.max(0, Math.round(metros * 2.8)); // heurística interior
    const fachadaArea = Math.max(0, Math.round(perimetro * ALTURA_MURO));
    // Si el guardado activo es "fosa", mostrar exclusivamente el capítulo y partidas del preset diseñado (estructura como en imagen)
    if (activeSaveName === 'fosa') {
      const apuIds = {
        fosa: 'apu_fosa_septica_3000l_u',
        camaraInsp: 'apu_camara_inspeccion_elevador_u',
        camaraDist: 'apu_camara_distribuidora_100l_u',
        camaraDesg: 'apu_camara_desgrasadora_100l_u',
        pvc110: 'apu_tuberia_pvc_110_m',
        dren: 'apu_dren_infiltracion_m',
      } as const;
      const has = (id: string) => !!apusIndex[id];
      const mkSub = (descripcion: string, unidadSalida: string, metrados: number, ids: string[]) => ({ id: `user_fosa_${descripcion}_${unidadSalida}`.toLowerCase().replace(/[^a-z0-9_]+/g,'_'), descripcion, unidadSalida, metrados, apuIds: ids.filter(has) });
      const rows = [
        {
          id: 'fosa_partida_1',
          chapterId: 'calc',
          descripcion: 'Fosa séptica 3.000 L instalada',
          apuIds: [],
          metrados: 1,
          subRows: [
            mkSub('Fosa séptica 3.000 L instalada', 'u', 1, [apuIds.fosa]),
          ],
        },
        {
          id: 'fosa_partida_2',
          chapterId: 'calc',
          descripcion: 'Cámaras sanitarias',
          apuIds: [],
          metrados: 1,
          subRows: [
            mkSub('Cámara de inspección con elevador', 'u', 2, [apuIds.camaraInsp]),
            mkSub('Cámara distribuidora 100 L', 'u', 1, [apuIds.camaraDist]),
            mkSub('Cámara desgrasadora 100 L', 'u', 1, [apuIds.camaraDesg]),
          ],
        },
        {
          id: 'fosa_partida_3',
          chapterId: 'calc',
          descripcion: 'Redes y drenaje sanitario',
          apuIds: [],
          metrados: 1,
          subRows: [
            mkSub('Tubería PVC Ø110 sanitaria enterrada', 'm', 15, [apuIds.pvc110]),
            mkSub('Dren de infiltración 0,50×0,80 m', 'm', 20, [apuIds.dren]),
          ],
        },
      ];
      return rows as any[];
    }

  const out = partidasCalc.map((p, _idx) => {
      const items = (p as any).itemsCalculados || [];
      const parentRowId = `calc_${p.id}`;
      // Caso especial: colapsar Instalaciones Sanitarias y Gas en una sola subpartida genérica
      if (p.id === 'instalaciones') {
        const base:any = {
          id: `calc_${p.id}_s0`,
          descripcion: 'Instalaciones sanitarias y gas',
          unidadSalida: 'gl',
          metrados: 1,
          apuIds: apusIndex['apu_inst_sanitaria_gl'] ? ['apu_inst_sanitaria_gl'] : [],
        };
        if (base.apuIds.length === 0) base.overrideTotal = Math.round((p as any).costo || items.reduce((a:any,b:any)=>a+(b.totalItem||0),0));
        const ov = subOverrides[base.id] || {};
        // Respetar override explícito aunque sea arreglo vacío
        const ovHasApuIds = Object.prototype.hasOwnProperty.call(ov, 'apuIds');
        const finalIds: string[] = ovHasApuIds
          ? (Array.isArray(ov.apuIds) ? (ov.apuIds as string[]) : [])
          : (base.apuIds as string[]);
        const useOverrideTotal = !(finalIds && finalIds.length) ? (ov.overrideTotal ?? base.overrideTotal) : undefined;
        const derived = [{ ...base, ...ov, apuIds: finalIds, overrideTotal: useOverrideTotal }].filter(s => !hiddenSubIds[s.id]);
        const manual = userSubRows[parentRowId] || [];
        const subRows = [...derived, ...manual];
        return {
          id: parentRowId,
          chapterId: 'calc',
          descripcion: rowDescOverrides[`calc_${p.id}`] ?? p.nombre,
          apuIds: [],
          metrados: 1,
          subRows,
        };
      }
      // Caso especial: colapsar Instalaciones Eléctricas en una sola subpartida genérica
      if (p.id === 'electricas') {
        const base:any = {
          id: `calc_${p.id}_s0`,
          descripcion: 'Instalaciones eléctricas',
          unidadSalida: 'gl',
          metrados: 1,
          apuIds: apusIndex['apu_inst_electrica_gl'] ? ['apu_inst_electrica_gl'] : [],
        };
        if (base.apuIds.length === 0) base.overrideTotal = Math.round((p as any).costo || items.reduce((a:any,b:any)=>a+(b.totalItem||0),0));
        const ov = subOverrides[base.id] || {};
        // Respetar override explícito aunque sea arreglo vacío
        const ovHasApuIds = Object.prototype.hasOwnProperty.call(ov, 'apuIds');
        const finalIds: string[] = ovHasApuIds
          ? (Array.isArray(ov.apuIds) ? (ov.apuIds as string[]) : [])
          : (base.apuIds as string[]);
        const useOverrideTotal = !(finalIds && finalIds.length) ? (ov.overrideTotal ?? base.overrideTotal) : undefined;
        const derived = [{ ...base, ...ov, apuIds: finalIds, overrideTotal: useOverrideTotal }].filter(s => !hiddenSubIds[s.id]);
        const manual = userSubRows[parentRowId] || [];
        const subRows = [...derived, ...manual];
        return {
          id: parentRowId,
          chapterId: 'calc',
          descripcion: rowDescOverrides[`calc_${p.id}`] ?? p.nombre,
          apuIds: [],
          metrados: 1,
          subRows,
        };
      }
      const subRowsDerived = items.map((it: any, i: number) => {
        const d = norm(it.descripcion);
        // Pinturas: generar subpartidas por m² con APUs específicos
        if (d.includes('pintura') && d.includes('interior')) {
          const apuIds = apusIndex['apu_pintura_interior_m2'] ? ['apu_pintura_interior_m2'] : [];
          const base: any = {
            id: `calc_${p.id}_s${i}`,
            descripcion: 'Pintura interior (látex) 2 manos',
            unidadSalida: 'm2',
            metrados: paredesIntArea,
            apuIds,
          };
          if (apuIds.length === 0) {
            const fb = findBestApuId('Pintura interior (látex) 2 manos', 'm2');
            if (fb) base.apuIds = [fb];
            // sin fallback de overrideTotal: si no hay APU, queda vacía (total 0)
          }
          const ov = subOverrides[base.id] || {};
          const ovHasApuIds = Object.prototype.hasOwnProperty.call(ov, 'apuIds');
          let finalIds: string[] = ovHasApuIds ? (Array.isArray(ov.apuIds) ? ov.apuIds as string[] : []) : (base.apuIds as string[]);
          if (ovHasApuIds && Array.isArray(ov.apuIds) && (ov.apuIds as string[]).length > 0) {
            const generic = new Set(['apu_inst_sanitaria_gl', 'apu_inst_electrica_gl']);
            const hasSpecificInBase = (base.apuIds || []).some((id:string) => !generic.has(id));
            const ovOnlyGeneric = (ov.apuIds as string[]).every((id:string) => generic.has(id));
            if (hasSpecificInBase && ovOnlyGeneric) finalIds = base.apuIds as string[];
          }
          const useOverrideTotal = !(finalIds && finalIds.length) ? (ov.overrideTotal ?? base.overrideTotal) : undefined;
          return { ...base, ...ov, apuIds: finalIds, overrideTotal: useOverrideTotal };
        }
        if (d.includes('pintura') && (d.includes('fachada') || d.includes('exterior'))) {
          const apuIds = apusIndex['apu_pintura_fachada_m2'] ? ['apu_pintura_fachada_m2'] : [];
          const base: any = {
            id: `calc_${p.id}_s${i}`,
            descripcion: 'Pintura fachada 2 manos',
            unidadSalida: 'm2',
            metrados: fachadaArea,
            apuIds,
          };
          if (apuIds.length === 0) {
            const fb = findBestApuId('Pintura fachada 2 manos', 'm2');
            if (fb) base.apuIds = [fb];
            // sin fallback de overrideTotal
          }
          const ov = subOverrides[base.id] || {};
          const ovHasApuIds = Object.prototype.hasOwnProperty.call(ov, 'apuIds');
          let finalIds: string[] = ovHasApuIds ? (Array.isArray(ov.apuIds) ? ov.apuIds as string[] : []) : (base.apuIds as string[]);
          if (ovHasApuIds && Array.isArray(ov.apuIds) && (ov.apuIds as string[]).length > 0) {
            const generic = new Set(['apu_inst_sanitaria_gl', 'apu_inst_electrica_gl']);
            const hasSpecificInBase = (base.apuIds || []).some((id:string) => !generic.has(id));
            const ovOnlyGeneric = (ov.apuIds as string[]).every((id:string) => generic.has(id));
            if (hasSpecificInBase && ovOnlyGeneric) finalIds = base.apuIds as string[];
          }
          const useOverrideTotal = !(finalIds && finalIds.length) ? (ov.overrideTotal ?? base.overrideTotal) : undefined;
          return { ...base, ...ov, apuIds: finalIds, overrideTotal: useOverrideTotal };
        }

        // Aislación con lana de vidrio → crear subpartida por m²
        if (d.includes('aislante') || d.includes('lana')) {
          const isTecho = p.id === 'techumbre' || d.includes('techo') || d.includes('cielo');
          const apuIds = isTecho
            ? (apusIndex['apu_acond_termico_cielo_lana100'] ? ['apu_acond_termico_cielo_lana100'] : [])
            : (apusIndex['apu_acond_termico_muros_lana100_bv'] ? ['apu_acond_termico_muros_lana100_bv'] : []);
          const base: any = {
            id: `calc_${p.id}_s${i}`,
            descripcion: isTecho ? 'Aislación térmica en cielo (lana 100 mm)' : 'Acondicionamiento térmico de muros (lana 100 mm + BV)',
            unidadSalida: 'm2',
            metrados: isTecho ? _cielosArea : paredesIntArea,
            apuIds,
          };
          if (apuIds.length === 0) {
            const fb = findBestApuId(base.descripcion, 'm2');
            if (fb) base.apuIds = [fb];
            // sin fallback de overrideTotal
          }
          const ov = subOverrides[base.id] || {};
          const ovHasApuIds = Object.prototype.hasOwnProperty.call(ov, 'apuIds');
          let finalIds: string[] = ovHasApuIds ? (Array.isArray(ov.apuIds) ? ov.apuIds as string[] : []) : (base.apuIds as string[]);
          if (ovHasApuIds && Array.isArray(ov.apuIds) && (ov.apuIds as string[]).length > 0) {
            const generic = new Set(['apu_inst_sanitaria_gl', 'apu_inst_electrica_gl']);
            const hasSpecificInBase = (base.apuIds || []).some((id:string) => !generic.has(id));
            const ovOnlyGeneric = (ov.apuIds as string[]).every((id:string) => generic.has(id));
            if (hasSpecificInBase && ovOnlyGeneric) finalIds = base.apuIds as string[];
          }
          const useOverrideTotal = !(finalIds && finalIds.length) ? (ov.overrideTotal ?? base.overrideTotal) : undefined;
          return { ...base, ...ov, apuIds: finalIds, overrideTotal: useOverrideTotal };
        }

        // Resto: subpartida desde ítem (usa APUs si hay match por descripción/unidad)
        const apuIds = matchApuIdsForItem(it.descripcion, it.unidad);
        const base:any = {
          id: `calc_${p.id}_s${i}`,
          descripcion: it.descripcion,
          unidadSalida: mapUnit(it.unidad),
          metrados: Number.isFinite(it.cantidadCalc) ? it.cantidadCalc : it.cantidad,
          apuIds,
        };
        // Detectar casos sensibles (2.2, 2.3, 4.2) para no aplicar fallback de costo
        const dd0 = norm(applySynonyms(String(base.descripcion||'')));
        const uu0 = normalizeUnitCanonical(String(base.unidadSalida||''));
        const isBlocked0 = (
          ((dd0.includes('acero') || dd0.includes('fierro')) && (dd0.includes('refuerzo') || dd0.includes('enfier')) && (uu0 === 'kg')) ||
          ((dd0.includes('madera') && (dd0.includes('encofrad') || dd0.includes('moldaj'))) && (uu0 === 'm2')) ||
          ((dd0.includes('zinc') && (dd0.includes('acanal') || dd0.includes('plancha'))) && (uu0 === 'm2'))
        );
        if (apuIds.length === 0 && !isBlocked0) {
          const fb = findBestApuId(base.descripcion, base.unidadSalida);
          if (fb) base.apuIds = [fb];
          // sin fallback de overrideTotal
        }
        const ov = subOverrides[base.id] || {};
        const ovHasApuIds = Object.prototype.hasOwnProperty.call(ov, 'apuIds');
        let finalIds: string[] = ovHasApuIds ? (Array.isArray(ov.apuIds) ? ov.apuIds as string[] : []) : (base.apuIds as string[]);
        if (ovHasApuIds && Array.isArray(ov.apuIds) && (ov.apuIds as string[]).length > 0) {
          const generic = new Set(['apu_inst_sanitaria_gl', 'apu_inst_electrica_gl']);
          const hasSpecificInBase = (base.apuIds || []).some((id:string) => !generic.has(id));
          const ovOnlyGeneric = (ov.apuIds as string[]).every((id:string) => generic.has(id));
          if (hasSpecificInBase && ovOnlyGeneric) finalIds = base.apuIds as string[];
        }
        // Fuerza a vacío y sin override en casos sensibles (2.2, 2.3, 4.2) aunque existan overrides antiguos
        const isBlocked = isBlocked0;
        const hasUserOverrideApu = ovHasApuIds && Array.isArray(ov.apuIds) && (ov.apuIds as string[]).length > 0;
        if (isBlocked && !hasUserOverrideApu) { finalIds = []; base.overrideTotal = undefined; }
        const useOverrideTotal = !(finalIds && finalIds.length)
          ? ((isBlocked && !hasUserOverrideApu) ? undefined : (ov.overrideTotal ?? base.overrideTotal))
          : undefined;
        return { ...base, ...ov, apuIds: finalIds, overrideTotal: useOverrideTotal };
      });
      let derivedVisible = subRowsDerived.filter(s => !hiddenSubIds[s.id]);
      // Alinear factores de partida con subpartidas
      // Techumbre: aplicar factor "techo" a nivel de subpartidas para que el subtotal coincida con el KPI
      if (p.id === 'techumbre') {
        derivedVisible = derivedVisible.map((s:any) => {
          if (Array.isArray(s.apuIds) && s.apuIds.length > 0) {
            const qty = Number(s.metrados || 0) * (techo || 1);
            return { ...s, metrados: qty };
          }
          if (typeof s.overrideTotal === 'number' && Number.isFinite(s.overrideTotal)) {
            const tot = Math.round((s.overrideTotal || 0) * (techo || 1));
            return { ...s, overrideTotal: tot };
          }
          return s;
        });
      }
      // Terminaciones: aplicar factor "piso" a subpartidas de cerámica de piso para alinear subtotal
      if (p.id === 'terminaciones') {
        derivedVisible = derivedVisible.map((s:any) => {
          const d = String(s.descripcion||'').toLowerCase();
          const isCerPiso = d.includes('cerámica') && d.includes('piso');
          if (!isCerPiso) return s;
          if (Array.isArray(s.apuIds) && s.apuIds.length > 0) {
            const qty = Number(s.metrados || 0) * (piso || 1);
            return { ...s, metrados: qty };
          }
          if (typeof s.overrideTotal === 'number' && Number.isFinite(s.overrideTotal)) {
            const tot = Math.round((s.overrideTotal || 0) * (piso || 1));
            return { ...s, overrideTotal: tot };
          }
          return s;
        });
      }
      const manual = userSubRows[parentRowId] || [];
      const subRows = [...derivedVisible, ...manual];
      const parentRow = {
        id: parentRowId,
        chapterId: 'calc',
        descripcion: rowDescOverrides[`calc_${p.id}`] ?? p.nombre,
        apuIds: [],
        metrados: 1,
        subRows,
      };
      return parentRow;
    });
    // Agregar capítulo manual para APUs añadidos desde biblioteca
    const manualParentId = 'calc_manual';
    const manual = userSubRows[manualParentId] || [];
    if (manual.length) {
      out.push({
        id: manualParentId,
        chapterId: 'calc',
        descripcion: 'Ítems manuales',
        apuIds: [],
        metrados: 1,
        subRows: manual,
      } as any);
    }
    return out;
  }, [partidasCalc, rowDescOverrides, matchApuIdsForItem, findBestApuId, metros, apusIndex, subOverrides, mapUnit, userSubRows, hiddenSubIds, techo, piso, activeSaveName]);

  // Partidas vacías: crear advertencias y sugerencias de APU
  const getPartidaByRowId = React.useCallback((rowId: string) => {
    const pid = String(rowId || '').replace(/^calc_/, '');
    return partidasData.find(pp => pp.id === pid);
  }, []);

  const predominantUnitFromItems = React.useCallback((items: PartidaItem[] | undefined): string => {
    if (!items || items.length === 0) return 'gl';
    const counts: Record<string, number> = {};
    for (const it of items) {
      const mu = mapUnit(it.unidad);
      counts[mu] = (counts[mu] || 0) + 1;
    }
    // preferir m2/m3 si empatan con otras
    const entries = Object.entries(counts).sort((a,b)=> b[1]-a[1]);
    const top = entries[0]?.[0] || 'gl';
    if (top === 'u' && (counts['m2'] || counts['m3'])) {
      if ((counts['m2']||0) >= (counts['m3']||0)) return 'm2';
      return 'm3';
    }
    return top || 'gl';
  }, [mapUnit]);

  const emptyWarnings = React.useMemo(() => {
    const warns: Array<{ rowId: string; name: string; unit: string; metrados: number; suggestedApuId: string | null }> = [];
    for (const r of presupuestoRows) {
      if (r.id === 'calc_manual') continue;
      const subs = Array.isArray(r.subRows) ? r.subRows : [];
      if (subs.length === 0) {
        const p = getPartidaByRowId(r.id);
        const name = p?.nombre || 'Partida';
        const unit = predominantUnitFromItems(p?.items);
        const metrados = unit === 'm2' ? metros : (unit === 'm3' ? Math.max(1, Math.round(metros * 0.1)) : 1);
        const suggestedApuId = findBestApuId(name, unit);
        warns.push({ rowId: r.id, name, unit, metrados, suggestedApuId });
      }
    }
    return warns;
  }, [presupuestoRows, metros, getPartidaByRowId, predominantUnitFromItems, findBestApuId]);

  const handleAddSuggested = React.useCallback((rowId: string) => {
    try {
      const w = emptyWarnings.find(x => x.rowId === rowId);
      if (!w) return;
      const nid = `user_${rowId}_${Date.now()}`;
      const desc = `APU para ${w.name}`;
      setUserSubRows(prev => {
        const arr = [...(prev[rowId] || [])];
        const patch: any = { id: nid, descripcion: desc, unidadSalida: w.unit, metrados: w.metrados };
        if (w.suggestedApuId) patch.apuIds = [w.suggestedApuId]; else patch.apuIds = [];
        arr.push(patch);
        return { ...prev, [rowId]: arr };
      });
      if (!w.suggestedApuId) {
        // Abrir selector si no hubo sugerencia
        setTimeout(()=> setSelectApuOpen({ open: true, subId: nid }), 0);
      }
    } catch {}
  }, [emptyWarnings]);

  const handleAddAndPick = React.useCallback((rowId: string) => {
    try {
      const p = getPartidaByRowId(rowId);
      const name = p?.nombre || 'Partida';
      const unit = predominantUnitFromItems(p?.items);
      const metrados = unit === 'm2' ? metros : (unit === 'm3' ? Math.max(1, Math.round(metros * 0.1)) : 1);
      const nid = `user_${rowId}_${Date.now()}`;
      setUserSubRows(prev => {
        const arr = [...(prev[rowId] || [])];
        arr.push({ id: nid, descripcion: `APU para ${name}`, unidadSalida: unit, metrados, apuIds: [] });
        return { ...prev, [rowId]: arr };
      });
      setTimeout(()=> setSelectApuOpen({ open: true, subId: nid }), 0);
    } catch {}
  }, [getPartidaByRowId, predominantUnitFromItems, metros]);

  // Fix vacío de subpartida tras guardar: aplicar sugerencia o abrir selector
  const fixEmptySubUseSuggestion = React.useCallback((parentId: string, subId: string) => {
    try {
      const w = saveWarnings.find(x => x.parentId === parentId && x.subId === subId);
      if (!w || !w.suggestedApuId) return;
      if (String(subId).startsWith('user_')) {
        setUserSubRows(prev => {
          const arr = [...(prev[parentId] || [])];
          const idx = arr.findIndex(s => s.id === subId);
          if (idx >= 0) arr[idx] = { ...arr[idx], apuIds: [w.suggestedApuId], overrideTotal: undefined, overrideUnitPrice: undefined } as any;
          return { ...prev, [parentId]: arr };
        });
      } else {
        setSubOverrides(prev => ({ ...prev, [subId]: { ...(prev[subId]||{}), apuIds: [w.suggestedApuId], overrideTotal: undefined, overrideUnitPrice: undefined } }));
      }
      setSaveWarnings(prev => prev.filter(x => !(x.parentId === parentId && x.subId === subId)));
    } catch {}
  }, [saveWarnings]);

  const fixEmptySubOpenPicker = React.useCallback((parentId: string, subId: string) => {
    try { setSelectApuOpen({ open: true, subId }); } catch {}
  }, []);

  // Auto-crear y asignar APU cuando una subpartida no tiene APU
  const autoCreatedRef = React.useRef<Record<string, boolean>>({});
  React.useEffect(() => {
    if (!onCreateApuByName) return;
    try {
      const allSubs: Array<{ id:string; descripcion:string; unidadSalida?:string; apuIds?:string[] }> = [];
      for (const r of presupuestoRows) {
        for (const s of (r.subRows || [])) allSubs.push(s);
      }
      const toCreate = allSubs.filter(s => {
        const hasApu = Array.isArray(s.apuIds) && s.apuIds.length > 0;
        const ov = subOverrides[s.id];
        const hasOvApu = Array.isArray(ov?.apuIds) && (ov!.apuIds as string[]).length > 0;
        const ovExplicit = ov ? Object.prototype.hasOwnProperty.call(ov, 'apuIds') : false;
        const already = !!autoCreatedRef.current[s.id];
        const isUserCreated = String(s.id || '').startsWith('user_');
        // No auto-crear APU si el usuario dejó explícitamente vacíos los apuIds (override presente aunque sea [])
        // Tampoco para subpartidas creadas por el usuario
        // Ni para casos sensibles (2.2, 2.3, 4.2)
        const d = norm(String(s.descripcion || ''));
        const u = normalizeUnitCanonical(String(s.unidadSalida || ''));
        const blocked = (
          ((d.includes('acero') || d.includes('fierro')) && (d.includes('refuerzo') || d.includes('enfier')) && (u === 'kg')) ||
          ((d.includes('madera') && (d.includes('encofrad') || d.includes('moldaj'))) && (u === 'm2')) ||
          ((d.includes('zinc') && (d.includes('acanal') || d.includes('plancha'))) && (u === 'm2'))
        );
        return !hasApu && !hasOvApu && !ovExplicit && !already && !isUserCreated && !blocked;
      });
      if (!toCreate.length) return;
      const tasks = toCreate.map(s => {
        const name = String(s.descripcion || 'APU sin título');
        const unit = String(s.unidadSalida || '');
        const res = onCreateApuByName(name, unit);
        const toPromise: Promise<{ sid:string; id:string | null }> = (res && typeof (res as any).then === 'function')
          ? (res as Promise<string>).then(id => ({ sid: s.id, id })).catch(() => ({ sid: s.id, id: null }))
          : Promise.resolve({ sid: s.id, id: (typeof res === 'string' ? res : null) });
        return toPromise;
      });
      Promise.all(tasks).then(results => {
        const patch: Record<string, { apuIds: string[]; overrideTotal?: number }> = {};
        for (const r of results) {
          if (r && r.id) {
            autoCreatedRef.current[r.sid] = true;
            patch[r.sid] = { apuIds: [r.id], overrideTotal: undefined as any };
          }
        }
        if (Object.keys(patch).length) {
          setSubOverrides(prev => {
            const next = { ...(prev||{}) } as typeof prev;
            for (const sid of Object.keys(patch)) {
              next[sid] = { ...(next[sid]||{}), ...patch[sid] } as any;
            }
            return next;
          });
        }
      });
    } catch {}
  }, [presupuestoRows, subOverrides, onCreateApuByName]);

  const getApuById = React.useCallback((id: string) => {
    const fromIndex = apusIndex[id];
    if (fromIndex) return fromIndex;
    // Fallback inmediato: leer desde localStorage si el padre aún no propagó la librería actualizada
    try {
      const raw = localStorage.getItem('apu-library');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const found = list.find((a:any) => String(a?.id||'') === String(id));
          if (found) return found;
        }
      }
    } catch {}
    return undefined as any;
  }, [apusIndex]);
  const unitCostWrapper = React.useCallback((apu: any, _res: Record<string, any>) => {
    try { return unitCost(apu, resources as any, apusIndex as any); } catch { return { unit: 0 }; }
  }, [resources, apusIndex]);

  // Inyección desde biblioteca: escuchar storage y consumir solicitudes
  const consumeInject = React.useCallback((val: string | null) => {
    if (!val) return;
    try {
      const p = JSON.parse(val || 'null');
      if (!p || !p.apuId) return;
      const apu = getApuById(String(p.apuId));
      const nid = `user_calc_${Date.now()}`;
      const desc = String(p.descripcion || apu?.descripcion || 'APU agregado');
      const unidadSalida = String(p.unidadSalida || apu?.unidadSalida || 'u');
      const metrados = Number(p.metrados || 1);
      setUserSubRows(prev => {
        const arr = [...(prev['calc_manual'] || [])];
        arr.push({ id: nid, descripcion: desc, unidadSalida, metrados, apuIds: [String(p.apuId)] });
        return { ...prev, ['calc_manual']: arr } as any;
      });
    } catch {}
  }, [getApuById]);

  React.useEffect(() => {
    // Consumir si ya existe al montar
    const raw = localStorage.getItem('calculator-inject');
    if (raw) {
      consumeInject(raw);
      try { localStorage.removeItem('calculator-inject'); } catch {}
    }
    const handler = (e: StorageEvent) => {
      if (e.key === 'calculator-inject' && e.newValue) {
        consumeInject(e.newValue);
        try { localStorage.removeItem('calculator-inject'); } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [consumeInject]);

  // Subtotal de materiales alineado con la Vista Presupuesto (suma de subpartidas visibles)
  const calcRowTotalLocal = React.useCallback((r:any) => {
    if (Array.isArray(r.subRows) && r.subRows.length > 0) {
      return r.subRows.reduce((acc:number, s:any) => {
        const sQty = Number(s.metrados || 0);
        const sIds: string[] = Array.isArray(s.apuIds) ? s.apuIds : [];
        const sPu = sIds.reduce((sum:number, id:string) => { try { return sum + unitCostWrapper(getApuById(id), resources as any).unit; } catch { return sum; } }, 0);
        const sEffPu = (typeof s.overrideUnitPrice === 'number' && Number.isFinite(s.overrideUnitPrice)) ? s.overrideUnitPrice : sPu;
        const sTot = (typeof s.overrideTotal === 'number' && Number.isFinite(s.overrideTotal)) ? s.overrideTotal : (sEffPu * sQty);
        return acc + (Number.isFinite(sTot) ? sTot : 0);
      }, 0);
    }
    const qty = Number(r.metrados || 0);
    const ids: string[] = r.apuIds?.length ? r.apuIds : (r.apuId ? [r.apuId] : []);
    const pu = ids.reduce((acc:number, id:string) => { try { return acc + unitCostWrapper(getApuById(id), resources as any).unit; } catch { return acc; } }, 0);
    const effPu = (typeof r.overrideUnitPrice === 'number' && Number.isFinite(r.overrideUnitPrice)) ? r.overrideUnitPrice : pu;
    const total = (typeof r.overrideTotal === 'number' && Number.isFinite(r.overrideTotal)) ? r.overrideTotal : (effPu * qty);
    return Number.isFinite(total) ? total : 0;
  }, [getApuById, unitCostWrapper, resources]);

  const subtotalMateriales = React.useMemo(() => {
    try {
      return (presupuestoRows || []).reduce((acc:number, r:any) => acc + calcRowTotalLocal(r), 0);
    } catch { return 0; }
  }, [presupuestoRows, calcRowTotalLocal]);

  // Limpieza única: si estos 3 ítems traen APUs autoasignados de sesiones anteriores, limpiarlos para que queden vacíos
  const cleanedSpecialsRef = React.useRef<boolean>(false);
  React.useEffect(() => {
    if (cleanedSpecialsRef.current) return;
    try {
  const autop = new Set(['apu_enfierradura', 'apu_moldajes_fundaciones', 'apu_cubierta_zinc_m2']);
      const patches: Record<string, { apuIds: string[]; overrideTotal?: number; overrideUnitPrice?: number }> = {};
      for (const r of presupuestoRows) {
        for (const s of (r.subRows || [])) {
          const d = norm(String(s.descripcion || ''));
          const u = normalizeUnitCanonical(String(s.unidadSalida || ''));
          const isBlocked = (
            ((d.includes('acero') || d.includes('fierro')) && (d.includes('refuerzo') || d.includes('enfier')) && (u === 'kg')) ||
            ((d.includes('madera') && (d.includes('encofrad') || d.includes('moldaj'))) && (u === 'm2')) ||
            ((d.includes('zinc') && (d.includes('acanal') || d.includes('plancha'))) && (u === 'm2'))
          );
          if (!isBlocked) continue;
          const ids: string[] = Array.isArray(s.apuIds) ? s.apuIds : [];
          if (ids.length && ids.every(id => autop.has(String(id)))) {
            // Limpiar completamente: sin APU y sin override para que el total no aparezca
            patches[s.id] = { apuIds: [], overrideTotal: undefined as any, overrideUnitPrice: undefined as any } as any;
          }
        }
      }
      if (Object.keys(patches).length) {
        setSubOverrides(prev => {
          const next = { ...(prev || {}) } as typeof prev;
          for (const sid of Object.keys(patches)) {
            next[sid] = { ...(next[sid] || {}), ...patches[sid] } as any;
          }
          return next;
        });
      }
      cleanedSpecialsRef.current = true;
    } catch {}
  }, [presupuestoRows, setSubOverrides]);

  // Cálculo financiero basado en subtotal alineado con Vista Presupuesto
  const ggMonto = React.useMemo(() => subtotalMateriales * (gg || 0), [subtotalMateriales, gg]);
  const utilMonto = React.useMemo(() => (subtotalMateriales + ggMonto) * (util || 0), [subtotalMateriales, ggMonto, util]);
  const neto = React.useMemo(() => subtotalMateriales + ggMonto + utilMonto, [subtotalMateriales, ggMonto, utilMonto]);
  const ivaMonto = React.useMemo(() => neto * (iva || 0), [neto, iva]);
  const total = React.useMemo(() => neto + ivaMonto, [neto, ivaMonto]);
  const costoPorM2 = React.useMemo(() => {
    const base = includeIvaInM2 ? total : (total - ivaMonto);
    return metros>0 ? Math.round(base/metros) : 0;
  }, [total, ivaMonto, includeIvaInM2, metros]);

  // Guardar estado de la calculadora en localStorage
  const readSavesIndex = React.useCallback((): Array<{name:string; savedAt:number}> => {
    try {
      const raw = localStorage.getItem('calculator-saves-index-v1');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }, []);

  const writeSavesIndex = React.useCallback((list: Array<{name:string; savedAt:number}>) => {
    try { localStorage.setItem('calculator-saves-index-v1', JSON.stringify(list)); } catch {}
  }, []);

  const buildSnapshot = React.useCallback(() => ({
    v: 1,
    savedAt: Date.now(),
    metros,
    calidad,
    techo,
    piso,
    includeIvaInM2,
    rowDescOverrides,
    subOverrides,
    userSubRows,
    hiddenSubIds,
    gg,
    util,
    iva,
  }), [metros, calidad, techo, piso, includeIvaInM2, rowDescOverrides, subOverrides, userSubRows, hiddenSubIds, gg, util, iva]);


  // Asegurar un guardado "a" inmutable (solo se crea si no existe). El usuario pidió
  // un snapshot llamado "a" que no sea modificable desde la UI.
  const ensureASave = React.useCallback(() => {
    try {
      const name = 'a';
      const key = `calculator-save:${encodeURIComponent(name)}`;
      const existing = localStorage.getItem(key);
      if (!existing) {
        const payload = { ...buildSnapshot(), name, immutable: true } as any;
        localStorage.setItem(key, JSON.stringify(payload));
        // agregar a índice si no estaba
        const idx = readSavesIndex().filter(x => x && x.name !== name);
        idx.unshift({ name, savedAt: payload.savedAt });
        writeSavesIndex(idx.slice(0, 30));
      } else {
        // Si existe pero no tiene marca immutable, aseguramos que el flag esté presente
        try {
          const parsed = JSON.parse(existing);
          if (parsed && !parsed.immutable) {
            parsed.immutable = true;
            localStorage.setItem(key, JSON.stringify(parsed));
            const idx = readSavesIndex().filter(x => x && x.name !== name);
            idx.unshift({ name, savedAt: parsed.savedAt || Date.now() });
            writeSavesIndex(idx.slice(0, 30));
          }
        } catch {}
      }
    } catch {}
  }, [buildSnapshot, readSavesIndex, writeSavesIndex]);

  // Crear un preset "fosa" con sus APUs respectivos (preferir IDs conocidos, luego heurística)
  const ensureFosaSave = React.useCallback(() => {
    try {
      const name = 'fosa';
      const key = `calculator-save:${encodeURIComponent(name)}`;
  const existing = localStorage.getItem(key);

      // Heurística: volumen excavación ~ 0.06 m³ por m² (mínimo 3 m³)
      const volExcav = Math.max(3, Math.round((metros || 0) * 0.06));
      // Heurística: losa tapa ~ 3 m²
      const losaM2 = 3;
      const calcManualId = 'calc_manual';
      const now = Date.now();
      const items = [
        { id: `user_${calcManualId}_${now}_1`, descripcion: 'Excavación para fosa séptica', unidadSalida: 'm3', metrados: volExcav },
        { id: `user_${calcManualId}_${now}_2`, descripcion: 'Fosa séptica prefabricada 3.000 L', unidadSalida: 'u', metrados: 1 },
        { id: `user_${calcManualId}_${now}_3`, descripcion: 'Relleno y compactación alrededor de fosa', unidadSalida: 'm3', metrados: volExcav },
        { id: `user_${calcManualId}_${now}_4`, descripcion: 'Cámara de inspección', unidadSalida: 'u', metrados: 1 },
        { id: `user_${calcManualId}_${now}_5`, descripcion: 'Losa de hormigón para tapa de fosa', unidadSalida: 'm2', metrados: losaM2 },
        { id: `user_${calcManualId}_${now}_6`, descripcion: 'Conexiones y tuberías sanitarias hacia fosa', unidadSalida: 'gl', metrados: 1 },
      ];
      // Preferencias de APU por ítem (IDs conocidos en la biblioteca); si no existen, caer a heurística
      const pickKnownApu = (desc: string, unit: string): string | null => {
        const d = norm(desc);
        const u = normalizeUnitCanonical(String(unit||''));
        const tryIds: string[] = [];
        // Excavación en zanja manual
        if (d.includes('excav') && (u === 'm3')) {
          tryIds.push('apu_exc_zanja_manual', 'apu_excavacion_manual');
        }
        // Fosa séptica prefabricada (unidad)
        if (d.includes('fosa') && d.includes('séptica') && (u === 'u' || u === 'gl')) {
          tryIds.push('apu_fosa_septica_3000l_u');
        }
        // Relleno y compactación manual
        if ((d.includes('relleno') || d.includes('compact')) && (u === 'm3')) {
          tryIds.push('apu_relleno_compact_manual');
        }
        // Cámara de inspección
        if (d.includes('cámara') || d.includes('camara')) {
          tryIds.push('apu_camara_inspeccion_elevador_u');
        }
        // Losa tapa fosa → radier H-25 10 cm con malla
        if (d.includes('losa') || d.includes('radier')) {
          tryIds.push('apu_radier_h25_10cm_malla_polietileno', 'apu_radier_10cm');
        }
        // Conexiones y tuberías sanitarias
        if ((d.includes('tuber') || d.includes('pvc') || d.includes('sanit')) && (u === 'gl' || u === 'u')) {
          tryIds.push('apu_inst_sanit_gas_lote', 'apu_inst_sanitaria_gl');
        }
        for (const id of tryIds) { if (apusIndex[id]) return id; }
        return null;
      };
      const withApu = items.map((s) => {
        try {
          const known = pickKnownApu(s.descripcion, s.unidadSalida || 'u');
          if (known) return { ...s, apuIds: [known] };
          const sug = findBestApuId(s.descripcion, s.unidadSalida || 'u');
          return sug ? { ...s, apuIds: [sug] } : { ...s, apuIds: [] as string[] };
        } catch { return { ...s, apuIds: [] as string[] }; }
      });
      if (!existing) {
        const snap = buildSnapshot();
        const payload = {
          ...snap,
          name,
          // Sobrescribimos subpartidas manuales para que el preset quede autocontenido
          userSubRows: { ...(snap.userSubRows || {}), [calcManualId]: withApu },
          rowDescOverrides: { ...(snap.rowDescOverrides || {}), [calcManualId]: 'Fosa séptica' },
        };
        localStorage.setItem(key, JSON.stringify(payload));
        const idx = readSavesIndex().filter(x => x && x.name !== name);
        idx.unshift({ name, savedAt: payload.savedAt });
        writeSavesIndex(idx.slice(0, 30));
      } else {
        // Reparar snapshot existente: si está vacío o le faltan ítems del preset, completar/actualizar
        try {
          const snap = JSON.parse(existing || 'null');
          const rows: any[] = (snap && snap.userSubRows && Array.isArray(snap.userSubRows[calcManualId])) ? snap.userSubRows[calcManualId] : [];
          const normDesc = (s:string)=> String(s||'').toLowerCase();
          const ensureList = [...withApu];
          const need: Array<{key:string; match:(d:string)=>boolean; make:()=>any; fixQty?:(r:any)=>any;}> = [
            { key:'excav', match:(d)=> d.includes('excav'), make:()=> ensureList[0], fixQty:(r)=> ({ ...r, metrados: volExcav }) },
            { key:'fosa', match:(d)=> d.includes('fosa'), make:()=> ensureList[1] },
            { key:'relleno', match:(d)=> d.includes('relleno') || d.includes('compact'), make:()=> ensureList[2], fixQty:(r)=> ({ ...r, metrados: volExcav }) },
            { key:'camara', match:(d)=> d.includes('cámara') || d.includes('camara'), make:()=> ensureList[3] },
            { key:'losa', match:(d)=> d.includes('losa') || d.includes('radier'), make:()=> ensureList[4], fixQty:(r)=> ({ ...r, metrados: losaM2 }) },
            { key:'conex', match:(d)=> d.includes('conex') || d.includes('sanit') || d.includes('pvc'), make:()=> ensureList[5] },
          ];
          let changed = false;
          const nextRows = Array.isArray(rows) ? [...rows] : [];
          for (const n of need) {
            const idx = nextRows.findIndex((r:any)=> n.match(normDesc(r.descripcion)));
            if (idx === -1) { nextRows.push(n.make()); changed = true; continue; }
            // Si existe pero sin APU, intentar asignar uno conocido
            const r0 = nextRows[idx] || {};
            const ids: string[] = Array.isArray(r0.apuIds) ? r0.apuIds : [];
            if (!ids.length) {
              const known = pickKnownApu(r0.descripcion, r0.unidadSalida || 'u');
              if (known) { nextRows[idx] = { ...r0, apuIds: [known] }; changed = true; }
            }
            // Actualizar metrados con heurística si aplica
            if (n.fixQty) { const upd = n.fixQty(r0); if (upd && upd.metrados !== r0.metrados) { nextRows[idx] = upd; changed = true; } }
          }
          if (!rows || rows.length === 0 || changed) {
            const patched = {
              ...snap,
              userSubRows: { ...(snap.userSubRows || {}), [calcManualId]: nextRows },
              rowDescOverrides: { ...(snap.rowDescOverrides || {}), [calcManualId]: 'Fosa séptica' },
              savedAt: Date.now(),
            };
            localStorage.setItem(key, JSON.stringify(patched));
            const idx = readSavesIndex().filter(x => x && x.name !== name);
            idx.unshift({ name, savedAt: patched.savedAt });
            writeSavesIndex(idx.slice(0, 30));
          }
        } catch {}
      }
    } catch {}
  }, [buildSnapshot, metros, findBestApuId, readSavesIndex, writeSavesIndex, apusIndex]);

  const handleSaveAs = React.useCallback(() => {
    try {
      const nameRaw = prompt('Nombre del guardado', '');
      const trimmed = (nameRaw || '').trim();
      if (trimmed) {
        const name = trimmed.slice(0, 64);
        const key = `calculator-save:${encodeURIComponent(name)}`;
        // Proteger guardados inmuebles: no permitir sobrescribir si tiene immutable flag
        try {
          const existingRaw = localStorage.getItem(key);
          if (existingRaw) {
            const parsed = JSON.parse(existingRaw);
            if (parsed && parsed.immutable) {
              alert(`El guardado "${name}" está protegido y no puede ser sobrescrito.`);
              return;
            }
          }
        } catch {}
        const payload = { ...buildSnapshot(), name };
        localStorage.setItem(key, JSON.stringify(payload));
        // actualizar índice (dedupe por nombre)
        const idx = readSavesIndex().filter(x => x && typeof x.name === 'string' && x.name !== name);
        idx.unshift({ name, savedAt: payload.savedAt });
        // Limitar a 30 entradas
        writeSavesIndex(idx.slice(0, 30));
      }
      // Siempre mostrar feedback de guardado (aunque se haya cancelado el nombre) y correr la validación
      setJustSavedAt(Date.now());
      window.setTimeout(() => setJustSavedAt(null), 1800);

      // Tras guardar o confirmar, detectar subpartidas vacías y proponer APUs
      try {
        const warns: Array<{ parentId: string; subId: string; descripcion: string; unit: string; metrados: number; suggestedApuId: string | null }> = [];
        for (const r of presupuestoRows) {
          const subs = Array.isArray(r.subRows) ? r.subRows : [];
          for (const s of subs) {
            const hasApu = Array.isArray(s.apuIds) && s.apuIds.length > 0;
            const hasQty = Number(s.metrados || 0) > 0;
            // Considerar "vacía" toda subpartida sin APU, aunque tenga override de costo
            if (!hasApu) {
              const unit = String(s.unidadSalida || 'u');
              const metr = hasQty ? Number(s.metrados || 0) : 1;
              const sug = findBestApuId(String(s.descripcion || ''), unit);
              warns.push({ parentId: r.id, subId: s.id, descripcion: String(s.descripcion || 'Subpartida'), unit, metrados: metr, suggestedApuId: sug });
            }
          }
        }
        setSaveWarnings(warns);
        setShowSaveWarnings(warns.length > 0);
        setLastSaveEmptyCount(warns.length);
        if (warns.length > 0) {
          setTimeout(() => {
            try { saveWarnsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
          }, 50);
        }
      } catch {}
    } catch {}
  }, [buildSnapshot, readSavesIndex, writeSavesIndex, presupuestoRows, findBestApuId]);

  const handleLoad = React.useCallback((name: string) => {
    try {
      const key = `calculator-save:${encodeURIComponent(name)}`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const snap = JSON.parse(raw || 'null');
      if (!snap) return;
      if (typeof snap.metros === 'number') setMetros(snap.metros);
      if (typeof snap.includeIvaInM2 === 'boolean') setIncludeIvaInM2(snap.includeIvaInM2);
      if (snap.rowDescOverrides && typeof snap.rowDescOverrides === 'object') setRowDescOverrides(snap.rowDescOverrides);
      if (snap.subOverrides && typeof snap.subOverrides === 'object') setSubOverrides(snap.subOverrides);
      if (snap.userSubRows && typeof snap.userSubRows === 'object') setUserSubRows(snap.userSubRows);
      if (snap.hiddenSubIds && typeof snap.hiddenSubIds === 'object') setHiddenSubIds(snap.hiddenSubIds);
      // parámetros financieros via callbacks
      if (typeof snap.gg === 'number' && onChangeGG) onChangeGG(snap.gg);
      if (typeof snap.util === 'number' && onChangeUtil) onChangeUtil(snap.util);
      if (typeof snap.iva === 'number' && onChangeIVA) onChangeIVA(snap.iva);
      setActiveSaveName(name || null);
      setJustLoadedAt(Date.now());
      window.setTimeout(() => setJustLoadedAt(null), 1800);
    } catch {}
  }, [onChangeGG, onChangeUtil, onChangeIVA]);

  const handleDeleteSave = React.useCallback((name: string) => {
    try {
      // Proteger guardados inmuebles: no permitir eliminar si está marcado immutable
      const key = `calculator-save:${encodeURIComponent(name)}`;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.immutable) {
            alert(`El guardado "${name}" está protegido y no puede ser eliminado.`);
            return;
          }
        }
      } catch {}
      const proceed = window.confirm(`¿Eliminar "${name}"?`);
      if (!proceed) return;
      localStorage.removeItem(key);
      const idx = readSavesIndex().filter(x => x && x.name !== name);
      writeSavesIndex(idx);
    } catch {}
  }, [readSavesIndex, writeSavesIndex]);

  // Carga automática: eliminar "base" y cargar preset solicitado "fosa" (creándolo si falta).
  React.useEffect(() => {
    try {
      if (autoLoadedRef.current) return;
      // Asegurar el guardado inmutable 'a' al montar (si el usuario ya pidió que exista)
      ensureASave();
      // Borrar "base" si existe y quitarlo del índice
      const baseKey = `calculator-save:${encodeURIComponent('base')}`;
      try {
        const hadBase = !!localStorage.getItem(baseKey);
        if (hadBase) {
          localStorage.removeItem(baseKey);
          const idx = readSavesIndex().filter(x => x && x.name !== 'base');
          writeSavesIndex(idx);
        }
      } catch {}
      // Crear 'fosa' si no existe y cargarla
      const fosaKey = `calculator-save:${encodeURIComponent('fosa')}`;
      const hasFosa = !!localStorage.getItem(fosaKey);
      if (!hasFosa) ensureFosaSave();
      autoLoadedRef.current = true;
      handleLoad('fosa');
    } catch {}
  }, [readSavesIndex, writeSavesIndex, handleLoad, ensureASave, ensureFosaSave]);

  // (El modo "Solo Fosa" fue retirado; mantener solo acción rápida en el menú de carga)

  // Subpartida actualmente seleccionada para el selector de APU (depende de presupuestoRows)
  const currentSub = React.useMemo(() => {
    const sid = selectApuOpen.subId; if(!sid) return null;
    const parent = presupuestoRows.find(r => (r.subRows||[]).some((s:any)=> s.id===sid));
    if (!parent) return null;
    const sub = (parent.subRows||[]).find((s:any)=> s.id===sid) || null;
    return sub;
  }, [selectApuOpen.subId, presupuestoRows]);

  return (
    <div className="container mx-auto p-4">
      <header className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl px-6 py-6 shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Calculadora de Presupuesto</h1>
            <p className="opacity-80">Casa Básica Económica - Región de Valparaíso</p>
          </div>
          <div className="relative flex items-center gap-3">
            {justSavedAt && (<span className="text-emerald-300 text-sm">Guardado</span>)}
            {justLoadedAt && (<span className="text-sky-300 text-sm">Cargado</span>)}
            {lastSaveEmptyCount > 0 && (
              <button
                type="button"
                onClick={()=>{ setShowSaveWarnings(true); setTimeout(()=>{ try{ saveWarnsRef.current?.scrollIntoView({behavior:'smooth', block:'start'}); }catch{} }, 0); }}
                className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-700/70 hover:bg-amber-600 text-white"
                title="Subpartidas vacías detectadas"
              >
                Vacías: {lastSaveEmptyCount}
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveAs}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold shadow focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              title="Guardar con nombre"
              data-tour="calc-save"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M7 21V14a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M7 3v6h9V3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              Guardar
            </button>
            {/* Botón de "Solo Fosa" retirado; mantenemos solo acción rápida en el menú de carga */}
            <div className="relative">
              <button
                type="button"
                onClick={()=> setLoadMenuOpen(v=>!v)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white text-sm font-semibold shadow focus:outline-none focus:ring-2 focus:ring-slate-400/60"
                title="Cargar guardado"
                data-tour="calc-load"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
                  <path d="M12 16V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8 12l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 20H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Cargar
              </button>
              {loadMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-20">
                  <div className="max-h-64 overflow-auto py-2">
                    {/* Acciones rápidas */}
                    <div className="px-3 py-2 border-b border-slate-700/60">
                      <div className="text-[11px] uppercase text-slate-400 mb-1">Acciones rápidas</div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={()=>{ try { ensureFosaSave(); handleLoad('fosa'); setLoadMenuOpen(false); } catch {} }}
                          className="px-2 py-1 rounded-lg text-sm font-medium bg-emerald-700/70 hover:bg-emerald-600 text-white"
                        >Cargar preset Fosa</button>
                        <button
                          onClick={()=>{ try { handleLoad('a'); setLoadMenuOpen(false); } catch {} }}
                          className="px-2 py-1 rounded-lg text-sm font-medium bg-indigo-700/70 hover:bg-indigo-600 text-white"
                        >Cargar A (protegido)</button>
                      </div>
                    </div>
                    {readSavesIndex().length === 0 && (
                      <div className="px-3 py-2 text-slate-400 text-sm">No hay guardados</div>
                    )}
                    {readSavesIndex().map((s, idx) => (
                      <div key={idx} className="flex items-start gap-2 px-3 py-2 hover:bg-slate-800">
                        <button
                          onClick={()=>{ setLoadMenuOpen(false); handleLoad(s.name); }}
                          className="flex-1 text-left text-slate-100 text-sm"
                        >
                          <div className="font-medium truncate">
                            {s.name}
                            {s.name === 'a' && (
                              <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded bg-indigo-800/60 text-indigo-200 align-middle">protegido</span>
                            )}
                            {s.name === 'fosa' && (
                              <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-800/60 text-emerald-200 align-middle">preset</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{new Date(s.savedAt).toLocaleString()}</div>
                        </button>
                        <button
                          onClick={(e)=>{ e.stopPropagation(); handleDeleteSave(s.name); }}
                          className="p-1 rounded-lg text-slate-300 hover:text-rose-300 hover:bg-slate-700"
                          title="Eliminar guardado"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M10 11v7M14 11v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Cinta superior con Metros + KPIs en una sola línea (responsive) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
        {/* Metros + slider (ocupa más ancho) */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 h-fit">
          <div>
            <label htmlFor="metros" className="block text-sm font-semibold text-slate-200">Metros Cuadrados de la Casa</label>
            <input
              id="metros"
              type="number"
              min={40}
              max={200}
              step={5}
              value={metros}
              onChange={(e) => setMetros(Number(e.target.value || 0))}
              className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:border-slate-500"
              data-tour="calc-metros"
            />
            <div className="text-indigo-400 font-semibold text-center mt-1">{metros} m²</div>
            <input
              type="range"
              min={40}
              max={200}
              step={5}
              value={metros}
              onChange={(e)=> setMetros(Number(e.target.value))}
              className="mt-3 w-full accent-indigo-500"
              data-tour="calc-slider"
            />
          </div>

          {/* Configuración actual eliminada a solicitud del usuario */}
        </div>

        {/* KPI: Costo por m² */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase text-slate-300">Costo por m²</div>
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                className="accent-indigo-500"
                checked={includeIvaInM2}
                onChange={(e)=> setIncludeIvaInM2(e.target.checked)}
              />
              <span>{includeIvaInM2 ? 'con IVA' : 'sin IVA'}</span>
            </label>
          </div>
          <div className="text-xl font-bold text-indigo-300 mt-1">{fmtCl(costoPorM2)}</div>
        </div>

        {/* KPI editables: GG, Utilidad, IVA */}
    <div className="rounded-2xl border border-purple-800 bg-purple-900/20 p-4">
          <div className="text-xs uppercase text-slate-300">Gastos Generales (%)</div>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={Math.round((gg||0)*1000)/10}
            onChange={(e)=> onChangeGG && onChangeGG(Math.max(0, Math.min(100, Number(e.target.value||0)))/100)}
            className="mt-2 w-full rounded-xl bg-slate-900 border border-purple-800/60 px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
            data-tour="calc-gg"
          />
    </div>
    <div className="rounded-2xl border border-emerald-800 bg-emerald-900/20 p-4">
          <div className="text-xs uppercase text-slate-300">Utilidad (%)</div>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={Math.round((util||0)*1000)/10}
            onChange={(e)=> onChangeUtil && onChangeUtil(Math.max(0, Math.min(100, Number(e.target.value||0)))/100)}
            className="mt-2 w-full rounded-xl bg-slate-900 border border-emerald-800/60 px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            data-tour="calc-util"
          />
    </div>
    <div className="rounded-2xl border border-rose-800 bg-rose-900/20 p-4">
          <div className="text-xs uppercase text-slate-300">IVA (%)</div>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={Math.round((iva||0)*1000)/10}
            onChange={(e)=> onChangeIVA && onChangeIVA(Math.max(0, Math.min(100, Number(e.target.value||0)))/100)}
            className="mt-2 w-full rounded-xl bg-slate-900 border border-rose-800/60 px-3 py-2 text-slate-100 focus:outline-none focus:border-rose-500"
            data-tour="calc-iva"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-6">
        {/* Sección de resultados */}
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
            <h2 className="text-lg font-semibold text-slate-100">Presupuesto Total Estimado</h2>
            <div className="text-3xl md:text-4xl font-extrabold text-emerald-400 my-2">{fmtCl(total)}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <div className="rounded-xl p-3 bg-blue-900/20 border border-blue-800">
                <div className="text-xs uppercase text-slate-300">Materiales</div>
                <div className="text-lg font-bold">{fmtCl(subtotalMateriales)}</div>
              </div>
              <div className="rounded-xl p-3 bg-purple-900/20 border border-purple-800">
                <div className="text-xs uppercase text-slate-300">Gastos Generales ({Math.round((gg||0)*100)}%)</div>
                <div className="text-lg font-bold">{fmtCl(ggMonto)}</div>
              </div>
              <div className="rounded-xl p-3 bg-emerald-900/20 border border-emerald-800">
                <div className="text-xs uppercase text-slate-300">Utilidad ({Math.round((util||0)*100)}%)</div>
                <div className="text-lg font-bold">{fmtCl(utilMonto)}</div>
              </div>
              <div className="rounded-xl p-3 bg-rose-900/20 border border-rose-800">
                <div className="text-xs uppercase text-slate-300">IVA ({Math.round((iva||0)*100)}%)</div>
                <div className="text-lg font-bold">{fmtCl(ivaMonto)}</div>
              </div>
            </div>
          </div>

          {/* Alertas de partidas vacías con sugerencia de APU */}
          {emptyWarnings.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-700 rounded-2xl p-4">
              <div className="text-amber-300 text-sm font-semibold mb-2">Partidas vacías</div>
              <div className="space-y-2">
                {emptyWarnings.map((w) => (
                  <div key={w.rowId} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-amber-900/10 rounded-xl p-2">
                    <div className="text-amber-200 text-sm">
                      La partida "{w.name}" está vacía.
                      {' '}
                      {w.suggestedApuId ? 'Se encontró un APU sugerido.' : 'No se encontró APU automático.'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!w.suggestedApuId}
                        onClick={() => handleAddSuggested(w.rowId)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold shadow ${w.suggestedApuId ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-amber-800/40 text-amber-300 cursor-not-allowed'}`}
                        data-tour="calc-add-suggested"
                      >
                        Agregar sugerido
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddAndPick(w.rowId)}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold shadow bg-slate-700 hover:bg-slate-600 text-white"
                      >
                        Elegir APU…
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alertas de subpartidas vacías tras guardar */}
          {showSaveWarnings && saveWarnings.length > 0 && (
            <div ref={saveWarnsRef} className="bg-sky-900/20 border border-sky-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sky-300 text-sm font-semibold">Subpartidas vacías detectadas al guardar</div>
                <button
                  type="button"
                  onClick={()=> setShowSaveWarnings(false)}
                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white"
                >Ocultar</button>
              </div>
              <div className="space-y-2">
                {saveWarnings.map((w) => (
                  <div key={w.subId} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-sky-900/10 rounded-xl p-2">
                    <div className="text-sky-200 text-sm">
                      "{w.descripcion}" — UN: {w.unit}{w.metrados ? ` · CANT: ${w.metrados}` : ''}
                      {' '}
                      {w.suggestedApuId ? 'Sugerencia disponible.' : 'Sin sugerencia automática.'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!w.suggestedApuId}
                        onClick={() => fixEmptySubUseSuggestion(w.parentId, w.subId)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold shadow ${w.suggestedApuId ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'bg-sky-800/40 text-sky-300 cursor-not-allowed'}`}
                        data-tour="calc-add-suggested"
                      >
                        Agregar sugerido
                      </button>
                      <button
                        type="button"
                        onClick={() => fixEmptySubOpenPicker(w.parentId, w.subId)}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold shadow bg-slate-700 hover:bg-slate-600 text-white"
                      >
                        Elegir APU…
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vista Presupuesto */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4" data-tour="calc-presupuesto">
            <h3 className="text-base font-semibold text-slate-100 mb-3">Vista Presupuesto</h3>
            <BudgetTable
              chapters={presupuestoChapters}
              rows={presupuestoRows}
              getApuById={getApuById}
              unitCost={unitCostWrapper}
              resources={resources as any}
              fmt={fmtCl}
              onAddSubRow={(rowId)=>{
                const name = (prompt('Nombre de la subpartida:', '') || '').trim();
                if (!name) return; // si no se ingresa nombre, no crear
                const nid = `user_${rowId}_${Date.now()}`;
                setUserSubRows(prev => {
                  const arr = [...(prev[rowId] || [])];
                  arr.push({ id: nid, descripcion: name, unidadSalida: 'u', metrados: 1, apuIds: [] });
                  return { ...prev, [rowId]: arr };
                });
                // No abrir selector automáticamente; el usuario podrá abrirlo al hacer clic en la subpartida
              }}
              onUpdateSubRow={(parentId, subId, patch)=>{
                if (String(subId).startsWith('user_')) {
                  setUserSubRows(prev => {
                    const arr = [...(prev[parentId] || [])];
                    const idx = arr.findIndex(s => s.id === subId);
                    if (idx >= 0) arr[idx] = { ...arr[idx], ...patch } as any;
                    return { ...prev, [parentId]: arr };
                  });
                } else {
                  setSubOverrides(prev => ({ ...prev, [subId]: { ...(prev[subId]||{}), ...patch } }));
                }
              }}
              onRemoveSubRow={(parentId, subId)=>{
                if (String(subId).startsWith('user_')) {
                  setUserSubRows(prev => {
                    const arr = (prev[parentId] || []).filter(s => s.id !== subId);
                    return { ...prev, [parentId]: arr };
                  });
                } else {
                  setHiddenSubIds(prev => ({ ...prev, [subId]: true }));
                }
              }}
              onPickApu={(subId) => { setSelectApuOpen({ open: true, subId }); }}
              onMoveChapter={() => { /* solo un capítulo en esta vista */ }}
              onDelete={() => { /* deshabilitado en calculadora */ }}
              onShowApuDetail={onShowApuDetail}
              onUpdateRow={(rowId, patch) => {
                if (patch && typeof patch.descripcion === 'string') {
                  setRowDescOverrides(prev => ({ ...prev, [rowId]: patch.descripcion }));
                }
              }}
            />
          {/* Modal selector de APU - mismo UI que Presupuesto */}
          <SelectApuModal
            open={selectApuOpen.open}
            onClose={()=> setSelectApuOpen({ open:false, subId:null })}
            onPick={(id:string)=>{
              const sid = selectApuOpen.subId; if(!sid) return;
              // Encontrar si es subpartida manual o derivada
              const parent = presupuestoRows.find(r => (r.subRows||[]).some((s:any)=> s.id===sid));
              if (!parent) { setSelectApuOpen({ open:false, subId:null }); return; }
              // Obtener subpartida actual para conocer APU(s) existentes
              const sub = (parent.subRows||[]).find((s:any)=> s.id===sid);
              const existing = Array.isArray(sub?.apuIds) ? (sub!.apuIds as string[]) : [];
              const next = existing.includes(id) ? existing : [...existing, id];
              if (String(sid).startsWith('user_')) {
                setUserSubRows(prev => {
                  const arr = [...(prev[parent.id] || [])];
                  const idx = arr.findIndex(s => s.id === sid);
                  if (idx >= 0) arr[idx] = { ...arr[idx], apuIds: next, overrideTotal: undefined } as any;
                  return { ...prev, [parent.id]: arr };
                });
              } else {
                setSubOverrides(prev => ({ ...prev, [sid]: { ...(prev[sid]||{}), apuIds: next, overrideTotal: undefined } }));
              }
              setSelectApuOpen({ open:false, subId:null });
            }}
            apus={Array.isArray(apus)? apus : []}
            resources={resources as any}
            apusIndex={apusIndex as any}
            targetUnit={currentSub?.unidadSalida}
            targetQty={Number(currentSub?.metrados || 0)}
            fmt={fmtCl}
            onCreateNew={()=>{
              try{
                const sid = selectApuOpen.subId; if(!sid){ setSelectApuOpen({open:false, subId:null}); return; }
                const parent = presupuestoRows.find(r => (r.subRows||[]).some((s:any)=> s.id===sid));
                const sub = parent ? (parent.subRows||[]).find((s:any)=> s.id===sid) : null;
                const name = String(sub?.descripcion || 'APU sin título');
                const unit = String(sub?.unidadSalida || '');
                if(onCreateApuByName){
                  const maybe = onCreateApuByName(name, unit);
                  const usePromise = (val:any): val is Promise<string> => !!val && typeof val.then==='function';
                  const handle = (newId:string)=>{
                    if(!newId) return;
                    const existing = Array.isArray(sub?.apuIds) ? (sub!.apuIds as string[]) : [];
                    const next = existing.includes(newId) ? existing : [...existing, newId];
                    if (String(sid).startsWith('user_')) {
                      setUserSubRows(prev => {
                        const arr = [...(prev[parent!.id] || [])];
                        const idx = arr.findIndex(s => s.id === sid);
                        if (idx >= 0) arr[idx] = { ...arr[idx], apuIds: next, overrideTotal: undefined } as any;
                        return { ...prev, [parent!.id]: arr };
                      });
                    } else {
                      setSubOverrides(prev => ({ ...prev, [sid]: { ...(prev[sid]||{}), apuIds: next, overrideTotal: undefined } }));
                    }
                    setSelectApuOpen({open:false, subId:null});
                  };
                  if (usePromise(maybe)) (maybe as Promise<string>).then(id=>handle(id)).catch(()=> setSelectApuOpen({open:false, subId:null}));
                  else if (typeof maybe==='string') handle(maybe);
                } else {
                  setSelectApuOpen({open:false, subId:null});
                }
              }catch{ setSelectApuOpen({open:false, subId:null}); }
            }}
          />
          </div>

          {/* Se eliminó la lista de partidas editable bajo la Vista Presupuesto */}
        </div>
      </div>
    </div>
  );
};

export default Calculator;
