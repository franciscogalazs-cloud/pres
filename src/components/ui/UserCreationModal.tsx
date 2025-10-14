import React from 'react';

interface UserCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const fieldClasses =
  'w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500';

export const UserCreationModal: React.FC<UserCreationModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Creación de Usuarios</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-600"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-6">
          <div className="grid gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nombre
              <input type="text" className={fieldClasses} placeholder="Nombre completo" />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
              <input
                type="email"
                className={fieldClasses}
                placeholder="Será usado como NOMBRE DE USUARIO"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Teléfono
              <input type="tel" className={fieldClasses} placeholder="Ej: +56 9 1234 5678" />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Password
              <input type="password" className={fieldClasses} placeholder="********" />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ciudad
              <input type="text" className={fieldClasses} placeholder="Ciudad" />
            </label>

            <fieldset className="grid gap-2 rounded border border-slate-200 px-3 py-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tipo
              </legend>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="tipo" className="accent-sky-600" defaultChecked />
                Administrador
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="tipo" className="accent-sky-600" />
                Usuario normal
              </label>
            </fieldset>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Profesión
              <select className={fieldClasses}>
                <option value="">Seleccione</option>
              </select>
            </label>
          </div>

          <footer className="flex items-center justify-end gap-3 pt-2">
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
