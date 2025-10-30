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
  optional?: boolean; // si true, omitir automáticamente si no se encuentra el target
}

export const tourSteps: TourStep[] = [
  // Bienvenida y tabs
  { id: 'welcome', title: '¡Bienvenido a APU Presupuestos!', content: 'Haremos un tour corto por Presupuesto, luego Biblioteca y terminamos en Calculadora.', target: 'body', position: 'bottom' },
  { id: 'tabs', title: 'Secciones principales', content: 'Cambia entre Biblioteca, Presupuesto y Calculadora con estas pestañas.', target: '[data-tour="tabs"]', position: 'bottom' },

  // Presupuesto primero
  { id: 'print-export', title: 'Imprimir presupuesto', content: 'Genera documentos listos para cliente desde “Imprimir”.', target: '[data-tour="print-button"]', position: 'left' },
  { id: 'export-excel', title: 'Exportar a Excel', content: 'Descarga tu presupuesto en Excel con hojas para Presupuesto y APUs usados.', target: '[data-tour="export-excel"]', position: 'left' },
  { id: 'save', title: 'Guardar presupuesto', content: 'Guarda el presupuesto y los metadatos del proyecto en tu navegador.', target: '[data-tour="save-button"]', position: 'left' },
  { id: 'clear', title: 'Borrar presupuesto', content: 'Elimina todo el presupuesto actual. Úsalo con cuidado: no se puede deshacer.', target: '[data-tour="clear-budget"]', position: 'left' },
  { id: 'new-project', title: 'Crear proyecto', content: 'Crea un nuevo proyecto y completa su información básica.', target: '[data-tour="new-project"]', position: 'bottom' },

  // Luego Biblioteca
  { id: 'add-apu', title: 'Agregar APU', content: 'Desde la Biblioteca, crea o selecciona APUs. Usa etiquetas/filtros para encontrar rápido.', target: '[data-tour="add-apu"]', position: 'bottom' },
  { id: 'search', title: 'Buscar en biblioteca', content: 'Escribe aquí para filtrar APUs por descripción o categoría.', target: '[data-tour="search-input"]', position: 'bottom' },

  // Atajos (global)
  { id: 'shortcuts', title: 'Atajos de teclado', content: 'F1 abre la ayuda y atajos. Tip: Ctrl+1/2 cambia pestañas, Ctrl+F busca.', target: '[data-tour="help-button"]', position: 'left' },

  // Finaliza en Calculadora
  { id: 'calc-metros', title: 'Define m² de la vivienda', content: 'Ajusta los m² para dimensionar el proyecto. Puedes escribir o usar el slider.', target: '[data-tour="calc-metros"]', position: 'bottom' },
  { id: 'calc-slider', title: 'Ajuste rápido con slider', content: 'Mueve el control para variar los m² en incrementos definidos.', target: '[data-tour="calc-slider"]', position: 'top' },
  { id: 'calc-gg', title: 'Gastos Generales (%)', content: 'Configura el porcentaje de GG aplicado al presupuesto.', target: '[data-tour="calc-gg"]', position: 'left' },
  { id: 'calc-util', title: 'Utilidad (%)', content: 'Define el margen de utilidad del proyecto.', target: '[data-tour="calc-util"]', position: 'left' },
  { id: 'calc-iva', title: 'IVA (%)', content: 'Incluye o ajusta el IVA para ver el total con impuestos.', target: '[data-tour="calc-iva"]', position: 'left' },
  { id: 'calc-presupuesto', title: 'Vista Presupuesto (Calculadora)', content: 'Ajusta subpartidas, agrega APUs sugeridos o búscalos manualmente.', target: '[data-tour="calc-presupuesto"]', position: 'top' },
  { id: 'calc-add-suggested', title: 'Agregar APU sugerido', content: 'Cuando haya una sugerencia disponible, puedes agregarla con un clic.', target: '[data-tour="calc-add-suggested"]', position: 'left', optional: true },
  { id: 'calc-save', title: 'Guardar cálculo', content: 'Guarda este estado de la calculadora para retomarlo más tarde.', target: '[data-tour="calc-save"]', position: 'left' },
  { id: 'calc-load', title: 'Cargar guardado', content: 'Carga un preset (como “Fosa”) o cualquiera de tus guardados.', target: '[data-tour="calc-load"]', position: 'left' }
];

// ====== Provider del sistema de ayuda ======
export const HelpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTooltipEnabled, setTooltipEnabled] = useState(true);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);

  const startTour = () => {
    try { localStorage.removeItem('apu-tour-completed'); } catch {}
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

  // Disable background scroll while tour is active
  useEffect(() => {
    const el = document.documentElement;
    if (!el) return;
    const prev = el.style.overflow;
    if (isTourActive) {
      el.style.overflow = 'hidden';
    }
    return () => { el.style.overflow = prev; };
  }, [isTourActive]);

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
  const [spotRect, setSpotRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const popRef = useRef<HTMLDivElement|null>(null);
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({});
  // no-op ref eliminado (no necesario)

  const currentStep = tourSteps[currentTourStep];

  // Cambiar automáticamente a la pestaña adecuada cuando un paso requiere "Biblioteca"
  useEffect(() => {
    if (!isTourActive || !currentStep) return;
    const requiresLibrary = new Set(['add-apu','search']);
    const requiresBudget = new Set(['export-excel','print-export','save','clear','new-project']);
  const requiresCalc = new Set(['calculator','calc','metrados','calc-metros','calc-slider','calc-gg','calc-util','calc-iva','calc-presupuesto','calc-save','calc-load']);

    const clickSelector = (sel: string) => {
      const el = document.querySelector(sel) as HTMLButtonElement | null;
      if (el) { try { el.click(); } catch {} }
    };

    if (requiresLibrary.has(currentStep.id)) {
      clickSelector('[data-tour="tab-biblioteca"]');
    } else if (requiresBudget.has(currentStep.id)) {
      clickSelector('[data-tour="tab-presupuesto"]');
    } else if (requiresCalc.has(currentStep.id)) {
      clickSelector('[data-tour="tab-calculadora"]');
    }
  }, [isTourActive, currentStep]);

  useEffect(() => {
    if (!isTourActive || !currentStep) return;

    const findTarget = () => {
      const element = document.querySelector(currentStep.target) as HTMLElement;
      if (element) {
        setTargetElement(element);
        const rect = element.getBoundingClientRect();
        const padding = 12;
        const top = rect.top - padding;
        const left = rect.left - padding;
        const width = rect.width + padding * 2;
        const height = rect.height + padding * 2;
        setHighlightStyle({
          position: 'fixed',
          top,
          left,
          width,
          height,
          zIndex: 10001
        });
        setSpotRect({ top, left, width, height });

        // Scroll a la vista el elemento objetivo
        try { element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch {}
        return true;
      }
      return false;
    };

    // Try to find target immediately
  findTarget();
    // If not found, retry after a short delay
    const t1 = window.setTimeout(() => {
      const ok = findTarget();
      if (!ok && currentStep.optional) {
        // Paso opcional: omitir automáticamente tras un segundo reintento breve
        nextTourStep();
      }
    }, 120);
    // Un tercer intento un poco más tarde (por si render tardío)
    const t2 = window.setTimeout(() => {
      const ok = findTarget();
      if (!ok && currentStep.optional) {
        nextTourStep();
      }
    }, 400);
    // Recalcular en scroll/resize por si el layout cambia
    const onScroll = () => findTarget();
    const onResize = () => findTarget();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    
    return () => { if (t1) clearTimeout(t1); if (t2) clearTimeout(t2); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); };
  }, [isTourActive, currentStep, nextTourStep]);

  // Posicionar popover cerca del target según la posición preferida (modo anclado)
  useEffect(() => {
    if (!spotRect || !currentStep) return;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const pref = currentStep.position || 'bottom';
    const pad = 12;
    const pop = popRef.current;
    const size = pop ? pop.getBoundingClientRect() : { width: 320, height: 160 } as any;
    const candidates: Array<{pos: 'top'|'bottom'|'left'|'right', top: number, left: number}> = [];
    // Calcular posiciones candidatas
    candidates.push({ pos: 'top', top: Math.max(8, spotRect.top - size.height - pad), left: Math.min(Math.max(8, spotRect.left + (spotRect.width - size.width)/2), viewportW - size.width - 8) });
    candidates.push({ pos: 'bottom', top: Math.min(viewportH - size.height - 8, spotRect.top + spotRect.height + pad), left: Math.min(Math.max(8, spotRect.left + (spotRect.width - size.width)/2), viewportW - size.width - 8) });
    candidates.push({ pos: 'left', top: Math.min(Math.max(8, spotRect.top + (spotRect.height - size.height)/2), viewportH - size.height - 8), left: Math.max(8, spotRect.left - size.width - pad) });
    candidates.push({ pos: 'right', top: Math.min(Math.max(8, spotRect.top + (spotRect.height - size.height)/2), viewportH - size.height - 8), left: Math.min(viewportW - size.width - 8, spotRect.left + spotRect.width + pad) });
    // Ordenar por preferencia: preferida primero
    const order = ['top','right','bottom','left'] as const;
    const ordered = [pref, ...order.filter(p => p !== pref)] as Array<'top'|'bottom'|'left'|'right'>;
    const pick = (p: 'top'|'bottom'|'left'|'right') => candidates.find(c => c.pos === p)!;
    let chosen = pick(ordered[0]);
    // Validar que quede dentro del viewport; si no, probar siguientes
    for (const o of ordered) {
      const c = pick(o);
      if (c.left >= 0 && c.top >= 0 && c.left + size.width <= viewportW && c.top + size.height <= viewportH) { chosen = c; break; }
    }
    setPopStyle({ position: 'fixed', top: chosen.top, left: chosen.left, zIndex: 10002, maxWidth: 'min(92vw, 380px)' });
  }, [spotRect, currentStep]);

  // Accesibilidad y navegación por teclado
  useEffect(() => {
    if (!isTourActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); localStorage.setItem('apu-tour-completed','true'); stopTour(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); nextTourStep(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prevTourStep(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isTourActive, nextTourStep, prevTourStep, stopTour]);

  // Focus inicial y trap dentro del popover
  useEffect(() => {
    if (!isTourActive) return;
    const pop = popRef.current;
    if (!pop) return;
    // Enfocar contenedor para que lectores de pantalla anuncien el diálogo
    setTimeout(() => { try { pop.focus(); } catch {} }, 0);

    const getFocusable = () => {
      if (!popRef.current) return [] as HTMLElement[];
      const sel = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
      return Array.from(popRef.current.querySelectorAll<HTMLElement>(sel)).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
    };
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusable();
      if (!focusables.length) { e.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (!active || active === first || !popRef.current?.contains(active)) { e.preventDefault(); last.focus(); }
      } else {
        if (active === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', trap, true);
    return () => window.removeEventListener('keydown', trap, true);
  }, [isTourActive, currentTourStep]);

  const completeTour = () => {
    localStorage.setItem('apu-tour-completed', 'true');
    stopTour();
  };

  if (!isTourActive || !currentStep) return null;

  const fixedMode = true; // Tour fijo: tarjeta en posición fija (abajo centrada)

  return (
    <>
      {/* Background overlay con "hueco" alrededor del target */}
      <div className="fixed inset-0 z-[9999] pointer-events-none" aria-hidden>
        {/* Banda superior */}
        <div
          onClick={stopTour}
          className="absolute left-0 right-0 bg-black/60 pointer-events-auto"
          style={{ top: 0, height: spotRect ? Math.max(0, spotRect.top) : '100%' as any }}
        />
        {spotRect && (
          <>
            {/* Banda izquierda */}
            <div
              onClick={stopTour}
              className="absolute bg-black/60 pointer-events-auto"
              style={{ top: spotRect.top, left: 0, width: Math.max(0, spotRect.left), height: spotRect.height }}
            />
            {/* Banda derecha */}
            <div
              onClick={stopTour}
              className="absolute bg-black/60 pointer-events-auto"
              style={{ top: spotRect.top, left: spotRect.left + spotRect.width, right: 0, height: spotRect.height }}
            />
            {/* Banda inferior */}
            <div
              onClick={stopTour}
              className="absolute left-0 right-0 bg-black/60 pointer-events-auto"
              style={{ top: spotRect.top + spotRect.height, bottom: 0 }}
            />
          </>
        )}
      </div>

      {/* Highlight circle */}
      {targetElement && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={highlightStyle}
          className="rounded-2xl border border-sky-400 shadow-lg shadow-sky-400/25 pointer-events-none"
        />
      )}

      {/* Tour step content */}
      {fixedMode ? (
        <motion.div
          ref={popRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10003] w-full max-w-xl px-4"
          tabIndex={-1}
        >
          <div className="bg-slate-800 text-slate-100 rounded-xl shadow-2xl border border-slate-700 p-5 pointer-events-auto" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {currentStep.title}
              </h3>
              <button
                onClick={stopTour}
                className="text-slate-400 hover:text-slate-200"
                >
                ✕
              </button>
            </div>
            <p className="text-slate-300 mb-3">{currentStep.content}</p>
            <div className="text-xs text-slate-400 mb-4">Paso {currentTourStep+1} de {tourSteps.length}</div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex space-x-1">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${index===currentTourStep? 'bg-sky-400' : index<currentTourStep? 'bg-sky-600' : 'bg-slate-600'}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 ml-auto">
                <button onClick={() => { localStorage.setItem('apu-tour-completed','true'); stopTour(); }} className="px-3 py-2 text-slate-400 hover:text-slate-200">Saltar</button>
                {currentTourStep > 0 && (
                  <button onClick={prevTourStep} className="px-4 py-2 border border-slate-600 rounded-lg text-slate-200 hover:bg-slate-700/60">Anterior</button>
                )}
                {currentTourStep < tourSteps.length - 1 ? (
                  <button onClick={nextTourStep} className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium">Siguiente</button>
                ) : (
                  <button onClick={completeTour} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium">Finalizar</button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          ref={popRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={popStyle}
          className="z-[10003] px-4"
          tabIndex={-1}
        >
          <div className="bg-slate-800 text-slate-100 rounded-xl shadow-2xl border border-slate-700 p-5 pointer-events-auto" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">{currentStep.title}</h3>
              <button onClick={stopTour} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <p className="text-slate-300 mb-3">{currentStep.content}</p>
            <div className="text-xs text-slate-400 mb-4">Paso {currentTourStep+1} de {tourSteps.length}</div>
            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                {tourSteps.map((_, index) => (
                  <div key={index} className={`w-2 h-2 rounded-full ${index===currentTourStep? 'bg-sky-400' : index<currentTourStep? 'bg-sky-600' : 'bg-slate-600'}`} />
                ))}
              </div>
              <div className="flex space-x-2">
                <button onClick={() => { localStorage.setItem('apu-tour-completed','true'); stopTour(); }} className="px-3 py-2 text-slate-400 hover:text-slate-200">Saltar</button>
                {currentTourStep > 0 && (<button onClick={prevTourStep} className="px-4 py-2 border border-slate-600 rounded-lg text-slate-200 hover:bg-slate-700/60">Anterior</button>)}
                {currentTourStep < tourSteps.length - 1 ? (
                  <button onClick={nextTourStep} className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium">Siguiente</button>
                ) : (
                  <button onClick={completeTour} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium">Finalizar</button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

// ====== Panel de ayuda ======
export const HelpPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isTooltipEnabled, setTooltipEnabled, startTour } = useHelp();
  const [seen, setSeen] = useState<boolean>(()=> !!localStorage.getItem('apu-tour-completed'));
  const panelRef = useRef<HTMLDivElement|null>(null);

  // Accesibilidad: cerrar con ESC y trap de foco dentro del panel
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setIsOpen(false); }
      if (e.key !== 'Tab') return;
      const root = panelRef.current;
      if (!root) return;
      const sel = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(sel)).filter(el => !el.hasAttribute('disabled'));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (!active || active === first || !root.contains(active)) { e.preventDefault(); last.focus(); }
      } else {
        if (active === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey, true);
    // Enfocar el panel al abrir
    setTimeout(() => { try { panelRef.current?.focus(); } catch {} }, 0);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen]);

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
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10003] w-full max-w-lg px-4"
              role="dialog" aria-modal={false} aria-labelledby="help-center-title"
            >
              <div
                ref={panelRef}
                tabIndex={-1}
                className="bg-slate-800 text-slate-100 rounded-2xl shadow-2xl border border-slate-700 p-6 focus:outline-none pointer-events-auto"
              >
                <div className="flex items-start justify-between mb-4">
                  <h2 id="help-center-title" className="text-xl font-semibold text-slate-100">
                    Centro de Ayuda
                  </h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-slate-400 hover:text-slate-200"
                    aria-label="Cerrar"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <h3 className="font-medium text-slate-100 mb-2">Tour Guiado</h3>
                    <p className="text-sm text-slate-300 mb-3">
                      Recorre las funciones principales de la aplicación
                    </p>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        startTour();
                        setTimeout(()=> setSeen(true), 0);
                      }}
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 px-4 rounded-lg font-medium"
                    >
                      Iniciar Tour
                    </button>
                    {seen && (
                      <button
                        onClick={() => { try { localStorage.removeItem('apu-tour-completed'); } catch {}; setSeen(false); }}
                        className="mt-2 w-full border border-slate-600 hover:bg-slate-700/60 text-slate-200 py-2 px-4 rounded-lg font-medium"
                      >
                        Restablecer tour (volver a mostrar)
                      </button>
                    )}
                  </div>

                  <div>
                    <h3 className="font-medium text-slate-100 mb-2">Configuración</h3>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isTooltipEnabled}
                        onChange={(e) => setTooltipEnabled(e.target.checked)}
                        className="w-4 h-4 text-sky-500 bg-slate-700 border-slate-600 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm text-slate-300">Mostrar tooltips de ayuda</span>
                    </label>
                  </div>

                  <div>
                    <h3 className="font-medium text-slate-100 mb-2">Atajos de Teclado</h3>
                    <div className="text-sm text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span>Cambiar a APU:</span>
                        <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-100">Ctrl+1</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Cambiar a Presupuesto:</span>
                        <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-100">Ctrl+2</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Ver todos los atajos:</span>
                        <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-100">F1</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-5">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-slate-600 hover:bg-slate-700/60 text-slate-200 rounded-lg font-medium"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};