import React, { createContext, useContext, useState, useEffect } from 'react';

// ====== Definición de temas ======

export type Theme = 'dark' | 'light';

export interface ThemeColors {
  // Colores de fondo principales
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    card: string;
    input: string;
  };
  // Colores de texto
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
  };
  // Colores de borde
  border: {
    primary: string;
    secondary: string;
    focus: string;
  };
  // Colores de estado
  status: {
    success: string;
    error: string;
    warning: string;
    info: string;
  };
  // Colores de UI
  ui: {
    hover: string;
    active: string;
    disabled: string;
  };
}

export const darkTheme: ThemeColors = {
  bg: {
    primary: '#0f172a',     // slate-900
    secondary: '#1e293b',   // slate-800
    tertiary: '#334155',    // slate-700
    card: '#1e293b',        // slate-800
    input: '#0f172a',       // slate-900
  },
  text: {
    primary: '#f1f5f9',     // slate-100
    secondary: '#cbd5e1',   // slate-300
    tertiary: '#94a3b8',    // slate-400
    muted: '#64748b',       // slate-500
  },
  border: {
    primary: '#475569',     // slate-600
    secondary: '#334155',   // slate-700
    focus: '#0ea5e9',       // sky-500
  },
  status: {
    success: '#22c55e',     // green-500
    error: '#ef4444',       // red-500
    warning: '#f59e0b',     // amber-500
    info: '#3b82f6',        // blue-500
  },
  ui: {
    hover: '#334155',       // slate-700
    active: '#0f172a',      // slate-900
    disabled: '#64748b',    // slate-500
  }
};

export const lightTheme: ThemeColors = {
  bg: {
    primary: '#ffffff',     // white
    secondary: '#f8fafc',   // slate-50
    tertiary: '#f1f5f9',    // slate-100
    card: '#ffffff',        // white
    input: '#f8fafc',       // slate-50
  },
  text: {
    primary: '#0f172a',     // slate-900
    secondary: '#334155',   // slate-700
    tertiary: '#64748b',    // slate-500
    muted: '#94a3b8',       // slate-400
  },
  border: {
    primary: '#cbd5e1',     // slate-300
    secondary: '#e2e8f0',   // slate-200
    focus: '#0ea5e9',       // sky-500
  },
  status: {
    success: '#16a34a',     // green-600
    error: '#dc2626',       // red-600
    warning: '#d97706',     // amber-600
    info: '#2563eb',        // blue-600
  },
  ui: {
    hover: '#f1f5f9',       // slate-100
    active: '#e2e8f0',      // slate-200
    disabled: '#cbd5e1',    // slate-300
  }
};

// ====== Context del tema ======

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ====== Provider del tema ======

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'dark' 
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Intentar cargar desde localStorage
    try {
      const saved = localStorage.getItem('apu-theme');
      return (saved as Theme) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const colors = theme === 'dark' ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  // Guardar en localStorage cuando cambie el tema
  useEffect(() => {
    try {
      localStorage.setItem('apu-theme', theme);
    } catch (error) {
      console.warn('No se pudo guardar el tema:', error);
    }
  }, [theme]);

  // Aplicar variables CSS personalizadas
  useEffect(() => {
    const root = document.documentElement;
    
    // Aplicar colores del tema como variables CSS
    Object.entries(colors.bg).forEach(([key, value]) => {
      root.style.setProperty(`--color-bg-${key}`, value);
    });
    
    Object.entries(colors.text).forEach(([key, value]) => {
      root.style.setProperty(`--color-text-${key}`, value);
    });
    
    Object.entries(colors.border).forEach(([key, value]) => {
      root.style.setProperty(`--color-border-${key}`, value);
    });
    
    Object.entries(colors.status).forEach(([key, value]) => {
      root.style.setProperty(`--color-status-${key}`, value);
    });
    
    Object.entries(colors.ui).forEach(([key, value]) => {
      root.style.setProperty(`--color-ui-${key}`, value);
    });

    // Agregar clase del tema al body
    document.body.className = theme;
  }, [colors, theme]);

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ====== Hook para usar el tema ======

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};

// ====== Utilidades para generar clases CSS dinámicas ======

export const getThemeClasses = (theme: Theme) => {
  if (theme === 'light') {
    return {
      // Fondos
      bgPrimary: 'bg-white',
      bgSecondary: 'bg-slate-50',
      bgTertiary: 'bg-slate-100',
      bgCard: 'bg-white',
      bgInput: 'bg-slate-50',
      
      // Textos
      textPrimary: 'text-slate-900',
      textSecondary: 'text-slate-700',
      textTertiary: 'text-slate-500',
      textMuted: 'text-slate-400',
      
      // Bordes
      borderPrimary: 'border-slate-300',
      borderSecondary: 'border-slate-200',
      borderFocus: 'border-sky-500',
      
      // Estados
      hover: 'hover:bg-slate-100',
      active: 'active:bg-slate-200',
      
      // Sombras
      shadow: 'shadow-lg shadow-slate-200/50',
    };
  }
  
  // Tema oscuro (por defecto)
  return {
    // Fondos
    bgPrimary: 'bg-slate-900',
    bgSecondary: 'bg-slate-800',
    bgTertiary: 'bg-slate-700',
    bgCard: 'bg-slate-800',
    bgInput: 'bg-slate-900',
    
    // Textos
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-300',
    textTertiary: 'text-slate-400',
    textMuted: 'text-slate-500',
    
    // Bordes
    borderPrimary: 'border-slate-600',
    borderSecondary: 'border-slate-700',
    borderFocus: 'border-sky-500',
    
    // Estados
    hover: 'hover:bg-slate-700',
    active: 'active:bg-slate-900',
    
    // Sombras
    shadow: 'shadow-lg shadow-slate-900/50',
  };
};