import type { Apu, Resource, UnitCostResult, CostBreakdown, FinancialParams } from '../types';

// ====== Cálculo de costos unitarios ======

// Cálculo unitario con soporte para sub-APU
// - apusIndex: índice para resolver referencias de sub-APU
// - memo: cacheo de costos por APU para evitar recomputaciones
// - stack: conjunto para prevenir ciclos (referencias circulares)
export function unitCost(
  apu: Apu | any,
  resources: Record<string, Resource>,
  apusIndex?: Record<string, Apu | any>,
  memo: Map<string, UnitCostResult> = new Map(),
  stack: Set<string> = new Set()
): UnitCostResult {
  // Memoization por id
  if (apu && typeof apu.id === 'string' && memo.has(apu.id)) return memo.get(apu.id)!;
  // Prevención de ciclos
  if (apu && typeof apu.id === 'string' && stack.has(apu.id)) {
    // Ciclo detectado: retornamos costo 0 para evitar bucle
    return { unit: 0, desglose: [{ nombre: `Ciclo en ${apu.id}`, costo: 0 }] };
  }
  if (apu && typeof apu.id === 'string') stack.add(apu.id);

  let total = 0;
  const desglose: Array<{ nombre: string; costo: number }> = [];

  const apuAny = apu as any;

  // Preferir secciones si existen filas (evita que 'items' legacy reemplace lo editado en secciones)
  const hasRowsInSections = (() => {
    try{
      const s = apuAny?.secciones || {};
      const known = ['materiales','equipos','manoObra','varios'];
      const hasABCD = known.some((k)=> Array.isArray(s?.[k]) && s[k].length>0);
      const hasExtras = Array.isArray(s?.extras) && s.extras.some((ex:any)=> Array.isArray(ex?.rows) && ex.rows.length>0);
      const hasUnknown = Object.keys(s||{}).some(k=> {
        if(known.includes(k) || k==='extras' || k==='__meta' || k==='__titles') return false;
        const v:any = (s as any)[k];
        if(Array.isArray(v)) return v.length>0;
        if(v && Array.isArray(v.rows)) return v.rows.length>0;
        return false;
      });
      return !!(hasABCD || hasExtras || hasUnknown);
    }catch{return false;}
  })();

  // Ruta A: APUs con secciones (materiales/equipos/manoObra/varios/extras)
  if (hasRowsInSections) {
    const accRows = (arr: any) => (Array.isArray(arr) ? arr : []) as Array<{ descripcion?: string; unidad?: string; cantidad?: number; pu?: number }>;
    const secs = apuAny.secciones || {};
    const known = ['materiales','equipos','manoObra','varios'];
    const allRows: Array<{ descripcion?: string; cantidad?: number; pu?: number }> = [
      ...accRows(secs.materiales),
      ...accRows(secs.equipos),
      ...accRows(secs.manoObra),
      ...accRows(secs.varios),
    ];
    if (Array.isArray(secs.extras)) {
      for (const ex of secs.extras) {
        allRows.push(...accRows(ex?.rows));
      }
    }
    // Incluir secciones heredadas como claves adicionales (no estándar)
    for (const k of Object.keys(secs||{})){
      if(known.includes(k) || k==='extras' || k==='__meta' || k==='__titles') continue;
      const v:any = (secs as any)[k];
      if(Array.isArray(v)) allRows.push(...accRows(v));
      else if(v && Array.isArray(v.rows)) allRows.push(...accRows(v.rows));
    }
    for (const r of allRows) {
      const qty = Number(r?.cantidad || 0);
      const pu = Number(r?.pu || 0);
      const costo = qty * pu;
      if (costo > 0) {
        desglose.push({ nombre: String(r?.descripcion || 'Item'), costo });
        total += costo;
      }
    }

  // Ruta B: APUs clásicos con items (coef/rendimiento/subapu)
  } else if (Array.isArray(apuAny?.items)) {
    for (const it of apuAny.items as any[]) {
      // Caso recurso directo (coef o rendimiento)
      if (it.tipo === 'coef' || it.tipo === 'rendimiento') {
        const r = resources[it.resourceId as string];
        if (!r) continue;
        let costo = 0;
        if (it.tipo === 'coef') {
          const merma = 1 + (it.merma ?? 0);
          costo = (it.coef ?? 0) * r.precio * merma;
        } else {
          // costo por 1 unidad de salida = tarifa / rendimiento
          costo = r.precio / (it.rendimiento || 1);
        }
        desglose.push({ nombre: r.nombre, costo });
        total += costo;
        continue;
      }

      // Caso sub-APU compuesto
      if (it.tipo === 'subapu') {
        const subId = it.apuRefId as string;
        const sub = apusIndex?.[subId];
        if (!sub) {
          // Si no existe el APU referenciado, lo ignoramos
          continue;
        }
        const subRes = unitCost(sub, resources, apusIndex, memo, stack);
        // Dos formas de consumo: por coeficiente o por rendimiento
        const coef = it.coef ?? (it.rendimiento ? 1 / (it.rendimiento as number) : 1);
        const costo = coef * subRes.unit;
        desglose.push({ nombre: `SubAPU ${subId}`, costo });
        total += costo;
        continue;
      }
    }
  }

  const result = { unit: total, desglose };
  if (apu && typeof apu.id === 'string') {
    memo.set(apu.id, result);
    stack.delete(apu.id);
  }
  return result;
}

// Costo unitario desglosado por secciones principales del APU
// Devuelve costos por unidad de salida del APU para: materiales, manoObra, equipos y varios
export function unitCostBySection(
  apu: Apu | any,
  resources: Record<string, Resource>,
  apusIndex?: Record<string, Apu | any>,
  memo: Map<string, { materiales:number; manoObra:number; equipos:number; varios:number }> = new Map(),
  stack: Set<string> = new Set()
): { materiales:number; manoObra:number; equipos:number; varios:number } {
  const empty = { materiales:0, manoObra:0, equipos:0, varios:0 } as const;
  if(!apu) return { ...empty };
  const id = (apu as any).id;
  if (typeof id === 'string' && memo.has(id)) return memo.get(id)!;
  if (typeof id === 'string' && stack.has(id)) return { ...empty };
  if (typeof id === 'string') stack.add(id);

  const out = { materiales:0, manoObra:0, equipos:0, varios:0 };
  const anyApu = apu as any;

  const hasRowsInSections = (() => {
    try{
      const s = anyApu?.secciones || {};
      const known = ['materiales','equipos','manoObra','varios'];
      const hasABCD = known.some((k)=> Array.isArray(s?.[k]) && s[k].length>0);
      const hasExtras = Array.isArray(s?.extras) && s.extras.some((ex:any)=> Array.isArray(ex?.rows) && ex.rows.length>0);
      const hasUnknown = Object.keys(s||{}).some(k=> {
        if(known.includes(k) || k==='extras' || k==='__meta' || k==='__titles') return false;
        const v:any = (s as any)[k];
        if(Array.isArray(v)) return v.length>0;
        if(v && Array.isArray(v.rows)) return v.rows.length>0;
        return false;
      });
      return !!(hasABCD || hasExtras || hasUnknown);
    }catch{return false;}
  })();

  if (hasRowsInSections) {
    const accRows = (arr: any) => (Array.isArray(arr) ? arr : []) as Array<{ descripcion?: string; unidad?: string; cantidad?: number; pu?: number }>;
    const secs = anyApu.secciones || {};
    for(const r of accRows(secs.materiales)) out.materiales += Number(r?.cantidad||0) * Number(r?.pu||0);
    for(const r of accRows(secs.manoObra))  out.manoObra  += Number(r?.cantidad||0) * Number(r?.pu||0);
    for(const r of accRows(secs.equipos))   out.equipos   += Number(r?.cantidad||0) * Number(r?.pu||0);
    for(const r of accRows(secs.varios))    out.varios    += Number(r?.cantidad||0) * Number(r?.pu||0);
    // extras y secciones heredadas suman a 'varios'
    if (Array.isArray(secs.extras)) for(const ex of secs.extras) for(const r of accRows(ex?.rows)) out.varios += Number(r?.cantidad||0) * Number(r?.pu||0);
    const known = ['materiales','equipos','manoObra','varios'];
    for(const k of Object.keys(secs||{})){
      if(known.includes(k) || k==='extras' || k==='__meta' || k==='__titles') continue;
      const v:any = secs[k];
      if(Array.isArray(v)) for(const r of v) out.varios += Number(r?.cantidad||0) * Number(r?.pu||0);
      else if(v && Array.isArray(v.rows)) for(const r of v.rows) out.varios += Number(r?.cantidad||0) * Number(r?.pu||0);
    }
  } else if (Array.isArray(anyApu?.items)) {
    for (const it of anyApu.items as any[]) {
      if (it.tipo === 'coef' || it.tipo === 'rendimiento') {
        const r = resources[it.resourceId as string];
        if (!r) continue;
        let costo = 0;
        if (it.tipo === 'coef') {
          const merma = 1 + (it.merma ?? 0);
          costo = (it.coef ?? 0) * r.precio * merma;
        } else {
          costo = r.precio / (it.rendimiento || 1);
        }
        const tipo = r.tipo;
        if (tipo === 'material') out.materiales += costo;
        else if (tipo === 'mano_obra') out.manoObra += costo;
        else if (tipo === 'equipo') out.equipos += costo;
        else out.varios += costo;
        continue;
      }
      if (it.tipo === 'subapu') {
        const subId = it.apuRefId as string;
        const sub = apusIndex?.[subId];
        if (!sub) continue;
        const coef = it.coef ?? (it.rendimiento ? 1 / (it.rendimiento as number) : 1);
        const subB = unitCostBySection(sub, resources, apusIndex, memo, stack);
        out.materiales += coef * subB.materiales;
        out.manoObra  += coef * subB.manoObra;
        out.equipos   += coef * subB.equipos;
        out.varios    += coef * subB.varios;
      }
    }
  }

  if (typeof id === 'string') { memo.set(id, out); stack.delete(id); }
  return out;
}

// ====== Cálculo de breakdown de costos ======

export function calculateCostBreakdown(
  directCost: number,
  params: FinancialParams
): CostBreakdown {
  const directo = directCost;
  const ggVal = directo * params.gg;
  const sub1 = directo + ggVal;
  const utilVal = sub1 * params.util;
  const subtotal = sub1 + utilVal;
  const ivaVal = subtotal * params.iva;
  const total = subtotal + ivaVal;

  return {
    directo,
    ggVal,
    sub1,
    utilVal,
    subtotal,
    ivaVal,
    total
  };
}

// ====== Cálculo de totales de presupuesto ======

export function calculateBudgetTotals(
  rows: Array<{ apuId: string; metrados: number }>,
  apus: Apu[],
  resources: Record<string, Resource>,
  params: FinancialParams
) {
  // Índice de APUs para cálculos recursivos
  const apusIndex: Record<string, Apu> = Object.fromEntries(apus.map(a => [a.id, a]));
  const sumDirecto = rows.reduce((acc, r) => {
    const a = apus.find(x => x.id === r.apuId);
    if (!a) return acc;
    const uc = unitCost(a, resources, apusIndex).unit;
    return acc + uc * r.metrados;
  }, 0);

  const breakdown = calculateCostBreakdown(sumDirecto, params);
  
  return {
    sumDirecto,
    bGG: breakdown.ggVal,
    bSub1: breakdown.sub1,
    bUtil: breakdown.utilVal,
    bSubtotal: breakdown.subtotal,
    bIVA: breakdown.ivaVal,
    bTotal: breakdown.total
  };
}