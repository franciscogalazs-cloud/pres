import React from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Row from "./Row";

type Props = {
  chapters: { id: string; letter: string; title: string; subChapters?: { id:string; title:string }[] }[];
  rows: any[];
  getApuById: (id: string) => any;
  unitCost: (apu: any, resources: Record<string, any>) => { unit: number };
  resources: Record<string, any>;
  fmt: (n: number) => string;
  onPickApu: (rowId: string) => void;
  onAddSubRow?: (rowId: string) => void;
  onUpdateSubRow?: (parentId: string, subId: string, patch: any) => void;
  onRemoveSubRow?: (parentId: string, subId: string) => void;
  onMoveChapter: (rowId: string, chapterId: string) => void;
  onDelete: (rowId: string) => void;
  onDuplicate?: (rowId: string) => void;
  onUpdateRow: (rowId: string, patch: any) => void;
  onShowApuDetail?: (id: string) => void;
  onAddSubChapter?: (chapterId: string) => void;
  onRenameSubChapter?: (chapterId: string, subId: string) => void;
  onDeleteSubChapter?: (chapterId: string, subId: string) => void;
};

export default function BudgetTable({ chapters, rows, getApuById, unitCost, resources, fmt, onPickApu, onAddSubRow, onUpdateSubRow, onRemoveSubRow, onMoveChapter, onDelete, onDuplicate, onUpdateRow, onShowApuDetail, onAddSubChapter /* onRenameSubChapter, onDeleteSubChapter (no usados) */ }: Props) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(s => ({ ...s, [id]: !s[id] }));
  const calcRowTotal = (r: any) => {
    // Si hay subpartidas, sumar sus totales individuales
    if (Array.isArray(r.subRows) && r.subRows.length > 0) {
      return r.subRows.reduce((acc: number, s: any) => {
        const sQty = Number(s.metrados || 0);
        const sIds: string[] = Array.isArray(s.apuIds) ? s.apuIds : [];
        const sPu = sIds.reduce((sum: number, id: string) => { try { return sum + unitCost(getApuById(id), resources).unit; } catch { return sum; } }, 0);
        const sEffPu = (typeof s.overrideUnitPrice === 'number' && Number.isFinite(s.overrideUnitPrice)) ? s.overrideUnitPrice : sPu;
        const sTot = (typeof s.overrideTotal === 'number' && Number.isFinite(s.overrideTotal)) ? s.overrideTotal : (sEffPu * sQty);
        return acc + (Number.isFinite(sTot) ? sTot : 0);
      }, 0);
    }
    const qty = Number(r.metrados || 0);
    const ids: string[] = r.apuIds?.length ? r.apuIds : (r.apuId ? [r.apuId] : []);
    const pu = ids.reduce((acc, id) => { try { return acc + unitCost(getApuById(id), resources).unit; } catch { return acc; } }, 0);
    const effPu = (typeof r.overrideUnitPrice === 'number' && Number.isFinite(r.overrideUnitPrice)) ? r.overrideUnitPrice : pu;
    const total = (typeof r.overrideTotal === 'number' && Number.isFinite(r.overrideTotal)) ? r.overrideTotal : (effPu * qty);
    return Number.isFinite(total) ? total : 0;
  };

  return (
    <div className="space-y-6">
      {chapters.map(ch => {
        const chRows = rows.filter(r => r.chapterId === ch.id);
        const chSubtotal = chRows.reduce((acc, r) => acc + calcRowTotal(r), 0);
        if (!chRows.length) return (
          <div key={ch.id} className="rounded-2xl border border-slate-700/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <button onClick={()=>toggle(ch.id)} className="p-1 rounded hover:bg-slate-700/60" aria-label="Mostrar/Ocultar capítulo" title="Mostrar/Ocultar capítulo">
                <EyeIcon className="h-5 w-5"/>
              </button>
              <button onClick={()=>onAddSubChapter && onAddSubChapter(ch.id)} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-1 text-sm font-semibold hover:bg-slate-700" title="Agregar subcapítulo" aria-label="Agregar subcapítulo">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-700">{ch.letter}</span>
                <span>{ch.title}</span>
              </button>
              <div className="ml-auto text-sm text-slate-300">Subtotal: <b>{fmt(0)}</b></div>
            </div>
            {/* subChapters ocultos según solicitud */}
          </div>
        );
        const isCollapsed = !!collapsed[ch.id];
        return (
          <div key={ch.id} className="rounded-2xl border border-slate-700/60">
            <div className="px-4 pt-3">
              <div className="flex items-center gap-2">
                <button onClick={()=>toggle(ch.id)} className="p-1 rounded hover:bg-slate-700/60" aria-label="Mostrar/Ocultar capítulo" title="Mostrar/Ocultar capítulo">
                  {isCollapsed ? <EyeIcon className="h-5 w-5"/> : <EyeSlashIcon className="h-5 w-5"/>}
                </button>
                <button onClick={()=>onAddSubChapter && onAddSubChapter(ch.id)} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-1 text-sm font-semibold hover:bg-slate-700" title="Agregar subcapítulo" aria-label="Agregar subcapítulo">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-700">{ch.letter}</span>
                  <span>{ch.title}</span>
                </button>
                <div className="ml-auto text-sm text-slate-300">Subtotal: <b>{fmt(chSubtotal)}</b></div>
              </div>
              {/* subChapters ocultos según solicitud */}
            </div>
            {!isCollapsed && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="text-slate-300 text-sm font-semibold">
                  <tr className="h-10">
                    <th className="w-10 text-center px-3">#</th>
                    <th className="text-left px-3">Descripción</th>
                    <th className="w-20 text-center px-3">UN</th>
                    <th className="w-24 text-right px-3">CANT.</th>
                    <th className="w-36 text-right px-3">P. UNIT.</th>
                    <th className="w-40 text-right px-3">TOTAL</th>
                    <th className="w-32 px-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-slate-200">
                  {chRows.map((r, idx) => (
                    <Row
                      key={r.id}
                      index={idx}
                      row={r}
                      chapters={chapters}
                      getApuById={getApuById}
                      unitCost={unitCost}
                      resources={resources}
                      fmt={fmt}
                      onPickApu={onPickApu}
                 onAddSubRow={onAddSubRow}
                onUpdateSubRow={onUpdateSubRow}
                onRemoveSubRow={onRemoveSubRow}
                      onMoveChapter={onMoveChapter}
                      onDelete={onDelete}
                      onDuplicate={onDuplicate}
                      onUpdateRow={onUpdateRow}
                      onShowApuDetail={onShowApuDetail}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
