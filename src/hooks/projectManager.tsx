import React, { createContext, useContext, useReducer, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Apu, BudgetRow, Resource } from '../types';

// ====== Tipos para gestión de proyectos ======
export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  budget: BudgetRow[];
  customApus: Apu[];
  settings: {
    gg: number;
    util: number;
    iva: number;
  };
  metadata: {
    client?: string;
    location?: string;
    status: 'draft' | 'active' | 'completed' | 'archived';
    totalCost?: number;
    estimatedDuration?: number;
    // Reporte profesional
    logoDataUrl?: string;
    signer1Name?: string;
    signer1Role?: string;
    signer2Name?: string;
    signer2Role?: string;
    annexes?: Array<{ title: string; href: string }>;
  };
  tags: string[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  apus: string[]; // IDs de APUs incluidos
  defaultSettings: {
    gg: number;
    util: number;
    iva: number;
  };
}

export interface ProjectComparison {
  projects: Project[];
  metrics: {
    totalCosts: number[];
    itemCounts: number[];
    costPerM2: number[];
    variations: number[];
  };
}

// ====== Estado del gestor de proyectos ======
interface ProjectManagerState {
  projects: Record<string, Project>;
  templates: Record<string, ProjectTemplate>;
  activeProjectId: string | null;
  favorites: string[];
  recentProjects: string[];
}

type ProjectManagerAction =
  | { type: 'CREATE_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; updates: Partial<Project> } }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_ACTIVE_PROJECT'; payload: string | null }
  | { type: 'ADD_TO_FAVORITES'; payload: string }
  | { type: 'REMOVE_FROM_FAVORITES'; payload: string }
  | { type: 'CREATE_TEMPLATE'; payload: ProjectTemplate }
  | { type: 'LOAD_FROM_TEMPLATE'; payload: { templateId: string; projectName: string } }
  | { type: 'IMPORT_PROJECTS'; payload: Project[] }
  | { type: 'RESTORE_STATE'; payload: ProjectManagerState };

// ====== Reducer ======
const projectManagerReducer = (
  state: ProjectManagerState,
  action: ProjectManagerAction
): ProjectManagerState => {
  switch (action.type) {
    case 'CREATE_PROJECT':
      const newProject = action.payload;
      return {
        ...state,
        projects: { ...state.projects, [newProject.id]: newProject },
        activeProjectId: newProject.id,
        recentProjects: [newProject.id, ...state.recentProjects.filter(id => id !== newProject.id)].slice(0, 10)
      };

    case 'UPDATE_PROJECT':
      const { id, updates } = action.payload;
      if (!state.projects[id]) return state;
      return {
        ...state,
        projects: {
          ...state.projects,
          [id]: { ...state.projects[id], ...updates, updatedAt: new Date() }
        },
        recentProjects: [id, ...state.recentProjects.filter(pid => pid !== id)].slice(0, 10)
      };

    case 'DELETE_PROJECT':
      const projectId = action.payload;
      const { [projectId]: deleted, ...remainingProjects } = state.projects;
      return {
        ...state,
        projects: remainingProjects,
        activeProjectId: state.activeProjectId === projectId ? null : state.activeProjectId,
        favorites: state.favorites.filter(id => id !== projectId),
        recentProjects: state.recentProjects.filter(id => id !== projectId)
      };

    case 'SET_ACTIVE_PROJECT':
      return { ...state, activeProjectId: action.payload };

    case 'ADD_TO_FAVORITES':
      if (state.favorites.includes(action.payload)) return state;
      return { ...state, favorites: [...state.favorites, action.payload] };

    case 'REMOVE_FROM_FAVORITES':
      return { ...state, favorites: state.favorites.filter(id => id !== action.payload) };

    case 'CREATE_TEMPLATE':
      return {
        ...state,
        templates: { ...state.templates, [action.payload.id]: action.payload }
      };

    case 'RESTORE_STATE':
      return action.payload;

    default:
      return state;
  }
};

// ====== Estado inicial ======
const initialState: ProjectManagerState = {
  projects: {},
  templates: {
    'residential': {
      id: 'residential',
      name: 'Casa Residencial',
      description: 'Plantilla para construcción de casas residenciales',
      apus: ['01-010', '02-020', '03-020', '03-030'],
      defaultSettings: { gg: 0.18, util: 0.20, iva: 0.19 }
    },
    'commercial': {
      id: 'commercial',
      name: 'Edificio Comercial',
      description: 'Plantilla para construcción comercial',
      apus: ['01-010', '02-020', '03-020', '03-030', '04-010'],
      defaultSettings: { gg: 0.15, util: 0.18, iva: 0.19 }
    }
  },
  activeProjectId: null,
  favorites: [],
  recentProjects: []
};

// ====== Context ======
const ProjectManagerContext = createContext<{
  state: ProjectManagerState;
  dispatch: React.Dispatch<ProjectManagerAction>;
  createProject: (name: string, description: string, templateId?: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  toggleFavorite: (id: string) => void;
  createTemplate: (name: string, description: string, apuIds: string[]) => void;
  compareProjects: (projectIds: string[]) => ProjectComparison;
  exportProject: (id: string) => void;
  importProject: (projectData: Project) => void;
} | null>(null);

// ====== Provider ======
export const ProjectManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(projectManagerReducer, initialState);

  // Persistencia en localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('apu-projects');
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        // Convertir strings de fecha de vuelta a Date objects
        Object.values(parsedState.projects).forEach((project: any) => {
          project.createdAt = new Date(project.createdAt);
          project.updatedAt = new Date(project.updatedAt);
        });
        dispatch({ type: 'RESTORE_STATE', payload: parsedState });
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('apu-projects', JSON.stringify(state));
  }, [state]);

  const createProject = useCallback((name: string, description: string, templateId?: string) => {
    const template = templateId ? state.templates[templateId] : null;
    const newProject: Project = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      budget: [],
      customApus: [],
      settings: template?.defaultSettings || { gg: 0.18, util: 0.20, iva: 0.19 },
      metadata: {
        status: 'draft',
        totalCost: 0
      },
      tags: template ? [template.name] : []
    };
    dispatch({ type: 'CREATE_PROJECT', payload: newProject });
  }, [state.templates]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id, updates } });
  }, []);

  const deleteProject = useCallback((id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este proyecto?')) {
      dispatch({ type: 'DELETE_PROJECT', payload: id });
    }
  }, []);

  const setActiveProject = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_PROJECT', payload: id });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    if (state.favorites.includes(id)) {
      dispatch({ type: 'REMOVE_FROM_FAVORITES', payload: id });
    } else {
      dispatch({ type: 'ADD_TO_FAVORITES', payload: id });
    }
  }, [state.favorites]);

  const createTemplate = useCallback((name: string, description: string, apuIds: string[]) => {
    const template: ProjectTemplate = {
      id: `template-${Date.now()}`,
      name,
      description,
      apus: apuIds,
      defaultSettings: { gg: 0.18, util: 0.20, iva: 0.19 }
    };
    dispatch({ type: 'CREATE_TEMPLATE', payload: template });
  }, []);

  const compareProjects = useCallback((projectIds: string[]): ProjectComparison => {
    const projects = projectIds.map(id => state.projects[id]).filter(Boolean);
    
    return {
      projects,
      metrics: {
        totalCosts: projects.map(p => p.metadata.totalCost || 0),
        itemCounts: projects.map(p => p.budget.length),
        costPerM2: projects.map(p => {
          const area = p.budget.reduce((sum, item) => sum + (item.metrados || 0), 0);
          return area > 0 ? (p.metadata.totalCost || 0) / area : 0;
        }),
        variations: projects.map((p, i) => {
          if (i === 0) return 0;
          const baseCost = projects[0].metadata.totalCost || 1;
          const currentCost = p.metadata.totalCost || 0;
          return ((currentCost - baseCost) / baseCost) * 100;
        })
      }
    };
  }, [state.projects]);

  const exportProject = useCallback((id: string) => {
    const project = state.projects[id];
    if (project) {
      const dataStr = JSON.stringify(project, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_proyecto.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [state.projects]);

  const importProject = useCallback((projectData: Project) => {
    const importedProject = {
      ...projectData,
      id: `imported-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    dispatch({ type: 'CREATE_PROJECT', payload: importedProject });
  }, []);

  const contextValue = {
    state,
    dispatch,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
    toggleFavorite,
    createTemplate,
    compareProjects,
    exportProject,
    importProject
  };

  return (
    <ProjectManagerContext.Provider value={contextValue}>
      {children}
    </ProjectManagerContext.Provider>
  );
};

// ====== Hook personalizado ======
export const useProjectManager = () => {
  const context = useContext(ProjectManagerContext);
  if (!context) {
    throw new Error('useProjectManager must be used within a ProjectManagerProvider');
  }
  return context;
};

// ====== Componente de tarjeta de proyecto ======
interface ProjectCardProps {
  project: Project;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onExport: () => void;
  onEdit?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isActive,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onDelete,
  onExport,
  onEdit
}) => {
  const statusColors = {
    draft: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    active: 'bg-green-500/10 text-green-600 border-green-500/20',
    completed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    archived: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
  };

  const statusLabels = {
    draft: 'Borrador',
    active: 'Activo',
    completed: 'Completado',
    archived: 'Archivado'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative bg-white dark:bg-slate-800 rounded-xl p-6 border-2 transition-all cursor-pointer ${
        isActive 
          ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
      onClick={onSelect}
    >
      {/* Header con favorito */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {project.name}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {project.description}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="ml-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <span className={`text-lg ${isFavorite ? 'text-red-500' : 'text-slate-400'}`}>
            {isFavorite ? '❤️' : '🤍'}
          </span>
        </button>
      </div>

      {/* Status y metadatos */}
      <div className="flex items-center justify-between mb-4">
        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${statusColors[project.metadata.status]}`}>
          {statusLabels[project.metadata.status]}
        </span>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {project.budget.length} partidas
        </div>
      </div>

      {/* Información adicional */}
      {project.metadata.client && (
        <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          👤 {project.metadata.client}
        </div>
      )}
      
      {project.metadata.location && (
        <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          📍 {project.metadata.location}
        </div>
      )}

      {project.metadata.totalCost && (
        <div className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4">
          ${project.metadata.totalCost.toLocaleString('es-CL')}
        </div>
      )}

      {/* Tags */}
      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {project.tags.map(tag => (
            <span 
              key={tag}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs rounded-lg text-slate-600 dark:text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer con fechas */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4">
        <span>Creado: {project.createdAt.toLocaleDateString('es-CL')}</span>
        <span>Modificado: {project.updatedAt.toLocaleDateString('es-CL')}</span>
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 text-sm rounded-lg transition-colors"
          >
            ✏️ Editar
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExport();
          }}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          📤 Exportar
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
        >
          🗑️
        </button>
      </div>
    </motion.div>
  );
};

// ====== Modal de creación de proyecto ======
interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string, description: string, templateId?: string) => void;
  templates: Record<string, ProjectTemplate>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  templates
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateProject(name.trim(), description.trim(), selectedTemplate || undefined);
      setName('');
      setDescription('');
      setSelectedTemplate('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Crear Nuevo Proyecto
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder="Ej: Casa Los Álamos"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder="Descripción del proyecto..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Plantilla (Opcional)
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Sin plantilla</option>
                  {Object.values(templates).map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
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
                  Crear Proyecto
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};