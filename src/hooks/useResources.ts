import { useCallback, useEffect, useState } from 'react';
import type { Resource } from '../types';
import { defaultResources } from '../data/defaults';

type ResourceMap = Record<string, Resource>;

const STORAGE_KEY = 'apu-resources';

const sanitizeResource = (key: string, candidate: Partial<Resource> | undefined, fallback?: Resource): Resource => {
  const base = fallback ?? defaultResources[key] ?? {
    id: key,
    tipo: 'material',
    nombre: key,
    unidad: '',
    precio: 0,
  };

  const precio = Number((candidate ?? {}).precio);

  return {
    id: typeof candidate?.id === 'string' && candidate.id.trim().length > 0 ? candidate.id : base.id,
    tipo: typeof candidate?.tipo === 'string' ? candidate.tipo : base.tipo,
    nombre: typeof candidate?.nombre === 'string' && candidate.nombre.trim().length > 0
      ? candidate.nombre
      : base.nombre,
    unidad: typeof candidate?.unidad === 'string' ? candidate.unidad : base.unidad,
    precio: Number.isFinite(precio) ? Math.max(0, precio) : base.precio,
  };
};

const sanitizeResources = (value: unknown): ResourceMap => {
  const result: ResourceMap = {};

  for (const [key, resource] of Object.entries(defaultResources)) {
    result[key] = sanitizeResource(key, resource, resource);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, Partial<Resource>>);
    for (const [key, raw] of entries) {
      result[key] = sanitizeResource(key, raw, result[key]);
    }
  }

  return result;
};

const readResourcesFromStorage = (): ResourceMap => {
  if (typeof window === 'undefined') {
    return sanitizeResources({});
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeResources(JSON.parse(raw)) : sanitizeResources({});
  } catch (error) {
    console.warn('No se pudo leer los recursos almacenados:', error);
    return sanitizeResources({});
  }
};

const writeResourcesToStorage = (resources: ResourceMap) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
  } catch (error) {
    console.warn('No se pudieron guardar los recursos:', error);
  }
};

export function useResources() {
  const [resources, setResourcesState] = useState<ResourceMap>(() => readResourcesFromStorage());

  useEffect(() => {
    writeResourcesToStorage(resources);
  }, [resources]);

  const loadResources = useCallback(() => readResourcesFromStorage(), []);

  const replaceResources = useCallback((value: ResourceMap | ((prev: ResourceMap) => ResourceMap)) => {
    setResourcesState((prev) => {
      const next = typeof value === 'function' ? (value as (p: ResourceMap) => ResourceMap)(prev) : value;
      return sanitizeResources(next);
    });
  }, []);

  const updateResourcePrice = useCallback((resourceId: string, newPrice: number) => {
    setResourcesState((prev) => {
      const current = prev[resourceId] ?? defaultResources[resourceId];
      if (!current) {
        return prev;
      }
      const precio = Number.isFinite(newPrice) ? Math.max(0, Number(newPrice)) : 0;
      return {
        ...prev,
        [resourceId]: {
          ...current,
          precio,
        },
      };
    });
  }, []);

  const saveResources = useCallback((value: ResourceMap) => {
    const sanitized = sanitizeResources(value);
    writeResourcesToStorage(sanitized);
  }, []);

  const resetResources = useCallback(() => {
    setResourcesState(sanitizeResources(defaultResources));
  }, []);

  return {
    resources,
    setResources: replaceResources,
    updateResourcePrice,
    loadResources,
    saveResources,
    resetResources,
  };
}
