import React, { Fragment } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { ApuDraft } from './ApuEditModal';

export interface ApuLibraryItem extends ApuDraft {
  numero: number;
  owner: 'all' | 'mine';
}

interface ApuLibraryTableProps {
  items: ApuLibraryItem[];
  filter: 'all' | 'mine';
  onFilterChange: (filter: 'all' | 'mine') => void;
  search: string;
  onSearch: (value: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onCreate: () => void;
  onCopy: (item: ApuLibraryItem) => void;
  onEdit: (item: ApuLibraryItem) => void;
  onDelete: (item: ApuLibraryItem) => void;
}

const buttonBase =
  'inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50';

export const ApuLibraryTable: React.FC<ApuLibraryTableProps> = ({
  items,
  filter,
  onFilterChange,
  search,
  onSearch,
  page,
  totalPages,
  onPageChange,
  onCreate,
  onCopy,
  onEdit,
  onDelete,
}) => {
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`${buttonBase} ${filter === 'all' ? 'ring-1 ring-slate-400' : ''}`}
            onClick={() => onFilterChange('all')}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-sky-600" />
            Ver todos los APUs
          </button>
          <button
            type="button"
            className={`${buttonBase} ${filter === 'mine' ? 'ring-1 ring-slate-400' : ''}`}
            onClick={() => onFilterChange('mine')}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
            Ver mis APUs
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-500">
            Buscar:
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              className="border-none bg-transparent text-slate-700 focus:outline-none focus:ring-0"
              placeholder="Descripción"
            />
          </label>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
          >
            <span className="text-lg leading-none">+</span>
            Crear nuevo APU
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">N°</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-left">Unidad</th>
              <th className="px-4 py-3 text-right">P. Unitario</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                  No hay APUs con los filtros actuales.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.numero} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{item.numero}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{item.descripcion}</div>
                    <div className="text-xs text-slate-400">&nbsp;</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.unidad.toUpperCase()}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {item.precioUnitario.toLocaleString('es-CL', {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                        onClick={() => onCopy(item)}
                      >
                        📋
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                        onClick={() => onEdit(item)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded-md border border-slate-300 text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                        onClick={() => onDelete(item)}
                        title="Eliminar APU"
                        aria-label="Eliminar APU"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>
          Página {page} de {totalPages || 1}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isFirst}
            className={`rounded border px-3 py-1 font-medium transition ${
              isFirst
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
            }`}
            onClick={() => !isFirst && onPageChange(page - 1)}
          >
            Anterior
          </button>
          {Array.from({ length: totalPages || 1 }).map((_, index) => {
            const pageNumber = index + 1;
            return (
              <Fragment key={pageNumber}>
                <button
                  type="button"
                  className={`rounded border px-3 py-1 font-medium transition ${
                    page === pageNumber
                      ? 'ring-1 ring-slate-400'
                      : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                  onClick={() => onPageChange(pageNumber)}
                >
                  {pageNumber}
                </button>
              </Fragment>
            );
          })}
          <button
            type="button"
            disabled={isLast}
            className={`rounded border px-3 py-1 font-medium transition ${
              isLast
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
            }`}
            onClick={() => !isLast && onPageChange(page + 1)}
          >
            Siguiente
          </button>
        </div>
      </footer>
    </div>
  );
};
