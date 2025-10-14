// ====== Tipos principales del sistema APU ======

export interface Resource {
  id: string;
  tipo: 'mano_obra' | 'material' | 'equipo' | 'servicio';
  nombre: string;
  unidad: string;
  precio: number;
}

export interface ApuItemCoef {
  resourceId: string;
  tipo: 'coef';
  coef: number;
  merma?: number;
}

export interface ApuItemRend {
  resourceId: string;
  tipo: 'rendimiento';
  rendimiento: number;
}

// Ítem que referencia otra partida/APU (sub-partida)
// Por defecto usa coeficiente si se especifica; alternativamente puede usar rendimiento.
export interface ApuItemSubApu {
  tipo: 'subapu';
  apuRefId: string;     // ID del APU referenciado
  coef?: number;         // Cantidad de sub-APU por unidad de salida
  rendimiento?: number;  // Unidades de salida por 1 unidad de sub-APU (alternativa)
}

export type ApuItem = ApuItemCoef | ApuItemRend | ApuItemSubApu;

export interface Apu {
  id: string;
  codigo: string;
  descripcion: string;
  unidadSalida: string;
  items: ApuItem[];
}

export interface UnitCostResult {
  unit: number;
  desglose: Array<{
    nombre: string;
    costo: number;
  }>;
}

// ====== Tipos de presupuesto ======

export interface BudgetRow {
  id: string;
  apuId: string;
  metrados: number;
}

export interface Template {
  name: string;
  items: Array<{
    apuId: string;
    metrados: number;
  }>;
}

export interface Templates {
  [key: string]: Template;
}

// ====== Tipos de calculadoras ======

export interface MetradoCalculator {
  cantidad: number;
  
  // m² presets
  preset2D: 'rect' | 'tabique' | 'muro' | 'pintura' | 'piso' | 'cielo' | 'techumbre' | 'muro_curvo' | 'fachada';
  largo: number;
  ancho: number;
  perimetro: number;
  altura: number;
  dobleCara: boolean;
  m2Vanos: number;
  manos: number;
  merma2D: number;
  area: number;
  pendientePct: number;
  radioArco: number;
  anguloDeg: number;
  caras: number;
  andamioPct: number;
  
  // m³ presets
  preset3D: 'generico' | 'radier' | 'losa' | 'zapata' | 'zapata_corrida' | 'columna' | 'viga' | 'zanja' | 'relleno' | 'escalera';
  espesor: number;
  radierPreset: string;
  seccAncho: number;
  seccAlto: number;
  largoElem: number;
  altoElem: number;
  anchoElem: number;
  profElem: number;
  factorCompact: number;
  
  // escalera
  anchoEsc: number;
  espesorEsc: number;
  alzadaEsc: number;
  huellaEsc: number;
  nPelEsc: number;
  descansoEsc: number;
  
  // kg presets
  presetKg: 'generico' | 'barras_rectas' | 'malla' | 'estribos';
  barras: number;
  diametro: number;
  largoBarra: number;
  kgPorMetro: number;
  kgPorM2: number;
  traslapePct: number;
  nEstribos: number;
  anchoInt: number;
  altoInt: number;
  largoGanchos: number;
  
  // m presets
  preset1D: 'generico' | 'tuberia' | 'perimetro' | 'cerchas' | 'cumbrera';
  longBase: number;
  factorLineal: number;
  lados: number;
  largoNave: number;
  pasoCercha: number;
  luzNave: number;
  factorGeom: number;
  largoCumbrera: number;
  tramosCumbrera: number;
}

// ====== Tipos de UI ======

export type NotificationSeverity = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationSeverity;
  ttl?: number;
  createdAt?: number;
  persistent?: boolean;
  // Compatibilidad con implementaciones antiguas
  show?: boolean;
}

export type TabType = 'apu' | 'presupuesto' | 'projects';

export type FilterCategory =
  | 'all'
  | 'topografia'
  | 'excavaciones'
  | 'muros'
  | 'estructuras'
  | 'radier'
  | 'otros';

// ====== Tipos de parámetros financieros ======

export interface FinancialParams {
  gg: number;      // Gastos generales
  util: number;    // Utilidad
  iva: number;     // IVA
}

// ====== Tipos de cálculos de costos ======

export interface CostBreakdown {
  directo: number;
  ggVal: number;
  sub1: number;
  utilVal: number;
  subtotal: number;
  ivaVal: number;
  total: number;
}