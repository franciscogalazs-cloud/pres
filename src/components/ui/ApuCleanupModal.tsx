import React from 'react';
import { groupSimilarApus, isApuIncomplete } from '../../utils/match';

type Apu = { id: string; descripcion: string; unidadSalida?: string; secciones?: any; items?: any[] };

export type ApuCleanupModalProps = {
  open: boolean;
  apus: Apu[];
  onClose: () => void;
  onMerge: (targetId: string, duplicateIds: string[], removeDuplicates: boolean) => void;
  onEdit: (id: string) => void;
};

const badge = 'inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold';

export default function ApuCleanupModal({ open, apus, onClose, onMerge, onEdit }: ApuCleanupModalProps){
  const [removeDup, setRemoveDup] = React.useState(true);
  const incompletos = React.useMemo(()=> apus.filter(a => isApuIncomplete(a)), [apus]);
  const similares = React.useMemo(()=> groupSimilarApus(apus, { threshold: 0.44, sameUnit: true }), [apus]);
  const [selectedTargets, setSelectedTargets] = React.useState<Record<string, string>>({});

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white text-slate-800 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Limpieza de Biblioteca APU</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">×</button>
        </header>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">APUs incompletos</h3>
              <span className={badge}>{incompletos.length}</span>
            </div>
            {incompletos.length === 0 ? (
              <p className="text-sm text-slate-500">No se detectaron APUs incompletos.</p>
            ) : (
              <ul className="space-y-2">
                {incompletos.map(a => (
                  <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{a.descripcion}</div>
                      <div className="text-xs text-slate-500">ID: {a.id} · Unidad: {(a.unidadSalida||'').toUpperCase()}</div>
                    </div>
                    <button onClick={()=> onEdit(a.id)} className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50">Completar ahora</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Posibles duplicados (por trigramas y misma unidad)</h3>
              <span className={badge}>{similares.length}</span>
            </div>
            {similares.length === 0 ? (
              <p className="text-sm text-slate-500">No se encontraron grupos de posibles duplicados.</p>
            ) : (
              <div className="space-y-4">
                {similares.map(g => {
                  const candidates = g.ids.map(id => apus.find(a => a.id === id)).filter(Boolean) as Apu[];
                  const target = selectedTargets[g.key] || candidates[0]?.id || g.key;
                  return (
                    <div key={g.key} className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 text-xs text-slate-500">Unidad: {(g.unit||'').toUpperCase()}</div>
                      <ul className="space-y-1">
                        {candidates.map(c => (
                          <li key={c.id} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`target_${g.key}`}
                              className="h-4 w-4"
                              checked={target === c.id}
                              onChange={()=> setSelectedTargets(prev => ({ ...prev, [g.key]: c.id }))}
                            />
                            <div className="truncate">
                              <span className="font-medium">{c.descripcion}</span>
                              <span className="ml-2 text-xs text-slate-500">ID: {c.id}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input type="checkbox" checked={removeDup} onChange={(e)=> setRemoveDup(e.currentTarget.checked)} />
                          Eliminar duplicados de la biblioteca (mantener solo el elegido)
                        </label>
                        <button
                          onClick={()=> onMerge(target, candidates.map(c=>c.id).filter(id=> id !== target), removeDup)}
                          className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >Fusionar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
          <button onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cerrar</button>
        </footer>
      </div>
    </div>
  );
}
