import React, { useEffect, useCallback, useState, useRef } from 'react';

// ====== Hook para gestión de foco ======

export const useFocusManagement = () => {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  const focusElement = useCallback((element: HTMLElement | null) => {
    if (element) {
      element.focus();
      setFocusedElement(element);
    }
  }, []);

  return {
    focusedElement,
    trapFocus,
    saveFocus,
    restoreFocus,
    focusElement,
  };
};

// ====== Hook para navegación por teclado ======

export const useKeyboardNavigation = (
  items: HTMLElement[],
  options: {
    loop?: boolean;
    horizontal?: boolean;
    onSelect?: (index: number) => void;
  } = {}
) => {
  const { loop = true, horizontal = false, onSelect } = options;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';

    switch (e.key) {
      case nextKey:
        e.preventDefault();
        setCurrentIndex(prev => {
          const next = prev + 1;
          if (next >= items.length) {
            return loop ? 0 : prev;
          }
          return next;
        });
        break;

      case prevKey:
        e.preventDefault();
        setCurrentIndex(prev => {
          const next = prev - 1;
          if (next < 0) {
            return loop ? items.length - 1 : prev;
          }
          return next;
        });
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onSelect) {
          onSelect(currentIndex);
        }
        break;

      case 'Home':
        e.preventDefault();
        setCurrentIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setCurrentIndex(items.length - 1);
        break;
    }
  }, [items, loop, horizontal, onSelect, currentIndex]);

  useEffect(() => {
    if (items[currentIndex]) {
      items[currentIndex].focus();
    }
  }, [currentIndex, items]);

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown,
  };
};

// ====== Hook para anuncios a screen readers ======

export const useScreenReaderAnnouncements = () => {
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;
      
      // Limpiar el mensaje después de un tiempo para permitir nuevos anuncios
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  const AnnouncementRegion: React.FC = () => (
    <div
      ref={announceRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );

  return { announce, AnnouncementRegion };
};

// ====== Hook para detección de modo de navegación ======

export const useNavigationMode = () => {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    const handleMouseDown = () => setIsKeyboardUser(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return { isKeyboardUser };
};

// ====== Componente Skip Link ======

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ href, children }) => {
  return (
    <a
      href={href}
      className="
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
        bg-sky-500 text-white px-4 py-2 rounded-lg z-50 
        focus:outline-none focus:ring-2 focus:ring-sky-300
      "
    >
      {children}
    </a>
  );
};

// ====== Componente de región principal con landmarks ======

interface LandmarkRegionProps {
  children: React.ReactNode;
  role?: 'main' | 'navigation' | 'banner' | 'contentinfo' | 'complementary' | 'form';
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

export const LandmarkRegion: React.FC<LandmarkRegionProps> = ({
  children,
  role = 'main',
  ariaLabel,
  ariaLabelledBy,
}) => {
  const props: React.HTMLAttributes<HTMLElement> = {
    role,
    ...(ariaLabel && { 'aria-label': ariaLabel }),
    ...(ariaLabelledBy && { 'aria-labelledby': ariaLabelledBy }),
  };

  return React.createElement(
    role === 'main' ? 'main' : 
    role === 'navigation' ? 'nav' : 
    role === 'banner' ? 'header' :
    role === 'contentinfo' ? 'footer' : 'section',
    props,
    children
  );
};

// ====== Componente de formulario accesible ======

interface AccessibleFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  ariaLabel?: string;
  className?: string;
}

export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  children,
  onSubmit,
  ariaLabel,
  className = "",
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className={className}
      role="form"
      aria-label={ariaLabel}
      noValidate
    >
      {children}
    </form>
  );
};

// ====== Input accesible mejorado ======

interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  showRequiredIndicator?: boolean;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  label,
  error,
  description,
  required,
  showRequiredIndicator = true,
  id,
  className = "",
  ...props
}) => {
  const autoIdRef = useRef<string>(`input-${Math.random().toString(36).substr(2, 9)}`);
  const inputId = id || autoIdRef.current;
  const errorId = error ? `${inputId}-error` : undefined;
  const descriptionId = description ? `${inputId}-description` : undefined;

  const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      <label 
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
        {required && showRequiredIndicator && (
          <span 
            className="text-red-400 ml-1" 
            aria-label="obligatorio"
          >
            *
          </span>
        )}
      </label>
      
      {description && (
        <div 
          id={descriptionId}
          className="text-sm text-slate-400"
        >
          {description}
        </div>
      )}
      
      <input
        id={inputId}
        className={`
          w-full px-3 py-2 rounded-xl border transition-all duration-200
          bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100
          placeholder-slate-400 dark:placeholder-slate-500
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
          ${error 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-slate-300 dark:border-slate-600 focus:ring-sky-500'
          }
          ${className}
        `}
        aria-describedby={ariaDescribedBy}
        aria-invalid={error ? 'true' : 'false'}
        aria-required={required}
        {...props}
      />
      
      {error && (
        <div 
          id={errorId}
          className="text-red-400 text-sm"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  );
};

// ====== Select accesible mejorado ======

interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string; disabled?: boolean }[];
  error?: string;
  description?: string;
  required?: boolean;
  showRequiredIndicator?: boolean;
  placeholder?: string;
}

export const AccessibleSelect: React.FC<AccessibleSelectProps> = ({
  label,
  options,
  error,
  description,
  required,
  showRequiredIndicator = true,
  placeholder,
  id,
  className = "",
  ...props
}) => {
  const autoIdRef = useRef<string>(`select-${Math.random().toString(36).substr(2, 9)}`);
  const selectId = id || autoIdRef.current;
  const errorId = error ? `${selectId}-error` : undefined;
  const descriptionId = description ? `${selectId}-description` : undefined;

  const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      <label 
        htmlFor={selectId}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
        {required && showRequiredIndicator && (
          <span 
            className="text-red-400 ml-1" 
            aria-label="obligatorio"
          >
            *
          </span>
        )}
      </label>
      
      {description && (
        <div 
          id={descriptionId}
          className="text-sm text-slate-400"
        >
          {description}
        </div>
      )}
      
      <select
        id={selectId}
        className={`
          w-full px-3 py-2 rounded-xl border transition-all duration-200
          bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
          ${error 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-slate-300 dark:border-slate-600 focus:ring-sky-500'
          }
          ${className}
        `}
        aria-describedby={ariaDescribedBy}
        aria-invalid={error ? 'true' : 'false'}
        aria-required={required}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <div 
          id={errorId}
          className="text-red-400 text-sm"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  );
};

// ====== Botón accesible con estados ======

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  ariaLabel,
  ariaDescribedBy,
  disabled,
  className = "",
  ...props
}) => {
  const baseStyles = "rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles = {
    primary: "bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-300",
    secondary: "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 focus:ring-slate-300",
    danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-300",
    success: "bg-green-500 hover:bg-green-600 text-white focus:ring-green-300",
  };
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  
  const buttonClass = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;
  
  return (
    <button
      className={buttonClass}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
            aria-hidden="true"
          />
          <span>Cargando...</span>
          <span className="sr-only">Procesando, por favor espere</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

// ====== Clases utilitarias para screen readers ======

export const srOnlyClasses = "sr-only";
export const focusVisibleClasses = "focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50";

// ====== Utilidad para generar IDs únicos ======

export const generateId = (prefix: string = 'id') => 
  `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

// ====== Hook para validar contraste de colores ======

export const useColorContrast = () => {
  const calculateContrast = useCallback((color1: string, color2: string): number => {
    // Función simplificada para calcular contraste
    // En una implementación real, usarías una librería como chroma-js
    const getLuminance = (color: string): number => {
      // Conversión simplificada - en producción usar algoritmo WCAG completo
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }, []);

  const meetsWCAG = useCallback((contrast: number, level: 'AA' | 'AAA' = 'AA'): boolean => {
    return level === 'AA' ? contrast >= 4.5 : contrast >= 7;
  }, []);

  return { calculateContrast, meetsWCAG };
};