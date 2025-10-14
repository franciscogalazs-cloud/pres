import React from "react";

type Props = {
  apuIds: string[];
  qty: number;
  getApuById: (id: string) => any;
  unitCost: (apu: any, resources: Record<string, any>) => { unit: number };
  resources: Record<string, any>;
  fmt: (n: number) => string;
  onOpenPicker?: () => void;
  onRemoveApu?: (id: string) => void;
  onEditApu?: (id: string) => void;
  onShowDetail?: (id: string) => void;
};

export default function ApuSubtable({ apuIds, qty, getApuById, unitCost, resources, fmt, onOpenPicker, onRemoveApu, onShowDetail }: Props) {
  if (!apuIds || apuIds.length === 0) return null;
  return (
    <div className="pl-6">
      <div className="space-y-4">
        {apuIds.map((id) => {
          try {
            const apu = getApuById(id);

            return (
              <div key={id} className="bg-slate-900/40 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                  <button
                    className="text-xs font-medium text-slate-200 truncate text-left hover:underline"
                    title={apu.descripcion}
                    onClick={()=> onShowDetail && onShowDetail(id)}
                  >
                    {apu.descripcion}
                  </button>
                  <div className="flex items-center gap-2">
                    {onOpenPicker && (
                      <button onClick={onOpenPicker} className="px-2 py-1 rounded-md text-[11px] bg-slate-800 hover:bg-slate-700">+ APU</button>
                    )}
                    {onRemoveApu && (
                      <button onClick={()=>onRemoveApu(id)} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60" title="Quitar APU" aria-label="Quitar APU">
                        {/* Trash icon inline para consistencia con el resto */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M9 3.75A2.25 2.25 0 0 1 11.25 1.5h1.5A2.25 2.25 0 0 1 15 3.75V4.5h3.75a.75.75 0 0 1 0 1.5h-.355l-1.003 12.036A3.75 3.75 0 0 1 13.655 21H10.345a3.75 3.75 0 0 1-3.737-2.964L5.605 6H5.25a.75.75 0 0 1 0-1.5H9V3.75Zm1.5.75h3V3.75a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75V4.5Zm-.75 4.5a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm4.5.75a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          } catch {
            return null;
          }
        })}
        {onOpenPicker && (
          <div>
            <button type="button" onClick={onOpenPicker} className="text-[11px] text-slate-400 hover:text-slate-200 hover:underline">+ Agregar APU</button>
          </div>
        )}
      </div>
    </div>
  );
}
