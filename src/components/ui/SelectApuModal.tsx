import React from 'react';
import { isApuIncomplete } from '../../utils/match';
import { unitCost } from '../../utils/calculations';

export type SelectApuModalProps = {
  open: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
  apus: any[];
  onCreateNew?: () => void;
  // Ghost costs context (opcional)
  resources?: Record<string, any>;
  apusIndex?: Record<string, any>;
  targetUnit?: string;
  targetQty?: number;
  fmt?: (n: number) => string;
};

export default function SelectApuModal({ open, onClose, onPick, apus, onCreateNew, resources = {}, apusIndex = {}, targetUnit, targetQty, fmt }: SelectApuModalProps) {
  const [term, setTerm] = React.useState('');
  const [hideIncomplete, setHideIncomplete] = React.useState(false);
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const format = React.useMemo(() => fmt || ((n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n || 0))), [fmt]);
  if (!open) return null;
  const list = (apus || [])
    .filter((a) => !term || String(a.descripcion || '').toLowerCase().includes(term.toLowerCase()))
    .filter((a) => {
      if(!hideIncomplete) return true;
      const incomplete = isApuIncomplete(a) || !String(a?.unidadSalida||'').trim();
      return !incomplete;
    });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl mx-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold">Seleccionar APU</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white">×</button>
        </div>
        <div className="p-4 grid gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">Buscar:</span>
            <input value={term} onChange={(e) => setTerm(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm w-full" placeholder="Descripción del APU" />
            <label className="inline-flex items-center gap-2 text-sm text-slate-300 whitespace-nowrap">
              <input type="checkbox" checked={hideIncomplete} onChange={(e)=> setHideIncomplete(e.currentTarget.checked)} />
              Ocultar incompletos
            </label>
          </div>
          {list.length === 0 ? (
            <div className="text-sm text-slate-300">No hay APUs creados para seleccionar. Puedes crear uno nuevo.</div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-700">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-300">
                    <th className="py-2 px-3">Descripción</th>
                    <th className="py-2 px-3 w-28">Cat.</th>
                    <th className="py-2 px-3 w-24">Unidad</th>
                    <th className="py-2 px-3 w-44 text-right">Ghost cost</th>
                    <th className="py-2 px-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a: any) => {
                    const incomplete = isApuIncomplete(a) || !String(a?.unidadSalida||'').trim();
                    let unitGhost: number | null = null;
                    let totalGhost: number | null = null;
                    if (!incomplete) {
                      try {
                        const res = unitCost(a, resources as any, apusIndex as any);
                        unitGhost = Number(res?.unit || 0);
                        if (targetQty && targetQty > 0) {
                          totalGhost = unitGhost * Number(targetQty || 0);
                        }
                      } catch {}
                    }
                    return (
                      <tr key={a.id} className="border-t border-slate-800 hover:bg-slate-800/60"
                        onMouseEnter={()=> setHoverId(a.id)} onMouseLeave={()=> setHoverId(null)}>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{a.descripcion}</span>
                            {incomplete && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-300 text-[10px]"
                                title="Este APU no tiene costo calculable o le falta unidad/secciones"
                                aria-label="APU incompleto"
                              >
                                incompleto
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3">{a.categoria || ''}</td>
                        <td className="py-2 px-3">{a.unidadSalida}</td>
                        <td className="py-2 px-3 text-right align-middle">
                          {(hoverId === a.id && !incomplete && unitGhost !== null) ? (
                            <div className="inline-flex flex-col items-end gap-0.5 text-xs text-slate-200">
                              <div className="inline-flex items-center gap-1">
                                <span className="text-slate-400">unit:</span>
                                <span className="font-semibold">{format(unitGhost)}</span>
                              </div>
                              {typeof targetQty==='number' && targetQty>0 && (
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-slate-400">total × {targetQty}:</span>
                                  <span className="font-semibold text-emerald-300">{format(totalGhost || 0)}</span>
                                </div>
                              )}
                              {targetUnit && a.unidadSalida && String(targetUnit).toLowerCase() !== String(a.unidadSalida).toLowerCase() && (
                                <div className="text-[10px] text-amber-300">Unidad distinta: {a.unidadSalida} → {targetUnit}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button onClick={() => onPick(a.id)} className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-700/30 text-xs">Seleccionar</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end gap-2">
            {onCreateNew && (
              <button onClick={onCreateNew} className="px-3 py-2 rounded-xl border border-slate-600 hover:bg-slate-700/40 text-sm">+ Crear nuevo APU</button>
            )}
            <button onClick={onClose} className="px-3 py-2 rounded-xl border border-slate-600 text-sm">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
