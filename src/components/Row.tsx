import React from "react";
import CurrencyInput from "./CurrencyInput";
import { TrashIcon, PencilSquareIcon, DocumentDuplicateIcon, ChevronDownIcon, ChevronRightIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

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
  const [rowCollapsed, setRowCollapsed] = React.useState<boolean>(false);
  const [subCollapsed, setSubCollapsed] = React.useState<Record<string, boolean>>({});
  const qty = Number(row.metrados || 0);
  const ids: string[] = row.apuIds?.length ? row.apuIds : (row.apuId ? [row.apuId] : []);
  const isEmpty = Array.isArray(row.subRows) ? row.subRows.length === 0 : (ids.length === 0);
  const pu = ids.reduce((acc, id) => {
    try { return acc + unitCost(getApuById(id), resources).unit; } catch { return acc; }
  }, 0);
  const effPu = typeof row.overrideUnitPrice === 'number' && Number.isFinite(row.overrideUnitPrice) ? row.overrideUnitPrice : pu;
  const _total = typeof row.overrideTotal === 'number' && Number.isFinite(row.overrideTotal) ? row.overrideTotal : (effPu * qty);
  const _unitOptions = ['','u','m','m2','m3','kg','jornal','día','hora','gl'];
  const _defaultUnit = row.unidadSalida ?? (ids[0] ? (getApuById(ids[0])?.unidadSalida || '') : '');

  return (
    <>
  <tr className={`hover:bg-slate-800/60 text-xs whitespace-nowrap group ${isEmpty ? 'bg-amber-900/10 ring-1 ring-amber-700/50' : ''}`}>
      {/* # (visual, no editable) */}
      <td className="h-10 px-3 text-center w-10 tabular-nums align-middle">{index + 1}</td>
      {/* Descripción */}
      <td className="h-10 px-3 align-middle">
        <button
          aria-label="Agregar subpartida"
          onClick={() => onAddSubRow && onAddSubRow(row.id)}
          className={`w-full h-9 rounded-md bg-transparent border-0 px-3 text-left text-xs min-w-0 truncate focus:outline-none focus:ring-1 ${isEmpty ? 'focus:ring-amber-500' : 'focus:ring-cyan-500'}`}
          title={isEmpty ? 'Partida vacía: agrega una subpartida o APU' : 'Agregar subpartida'}
        >
          {(row.descripcion?.trim()) || 'Sin nombre'} {isEmpty && <span className="ml-2 text-amber-300">(vacía)</span>}
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
            aria-label={rowCollapsed ? 'Mostrar subpartidas y APUs' : 'Ocultar subpartidas y APUs'}
            title={rowCollapsed ? 'Mostrar subpartidas y APUs' : 'Ocultar subpartidas y APUs'}
            onClick={() => setRowCollapsed(v => !v)}
            className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60"
          >
            {rowCollapsed ? <EyeIcon className="h-4 w-4"/> : <EyeSlashIcon className="h-4 w-4"/>}
          </button>
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
          <button
            aria-label="Eliminar partida"
            onClick={() => { if (!confirm('¿Eliminar esta partida completa?')) return; onDelete(row.id); }}
            className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60"
          >
            <TrashIcon className="h-4 w-4"/>
          </button>
          <select aria-label="Mover a capítulo" value={row.chapterId} onChange={e=>onMoveChapter(row.id, e.target.value)} className="ml-1 h-7 px-2 rounded-md bg-slate-800 border border-slate-700 text-xs">
            {chapters.map(c => <option key={c.id} value={c.id}>{c.letter}</option>)}
          </select>
        </div>
      </td>
    </tr>
    {(ids.length > 0 && !rowCollapsed) && (
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
                return (
                  <div key={id} className="flex items-center gap-2 text-[11px] group">
                    <span className="text-slate-500">•</span>
                    <button
                      onClick={() => onShowApuDetail && onShowApuDetail(id)}
                      className="text-slate-200 hover:underline text-left"
                      title={apu.descripcion}
                    >
                      {apu.descripcion}
                    </button>
                    <span className="text-slate-400">— {un} · {fmt(puApu)}</span>
                    <button
                      onClick={() => {
                        if (!confirm('¿Quitar este APU de la partida?')) return;
                        const next = ids.filter(x => x !== id);
                        if (next.length > 0) {
                          onUpdateRow(row.id, { apuIds: next });
                        } else {
                          onUpdateRow(row.id, { apuIds: [], apuId: '' });
                        }
                      }}
                      className="ml-1 p-1 rounded-md text-slate-400 hover:text-red-200 hover:bg-red-900/30"
                      title="Quitar APU de la partida"
                      aria-label="Quitar APU de la partida"
                    >
                      <TrashIcon className="h-3.5 w-3.5"/>
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
  {!rowCollapsed && (Array.isArray(row.subRows)? row.subRows: []).map((s:any, sIdx:number)=>{
      const sid = s.id;
      const sQty = Number(s.metrados||0);
      const sIds: string[] = s.apuIds||[];
      const puSBase = sIds.reduce((acc:number, id:string)=>{ try{ return acc + unitCost(getApuById(id), resources).unit; }catch{ return acc; } }, 0);
      const effPuS = (typeof s.overrideUnitPrice === 'number' && Number.isFinite(s.overrideUnitPrice)) ? s.overrideUnitPrice : puSBase;
      const totS = (typeof s.overrideTotal === 'number' && Number.isFinite(s.overrideTotal)) ? s.overrideTotal : effPuS * sQty;
      return (
        <React.Fragment key={sid}>
          <tr className="hover:bg-slate-800/60 text-xs whitespace-nowrap group">
            {/* # */}
            <td className="h-10 px-3 text-center w-10 tabular-nums align-middle">{index + 1}.{sIdx + 1}</td>
            {/* Descripción subpartida */}
            <td className="h-10 px-3 align-middle">
              <button
                aria-label="Seleccionar APU para subpartida"
                onClick={() => onPickApu(sid)}
                className="w-full h-9 rounded-md bg-transparent border-0 px-3 text-left text-xs min-w-0 truncate focus:outline-none focus:ring-1 focus:ring-cyan-500"
                title={`${(s.descripcion?.trim()) || 'Subpartida'}${sIds.length===0 ? ' — sin APU' : ''}`}
              >
                <span className="pl-8">{(s.descripcion?.trim()) || 'Subpartida'}</span>
                {sIds.length === 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-300 text-[10px] align-middle">
                    sin APU
                  </span>
                )}
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
                {['u','ml','m','m2','m3','kg','jornal','día','hora','gl'].map(u => (
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
              <CurrencyInput
                ariaLabel="Precio unitario (CLP)"
                value={typeof s.overrideUnitPrice === 'number' && Number.isFinite(s.overrideUnitPrice) ? s.overrideUnitPrice : undefined}
                onChange={(val)=>{
                  if (val === undefined) { onUpdateSubRow && onUpdateSubRow(row.id, sid, { overrideUnitPrice: undefined }); return; }
                  onUpdateSubRow && onUpdateSubRow(row.id, sid, { overrideUnitPrice: Number(val) });
                }}
                placeholder={effPuS ? `${fmt(effPuS)}` : '0'}
              />
            </td>
            {/* Total subpartida */}
            <td className="h-10 px-3 text-right w-40 align-middle tabular-nums font-semibold">
              <CurrencyInput
                ariaLabel="Total (CLP)"
                value={typeof s.overrideTotal === 'number' && Number.isFinite(s.overrideTotal) ? s.overrideTotal : undefined}
                onChange={(val)=>{
                  if (val === undefined) { onUpdateSubRow && onUpdateSubRow(row.id, sid, { overrideTotal: undefined }); return; }
                  onUpdateSubRow && onUpdateSubRow(row.id, sid, { overrideTotal: Number(val) });
                }}
                placeholder={totS ? `${fmt(totS)}` : '0'}
              />
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
                  <button
                    aria-label="Eliminar subpartida"
                    title="Eliminar subpartida"
                    onClick={() => { if (!confirm('¿Eliminar esta subpartida?')) return; onRemoveSubRow(row.id, sid); }}
                    className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60"
                  >
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
                        return (
                          <div key={id} className="flex items-center gap-2 text-[11px] group">
                          <span className="text-slate-500">•</span>
                          <button onClick={() => onShowApuDetail && onShowApuDetail(id)} className="text-slate-200 hover:underline text-left" title={apu.descripcion}>
                            {apu.descripcion}
                          </button>
                          <span className="text-slate-400">— {un} · {fmt(puApu)}</span>
                            <button
                              onClick={() => {
                                if (!confirm('¿Quitar este APU de la subpartida?')) return;
                                const next = sIds.filter(x => x !== id);
                                // Mantener la subpartida aunque quede vacía: apuIds = []
                                onUpdateSubRow && onUpdateSubRow(row.id, sid, { apuIds: next });
                              }}
                              className="ml-1 p-1 rounded-md text-slate-400 hover:text-red-200 hover:bg-red-900/30"
                              title="Quitar APU de la subpartida"
                              aria-label="Quitar APU de la subpartida"
                            >
                              <TrashIcon className="h-3.5 w-3.5"/>
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
