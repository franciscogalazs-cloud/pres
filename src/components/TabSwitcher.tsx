import React from 'react';
import { motion } from 'framer-motion';
import type { TabType } from '../types';
import { useAnimation, hoverAnimations } from '../contexts/AnimationContext';

interface TabSwitcherProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TabSwitcher: React.FC<TabSwitcherProps> = React.memo(({ 
  activeTab, 
  onTabChange 
}) => {
  const { reducedMotion } = useAnimation();
  const tabsRef = React.useRef<HTMLDivElement>(null);
  
  const tabs = ['apu', 'presupuesto', 'projects'] as const;
  const currentIndex = tabs.indexOf(activeTab);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        onTabChange(tabs[prevIndex]);
        break;
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        onTabChange(tabs[nextIndex]);
        break;
    }
  };
  
  const TabButton = reducedMotion ? 'button' : motion.button;
  const tabMotionProps = reducedMotion ? {} : {
    ...hoverAnimations.button,
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
  };
  
  return (
    <div 
      ref={tabsRef}
      className="flex gap-2 bg-slate-800 p-1 rounded-2xl w-fit relative"
      role="tablist"
      aria-label="Navegación entre secciones"
      onKeyDown={handleKeyDown}
    >
      {/* Indicador de tab activo */}
      {!reducedMotion && (
        <motion.div
          className="absolute top-1 bottom-1 bg-slate-900 rounded-xl"
          initial={false}
          animate={{
            left: activeTab === 'apu' ? 4 : 
                  activeTab === 'presupuesto' ? 'calc(33.33% + 1px)' : 
                  'calc(66.66% + 1px)',
            width: 'calc(33.33% - 6px)',
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      
      <TabButton 
        onClick={() => onTabChange('apu')} 
        className={`px-3 py-1 rounded-xl transition-colors relative z-10 ${
          activeTab === 'apu' ? 'bg-slate-900 text-white' : 'hover:bg-slate-700 text-slate-300'
        }`}
        role="tab"
        aria-selected={activeTab === 'apu'}
        aria-controls="apu-panel"
        id="apu-tab"
        tabIndex={activeTab === 'apu' ? 0 : -1}
        {...tabMotionProps}
      >
        APU
      </TabButton>
      <TabButton 
        onClick={() => onTabChange('presupuesto')} 
        className={`px-3 py-1 rounded-xl transition-colors relative z-10 ${
          activeTab === 'presupuesto' ? 'bg-slate-900 text-white' : 'hover:bg-slate-700 text-slate-300'
        }`}
        role="tab"
        aria-selected={activeTab === 'presupuesto'}
        aria-controls="presupuesto-panel"
        id="presupuesto-tab"
        tabIndex={activeTab === 'presupuesto' ? 0 : -1}
        {...tabMotionProps}
      >
        Presupuesto
      </TabButton>

      <TabButton 
        onClick={() => onTabChange('projects')} 
        className={`px-3 py-1 rounded-xl transition-colors relative z-10 ${
          activeTab === 'projects' ? 'bg-slate-900 text-white' : 'hover:bg-slate-700 text-slate-300'
        }`}
        role="tab"
        aria-selected={activeTab === 'projects'}
        aria-controls="projects-panel"
        id="projects-tab"
        tabIndex={activeTab === 'projects' ? 0 : -1}
        {...tabMotionProps}
      >
        🏗️ Proyectos
      </TabButton>
    </div>
  );
});

TabSwitcher.displayName = 'TabSwitcher';