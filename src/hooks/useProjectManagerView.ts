import { useState, useMemo, useCallback } from 'react';
import {
  useProjectManager,
  Project,
} from './projectManager';

type FilterStatus = 'all' | 'favorites' | 'draft' | 'active' | 'completed' | 'archived';
type SortBy = 'name' | 'created' | 'updated' | 'cost';

export interface ProjectMetadataUpdates {
  client?: string;
  location?: string;
  logoDataUrl?: string;
  signer1Name?: string;
  signer1Role?: string;
  signer2Name?: string;
  signer2Role?: string;
}

export const useProjectManagerView = () => {
  const {
    state,
    createProject,
    setActiveProject,
    toggleFavorite,
    deleteProject,
    exportProject,
    updateProject,
    compareProjects,
  } = useProjectManager();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const totalProjects = useMemo(
    () => Object.keys(state.projects).length,
    [state.projects],
  );

  const filteredAndSortedProjects = useMemo(() => {
    let projects = Object.values(state.projects);

    if (searchTerm) {
      const normalized = searchTerm.toLowerCase();
      projects = projects.filter((project) => {
        const nameMatch = project.name.toLowerCase().includes(normalized);
        const descriptionMatch = project.description.toLowerCase().includes(normalized);
        const clientMatch = project.metadata.client?.toLowerCase().includes(normalized);
        const tagMatch = project.tags.some((tag) => tag.toLowerCase().includes(normalized));
        return nameMatch || descriptionMatch || clientMatch || tagMatch;
      });
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'favorites') {
        projects = projects.filter((project) => state.favorites.includes(project.id));
      } else {
        projects = projects.filter((project) => project.metadata.status === filterStatus);
      }
    }

    projects.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'cost':
          return (b.metadata.totalCost ?? 0) - (a.metadata.totalCost ?? 0);
        case 'updated':
        default:
          return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
    });

    return projects;
  }, [state.projects, state.favorites, searchTerm, filterStatus, sortBy]);

  const toggleSelectionForComparison = useCallback((projectId: string) => {
    setSelectedForComparison((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  }, []);

  const selectedProjectsForComparison = useMemo(
    () =>
      selectedForComparison
        .map((id) => state.projects[id])
        .filter(Boolean) as Project[],
    [selectedForComparison, state.projects],
  );

  const canStartComparison = selectedForComparison.length >= 2;

  const startComparison = useCallback(() => {
    if (selectedForComparison.length >= 2) {
      setShowComparison(true);
    }
  }, [selectedForComparison]);

  const closeComparison = useCallback(() => {
    setShowComparison(false);
  }, []);

  const openCreateModal = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const openMetadataModal = useCallback((project: Project) => {
    setEditingProject(project);
    setShowMetaModal(true);
  }, []);

  const closeMetadataModal = useCallback(() => {
    setShowMetaModal(false);
    setEditingProject(null);
  }, []);

  const updateFilterStatus = useCallback((next: FilterStatus) => {
    setFilterStatus(next);
  }, []);

  const updateSortBy = useCallback((next: SortBy) => {
    setSortBy(next);
  }, []);

  const saveProjectMetadata = useCallback(
    (updates: ProjectMetadataUpdates) => {
      if (!editingProject) {
        return;
      }

      const merged = {
        ...editingProject.metadata,
        client: updates.client,
        location: updates.location,
        logoDataUrl: updates.logoDataUrl,
        signer1Name: updates.signer1Name,
        signer1Role: updates.signer1Role,
        signer2Name: updates.signer2Name,
        signer2Role: updates.signer2Role,
      };

      updateProject(editingProject.id, { metadata: merged });
      setShowMetaModal(false);
      setEditingProject(null);
    },
    [editingProject, updateProject],
  );

  return {
    state,
    actions: {
      createProject,
      setActiveProject,
      toggleFavorite,
      deleteProject,
      exportProject,
      updateProject,
      compareProjects,
    },
    derived: {
      totalProjects,
      filteredAndSortedProjects,
      selectedProjectsForComparison,
      canStartComparison,
    },
    search: {
      term: searchTerm,
      setTerm: setSearchTerm,
    },
    filters: {
      status: filterStatus,
      setStatus: updateFilterStatus,
      sortBy,
      setSortBy: updateSortBy,
    },
    modals: {
      showCreateModal,
      openCreateModal,
      closeCreateModal,
      showComparison,
      startComparison,
      closeComparison,
      showMetaModal,
      openMetadataModal,
      closeMetadataModal,
    },
    comparison: {
      selectedIds: selectedForComparison,
      toggleSelectionForComparison,
    },
    editingProject,
    saveProjectMetadata,
  };
};
