import { useState, useCallback } from 'react';
import type { MetradoCalculator } from '../types';
import { clamp0, slopeFactor, rebarKgPerM } from '../utils/formatters';

const numericFields: Array<keyof MetradoCalculator> = [
  'cantidad',
  'largo',
  'ancho',
  'perimetro',
  'altura',
  'm2Vanos',
  'manos',
  'merma2D',
  'area',
  'pendientePct',
  'radioArco',
  'anguloDeg',
  'caras',
  'andamioPct',
  'espesor',
  'seccAncho',
  'seccAlto',
  'largoElem',
  'altoElem',
  'anchoElem',
  'profElem',
  'factorCompact',
  'anchoEsc',
  'espesorEsc',
  'alzadaEsc',
  'huellaEsc',
  'nPelEsc',
  'descansoEsc',
  'barras',
  'diametro',
  'largoBarra',
  'kgPorMetro',
  'kgPorM2',
  'traslapePct',
  'nEstribos',
  'anchoInt',
  'altoInt',
  'largoGanchos',
  'longBase',
  'factorLineal',
  'lados',
  'largoNave',
  'pasoCercha',
  'luzNave',
  'factorGeom',
  'largoCumbrera',
  'tramosCumbrera',
];

const numericFieldSet = new Set<keyof MetradoCalculator>(numericFields);
const booleanFieldSet = new Set<keyof MetradoCalculator>(['dobleCara']);

const coerceNumber = (value: unknown): number => {
  const num = typeof value === 'string' ? Number(value) : Number(value);
  return Number.isFinite(num) ? num : 0;
};

const sanitizeCalcUpdates = (updates: Partial<MetradoCalculator>): Partial<MetradoCalculator> => {
  const sanitized: Partial<MetradoCalculator> = {};
  const target = sanitized as Record<keyof MetradoCalculator, MetradoCalculator[keyof MetradoCalculator]>;
  (Object.entries(updates) as Array<[keyof MetradoCalculator, unknown]>).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (numericFieldSet.has(key)) {
      target[key] = coerceNumber(value);
    } else if (booleanFieldSet.has(key)) {
      target[key] = Boolean(value);
    } else {
      target[key] = value as MetradoCalculator[keyof MetradoCalculator];
    }
  });
  return sanitized;
};

const createInitialCalc = (): MetradoCalculator => ({
  cantidad: 1,
  // m2 presets
  preset2D: 'rect',
  largo: 0,
  ancho: 0,
  perimetro: 0,
  altura: 0,
  dobleCara: false,
  m2Vanos: 0,
  manos: 2,
  merma2D: 0.05,
  area: 0,
  pendientePct: 0,
  radioArco: 1,
  anguloDeg: 90,
  caras: 1,
  andamioPct: 0.1,
  // m3 presets
  preset3D: 'generico',
  espesor: 0.1,
  radierPreset: '10',
  seccAncho: 0.3,
  seccAlto: 0.3,
  largoElem: 1,
  altoElem: 0.5,
  anchoElem: 0.5,
  profElem: 0.5,
  factorCompact: 1.1,
  // escalera
  anchoEsc: 1,
  espesorEsc: 0.15,
  alzadaEsc: 0.17,
  huellaEsc: 0.28,
  nPelEsc: 15,
  descansoEsc: 0,
  // kg presets
  presetKg: 'generico',
  barras: 1,
  diametro: 10,
  largoBarra: 1,
  kgPorMetro: rebarKgPerM['10'],
  kgPorM2: 2.5,
  traslapePct: 0.15,
  nEstribos: 10,
  anchoInt: 0.25,
  altoInt: 0.35,
  largoGanchos: 0.15,
  // m presets
  preset1D: 'generico',
  longBase: 1,
  factorLineal: 1.05,
  lados: 4,
  largoNave: 12,
  pasoCercha: 0.6,
  luzNave: 8,
  factorGeom: 1.3,
  largoCumbrera: 10,
  tramosCumbrera: 1,
});

// ====== Hook para calculadoras de metrado ======

export function useMetradoCalculator() {
  const [calc, setCalc] = useState<MetradoCalculator>(() => createInitialCalc());

  const updateCalc = useCallback((updates: Partial<MetradoCalculator>) => {
    if (!updates || Object.keys(updates).length === 0) {
      return;
    }
    const sanitized = sanitizeCalcUpdates(updates);
    if (Object.keys(sanitized).length === 0) {
      return;
    }
    setCalc((prev) => ({ ...prev, ...sanitized }));
  }, []);

  const resetCalc = useCallback(() => {
    setCalc(createInitialCalc());
  }, []);

  const calcMetrado = useCallback((unitKey: string): number => {
    const c = Number(calc.cantidad) || 0;
    
    if (unitKey === 'm2') {
      switch (calc.preset2D) {
        case 'tabique': {
          const per = Number(calc.perimetro) || 0;
          const alt = Number(calc.altura) || 0;
          const van = Number(calc.m2Vanos) || 0;
          let area = c * per * alt;
          if (calc.dobleCara) area *= 2;
          area -= van;
          return clamp0(area);
        }
        case 'muro': {
          const largo = Number(calc.largo) || 0;
          const alt = Number(calc.altura) || 0;
          const van = Number(calc.m2Vanos) || 0;
          const caras = calc.dobleCara ? 2 : 1;
          return clamp0(c * largo * alt * caras - van);
        }
        case 'muro_curvo': {
          const R = Number(calc.radioArco) || 0;
          const ang = Number(calc.anguloDeg) || 0;
          const alt = Number(calc.altura) || 0;
          const van = Number(calc.m2Vanos) || 0;
          const caras = Number(calc.caras) || 1;
          const arco = (2 * Math.PI * R) * (ang / 360);
          return clamp0(c * arco * alt * Math.max(1, caras) - van);
        }
        case 'fachada': {
          const peri = Number(calc.perimetro) || 0;
          const alt = Number(calc.altura) || 0;
          const van = Number(calc.m2Vanos) || 0;
          const caras = Math.max(1, Number(calc.caras) || 1);
          const fAnd = 1 + (Number(calc.andamioPct) || 0);
          return clamp0((c * peri * alt * caras - van) * fAnd);
        }
        case 'pintura': {
          const areaBase = Number(calc.area) || (Number(calc.largo) || 0) * (Number(calc.altura) || 0);
          const manos = Number(calc.manos) || 1;
          const merma = 1 + (Number(calc.merma2D) || 0);
          return clamp0(c * areaBase * manos * merma);
        }
        case 'piso': {
          const areaBase = (Number(calc.largo) || 0) * (Number(calc.ancho) || 0);
          const merma = 1 + (Number(calc.merma2D) || 0);
          return clamp0(c * areaBase * merma);
        }
        case 'cielo': {
          const areaBase = Number(calc.area) || (Number(calc.largo) || 0) * (Number(calc.ancho) || 0);
          const van = Number(calc.m2Vanos) || 0;
          return clamp0(c * areaBase - van);
        }
        case 'techumbre': {
          const areaH = (Number(calc.largo) || 0) * (Number(calc.ancho) || 0);
          const f = slopeFactor(Number(calc.pendientePct) || 0);
          const merma = 1 + (Number(calc.merma2D) || 0);
          return clamp0(c * areaH * f * merma);
        }
        default: // 'rect'
          return clamp0(c * (Number(calc.largo) || 0) * (Number(calc.ancho) || 0));
      }
    }
    
    if (unitKey === 'm3') {
      switch (calc.preset3D) {
        case 'losa': {
          const area = Number(calc.area) || 0;
          const e = Number(calc.espesor) || 0;
          return clamp0(c * area * e);
        }
        case 'radier': {
          const L = Number(calc.largo) || 0;
          const A = Number(calc.ancho) || 0;
          const E = Number(calc.espesor) || 0;
          return clamp0(c * L * A * E);
        }
        case 'zapata': {
          const L = Number(calc.largoElem) || 0;
          const A = Number(calc.anchoElem) || 0;
          const H = Number(calc.altoElem) || 0;
          return clamp0(c * L * A * H);
        }
        case 'zapata_corrida': {
          const long = Number(calc.largoElem) || 0;
          const A = Number(calc.anchoElem) || 0;
          const H = Number(calc.altoElem) || 0;
          return clamp0(c * long * A * H);
        }
        case 'columna': {
          const b = Number(calc.seccAncho) || 0;
          const h = Number(calc.seccAlto) || 0;
          const alt = Number(calc.altoElem) || 0;
          return clamp0(c * b * h * alt);
        }
        case 'viga': {
          const b = Number(calc.seccAncho) || 0;
          const h = Number(calc.seccAlto) || 0;
          const L = Number(calc.largoElem) || 0;
          return clamp0(c * b * h * L);
        }
        case 'zanja': {
          const L = Number(calc.largoElem) || 0;
          const A = Number(calc.anchoElem) || 0;
          const P = Number(calc.profElem) || 0;
          return clamp0(c * L * A * P);
        }
        case 'relleno': {
          const area = Number(calc.area) || (Number(calc.largo) || 0) * (Number(calc.ancho) || 0);
          const e = Number(calc.espesor) || 0;
          const f = Number(calc.factorCompact) || 1;
          return clamp0(c * area * e * f);
        }
        case 'escalera': {
          const w = Number(calc.anchoEsc) || 0;
          const t = Number(calc.espesorEsc) || 0;
          const a = Number(calc.alzadaEsc) || 0;
          const h = Number(calc.huellaEsc) || 0;
          const n = Math.max(0, Math.floor(Number(calc.nPelEsc) || 0));
          const descanso = Number(calc.descansoEsc) || 0;
          const run = h * n;
          const rise = a * n;
          const Ls = Math.hypot(run, rise);
          const vol = w * t * Ls + w * t * descanso;
          return clamp0(c * vol);
        }
        default: // 'generico'
          return clamp0(c * (Number(calc.largo) || 0) * (Number(calc.ancho) || 0) * (Number(calc.espesor) || 0));
      }
    }
    
    if (unitKey === 'kg') {
      switch (calc.presetKg) {
        case 'malla': {
          const area = Number(calc.area) || (Number(calc.largo) || 0) * (Number(calc.ancho) || 0);
          const kg = area * (Number(calc.kgPorM2) || 0);
          const traslape = 1 + (Number(calc.traslapePct) || 0);
          return clamp0(c * kg * traslape);
        }
        case 'estribos': {
          const nEst = Number(calc.nEstribos) || 0;
          const ancho = Number(calc.anchoInt) || 0;
          const alto = Number(calc.altoInt) || 0;
          const ganchos = Number(calc.largoGanchos) || 0;
          const perimetroEstribo = 2 * (ancho + alto);
          const largoTotal = (perimetroEstribo + ganchos) * nEst;
          return clamp0(c * largoTotal * (Number(calc.kgPorMetro) || 0));
        }
        default: // 'generico' | 'barras_rectas'
          return clamp0(c * (Number(calc.barras) || 0) * (Number(calc.largoBarra) || 0) * (Number(calc.kgPorMetro) || 0));
      }
    }
    
    if (unitKey === 'm') {
      switch (calc.preset1D) {
        case 'tuberia': {
          const base = Number(calc.longBase) || 0;
          const f = Number(calc.factorLineal) || 1;
          return clamp0(c * base * f);
        }
        case 'perimetro': {
          const lados = Math.max(1, Math.floor(Number(calc.lados) || 0));
          const L = Number(calc.largo) || 0;
          const A = Number(calc.ancho) || 0;
          const peri = lados === 4 ? 2 * (L + A) : (lados === 3 ? L + A + Math.hypot(L, A) : Math.max(1, lados) * L);
          return clamp0(c * peri);
        }
        case 'cerchas': {
          const ln = Number(calc.largoNave) || 0;
          const paso = Math.max(0.1, Number(calc.pasoCercha) || 0.6);
          const luz = Number(calc.luzNave) || 0;
          const fg = Math.max(1, Number(calc.factorGeom) || 1);
          const n = Math.floor(ln / paso) + 1;
          return clamp0(c * n * luz * fg);
        }
        case 'cumbrera': {
          const Lc = Number(calc.largoCumbrera) || 0;
          const tr = Math.max(1, Math.floor(Number(calc.tramosCumbrera) || 1));
          return clamp0(c * Lc * tr);
        }
        default: // generico
          return clamp0(c * (Number(calc.largo) || 0));
      }
    }
    
    // gl u otros
    return clamp0(c || 0);
  }, [calc]);

  return {
    calc,
    updateCalc,
    resetCalc,
    calcMetrado,
  };
}
