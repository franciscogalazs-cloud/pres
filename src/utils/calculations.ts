import type { Apu, Resource, UnitCostResult, CostBreakdown, FinancialParams } from '../types';

// ====== Cálculo de costos unitarios ======

// Cálculo unitario con soporte para sub-APU
// - apusIndex: índice para resolver referencias de sub-APU
// - memo: cacheo de costos por APU para evitar recomputaciones
// - stack: conjunto para prevenir ciclos (referencias circulares)
export function unitCost(
  apu: Apu,
  resources: Record<string, Resource>,
  apusIndex?: Record<string, Apu>,
  memo: Map<string, UnitCostResult> = new Map(),
  stack: Set<string> = new Set()
): UnitCostResult {
  // Memoization por id
  if (memo.has(apu.id)) return memo.get(apu.id)!;
  // Prevención de ciclos
  if (stack.has(apu.id)) {
    // Ciclo detectado: retornamos costo 0 para evitar bucle
    return { unit: 0, desglose: [{ nombre: `Ciclo en ${apu.codigo}`, costo: 0 }] };
  }
  stack.add(apu.id);

  let total = 0;
  const desglose: Array<{ nombre: string; costo: number }> = [];

  for (const it of apu.items as any[]) {
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
      // - coef: cantidad de sub-APU por 1 unidad de salida
      // - rendimiento: unidades de salida por 1 unidad de sub-APU
      const coef = it.coef ?? (it.rendimiento ? 1 / (it.rendimiento as number) : 1);
      const costo = coef * subRes.unit;
      desglose.push({ nombre: `SubAPU ${sub.codigo}`, costo });
      total += costo;
      continue;
    }
  }

  const result = { unit: total, desglose };
  memo.set(apu.id, result);
  stack.delete(apu.id);
  return result;
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