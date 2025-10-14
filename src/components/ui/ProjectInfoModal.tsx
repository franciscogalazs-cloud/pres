import React from 'react';

interface ProjectInfoModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const labelCls =
  'text-xs font-semibold uppercase tracking-wide text-slate-600 flex flex-col gap-1';
const inputCls =
  'w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500';

export const ProjectInfoModal: React.FC<ProjectInfoModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Información del Proyecto</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-600"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <form onSubmit={onSubmit} className="grid gap-5 px-6 py-6">
          <div className="grid gap-3 md:grid-cols-2">
            <label className={labelCls}>
              Nombre del Proyecto <span className="text-red-500">*</span>
              <input
                type="text"
                className={inputCls}
                defaultValue="REMODELACION SEDE SOCIAL LAS AMAPOLAS"
              />
            </label>
            <label className={labelCls}>
              Propietario <span className="text-red-500">*</span>
              <input
                type="text"
                className={inputCls}
                defaultValue="SERVIU REGION DEL BIO BIO"
              />
            </label>
            <label className={labelCls}>
              Dirección
              <input type="text" className={inputCls} defaultValue="AMAPOLAS 560" />
            </label>
            <label className={labelCls}>
              Ciudad
              <input type="text" className={inputCls} defaultValue="CORONEL" />
            </label>
            <label className={labelCls}>
              Comuna
              <input type="text" className={inputCls} defaultValue="CORONEL" />
            </label>
            <label className={labelCls}>
              Fecha entrega/apertura
              <input type="date" className={inputCls} defaultValue="2024-02-22" />
            </label>
            <label className={labelCls}>
              Plazo de Ejecución (días)
              <input type="number" className={inputCls} defaultValue={120} />
            </label>
            <label className={labelCls}>
              % de Leyes Sociales
              <input type="number" className={inputCls} defaultValue={45} />
            </label>
            <label className={labelCls}>
              % IVA
              <input type="number" className={inputCls} defaultValue={19} />
            </label>
          </div>

          <div className="grid gap-4 rounded border border-slate-200 px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="ggMode" defaultChecked className="accent-sky-600" />
                GG y Utilidades separados
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="ggMode" className="accent-sky-600" />
                GG y Utilidades agrupadas
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className={labelCls}>
                % Gastos Generales
                <input type="number" className={inputCls} defaultValue={20} />
              </label>
              <label className={labelCls}>
                % de Utilidades
                <input type="number" className={inputCls} defaultValue={20} />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="ggDisplay" className="accent-sky-600" />
                Mostrar GG y Utilidades en Itemizado
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="ggDisplay"
                  className="accent-sky-600"
                  defaultChecked
                />
                Mostrar GG y Utilidades en APU
              </label>
            </div>
          </div>

          <footer className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-red-500 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Grabar
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
