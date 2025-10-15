import React, { useMemo, useState } from 'react';
import { UserCreationModal } from './UserCreationModal';
import { ProjectInfoModal } from './ProjectInfoModal';
import { ApuEditModal, type ApuDraft } from './ApuEditModal';
import { ApuLibraryTable, type ApuLibraryItem } from './ApuLibraryTable';

const MOCK_APUS: ApuLibraryItem[] = [
  { numero: 2, descripcion: 'Estructura metálica pesada perfiles HEB', unidad: 'KG', precioUnitario: 2.997, owner: 'all' },
  { numero: 3, descripcion: 'Estructura metálica pesada perfiles IPE', unidad: 'KG', precioUnitario: 2.381, owner: 'all' },
  { numero: 4, descripcion: 'Estructura metálica pesada perfiles IPN', unidad: 'KG', precioUnitario: 3.392, owner: 'all' },
  { numero: 5, descripcion: 'Estructura metálica pesada perfiles UPN', unidad: 'KG', precioUnitario: 2.776, owner: 'mine' },
  { numero: 6, descripcion: 'Sala de baño (WC + Lavamanos + kit y grifería)', unidad: 'C/U', precioUnitario: 144.585, owner: 'all' },
  { numero: 7, descripcion: 'Sala de baño económica (WC y Lavamanos)', unidad: 'C/U', precioUnitario: 110.585, owner: 'mine' },
  { numero: 8, descripcion: 'Xiladecor 2 manos', unidad: 'M2', precioUnitario: 6.222, owner: 'mine' },
  { numero: 9, descripcion: 'Cerestain 2 manos', unidad: 'M2', precioUnitario: 4.825, owner: 'mine' },
  { numero: 10, descripcion: 'Ventanas de PVC', unidad: 'M2', precioUnitario: 156.0, owner: 'all' },
  { numero: 11, descripcion: 'Ventanas de PVC', unidad: 'C/U', precioUnitario: 156.0, owner: 'mine' },
  { numero: 12, descripcion: 'Base estabilizada CBR = 100% e = 0,15 m, calzada.', unidad: 'M2', precioUnitario: 3.49, owner: 'all' },
  { numero: 13, descripcion: 'Base estabilizada CBR > 60% e = 0,10m, acera reforzada', unidad: 'M2', precioUnitario: 2.916, owner: 'mine' },
  { numero: 14, descripcion: 'Base estabilizada CBR > 60% e = 0,15m, zarpa y baden.', unidad: 'M2', precioUnitario: 3.224, owner: 'all' },
  { numero: 15, descripcion: 'Base estabilizada e=15[cm] CBR 60%', unidad: 'M2', precioUnitario: 3.534, owner: 'mine' },
];

const PAGE_SIZE = 8;

export const ReferenceLayout: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showApuModal, setShowApuModal] = useState(false);
  const [selectedApu, setSelectedApu] = useState<ApuDraft | null>(null);

  const filteredItems = useMemo(() => {
    return MOCK_APUS.filter((item) => {
      const matchesFilter = filter === 'all' || item.owner === 'mine';
      const matchesSearch =
        search.trim().length === 0 ||
        item.descripcion.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCreateApu = () => {
    setSelectedApu(null);
    setShowApuModal(true);
  };

  const handleEditApu = (item: ApuLibraryItem) => {
    setSelectedApu({
      id: item.numero,
      descripcion: item.descripcion,
      unidad: item.unidad,
      precioUnitario: item.precioUnitario,
    });
    setShowApuModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Panel de Gestión de APUs</h1>
            <p className="text-sm text-slate-500">
              Administra usuarios, proyectos y biblioteca de análisis de precios unitarios.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowUserModal(true)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
            >
              Crear usuario
            </button>
            <button
              type="button"
              onClick={() => setShowProjectModal(true)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
            >
              Info proyecto
            </button>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {filteredItems.length} APUs activos
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-800">📚 Biblioteca de APUs</span>
          </div>
          <ApuLibraryTable
            items={paginatedItems}
            filter={filter}
            onFilterChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
            search={search}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            page={currentPage}
            totalPages={totalPages}
            onPageChange={(value) => setPage(value)}
            onCreate={handleCreateApu}
            onCopy={(item) => {
              const text = `${item.descripcion} (${item.unidad}) - ${item.precioUnitario}`;
              if (navigator.clipboard) {
                navigator.clipboard.writeText(text).catch(() => {
                  console.warn('No se pudo copiar el APU.');
                });
              }
            }}
            onEdit={handleEditApu}
            onDelete={(item) => {
              console.info('Borrar APU', item);
            }}
          />
        </section>
      </main>

      <UserCreationModal
        open={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSubmit={(event) => {
          event.preventDefault();
          setShowUserModal(false);
        }}
      />

      <ProjectInfoModal
        open={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSubmit={(event) => {
          event.preventDefault();
          setShowProjectModal(false);
        }}
      />

      <ApuEditModal
        open={showApuModal}
        apu={selectedApu ?? undefined}
        onClose={() => setShowApuModal(false)}
        onSave={(draft) => {
          console.info('Guardar APU', draft);
          setShowApuModal(false);
        }}
      />
    </div>
  );
};
