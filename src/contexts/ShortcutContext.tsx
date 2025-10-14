import React, { useEffect, useCallback, useMemo } from 'react';

// ====== Tipos para shortcuts ======

export interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  disabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export interface ShortcutGroup {
  name: string;
  shortcuts: Shortcut[];
}

// ====== Hook para shortcuts de teclado ======

export const useKeyboardShortcuts = (shortcuts: Shortcut[], enabled: boolean = true) => {
  const normalizedShortcuts = useMemo(() => {
    return shortcuts.map(shortcut => ({
      ...shortcut,
      key: shortcut.key.length === 1 ? shortcut.key.toLowerCase() : shortcut.key,
      preventDefault: shortcut.preventDefault ?? true,
      stopPropagation: shortcut.stopPropagation ?? false,
    }));
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const pressedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      const matchedShortcut = normalizedShortcuts.find(shortcut => {
        if (shortcut.disabled) return false;

        return (
          pressedKey === shortcut.key &&
          !!event.ctrlKey === !!shortcut.ctrlKey &&
          !!event.altKey === !!shortcut.altKey &&
          !!event.shiftKey === !!shortcut.shiftKey &&
          !!event.metaKey === !!shortcut.metaKey
        );
      });

      if (!matchedShortcut) {
        return;
      }

      if (matchedShortcut.preventDefault) {
        event.preventDefault();
      }
      if (matchedShortcut.stopPropagation) {
        event.stopPropagation();
      }

      try {
        matchedShortcut.action();
      } catch (error) {
        console.error('Error ejecutando shortcut:', error);
      }
    },
    [normalizedShortcuts, enabled],
  );

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return { shortcuts: normalizedShortcuts };
};

// ====== Contexto de shortcuts globales ======

interface ShortcutContextType {
  registerShortcuts: (groupName: string, shortcuts: Shortcut[]) => void;
  unregisterShortcuts: (groupName: string) => void;
  toggleGroup: (groupName: string, enabled: boolean) => void;
  getAllShortcuts: () => ShortcutGroup[];
  isGroupEnabled: (groupName: string) => boolean;
}

const ShortcutContext = React.createContext<ShortcutContextType | undefined>(undefined);

// ====== Provider de shortcuts ======

interface ShortcutProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export const ShortcutProvider: React.FC<ShortcutProviderProps> = ({ 
  children, 
  enabled = true 
}) => {
  const [shortcutGroups, setShortcutGroups] = React.useState<Map<string, ShortcutGroup>>(new Map());
  const [enabledGroups, setEnabledGroups] = React.useState<Set<string>>(new Set());

  const registerShortcuts = useCallback((groupName: string, shortcuts: Shortcut[]) => {
    setShortcutGroups(prev => {
      const next = new Map(prev);
      next.set(groupName, { name: groupName, shortcuts });
      return next;
    });

    setEnabledGroups(prev => {
      const next = new Set(prev);
      next.add(groupName);
      return next;
    });
  }, []);

  const unregisterShortcuts = useCallback((groupName: string) => {
    setShortcutGroups(prev => {
      const next = new Map(prev);
      next.delete(groupName);
      return next;
    });
    
    setEnabledGroups(prev => {
      const next = new Set(prev);
      next.delete(groupName);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupName: string, groupEnabled: boolean) => {
    setEnabledGroups(prev => {
      const next = new Set(prev);
      if (groupEnabled) {
        next.add(groupName);
      } else {
        next.delete(groupName);
      }
      return next;
    });
  }, []);

  const getAllShortcuts = useCallback(() => {
    return Array.from(shortcutGroups.values());
  }, [shortcutGroups]);

  const isGroupEnabled = useCallback((groupName: string) => {
    return enabledGroups.has(groupName);
  }, [enabledGroups]);

  // Combinar todos los shortcuts activos
  const allActiveShortcuts = useMemo(() => {
    const active: Shortcut[] = [];
    
    for (const [groupName, group] of shortcutGroups.entries()) {
      if (enabledGroups.has(groupName)) {
        active.push(...group.shortcuts);
      }
    }
    
    return active;
  }, [shortcutGroups, enabledGroups]);

  // Usar el hook de shortcuts para todos los activos
  useKeyboardShortcuts(allActiveShortcuts, enabled);

  const contextValue = useMemo<ShortcutContextType>(() => ({
    registerShortcuts,
    unregisterShortcuts,
    toggleGroup,
    getAllShortcuts,
    isGroupEnabled,
  }), [registerShortcuts, unregisterShortcuts, toggleGroup, getAllShortcuts, isGroupEnabled]);

  return (
    <ShortcutContext.Provider value={contextValue}>
      {children}
    </ShortcutContext.Provider>
  );
};

// ====== Hook para usar el contexto ======

export const useShortcuts = () => {
  const context = React.useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcuts debe ser usado dentro de ShortcutProvider');
  }
  return context;
};

// ====== Hook para registrar shortcuts automáticamente ======

export const useRegisterShortcuts = (
  groupName: string, 
  shortcuts: Shortcut[], 
  enabled: boolean = true
) => {
  const { registerShortcuts, unregisterShortcuts, toggleGroup } = useShortcuts();

  useEffect(() => {
    registerShortcuts(groupName, shortcuts);
    
    return () => {
      toggleGroup(groupName, false);
      unregisterShortcuts(groupName);
    };
  }, [groupName, shortcuts, registerShortcuts, unregisterShortcuts, toggleGroup]);

  useEffect(() => {
    toggleGroup(groupName, enabled);
  }, [groupName, enabled, toggleGroup]);
};

// ====== Componente para mostrar shortcuts ======

interface ShortcutDisplayProps {
  shortcut: Shortcut;
  className?: string;
}

export const ShortcutDisplay: React.FC<ShortcutDisplayProps> = React.memo(({ 
  shortcut, 
  className = "" 
}) => {
  const keys = [];
  
  if (shortcut.ctrlKey) keys.push('Ctrl');
  if (shortcut.altKey) keys.push('Alt');
  if (shortcut.shiftKey) keys.push('Shift');
  if (shortcut.metaKey) keys.push('Cmd');
  keys.push(shortcut.key.toUpperCase());

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          {index > 0 && <span className="text-slate-400">+</span>}
          <kbd className="px-2 py-1 text-xs bg-slate-700 text-slate-200 rounded border border-slate-600">
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  );
});

ShortcutDisplay.displayName = 'ShortcutDisplay';

// ====== Modal de ayuda con shortcuts ======

interface ShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutHelpModal: React.FC<ShortcutHelpModalProps> = React.memo(({ 
  isOpen, 
  onClose 
}) => {
  const { getAllShortcuts, isGroupEnabled } = useShortcuts();
  const shortcutGroups = getAllShortcuts();

  useKeyboardShortcuts([
    {
      key: 'Escape',
      description: 'Cerrar ayuda',
      action: onClose,
    }
  ], isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-100">Atajos de Teclado</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            aria-label="Cerrar atajos"
          >
            X
          </button>
        </div>

        <div className="space-y-6">
          {shortcutGroups.map(group => (
            <div key={group.name} className="space-y-3">
              <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
                {group.name}
                {!isGroupEnabled(group.name) && (
                  <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded">
                    Deshabilitado
                  </span>
                )}
              </h3>
              <div className="grid gap-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 rounded-lg bg-slate-900 ${
                      shortcut.disabled ? 'opacity-50' : ''
                    }`}
                  >
                    <span className="text-slate-300">{shortcut.description}</span>
                    <ShortcutDisplay shortcut={shortcut} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {shortcutGroups.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              No hay atajos de teclado registrados
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-700">
          <p className="text-sm text-slate-400">
            Presiona <ShortcutDisplay shortcut={{ key: 'Escape', description: '', action: () => {} }} className="inline-flex" /> para cerrar esta ayuda
          </p>
        </div>
      </div>
    </div>
  );
});

ShortcutHelpModal.displayName = 'ShortcutHelpModal';

// ====== Utilities para shortcuts comunes ======

export const createShortcut = (
  key: string,
  action: () => void,
  description: string,
  modifiers: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  } = {}
): Shortcut => ({
  key,
  ctrlKey: modifiers.ctrl,
  altKey: modifiers.alt,
  shiftKey: modifiers.shift,
  metaKey: modifiers.meta,
  description,
  action,
});

export const commonShortcuts = {
  save: (action: () => void) => createShortcut('s', action, 'Guardar', { ctrl: true }),
  copy: (action: () => void) => createShortcut('c', action, 'Copiar', { ctrl: true }),
  paste: (action: () => void) => createShortcut('v', action, 'Pegar', { ctrl: true }),
  undo: (action: () => void) => createShortcut('z', action, 'Deshacer', { ctrl: true }),
  redo: (action: () => void) => createShortcut('y', action, 'Rehacer', { ctrl: true }),
  find: (action: () => void) => createShortcut('f', action, 'Buscar', { ctrl: true }),
  newItem: (action: () => void) => createShortcut('n', action, 'Nuevo', { ctrl: true }),
  delete: (action: () => void) => createShortcut('Delete', action, 'Eliminar'),
  enter: (action: () => void) => createShortcut('Enter', action, 'Confirmar'),
  escape: (action: () => void) => createShortcut('Escape', action, 'Cancelar'),
  help: (action: () => void) => createShortcut('F1', action, 'Ayuda'),
  refresh: (action: () => void) => createShortcut('F5', action, 'Actualizar'),
};
