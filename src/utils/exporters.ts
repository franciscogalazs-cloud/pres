import type { Apu, Resource, BudgetRow } from '../types';
import { unitCost } from './calculations';
import { fmt } from './formatters';

// ====== Exportación a CSV ======

export function exportBudgetToCSV(
  rows: BudgetRow[],
  apus: Apu[],
  resources: Record<string, Resource>,
  totals: {
    sumDirecto: number;
    bGG: number;
    bUtil: number;
    bIVA: number;
    bTotal: number;
  },
  params: { gg: number; util: number; iva: number }
): void {
  const apusIndex: Record<string, Apu> = Object.fromEntries(apus.map(a => [a.id, a]));
  const headers = ['Código', 'Descripción', 'Unidad', 'Metrado', 'Unit. Directo', 'Total Directo'];
  const csvData = rows.map(r => {
    const a = apus.find(x => x.id === r.apuId);
    if (!a) return [];
    const uc = unitCost(a, resources, apusIndex).unit;
    const dir = uc * r.metrados;
    return [a.codigo, a.descripcion, a.unidadSalida, r.metrados, uc, dir];
  });
  
  const csvContent = [
    headers.join(','),
    ...csvData.map(row => row.map(cell => `"${cell}"`).join(',')),
    '',
    `"Total Directo","","","",,"${totals.sumDirecto}"`,
    `"Gastos Generales (${(params.gg * 100).toFixed(1)}%)","","","",,"${totals.bGG}"`,
    `"Utilidad (${(params.util * 100).toFixed(1)}%)","","","",,"${totals.bUtil}"`,
    `"IVA (${(params.iva * 100).toFixed(1)}%)","","","",,"${totals.bIVA}"`,
    `"TOTAL PRESUPUESTO","","","",,"${totals.bTotal}"`
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'presupuesto_apu.csv';
  link.click();
}

// ====== Exportación de APU a texto ======

export function exportAPUToText(
  apu: Apu,
  resources: Record<string, Resource>,
  metrados: number,
  costBreakdown: {
    directo: number;
    ggVal: number;
    utilVal: number;
    ivaVal: number;
    total: number;
  },
  params: { gg: number; util: number; iva: number },
  allApus?: Apu[]
): void {
  const apusIndex: Record<string, Apu> = allApus && allApus.length
    ? Object.fromEntries(allApus.map(a => [a.id, a]))
    : { [apu.id]: apu };
  const u = unitCost(apu, resources, apusIndex);
  
  const apuData = [
    `APU: ${apu.codigo} - ${apu.descripcion}`,
    `Unidad: ${apu.unidadSalida}`,
    `Metrado: ${metrados} ${apu.unidadSalida}`,
    '',
    'ANÁLISIS DE PRECIOS UNITARIOS:',
    ''.padEnd(50, '-'),
    ...apu.items.map(it => {
      if (it.tipo === 'coef' || it.tipo === 'rendimiento') {
        const r = resources[it.resourceId];
        if (!r) return '';
        const costoUnit = it.tipo === 'coef'
          ? (it.coef ?? 0) * r.precio * (1 + (it.merma ?? 0))
          : r.precio / (it.rendimiento || 1);
        return `${r.nombre.padEnd(30)} ${fmt(costoUnit).padStart(15)}`;
      }
      // Para sub-APU, mostramos una fila resumida
      if ((it as any).tipo === 'subapu') {
        const refId = (it as any).apuRefId as string;
        return `SubAPU ${refId}`.padEnd(30) + ' ' + fmt(0).padStart(15);
      }
      return '';
    }),
    ''.padEnd(50, '-'),
    `PRECIO UNITARIO DIRECTO:${fmt(u.unit).padStart(20)}`,
    '',
    `GASTOS GENERALES (${(params.gg * 100).toFixed(1)}%):${fmt(costBreakdown.ggVal).padStart(18)}`,
    `UTILIDAD (${(params.util * 100).toFixed(1)}%):${fmt(costBreakdown.utilVal).padStart(28)}`,
    `IVA (${(params.iva * 100).toFixed(1)}%):${fmt(costBreakdown.ivaVal).padStart(35)}`,
    ''.padEnd(50, '='),
    `PRECIO TOTAL:${fmt(costBreakdown.total).padStart(32)}`
  ].join('\n');

  const blob = new Blob([apuData], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `apu_${apu.codigo.replace('-', '_')}.txt`;
  link.click();
}

// ====== Impresión de APU ======

export function printAPU(
  apu: Apu,
  resources: Record<string, Resource>,
  metrados: number,
  costBreakdown: {
    directo: number;
    ggVal: number;
    utilVal: number;
    ivaVal: number;
    total: number;
  },
  params: { gg: number; util: number; iva: number },
  allApus?: Apu[]
): void {
  const apusIndex: Record<string, Apu> = allApus && allApus.length
    ? Object.fromEntries(allApus.map(a => [a.id, a]))
    : { [apu.id]: apu };
  const u = unitCost(apu, resources, apusIndex);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const printContent = `
    <html>
      <head>
        <title>APU ${apu.codigo}</title>
        <style>
          body { font-family: monospace; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .table { width: 100%; border-collapse: collapse; }
          .table th, .table td { border: 1px solid #333; padding: 8px; text-align: left; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>ANÁLISIS DE PRECIO UNITARIO</h2>
          <h3>${apu.codigo} - ${apu.descripcion}</h3>
          <p>Unidad: ${apu.unidadSalida} | Metrado: ${metrados}</p>
        </div>
        <table class="table">
          <thead>
            <tr><th>Recurso</th><th>Tipo</th><th>Coef/Rend</th><th>Merma</th><th>Precio</th><th>Costo Unit.</th></tr>
          </thead>
          <tbody>
            ${apu.items.map(it => {
              if (it.tipo === 'coef' || it.tipo === 'rendimiento') {
                const r = resources[it.resourceId];
                if (!r) return '';
                const costoUnit = it.tipo === 'coef'
                  ? (it.coef ?? 0) * r.precio * (1 + (it.merma ?? 0))
                  : r.precio / (it.rendimiento || 1);
                return `<tr>
                  <td>${r.nombre}</td>
                  <td>${it.tipo}</td>
                  <td>${it.tipo === 'coef' ? it.coef : it.rendimiento}</td>
                  <td>${it.tipo === 'coef' ? (it.merma ?? 0) : '-'}</td>
                  <td>${fmt(r.precio)}</td>
                  <td>${fmt(costoUnit)}</td>
                </tr>`;
              }
              const sub = (it as any);
              if (sub.tipo === 'subapu') {
                const refId = sub.apuRefId as string;
                return `<tr>
                  <td>SubAPU ${refId}</td>
                  <td>subapu</td>
                  <td>${sub.coef ?? (sub.rendimiento ? `1/${sub.rendimiento}` : 1)}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                </tr>`;
              }
              return '';
            }).join('')}
            <tr class="total">
              <td colspan="5">PRECIO UNITARIO DIRECTO</td>
              <td>${fmt(u.unit)}</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top: 20px;">
          <p>Gastos Generales (${(params.gg * 100).toFixed(1)}%): ${fmt(costBreakdown.ggVal)}</p>
          <p>Utilidad (${(params.util * 100).toFixed(1)}%): ${fmt(costBreakdown.utilVal)}</p>
          <p>IVA (${(params.iva * 100).toFixed(1)}%): ${fmt(costBreakdown.ivaVal)}</p>
          <p class="total">TOTAL: ${fmt(costBreakdown.total)}</p>
        </div>
      </body>
    </html>
  `;
  
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.print();
}