import { useMemo } from 'react';
import type { TabType } from '../types';

interface HeaderConfig {
  title: string;
  subtitle: string;
  toolbarLabel: string;
  ariaLabel: string;
  badge: string;
}

const TAB_COPY: Record<TabType, Omit<HeaderConfig, 'toolbarLabel' | 'ariaLabel' | 'badge'>> = {
  apu: {
    title: 'Analisis de Precios Unitarios',
    subtitle: 'Define rendimientos, recursos y costos unitarios con precision.',
  },
  presupuesto: {
    title: 'Presupuestos Ejecutivos',
    subtitle: 'Construye escenarios financieros y valida margenes al instante.',
  },
  projects: {
    title: 'Gestion de Proyectos',
    subtitle: 'Administra estados, plantillas y reportes listos para compartir.',
  },
};

export const useAppHeader = (tab: TabType): HeaderConfig => {
  return useMemo(() => {
    const content = TAB_COPY[tab] ?? TAB_COPY.projects;
    return {
      title: content.title,
      subtitle: content.subtitle,
      toolbarLabel: 'Acciones principales',
      ariaLabel: `Encabezado principal para ${content.title.toLowerCase()}`,
  badge: '',
    };
  }, [tab]);
};
