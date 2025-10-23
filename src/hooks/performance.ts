import React, { useMemo, useCallback, memo } from 'react';

// ====== Hook para memoización avanzada ======

export const useStableMemo = <T>(factory: () => T, deps: React.DependencyList): T => {
  const ref = React.useRef<{ deps: React.DependencyList; value: T }>();
  
  if (!ref.current || !depsEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }
  
  return ref.current.value;
};

// Comparación profunda simple para dependencias
const depsEqual = (a: React.DependencyList, b: React.DependencyList): boolean => {
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
};

// ====== Hook para debounce optimizado ======

export const useOptimizedDebounce = <T>(
  value: T,
  delay: number,
  options: {
    maxWait?: number;
    leading?: boolean;
    trailing?: boolean;
  } = {}
): T => {
  const { maxWait, leading = false, trailing = true } = options;
  
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  const lastCallTime = React.useRef<number>();
  const lastInvokeTime = React.useRef<number>(0);
  const timerId = React.useRef<ReturnType<typeof setTimeout>>();

  const invokeFunc = useCallback((newValue: T) => {
    setDebouncedValue(newValue);
    lastInvokeTime.current = Date.now();
  }, []);

  const shouldInvoke = useCallback((time: number): boolean => {
    const timeSinceLastCall = time - (lastCallTime.current || 0);
    const timeSinceLastInvoke = time - lastInvokeTime.current;

    return (
      !lastCallTime.current ||
      timeSinceLastCall >= delay ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }, [delay, maxWait]);

  const debounced = useCallback((newValue: T) => {
    const time = Date.now();
    lastCallTime.current = time;

    if (shouldInvoke(time)) {
      if (timerId.current) {
        clearTimeout(timerId.current);
        timerId.current = undefined;
      }

      if (leading) {
        invokeFunc(newValue);
        return;
      }
    }

    if (timerId.current) {
      clearTimeout(timerId.current);
    }

    timerId.current = setTimeout(() => {
      const time = Date.now();
      if (shouldInvoke(time) && trailing) {
        invokeFunc(newValue);
      }
      timerId.current = undefined;
    }, delay);
  }, [delay, leading, trailing, shouldInvoke, invokeFunc]);

  React.useEffect(() => {
    debounced(value);
    
    return () => {
      if (timerId.current) {
        clearTimeout(timerId.current);
      }
    };
  }, [value, debounced]);

  return debouncedValue;
};

// ====== Hook para virtualización de listas ======

export const useVirtualList = <T>(
  items: T[],
  options: {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
  }
) => {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, startIndex, endIndex]);

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    containerProps: {
      style: { height: containerHeight, overflow: 'auto' },
      onScroll: handleScroll,
    },
    listProps: {
      style: { height: totalHeight, position: 'relative' as const },
    },
    itemProps: (index: number) => ({
      style: {
        position: 'absolute' as const,
        top: (startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%',
      },
    }),
  };
};

// ====== Hook para memoización de funciones costosas ======

export const useExpensiveOperation = <T, Args extends any[]>(
  fn: (...args: Args) => T,
  deps: React.DependencyList,
  options: {
    timeout?: number;
    fallback?: T;
  } = {}
): { value: T | undefined; loading: boolean; error: Error | null } => {
  const { timeout = 5000, fallback } = options;
  const [state, setState] = React.useState<{
    value: T | undefined;
    loading: boolean;
    error: Error | null;
  }>({
    value: fallback,
    loading: false,
    error: null,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedFn = useCallback(fn, deps);

  React.useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const executeOperation = async () => {
      setState({ value: fallback, loading: true, error: null });

      try {
        // Crear timeout para operaciones largas
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Operación timeout')), timeout);
        });

        // Ejecutar la función en el siguiente tick para no bloquear la UI
        const operationPromise = new Promise<T>((resolve) => {
          setTimeout(() => {
            try {
              const result = memoizedFn(...(deps as Args));
              resolve(result);
            } catch (error) {
              throw error;
            }
          }, 0);
        });

        const result = await Promise.race([operationPromise, timeoutPromise]);

        if (!cancelled) {
          setState({ value: result, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ value: fallback, loading: false, error: error as Error });
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    executeOperation();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  // deps spread está intencional para recalcular por dependencias externas
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedFn, timeout, fallback, ...deps]);

  return state;
};

// ====== Hook para cache con TTL ======

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export const useCacheWithTTL = <T>(ttlMs: number = 5 * 60 * 1000) => {
  const cache = React.useRef(new Map<string, CacheEntry<T>>());

  const get = useCallback((key: string): T | null => {
    const entry = cache.current.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      cache.current.delete(key);
      return null;
    }

    return entry.value;
  }, []);

  const set = useCallback((key: string, value: T, customTtl?: number) => {
    cache.current.set(key, {
      value,
      timestamp: Date.now(),
      ttl: customTtl || ttlMs,
    });
  }, [ttlMs]);

  const clear = useCallback(() => {
    cache.current.clear();
  }, []);

  const remove = useCallback((key: string) => {
    cache.current.delete(key);
  }, []);

  // Limpieza automática de entradas expiradas
  React.useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of cache.current.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          cache.current.delete(key);
        }
      }
    }, ttlMs);

    return () => clearInterval(cleanupInterval);
  }, [ttlMs]);

  return { get, set, clear, remove };
};

// ====== HOC para optimización de renders ======

export const withRenderOptimization = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    displayName?: string;
    propsAreEqual?: (prevProps: P, nextProps: P) => boolean;
  } = {}
) => {
  const { displayName, propsAreEqual } = options;
  
  const OptimizedComponent = memo(Component, propsAreEqual);
  
  if (displayName) {
    OptimizedComponent.displayName = displayName;
  }
  
  return OptimizedComponent;
};

// ====== Hook para intersection observer optimizado ======

export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [entry, setEntry] = React.useState<IntersectionObserverEntry | null>(null);
  const elementRef = React.useRef<Element | null>(null);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  // El objeto options puede recrearse arriba; observar campos relevantes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.threshold, options.rootMargin, options.root]);

  return { ref: elementRef, isIntersecting, entry };
};