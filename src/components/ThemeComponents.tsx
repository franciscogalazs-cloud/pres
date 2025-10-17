import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

// ====== Toggle de tema ======

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = React.memo(({ 
  className = "", 
  showLabel = false 
}) => {
  const { theme, toggleTheme } = useTheme();
  
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex items-center gap-2 px-3 py-2 rounded-xl
        bg-slate-200 dark:bg-slate-700 
        hover:bg-slate-300 dark:hover:bg-slate-600
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2
        focus:ring-offset-white dark:focus:ring-offset-slate-900
        ${className}
      `}
      title={`Cambiar a tema ${isDark ? 'claro' : 'oscuro'}`}
      data-tour="theme-toggle"
    >
      {/* Contenedor del switch */}
      <div className="relative w-12 h-6 bg-slate-300 dark:bg-slate-600 rounded-full transition-colors duration-200">
        {/* Indicador deslizante */}
        <div 
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md
            transform transition-transform duration-200 ease-in-out
            ${isDark ? 'translate-x-6' : 'translate-x-0'}
          `}
        >
          {/* Ícono del tema actual */}
          <div className="w-full h-full flex items-center justify-center">
            {isDark ? (
              <span className="text-slate-700 text-xs">🌙</span>
            ) : (
              <span className="text-yellow-500 text-xs">☀️</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Label opcional */}
      {showLabel && (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {isDark ? 'Oscuro' : 'Claro'}
        </span>
      )}
    </button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';

// ====== Selector de tema con opciones múltiples ======

interface ThemeSelectorProps {
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = React.memo(({ 
  className = "" 
}) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`flex gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-xl ${className}`}>
      <button
        onClick={() => setTheme('light')}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 ease-in-out
          ${theme === 'light' 
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm' 
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }
        `}
      >
        <span>☀️</span>
        <span>Claro</span>
      </button>
      
      <button
        onClick={() => setTheme('dark')}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 ease-in-out
          ${theme === 'dark' 
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm' 
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }
        `}
      >
        <span>🌙</span>
        <span>Oscuro</span>
      </button>
    </div>
  );
});

ThemeSelector.displayName = 'ThemeSelector';

// ====== Componente de demo para mostrar colores del tema ======

export const ThemePreview: React.FC = React.memo(() => {
  const { theme, colors } = useTheme();

  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Preview del Tema: {theme === 'dark' ? 'Oscuro' : 'Claro'}
      </h3>
      
      {/* Paleta de colores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">Fondos</h4>
          {Object.entries(colors.bg).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600" 
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">{key}</span>
            </div>
          ))}
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">Textos</h4>
          {Object.entries(colors.text).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600" 
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">{key}</span>
            </div>
          ))}
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">Estados</h4>
          {Object.entries(colors.status).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600" 
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">{key}</span>
            </div>
          ))}
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">UI</h4>
          {Object.entries(colors.ui).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600" 
                style={{ backgroundColor: color }}
              />                      
              <span className="text-xs text-slate-600 dark:text-slate-400">{key}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Componentes de ejemplo */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">Componentes</h4>
        
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-2 border border-slate-300 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Botón Primario
          </button>
          <button className="px-3 py-2 border border-slate-300 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Botón Secundario
          </button>
          <input 
            type="text" 
            placeholder="Input de ejemplo" 
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-600 rounded-lg">
            <div className="text-green-800 dark:text-green-400 text-sm font-medium">Éxito</div>
            <div className="text-green-600 dark:text-green-300 text-xs">Mensaje de éxito</div>
          </div>
          <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-600 rounded-lg">
            <div className="text-red-800 dark:text-red-400 text-sm font-medium">Error</div>
            <div className="text-red-600 dark:text-red-300 text-xs">Mensaje de error</div>
          </div>
        </div>
      </div>
    </div>
  );
});

ThemePreview.displayName = 'ThemePreview';