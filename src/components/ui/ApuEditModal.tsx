import React, { useEffect, useState } from 'react';

export interface ApuDraft {
  id?: number;
  descripcion: string;
  unidad: string;
  precioUnitario: number;
}

interface ApuEditModalProps {
  open: boolean;
  apu?: ApuDraft | null;
  onClose: () => void;
  onSave: (value: ApuDraft) => void;
}

const labelCls =
  'text-xs font-semibold uppercase tracking-wide text-slate-600 flex flex-col gap-1';
const inputCls =
  'w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500';

export const ApuEditModal: React.FC<ApuEditModalProps> = ({ open, apu, onClose, onSave }) => {
  const [draft, setDraft] = useState<ApuDraft>({
    id: undefined,
    descripcion: '',
    unidad: '',
    precioUnitario: 0,
  });

  useEffect(() => {
    if (apu) {
      setDraft(apu);
    } else {
      setDraft({
        descripcion: '',
        unidad: '',
        precioUnitario: 0,
      });
    }
  }, [apu, open]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {apu ? 'Creación - Modificación APU' : 'Nuevo APU'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-600"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <div className="space-y-3">
            <label className={labelCls}>
              Nombre
              <input
                type="text"
                className={inputCls}
                value={draft.descripcion}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, descripcion: event.target.value }))
                }
                required
              />
            </label>

            <label className={labelCls}>
              Unidad de Medida
              <input
                type="text"
                className={inputCls}
                value={draft.unidad}
                onChange={(event) => setDraft((prev) => ({ ...prev, unidad: event.target.value }))}
                required
              />
            </label>

            <label className={labelCls}>
              Precio
              <input
                type="number"
                step="0.001"
                className={inputCls}
                value={draft.precioUnitario}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, precioUnitario: Number(event.target.value) }))
                }
                required
              />
            </label>

            {/* Código externo eliminado */}
          </div>

          <footer className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cerrar
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
