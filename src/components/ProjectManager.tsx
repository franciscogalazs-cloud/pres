import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ProjectCard,
  CreateProjectModal,
  Project,
  ProjectComparison as ProjectComparisonResult,
} from '../hooks/projectManager';
import { useProjectManagerView, ProjectMetadataUpdates } from '../hooks/useProjectManagerView';

interface ProjectComparisonProps {
  projects: Project[];
  onClose: () => void;
  compareProjects: (projectIds: string[]) => ProjectComparisonResult;
}

const ProjectComparison: React.FC<ProjectComparisonProps> = ({ projects, onClose, compareProjects }) => {
  const comparison = compareProjects(projects.map((project) => project.id));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Comparacion de Proyectos
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cerrar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 font-semibold text-slate-900 dark:text-slate-100">
                  Metrica
                </th>
                {projects.map((project) => (
                  <th key={project.id} className="text-left p-4 font-semibold text-slate-900 dark:text-slate-100">
                    {project.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="p-4 font-medium text-slate-700 dark:text-slate-300">Costo Total</td>
                {comparison.metrics.totalCosts.map((cost, index) => (
                  <td key={index} className="p-4 text-slate-900 dark:text-slate-100">
                    {formatCurrency(cost)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="p-4 font-medium text-slate-700 dark:text-slate-300">Numero de Partidas</td>
                {comparison.metrics.itemCounts.map((count, index) => (
                  <td key={index} className="p-4 text-slate-900 dark:text-slate-100">
                    {count}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="p-4 font-medium text-slate-700 dark:text-slate-300">Costo por m2</td>
                {comparison.metrics.costPerM2.map((costPerM2, index) => (
                  <td key={index} className="p-4 text-slate-900 dark:text-slate-100">
                    {formatCurrency(costPerM2)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="p-4 font-medium text-slate-700 dark:text-slate-300">Variacion vs Base</td>
                {comparison.metrics.variations.map((variation, index) => (
                  <td
                    key={index}
                    className={`p-4 font-medium ${
                      variation > 0
                        ? 'text-red-600'
                        : variation < 0
                        ? 'text-green-600'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {index === 0 ? 'Base' : `${variation > 0 ? '+' : ''}${variation.toFixed(1)}%`}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <td className="p-4 font-medium text-slate-700 dark:text-slate-300">Estado</td>
                {projects.map((project) => (
                  <td key={project.id} className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        project.metadata.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : project.metadata.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : project.metadata.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {project.metadata.status === 'active'
                        ? 'Activo'
                        : project.metadata.status === 'completed'
                        ? 'Completado'
                        : project.metadata.status === 'draft'
                        ? 'Borrador'
                        : 'Archivado'}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-300">Ultima Modificacion</td>
                {projects.map((project) => (
                  <td key={project.id} className="p-4 text-slate-900 dark:text-slate-100">
                    {project.updatedAt.toLocaleDateString('es-CL')}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Comparacion Visual de Costos
          </h3>
          <div className="space-y-4">
            {projects.map((project, index) => {
              const maxCost = Math.max(...comparison.metrics.totalCosts);
              const percentage = maxCost > 0 ? (comparison.metrics.totalCosts[index] / maxCost) * 100 : 0;

              return (
                <div key={project.id} className="flex items-center space-x-4">
                  <div className="w-32 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                    {project.name}
                  </div>
                  <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-lg h-8 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className="bg-blue-500 h-full rounded-lg flex items-center justify-end pr-2"
                    >
                      <span className="text-white text-xs font-medium">
                        {formatCurrency(comparison.metrics.totalCosts[index])}
                      </span>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface ProjectMetadataModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (updates: ProjectMetadataUpdates) => void;
}

const ProjectMetadataModal: React.FC<ProjectMetadataModalProps> = ({ isOpen, project, onClose, onSave }) => {
  const [client, setClient] = useState('');
  const [location, setLocation] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);
  const [signer1Name, setSigner1Name] = useState('');
  const [signer1Role, setSigner1Role] = useState('');
  const [signer2Name, setSigner2Name] = useState('');
  const [signer2Role, setSigner2Role] = useState('');

  useEffect(() => {
    if (isOpen && project) {
      setClient(project.metadata.client || '');
      setLocation(project.metadata.location || '');
      setLogoDataUrl(project.metadata.logoDataUrl);
      setSigner1Name(project.metadata.signer1Name || '');
      setSigner1Role(project.metadata.signer1Role || '');
      setSigner2Name(project.metadata.signer2Name || '');
      setSigner2Role(project.metadata.signer2Role || '');
    }
    if (!isOpen) {
      setClient('');
      setLocation('');
      setLogoDataUrl(undefined);
      setSigner1Name('');
      setSigner1Role('');
      setSigner2Name('');
      setSigner2Role('');
    }
  }, [isOpen, project]);

  if (!isOpen || !project) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({
      client,
      location,
      logoDataUrl,
      signer1Name,
      signer1Role,
      signer2Name,
      signer2Role,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Metadatos del Proyecto
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cliente
            </label>
            <input
              type="text"
              value={client}
              onChange={(event) => setClient(event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ubicacion
            </label>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Logo (Data URL)
            </label>
            <input
              type="text"
              value={logoDataUrl || ''}
              onChange={(event) => setLogoDataUrl(event.target.value || undefined)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              placeholder="data:image/png;base64,..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Firmante 1 - Nombre
              </label>
              <input
                type="text"
                value={signer1Name}
                onChange={(event) => setSigner1Name(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Firmante 1 - Cargo
              </label>
              <input
                type="text"
                value={signer1Role}
                onChange={(event) => setSigner1Role(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Firmante 2 - Nombre
              </label>
              <input
                type="text"
                value={signer2Name}
                onChange={(event) => setSigner2Name(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Firmante 2 - Cargo
              </label>
              <input
                type="text"
                value={signer2Role}
                onChange={(event) => setSigner2Role(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Guardar
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export const ProjectManager: React.FC = () => {
  const {
    state,
    actions: {
      createProject,
      setActiveProject,
      toggleFavorite,
      deleteProject,
      exportProject,
      compareProjects,
    },
    derived: {
      totalProjects,
      filteredAndSortedProjects,
      selectedProjectsForComparison,
      canStartComparison,
    },
    search,
    filters,
    modals,
    comparison,
    editingProject,
    saveProjectMetadata,
  } = useProjectManagerView();

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Gestion de Proyectos
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {totalProjects} proyectos total
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canStartComparison && (
            <button
              onClick={modals.startComparison}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Comparar ({comparison.selectedIds.length})
            </button>
          )}

          <button
            onClick={modals.openCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Nuevo Proyecto
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar proyectos..."
            value={search.term}
            onChange={(event) => search.setTerm(event.target.value)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          />
        </div>

        <select
          value={filters.status}
          onChange={(event) =>
            filters.setStatus(
              event.target.value as Parameters<typeof filters.setStatus>[0],
            )
          }
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
        >
          <option value="all">Todos los proyectos</option>
          <option value="favorites">Favoritos</option>
          <option value="draft">Borradores</option>
          <option value="active">Activos</option>
          <option value="completed">Completados</option>
          <option value="archived">Archivados</option>
        </select>

        <select
          value={filters.sortBy}
          onChange={(event) =>
            filters.setSortBy(
              event.target.value as Parameters<typeof filters.setSortBy>[0],
            )
          }
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
        >
          <option value="updated">Ultima modificacion</option>
          <option value="created">Fecha de creacion</option>
          <option value="name">Nombre A-Z</option>
          <option value="cost">Costo (mayor a menor)</option>
        </select>
      </div>

      {filteredAndSortedProjects.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            No hay proyectos
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {search.term || filters.status !== 'all'
              ? 'No se encontraron proyectos con los filtros seleccionados'
              : 'Comienza creando tu primer proyecto'}
          </p>
          {!search.term && filters.status === 'all' && (
            <button
              onClick={modals.openCreateModal}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Crear primer proyecto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAndSortedProjects.map((project) => (
              <div key={project.id} className="relative">
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={comparison.selectedIds.includes(project.id)}
                    onChange={() => comparison.toggleSelectionForComparison(project.id)}
                    className="w-4 h-4 text-purple-600 bg-white border-slate-300 rounded focus:ring-purple-500"
                  />
                </div>

                <ProjectCard
                  project={project}
                  isActive={state.activeProjectId === project.id}
                  isFavorite={state.favorites.includes(project.id)}
                  onSelect={() => setActiveProject(project.id)}
                  onToggleFavorite={() => toggleFavorite(project.id)}
                  onDelete={() => deleteProject(project.id)}
                  onExport={() => exportProject(project.id)}
                  onEdit={() => modals.openMetadataModal(project)}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {state.recentProjects.length > 0 && (
        <div className="pt-8 border-t border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Proyectos recientes
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {state.recentProjects.slice(0, 5).map((projectId) => {
              const project = state.projects[projectId];
              if (!project) {
                return null;
              }

              return (
                <button
                  key={projectId}
                  onClick={() => setActiveProject(projectId)}
                  className="flex-shrink-0 w-48 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-left"
                >
                  <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {project.name}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 truncate">
                    {project.description}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    {project.updatedAt.toLocaleDateString('es-CL')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <CreateProjectModal
        isOpen={modals.showCreateModal}
        onClose={modals.closeCreateModal}
        onCreateProject={createProject}
        templates={state.templates}
      />

      <ProjectMetadataModal
        isOpen={modals.showMetaModal}
        project={editingProject}
        onClose={modals.closeMetadataModal}
        onSave={saveProjectMetadata}
      />

      {modals.showComparison && (
        <ProjectComparison
          projects={selectedProjectsForComparison}
          onClose={modals.closeComparison}
          compareProjects={compareProjects}
        />
      )}
    </div>
  );
};
