import React from 'react';
import type { TabType } from '../types';
import { LandmarkRegion } from '../hooks/accessibility';
import { useAppHeader } from '../hooks/useAppHeader';

interface AppHeaderProps {
  tab: TabType;
}

export const AppHeader: React.FC<AppHeaderProps> = React.memo(({ tab }) => {
  const { title, subtitle, ariaLabel, toolbarLabel, badge } = useAppHeader(tab);

  return (
    <LandmarkRegion role="banner" ariaLabel={ariaLabel}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" id="main-heading">
            {title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        <div
          className="flex flex-wrap items-center gap-2"
          role="toolbar"
          aria-label={toolbarLabel}
        >
          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
            {badge}
          </span>
        </div>
      </div>
    </LandmarkRegion>
  );
});

AppHeader.displayName = 'AppHeader';
