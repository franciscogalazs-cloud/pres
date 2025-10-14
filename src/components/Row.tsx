import React from "react";
import { TrashIcon, PencilSquareIcon, DocumentDuplicateIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

type RowProps = {
  index: number;
  row: any;
  chapters: { id: string; letter: string; title: string }[];
  onPickApu: (rowId: string) => void;
  onAddSubRow?: (rowId: string) => void;
  onUpdateSubRow?: (parentId: string, subId: string, patch: any) => void;
  onRemoveSubRow?: (parentId: string, subId: string) => void;
  onMoveChapter: (rowId: string, chapterId: string) => void;
  onDelete: (rowId: string) => void;
  onDuplicate?: (rowId: string) => void;
  getApuById: (id: string) => any;
  unitCost: (apu: any, resources: Record<string, any>) => { unit: number };
  resources: Record<string, any>;
  fmt: (n: number) => string;
  onUpdateRow: (rowId: string, patch: any) => void;
  onShowApuDetail?: (id: string) => void;
};

export default function Row({ index, row, chapters, onPickApu, onAddSubRow, onUpdateSubRow, onRemoveSubRow, onMoveChapter, onDelete, onDuplicate, getApuById, unitCost, resources, fmt, onUpdateRow, onShowApuDetail }: RowProps) {
  const [subCollapsed, setSubCollapsed] = React.useState<Record<string, boolean>>({});
  const qty = Number(row.metrados || 0);
  const ids: string[] = row.apuIds?.length ? row.apuIds : (row.apuId ? [row.apuId] : []);
  const pu = ids.reduce((acc, id) => {
    try { return acc + unitCost(getApuById(id), resources).unit; } catch { return acc; }
  }, 0);
  const effPu = typeof row.overrideUnitPrice === 'number' && Number.isFinite(row.overrideUnitPrice) ? row.overrideUnitPrice : pu;
  const total = typeof row.overrideTotal === 'number' && Number.isFinite(row.overrideTotal) ? row.overrideTotal : (effPu * qty);
  const unitOptions = ['','m','m2','m3','kg','jornal','día','hora','gl'];
  const defaultUnit = row.unidadSalida ?? (ids[0] ? (getApuById(ids[0])?.unidadSalida || '') : '');

  return (
    <>
    <tr className="hover:bg-slate-800/60 text-xs whitespace-nowrap">
      {/* # (visual, no editable) */}
      <td className="h-10 px-3 text-center w-10 tabular-nums align-middle">{index + 1}</td>
      {/* Descripción */}
      <td className="h-10 px-3 align-middle">
        <button
          aria-label="Agregar subpartida"
          onClick={() => onAddSubRow && onAddSubRow(row.id)}
          className="w-full h-9 rounded-md bg-transparent border-0 px-3 text-left text-xs min-w-0 truncate focus:outline-none focus:ring-1 focus:ring-cyan-500"
          title="Agregar subpartida"
        >
          {(row.descripcion?.trim()) || 'Sin nombre'}
        </button>
      </td>
  {/* UN (selector de unidad de la partida) */}
  <td className="h-10 px-3 text-center w-20 align-middle"></td>
  {/* CANT. editable: metrados */}
  <td className="h-10 px-3 text-right w-24 align-middle tabular-nums"></td>
  {/* P. UNIT. editable: overrideUnitPrice, placeholder = calculado */}
  <td className="h-10 px-3 text-right w-36 align-middle tabular-nums"></td>
  {/* TOTAL editable: overrideTotal */}
  <td className="h-10 px-3 text-right w-40 align-middle tabular-nums font-semibold"></td>
      {/* Acciones */}
      <td className="h-10 px-2 align-middle">
        <div className="flex items-center justify-end gap-1">
          <button
            aria-label="Renombrar partida"
            title="Renombrar partida"
            onClick={() => {
              const name = prompt('Nuevo nombre de la partida:', (row.descripcion || '').trim());
              if (name !== null) {
                const val = name.trim();
                if (val !== (row.descripcion || '')) {
                  onUpdateRow(row.id, { descripcion: val });
                }
              }
            }}
            className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60"
          >
            <PencilSquareIcon className="h-4 w-4"/>
          </button>
          {onDuplicate && (
            <button aria-label="Duplicar partida" onClick={() => onDuplicate(row.id)} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60"><DocumentDuplicateIcon className="h-4 w-4"/></button>
          )}
          <button aria-label="Eliminar partida" onClick={() => onDelete(row.id)} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60"><TrashIcon className="h-4 w-4"/></button>
          <select aria-label="Mover a capítulo" value={row.chapterId} onChange={e=>onMoveChapter(row.id, e.target.value)} className="ml-1 h-7 px-2 rounded-md bg-slate-800 border border-slate-700 text-xs">
            {chapters.map(c => <option key={c.id} value={c.id}>{c.letter}</option>)}
          </select>
        </div>
      </td>
    </tr>
    {(ids.length > 0) && (
      <tr className="bg-slate-900/40">
        {/* # columna vacía para alineación */}
        <td className="px-3 w-10"></td>
        {/* Descripción: lista de APUs asignados */}
        <td className="px-3 py-2 align-top">
          <div className="text-[11px] text-slate-300 mb-1">APUs asignados:</div>
          <div className="grid gap-1">
            {ids.map((id) => {
              try {
                const apu = getApuById(id);
                const un = apu?.unidadSalida || 'GL';
                const puApu = (()=>{ try{ return unitCost(apu, resources).unit; }catch{ return 0; } })();
                const totalApu = puApu * qty;
                return (
                  <div key={id} className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">•</span>
                    <button
                      onClick={() => onShowApuDetail && onShowApuDetail(id)}
                      className="text-slate-200 hover:underline text-left"
                      title={apu.descripcion}
                    >
                      {apu.descripcion}
                    </button>
                    <span className="text-slate-400">— {un} · {fmt(puApu)} · Total: {fmt(totalApu)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm('¿Quitar este APU de la partida?')) return;
                        const current: string[] = row.apuIds?.length ? [...row.apuIds] : (row.apuId ? [row.apuId] : []);
                        const next = current.filter(x => x !== id);
                        onUpdateRow(row.id, { apuIds: next, apuId: next[0] || null });
                      }}
                      className="ml-1 p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60"
                      title="Quitar"
                      aria-label="Quitar APU"
                    >
                      <TrashIcon className="h-4 w-4"/>
                    </button>
                  </div>
                );
              } catch {
                return null;
              }
            })}
          </div>
        </td>
        {/* Resto de columnas vacías para mantener el layout */}
        <td className="px-3 w-20"></td>
        <td className="px-3 w-24"></td>
  <td className="px-3 w-36"></td>
  <td className="px-3 w-40"></td>
        <td className="px-2 w-32"></td>
      </tr>
    )}
    {/* Subpartidas como filas completas */}
    {(Array.isArray(row.subRows)? row.subRows: []).map((s:any, sIdx:number)=>{
      const sid = s.id;
      const sQty = Number(s.metrados||0);
      const sIds: string[] = s.apuIds||[];
      const puSBase = sIds.reduce((acc:number, id:string)=>{ try{ return acc + unitCost(getApuById(id), resources).unit; }catch{ return acc; } }, 0);
      const effPuS = (typeof s.overrideUnitPrice === 'number' && Number.isFinite(s.overrideUnitPrice)) ? s.overrideUnitPrice : puSBase;
      const totS = (typeof s.overrideTotal === 'number' && Number.isFinite(s.overrideTotal)) ? s.overrideTotal : effPuS * sQty;
      return (
        <React.Fragment key={sid}>
          <tr className="hover:bg-slate-800/60 text-xs whitespace-nowrap">
            {/* # */}
            <td className="h-10 px-3 text-center w-10 tabular-nums align-middle">{index + 1}.{sIdx + 1}</td>
            {/* Descripción subpartida */}
            <td className="h-10 px-3 align-middle">
              <button
                aria-label="Seleccionar APU para subpartida"
                onClick={() => onPickApu(sid)}
                className="w-full h-9 rounded-md bg-transparent border-0 px-3 text-left text-xs min-w-0 truncate focus:outline-none focus:ring-1 focus:ring-cyan-500"
                title={(s.descripcion?.trim()) || 'Subpartida'}
              >
                <span className="pl-8">{(s.descripcion?.trim()) || 'Subpartida'}</span>
              </button>
            </td>
            {/* UN subpartida */}
            <td className="h-10 px-3 text-center w-20 align-middle">
              <select
                aria-label="Unidad"
                className="h-9 w-full rounded-md bg-slate-800 border border-slate-700 px-2 text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-cyan-500"
                value={s.unidadSalida || ''}
                onChange={(e) => onUpdateSubRow && onUpdateSubRow(row.id, sid, { unidadSalida: e.target.value })}
              >
                <option value="">UN...</option>
                {['m','m2','m3','kg','jornal','día','hora','gl'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </td>
            {/* Cantidad subpartida */}
            <td className="h-10 px-3 text-right w-24 align-middle tabular-nums">
              <input
                aria-label="Cantidad"
                type="number"
                step={0.1}
                className="h-9 w-full text-right rounded-md bg-slate-800 border border-slate-700 px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500 tabular-nums"
                value={Number.isFinite(sQty) ? sQty : 0}
                onChange={(e) => onUpdateSubRow && onUpdateSubRow(row.id, sid, { metrados: Math.max(0, Number(e.target.value) || 0) })}
              />
            </td>
            {/* P. Unit. subpartida */}
            <td className="h-10 px-3 text-right w-36 align-middle tabular-nums">
              <div className="relative">
                <input
                  aria-label="Precio unitario (CLP)"
                  type="number"
                  step={1}
                  className="h-9 w-full text-right rounded-md bg-slate-800 border border-slate-700 px-2 pr-8 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500 tabular-nums"
                  value={(typeof s.overrideUnitPrice === 'number' && Number.isFinite(s.overrideUnitPrice)) ? s.overrideUnitPrice : ''}
                  placeholder={effPuS ? `${fmt(effPuS)}` : '0'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') { onUpdateSubRow && onUpdateSubRow(row.id, sid, { overrideUnitPrice: undefined }); return; }
                    onUpdateSubRow && onUpdateSubRow(row.id, sid, { overrideUnitPrice: Number(val) });
                  }}
                />
              </div>
            </td>
            {/* Total subpartida */}
            <td className="h-10 px-3 text-right w-40 align-middle tabular-nums font-semibold">
              <div className="relative">
                <input
                  aria-label="Total (CLP)"
                  type="number"
                  step={1}
                  className="h-9 w-full text-right rounded-md bg-slate-800 border border-slate-700 px-2 pr-8 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500 tabular-nums font-semibold"
                  value={(typeof s.overrideTotal === 'number' && Number.isFinite(s.overrideTotal)) ? s.overrideTotal : ''}
                  placeholder={totS ? `${fmt(totS)}` : '0'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') { onUpdateSubRow && onUpdateSubRow(row.id, sid, { overrideTotal: undefined }); return; }
                    onUpdateSubRow && onUpdateSubRow(row.id, sid, { overrideTotal: Number(val) });
                  }}
                />
              </div>
            </td>
            {/* Acciones subpartida */}
            <td className="h-10 px-2 align-middle">
              <div className="flex items-center justify-end gap-1">
                <button
                  aria-label={subCollapsed[sid] ? 'Mostrar APUs' : 'Ocultar APUs'}
                  title={subCollapsed[sid] ? 'Mostrar APUs' : 'Ocultar APUs'}
                  onClick={() => setSubCollapsed(s => ({ ...s, [sid]: !s[sid] }))}
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60"
                >
                  {subCollapsed[sid] ? <ChevronRightIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>}
                </button>
                {onUpdateSubRow && (
                  <button
                    aria-label="Renombrar subpartida"
                    title="Renombrar subpartida"
                    onClick={() => {
                      const name = prompt('Nuevo nombre de la subpartida:', (s.descripcion || 'Subpartida').trim());
                      if (name !== null) {
                        const v = name.trim();
                        if (v) onUpdateSubRow(row.id, sid, { descripcion: v });
                      }
                    }}
                    className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60"
                  >
                    <PencilSquareIcon className="h-4 w-4"/>
                  </button>
                )}
                {onRemoveSubRow && (
                  <button aria-label="Eliminar subpartida" title="Eliminar subpartida" onClick={() => onRemoveSubRow(row.id, sid)} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60">
                    <TrashIcon className="h-4 w-4"/>
                  </button>
                )}
              </div>
            </td>
          </tr>
          {sIds.length > 0 && !subCollapsed[sid] && (
            <tr className="bg-slate-900/40">
              <td className="px-3 w-10"></td>
              <td className="px-3 py-2 align-top" colSpan={5}>
                <div className="grid gap-1 pl-8">
                  {sIds.map((id) => {
                    try {
                      const apu = getApuById(id);
                      const un = apu?.unidadSalida || 'GL';
                      const puApu = (()=>{ try{ return unitCost(apu, resources).unit; }catch{ return 0; } })();
                      const totalApu = puApu * sQty;
                        return (
                          <div key={id} className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-500">•</span>
                          <button onClick={() => onShowApuDetail && onShowApuDetail(id)} className="text-slate-200 hover:underline text-left" title={apu.descripcion}>
                            {apu.descripcion}
                          </button>
                          <span className="text-slate-400">— {un} · {fmt(puApu)} · Total: {fmt(totalApu)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!confirm('¿Quitar este APU de la subpartida?')) return;
                                const next = (sIds || []).filter(x => x !== id);
                                onUpdateSubRow && onUpdateSubRow(row.id, sid, { apuIds: next });
                              }}
                              className="ml-1 p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60"
                              title="Quitar APU de subpartida"
                              aria-label="Quitar APU de subpartida"
                            >
                              <TrashIcon className="h-4 w-4"/>
                            </button>
                        </div>
                      );
                    } catch { return null; }
                  })}
                </div>
              </td>
              <td className="px-2 w-32"></td>
            </tr>
          )}
        </React.Fragment>
      );
    })}
    </>
  );
}
