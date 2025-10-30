import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ====== Context para sistema de ayuda ======
interface HelpContextType {
  isTooltipEnabled: boolean;
  setTooltipEnabled: (enabled: boolean) => void;
  isTourActive: boolean;
  startTour: () => void;
  stopTour: () => void;
  currentTourStep: number;
  nextTourStep: () => void;
  prevTourStep: () => void;
}

const HelpContext = createContext<HelpContextType | null>(null);

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (!context) throw new Error('useHelp must be used within HelpProvider');
  return context;
};

// ====== Datos del tour ======
export interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'none';
}

export const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: '¡Bienvenido a APU Presupuestos!',
    content: 'Haremos un tour corto: crear proyecto, agregar APU, imprimir/exportar y atajos clave.',
    target: 'body',
    position: 'bottom'
  },
  {
    id: 'new-project',
    title: 'Crear proyecto',
    content: 'Empieza aquí con “Nuevo proyecto”. Podrás nombrarlo y guardar su información básica.',
    target: '[data-tour="new-project"]',
    position: 'bottom'
  },
  {
    id: 'add-apu',
    title: 'Agregar APU',
    content: 'Desde la Biblioteca, crea o selecciona APUs. Usa etiquetas/filtros para encontrar rápido.',
    target: '[data-tour="add-apu"]',
    position: 'bottom'
  },
  {
    id: 'print-export',
    title: 'Imprimir y Exportar',
    content: 'Genera documentos listos para cliente: “Imprimir” (A4) o “Exportar Excel”.',
    target: '[data-tour="print-button"]',
    position: 'left'
  },
  {
    id: 'shortcuts',
    title: 'Atajos de teclado',
    content: 'Presiona F1 para ver la hoja de atajos. Tip: Ctrl+1/2 cambia pestañas, Ctrl+F busca.',
    target: '[data-tour="help-button"]',
    position: 'left'
  }
];

// ====== Provider del sistema de ayuda ======
export const HelpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTooltipEnabled, setTooltipEnabled] = useState(true);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);

  const startTour = () => {
    setIsTourActive(true);
    setCurrentTourStep(0);
  };

  const stopTour = () => {
    setIsTourActive(false);
    setCurrentTourStep(0);
  };

  const nextTourStep = () => {
    if (currentTourStep < tourSteps.length - 1) {
      setCurrentTourStep(current => current + 1);
    } else {
      stopTour();
    }
  };

  const prevTourStep = () => {
    if (currentTourStep > 0) {
      setCurrentTourStep(current => current - 1);
    }
  };

  // Auto-start tour for new users
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('apu-tour-completed');
    if (!hasSeenTour) {
      setTimeout(startTour, 1000); // Delay to ensure DOM is ready
    }
  }, []);

  const contextValue = {
    isTooltipEnabled,
    setTooltipEnabled,
    isTourActive,
    startTour,
    stopTour,
    currentTourStep,
    nextTourStep,
    prevTourStep
  };

  return (
    <HelpContext.Provider value={contextValue}>
      {children}
      <TourOverlay />
    </HelpContext.Provider>
  );
};

// ====== Componente Tooltip ======
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 500,
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const { isTooltipEnabled } = useHelp();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<any>();

  const showTooltip = () => {
    if (disabled || !isTooltipEnabled) return;
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Calculate optimal position
      if (triggerRef.current && tooltipRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight
        };

        let newPosition = position;
        
        // Check if tooltip would go outside viewport and adjust
        if (position === 'top' && rect.top - tooltipRect.height < 10) {
          newPosition = 'bottom';
        } else if (position === 'bottom' && rect.bottom + tooltipRect.height > viewport.height - 10) {
          newPosition = 'top';
        } else if (position === 'left' && rect.left - tooltipRect.width < 10) {
          newPosition = 'right';
        } else if (position === 'right' && rect.right + tooltipRect.width > viewport.width - 10) {
          newPosition = 'left';
        }
        
        setActualPosition(newPosition);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTooltipStyles = () => {
    const baseStyles = 'absolute z-50 px-3 py-2 text-sm bg-slate-800 text-white rounded-lg shadow-lg border border-slate-600 max-w-xs';
    const positionStyles = {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
    };
    
    return `${baseStyles} ${positionStyles[actualPosition]}`;
  };

  const getArrowStyles = () => {
    const baseStyles = 'absolute w-2 h-2 bg-slate-800 border border-slate-600 transform rotate-45';
    const positionStyles = {
      top: 'top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-t-0 border-l-0',
      bottom: 'bottom-full left-1/2 transform -translate-x-1/2 translate-y-1/2 border-b-0 border-r-0',
      left: 'left-full top-1/2 transform -translate-y-1/2 translate-x-1/2 border-l-0 border-b-0',
      right: 'right-full top-1/2 transform -translate-y-1/2 -translate-x-1/2 border-r-0 border-t-0'
    };
    
    return `${baseStyles} ${positionStyles[actualPosition]}`;
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={getTooltipStyles()}
            role="tooltip"
          >
            {content}
            <div className={getArrowStyles()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ====== Overlay del tour ======
const TourOverlay: React.FC = () => {
  const { isTourActive, currentTourStep, nextTourStep, prevTourStep, stopTour } = useHelp();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  const currentStep = tourSteps[currentTourStep];

  useEffect(() => {
    if (!isTourActive || !currentStep) return;

    const findTarget = () => {
      const element = document.querySelector(currentStep.target) as HTMLElement;
      if (element) {
        setTargetElement(element);
        const rect = element.getBoundingClientRect();
        setHighlightStyle({
          position: 'fixed',
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          zIndex: 1000
        });
      }
    };

    // Try to find target immediately
    findTarget();
    
    // If not found, retry after a short delay
    const timeout = setTimeout(findTarget, 100);
    
    return () => clearTimeout(timeout);
  }, [isTourActive, currentStep]);

  const completeTour = () => {
    localStorage.setItem('apu-tour-completed', 'true');
    stopTour();
  };

  if (!isTourActive || !currentStep) return null;

  return (
    <>
      {/* Background overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-[999]"
        onClick={stopTour}
      />

      {/* Highlight circle */}
      {targetElement && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={highlightStyle}
          className="rounded-lg border-2 border-sky-400 shadow-lg shadow-sky-400/20 pointer-events-none"
        />
      )}

      {/* Tour step content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[1001] w-full max-w-md px-4"
      >
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {currentStep.title}
            </h3>
            <button
              onClick={stopTour}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ✕
            </button>
          </div>
          
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            {currentStep.content}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentTourStep
                      ? 'bg-sky-500'
                      : index < currentTourStep
                      ? 'bg-sky-300'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>

            <div className="flex space-x-2">
              {currentTourStep > 0 && (
                <button
                  onClick={prevTourStep}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"
                >
                  Anterior
                </button>
              )}
              
              {currentTourStep < tourSteps.length - 1 ? (
                <button
                  onClick={nextTourStep}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={completeTour}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
                >
                  Finalizar
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

// ====== Panel de ayuda ======
export const HelpPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isTooltipEnabled, setTooltipEnabled, startTour } = useHelp();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-sky-500 hover:bg-sky-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40"
        title="Ayuda"
        data-tour="help-button"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl shadow-xl z-51 w-full max-w-md mx-4"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Centro de Ayuda
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                      Tour Guiado
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Recorre las funciones principales de la aplicación
                    </p>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        startTour();
                      }}
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 px-4 rounded-lg font-medium"
                    >
                      Iniciar Tour
                    </button>
                  </div>

                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                      Configuración
                    </h3>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isTooltipEnabled}
                        onChange={(e) => setTooltipEnabled(e.target.checked)}
                        className="w-4 h-4 text-sky-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Mostrar tooltips de ayuda
                      </span>
                    </label>
                  </div>

                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                      Atajos de Teclado
                    </h3>
                    <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Cambiar a APU:</span>
                        <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">Ctrl+1</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Cambiar a Presupuesto:</span>
                        <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">Ctrl+2</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Ver todos los atajos:</span>
                        <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">F1</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full mt-6 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 py-2 px-4 rounded-lg font-medium"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};