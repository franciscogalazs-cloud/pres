import React from 'react';
import { groupSimilarApus, isApuIncomplete } from '../../utils/match';
import { unitCost } from '../../utils/calculations';

type Apu = { id: string; descripcion: string; unidadSalida?: string; secciones?: any; items?: any[] };

export type ApuCleanupModalProps = {
  open: boolean;
  apus: Apu[];
  resources: Record<string, any>;
  usageCounts?: Record<string, number>;
  onShowUsages?: (id: string) => void;
  onClose: () => void;
  onMerge: (targetId: string, duplicateIds: string[], removeDuplicates: boolean) => void;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
};

const badge = 'inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold';

export default function ApuCleanupModal({ open, apus, resources, usageCounts, onShowUsages, onClose, onMerge, onEdit, onDelete }: ApuCleanupModalProps){
  const [removeDup, setRemoveDup] = React.useState(true);
  const incompletos = React.useMemo(()=> apus.filter(a => isApuIncomplete(a)), [apus]);
  const similares = React.useMemo(()=> groupSimilarApus(apus, { threshold: 0.44, sameUnit: true }), [apus]);
  const [selectedTargets, setSelectedTargets] = React.useState<Record<string, string>>({});
  const [skippedGroups, setSkippedGroups] = React.useState<Record<string, boolean>>({});
  const [toDelete, setToDelete] = React.useState<Set<string>>(new Set());
  const fmtCl = React.useCallback((n:number)=> new Intl.NumberFormat('es-CL', { style:'currency', currency:'CLP', maximumFractionDigits:0 }).format(n||0), []);
  const summary = React.useMemo(()=>{
    const groups = similares || [];
    const totalGroups = groups.length;
    const totalDuplicates = groups.reduce((acc, g)=> acc + Math.max(0, (g.ids?.length||0) - 1), 0);
    return { totalGroups, totalDuplicates };
  }, [similares]);

  const applyAll = React.useCallback(()=>{
    const groups = similares || [];
    if(!groups.length) return;
    const confirmMsg = `Se aplicarán fusiones en ${groups.length} grupo(s), eliminando hasta ${summary.totalDuplicates} duplicado(s) (según selección). ¿Continuar?`;
    if(!window.confirm(confirmMsg)) return;
    for(const g of groups){
      if (skippedGroups[g.key]) continue;
      const candidates = (g.ids||[]).map(id => apus.find(a => a.id === id)).filter(Boolean) as Apu[];
      if(candidates.length < 2) continue;
      const target = selectedTargets[g.key] || candidates[0].id;
      const dups = candidates.map(c=>c.id).filter(id => id !== target);
      if(dups.length){ onMerge(target, dups, removeDup); }
    }
    onClose();
  }, [similares, selectedTargets, removeDup, onMerge, onClose, apus, summary.totalDuplicates, skippedGroups]);

  const toggleDelete = React.useCallback((id:string)=>{
    setToDelete(prev=>{
      const next = new Set(prev);
      if(next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSaveChanges = React.useCallback(()=>{
    const ids = Array.from(toDelete);
    if (!ids.length) { onClose(); return; }
    const blocked = ids.filter(id => (usageCounts && (usageCounts[id]||0) > 0));
    const deletable = ids.filter(id => !blocked.includes(id));
    if (deletable.length === 0) {
      alert('No hay APU(s) eliminables: todos están en uso.');
      return;
    }
    const preMsg = `Se eliminarán ${deletable.length} APU(s).${blocked.length? `\n(${blocked.length} no se eliminarán por estar en uso)` : ''}\n¿Confirmar?`;
    if(!window.confirm(preMsg)) return;
    deletable.forEach(id => { try { onDelete && onDelete(id); } catch {} });
    const postMsg = `Eliminados ${deletable.length} APU(s).${blocked.length? `\n${blocked.length} no se eliminaron por estar en uso.` : ''}`;
    alert(postMsg);
    onClose();
  }, [toDelete, onDelete, onClose, usageCounts]);

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white text-slate-800 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Limpieza de Biblioteca APU</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">×</button>
        </header>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-8">
          <section className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-3">
              <div><span className="font-semibold">Grupos similares:</span> {summary.totalGroups}</div>
              <div><span className="font-semibold">Posibles duplicados:</span> {summary.totalDuplicates}</div>
              <div><span className="font-semibold">Marcados para borrar:</span> {toDelete.size}</div>
              <label className="inline-flex items-center gap-2 ml-auto">
                <input type="checkbox" checked={removeDup} onChange={(e)=> setRemoveDup(e.currentTarget.checked)} />
                <span>Eliminar duplicados al fusionar</span>
              </label>
              <button onClick={applyAll} className="ml-auto rounded bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700">Aplicar todo</button>
            </div>
          </section>
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
                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>ID: {a.id}</span>
                        <span>· Unidad: {(a.unidadSalida||'').toUpperCase()}</span>
                        <span>· P. Unit.: {fmtCl(unitCost(a as any, resources as any).unit || 0)}</span>
                        {(usageCounts && (usageCounts[a.id]||0) > 0) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 text-[10px]">en uso · {usageCounts[a.id]}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onShowUsages && (
                        <button onClick={()=> onShowUsages(a.id)} className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver usos</button>
                      )}
                      <button onClick={()=> onEdit(a.id)} className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50">Completar ahora</button>
                    </div>
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
                      <div className="mb-2 text-xs text-slate-500 flex items-center gap-2">
                        <span>Unidad: {(g.unit||'').toUpperCase()}</span>
                        <button
                          onClick={()=> setSkippedGroups(prev => ({ ...prev, [g.key]: !prev[g.key] }))}
                          className={`ml-auto rounded px-2 py-0.5 text-xs border ${skippedGroups[g.key]? 'border-slate-400 text-slate-500 bg-slate-100' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                          title={skippedGroups[g.key]? 'Este grupo no se fusionará en Aplicar todo' : 'Omitir este grupo en Aplicar todo'}
                        >
                          {skippedGroups[g.key]? 'No fusionar (omitido)' : 'No fusionar'}
                        </button>
                      </div>
                      <ul className="space-y-1">
                        {candidates.map(c => {
                          const pu = unitCost(c as any, resources as any).unit || 0;
                          const incomplete = isApuIncomplete(c);
                          const inUseCount = (usageCounts && usageCounts[c.id]) || 0;
                          return (
                            <li key={c.id} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
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
                                  {incomplete && (
                                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-[10px]">incompleto</span>
                                  )}
                                  {inUseCount > 0 && (
                                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 text-[10px]">en uso · {inUseCount}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={()=> toggleDelete(c.id)}
                                  className={`rounded border px-2 py-0.5 text-xs ${toDelete.has(c.id)? 'border-red-500 text-red-600 bg-red-50' : (inUseCount>0? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300 text-slate-700 hover:bg-slate-50')}`}
                                  title={inUseCount>0? 'No se puede borrar: APU en uso' : (toDelete.has(c.id)? 'Quitar de borrado' : 'Marcar para borrar')}
                                  disabled={inUseCount>0}
                                >
                                  {toDelete.has(c.id)? 'Borrar (marcado)' : 'Borrar'}
                                </button>
                                {onShowUsages && (
                                  <button
                                    onClick={()=> onShowUsages(c.id)}
                                    className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
                                  >Ver usos</button>
                                )}
                                <div className="text-xs text-slate-600 whitespace-nowrap">{(c.unidadSalida||'').toUpperCase()} · {fmtCl(pu)}</div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-slate-500">Duplicados en este grupo: {Math.max(0, candidates.length - 1)}</div>
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
          <button onClick={handleSaveChanges} className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Guardar cambios</button>
          <button onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cerrar</button>
        </footer>
      </div>
    </div>
  );
}
