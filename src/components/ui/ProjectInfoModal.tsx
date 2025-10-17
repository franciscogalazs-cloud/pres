import React from 'react';

interface ProjectInfoInitial {
  nombre?: string;
  propietario?: string;
  direccion?: string;
  ciudad?: string;
  comuna?: string;
  fecha?: string;
  plazoDias?: number | string;
}

interface ProjectInfoModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  initial?: ProjectInfoInitial;
}

const labelCls =
  'text-xs font-semibold uppercase tracking-wide text-slate-400 flex flex-col gap-1';
const inputCls =
  'w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500';

export const ProjectInfoModal: React.FC<ProjectInfoModalProps> = ({
  open,
  onClose,
  onSubmit,
  initial,
}) => {
  if (!open) return null;

  const [nombre, setNombre] = React.useState<string>(initial?.nombre || '');
  const [nameChangeAction, setNameChangeAction] = React.useState<'update'|'create'>('update');
  const prevName = (initial?.nombre || '').trim().toLowerCase();
  const currName = (nombre || '').trim().toLowerCase();
  const nameChanged = !!prevName && prevName !== currName;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-700">
        <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold">Proyecto</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-200"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <form onSubmit={onSubmit} className="px-6 py-4 grid gap-3">
          <label className={labelCls}>
            Nombre del Proyecto <span className="text-red-500">*</span>
            <input
              type="text"
              className={inputCls}
              name="nombre"
              value={nombre}
              onChange={(e)=> setNombre(e.target.value)}
            />
          </label>
          <label className={labelCls}>
            Propietario <span className="text-red-500">*</span>
            <input
              type="text"
              className={inputCls}
              name="propietario"
              defaultValue={initial?.propietario || ''}
            />
          </label>
          <label className={labelCls}>
            Dirección
            <input type="text" className={inputCls} name="direccion" defaultValue={initial?.direccion || ''} />
          </label>
          <label className={labelCls}>
            Ciudad
            <input type="text" className={inputCls} name="ciudad" defaultValue={initial?.ciudad || ''} />
          </label>
          <label className={labelCls}>
            Comuna
            <input type="text" className={inputCls} name="comuna" defaultValue={initial?.comuna || ''} />
          </label>
          <label className={labelCls}>
            Fecha entrega/apertura
            <input type="date" className={inputCls} name="fecha" defaultValue={initial?.fecha || ''} />
          </label>
          <label className={labelCls}>
            Plazo de Ejecución (días)
            <input type="number" className={inputCls} name="plazoDias" defaultValue={initial?.plazoDias ?? ''} />
          </label>

          {nameChanged && (
            <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-200">
              <div className="text-sm font-semibold mb-2">Nombre cambiado. ¿Actualizar existente? (Aceptar) / ¿Crear nuevo? (Cancelar)</div>
              <div className="flex flex-col gap-2 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="nameChangeAction"
                    value="update"
                    className="accent-slate-200"
                    checked={nameChangeAction==='update'}
                    onChange={()=> setNameChangeAction('update')}
                  />
                  Actualizar existente
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="nameChangeAction"
                    value="create"
                    className="accent-slate-200"
                    checked={nameChangeAction==='create'}
                    onChange={()=> setNameChangeAction('create')}
                  />
                  Crear nuevo
                </label>
              </div>
            </div>
          )}

          <footer className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700/30"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700/30"
            >
              Guardar
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
