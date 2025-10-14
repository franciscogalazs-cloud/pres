import { useCallback, useEffect, useReducer } from 'react';
import type { BudgetRow } from '../types';
import { uid } from '../utils/formatters';
import { apus } from '../data/defaults';

type BudgetState = {
  rows: BudgetRow[];
  past: BudgetRow[][];
  future: BudgetRow[][];
};

type BudgetAction =
  | { type: 'add'; apuId?: string; metrados?: number }
  | { type: 'update'; id: string; patch: Partial<BudgetRow> }
  | { type: 'delete'; id: string }
  | { type: 'replace'; rows: BudgetRow[] }
  | { type: 'hydrate'; rows: BudgetRow[] }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clearHistory' };

const STORAGE_KEY = 'apu-budget';
const HISTORY_LIMIT = 50;
const apuIdSet = new Set(apus.map((apu) => apu.id));
const fallbackApuId = apus[0]?.id ?? '';

const createSnapshot = (rows: BudgetRow[]): BudgetRow[] =>
  rows.map((row) => ({ ...row }));

const clampHistory = (history: BudgetRow[][]): BudgetRow[][] =>
  history.slice(-HISTORY_LIMIT);

const coerceMetrados = (value: unknown): number => {
  const num = typeof value === 'string' ? Number(value) : Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.max(0, num);
};

const ensureApuId = (id: unknown): string => {
  if (typeof id === 'string' && apuIdSet.has(id)) {
    return id;
  }
  return fallbackApuId || apus[0]?.id || id?.toString() || '';
};

const sanitizeRow = (row: Partial<BudgetRow>): BudgetRow => {
  return {
    id: typeof row.id === 'string' && row.id.trim().length > 0 ? row.id : uid(),
    apuId: ensureApuId(row.apuId),
    metrados: coerceMetrados(row.metrados ?? 1) || 0,
  };
};

const sanitizeRows = (rows: unknown): BudgetRow[] => {
  if (!Array.isArray(rows)) {
    return [sanitizeRow({ apuId: fallbackApuId, metrados: 1 })];
  }

  const sanitized = rows
    .map((entry) => {
      if (entry && typeof entry === 'object') {
        return sanitizeRow(entry as Partial<BudgetRow>);
      }
      return null;
    })
    .filter((entry): entry is BudgetRow => entry !== null);

  if (sanitized.length === 0) {
    return [sanitizeRow({ apuId: fallbackApuId, metrados: 1 })];
  }

  return sanitized;
};

const readRowsFromStorage = (): BudgetRow[] => {
  if (typeof window === 'undefined') {
    return sanitizeRows([]);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeRows(JSON.parse(raw)) : sanitizeRows([]);
  } catch (error) {
    console.warn('No se pudo leer el presupuesto almacenado:', error);
    return sanitizeRows([]);
  }
};

const writeRowsToStorage = (rows: BudgetRow[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (error) {
    console.warn('No se pudo guardar el presupuesto:', error);
  }
};

const initialState = (): BudgetState => {
  const rows = readRowsFromStorage();
  return {
    rows,
    past: [],
    future: [],
  };
};

const rowsEqual = (a: BudgetRow[], b: BudgetRow[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    const rowA = a[index];
    const rowB = b[index];
    if (
      rowA.id !== rowB.id ||
      rowA.apuId !== rowB.apuId ||
      rowA.metrados !== rowB.metrados
    ) {
      return false;
    }
  }
  return true;
};

const reducer = (state: BudgetState, action: BudgetAction): BudgetState => {
  switch (action.type) {
    case 'add': {
      const newRow = sanitizeRow({
        apuId: action.apuId,
        metrados: action.metrados ?? 1,
      });
      const nextRows = [...state.rows, newRow];
      return {
        rows: nextRows,
        past: clampHistory([...state.past, createSnapshot(state.rows)]),
        future: [],
      };
    }

    case 'update': {
      let changed = false;
      const nextRows = state.rows.map((row) => {
        if (row.id !== action.id) {
          return row;
        }
        const candidate = sanitizeRow({ ...row, ...action.patch, id: row.id });
        if (candidate.apuId !== row.apuId || candidate.metrados !== row.metrados) {
          changed = true;
          return candidate;
        }
        return row;
      });

      if (!changed) {
        return state;
      }

      return {
        rows: nextRows,
        past: clampHistory([...state.past, createSnapshot(state.rows)]),
        future: [],
      };
    }

    case 'delete': {
      if (!state.rows.some((row) => row.id === action.id)) {
        return state;
      }
      const nextRows = state.rows.filter((row) => row.id !== action.id);
      return {
        rows: nextRows,
        past: clampHistory([...state.past, createSnapshot(state.rows)]),
        future: [],
      };
    }

    case 'replace': {
      const sanitized = sanitizeRows(action.rows);
      if (rowsEqual(sanitized, state.rows)) {
        return state;
      }
      return {
        rows: sanitized,
        past: clampHistory([...state.past, createSnapshot(state.rows)]),
        future: [],
      };
    }

    case 'hydrate': {
      const sanitized = sanitizeRows(action.rows);
      return {
        rows: sanitized,
        past: [],
        future: [],
      };
    }

    case 'undo': {
      if (state.past.length === 0) {
        return state;
      }
      const previous = state.past[state.past.length - 1];
      const remainingPast = state.past.slice(0, -1);
      return {
        rows: createSnapshot(previous),
        past: remainingPast,
        future: clampHistory([createSnapshot(state.rows), ...state.future]),
      };
    }

    case 'redo': {
      if (state.future.length === 0) {
        return state;
      }
      const [next, ...rest] = state.future;
      return {
        rows: createSnapshot(next),
        past: clampHistory([...state.past, createSnapshot(state.rows)]),
        future: rest,
      };
    }

    case 'clearHistory': {
      return {
        rows: state.rows,
        past: [],
        future: [],
      };
    }

    default:
      return state;
  }
};

export function useBudget() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => {
    writeRowsToStorage(state.rows);
  }, [state.rows]);

  const addRow = useCallback(
    (apuId?: string, metrados: number = 1) => {
      dispatch({ type: 'add', apuId, metrados });
    },
    [],
  );

  const updateRow = useCallback((id: string, patch: Partial<BudgetRow>) => {
    dispatch({ type: 'update', id, patch });
  }, []);

  const deleteRow = useCallback((id: string) => {
    dispatch({ type: 'delete', id });
  }, []);

  const replaceRows = useCallback((rows: BudgetRow[]) => {
    dispatch({ type: 'replace', rows });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'undo' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'redo' });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'clearHistory' });
  }, []);

  const loadBudget = useCallback(() => readRowsFromStorage(), []);

  const saveBudget = useCallback((rows: BudgetRow[]) => {
    const sanitized = sanitizeRows(rows);
    writeRowsToStorage(sanitized);
  }, []);

  const reloadBudget = useCallback(() => {
    const stored = readRowsFromStorage();
    dispatch({ type: 'hydrate', rows: stored });
    return stored;
  }, []);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return {
    rows: state.rows,
    addRow,
    updateRow,
    deleteRow,
    replaceRows,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
    loadBudget,
    saveBudget,
    reloadBudget,
  };
}
