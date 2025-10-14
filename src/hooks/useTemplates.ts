import { useCallback, useEffect, useState } from 'react';
import type { Templates, BudgetRow, Template } from '../types';
import { defaultTemplates } from '../data/defaults';
import { uid } from '../utils/formatters';

const STORAGE_KEY = 'apu-templates';

const sanitizeTemplateKey = (name: string): string =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const sanitizeTemplateItems = (items: unknown): Template['items'] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const candidate = item as { apuId?: unknown; metrados?: unknown };
      const apuId = typeof candidate.apuId === 'string' ? candidate.apuId : '';
      if (!apuId) {
        return null;
      }
      const metrados = Number(candidate.metrados);
      return {
        apuId,
        metrados: Number.isFinite(metrados) ? metrados : 0,
      };
    })
    .filter((entry): entry is Template['items'][number] => entry !== null);
};

const sanitizeTemplate = (key: string, candidate: Partial<Template>, fallback?: Template): Template => {
  const name = typeof candidate.name === 'string' && candidate.name.trim().length > 0
    ? candidate.name.trim()
    : fallback?.name ?? key;

  const items = sanitizeTemplateItems(candidate.items ?? fallback?.items ?? []);

  return { name, items };
};

const sanitizeTemplates = (value: unknown): Templates => {
  const result: Templates = {};

  for (const [key, template] of Object.entries(defaultTemplates)) {
    result[key] = sanitizeTemplate(key, template, template);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, Partial<Template>>);
    for (const [key, template] of entries) {
      const sanitizedKey = sanitizeTemplateKey(key) || key;
      result[sanitizedKey] = sanitizeTemplate(sanitizedKey, template, result[sanitizedKey]);
    }
  }

  return result;
};

const readTemplatesFromStorage = (): Templates => {
  if (typeof window === 'undefined') {
    return sanitizeTemplates({});
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeTemplates(JSON.parse(raw)) : sanitizeTemplates({});
  } catch (error) {
    console.warn('No se pudieron leer las plantillas:', error);
    return sanitizeTemplates({});
  }
};

const writeTemplatesToStorage = (templates: Templates) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.warn('No se pudieron guardar las plantillas:', error);
  }
};

export function useTemplates() {
  const [templates, setTemplates] = useState<Templates>(() => readTemplatesFromStorage());

  useEffect(() => {
    writeTemplatesToStorage(templates);
  }, [templates]);

  const saveTemplate = useCallback((name: string, currentRows: BudgetRow[]) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, message: 'Debes ingresar un nombre para la plantilla.' };
    }

    const normalizedKey = sanitizeTemplateKey(trimmedName);
    const key = normalizedKey || `template_${uid()}`;

    const items = currentRows.map((row) => ({
      apuId: row.apuId,
      metrados: Number.isFinite(row.metrados) ? row.metrados : Number(row.metrados) || 0,
    }));

    setTemplates((prev) => ({
      ...prev,
      [key]: {
        name: trimmedName,
        items,
      },
    }));

    const message = templates[key]
      ? `Plantilla "${trimmedName}" actualizada`
      : `Plantilla "${trimmedName}" guardada`;

    return { success: true, message, key };
  }, [templates]);

  const loadTemplate = useCallback((templateKey: string): BudgetRow[] | null => {
    const template = templates[templateKey];
    if (!template) {
      return null;
    }
    return template.items.map((item) => ({
      id: uid(),
      apuId: item.apuId,
      metrados: Number.isFinite(item.metrados) ? item.metrados : Number(item.metrados) || 0,
    }));
  }, [templates]);

  const deleteTemplate = useCallback((templateKey: string) => {
    setTemplates((prev) => {
      if (!prev[templateKey]) {
        return prev;
      }
      const next = { ...prev };
      delete next[templateKey];
      return next;
    });
  }, []);

  const resetTemplates = useCallback(() => {
    setTemplates(sanitizeTemplates(defaultTemplates));
  }, []);

  const reloadTemplates = useCallback(() => {
    const stored = readTemplatesFromStorage();
    setTemplates(stored);
    return stored;
  }, []);

  return {
    templates,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    resetTemplates,
    reloadTemplates,
  };
}
