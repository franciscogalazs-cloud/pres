import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type AnalyticsEventCategory =
  | 'budget'
  | 'project'
  | 'export'
  | 'offline'
  | 'notification'
  | 'ui'
  | 'custom';

export interface AnalyticsEvent {
  id: string;
  name: string;
  category: AnalyticsEventCategory;
  payload?: Record<string, unknown>;
  timestamp: number;
  durationMs?: number;
  context?: string;
}

interface TrackEventInput {
  name: string;
  category?: AnalyticsEventCategory;
  payload?: Record<string, unknown>;
  durationMs?: number;
  context?: string;
  timestamp?: number;
}

interface AnalyticsSummary {
  totalEvents: number;
  eventsByCategory: Record<AnalyticsEventCategory, number>;
  firstEventAt: number | null;
  lastEventAt: number | null;
  recentEvents: AnalyticsEvent[];
}

interface AnalyticsContextValue {
  events: AnalyticsEvent[];
  summary: AnalyticsSummary;
  trackEvent: (input: TrackEventInput) => string;
  trackTiming: <T>(input: TrackEventInput, fn: () => Promise<T> | T) => Promise<T>;
  clearAnalytics: () => void;
  exportAnalytics: () => string;
}

const STORAGE_KEY = 'apu-analytics-log';
const MAX_EVENTS = 200;

const defaultSummary: AnalyticsSummary = {
  totalEvents: 0,
  eventsByCategory: {
    budget: 0,
    project: 0,
    export: 0,
    offline: 0,
    notification: 0,
    ui: 0,
    custom: 0,
  },
  firstEventAt: null,
  lastEventAt: null,
  recentEvents: [],
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const safeParse = (): AnalyticsEvent[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => ({
        id: typeof entry.id === 'string' ? entry.id : generateId(),
        name: typeof entry.name === 'string' ? entry.name : 'event',
        category: (entry.category as AnalyticsEventCategory) ?? 'custom',
        payload: typeof entry.payload === 'object' ? entry.payload : undefined,
        timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : Date.now(),
        durationMs: typeof entry.durationMs === 'number' ? entry.durationMs : undefined,
        context: typeof entry.context === 'string' ? entry.context : undefined,
      }))
      .slice(-MAX_EVENTS);
  } catch (error) {
    console.warn('No se pudo restaurar analytics:', error);
    return [];
  }
};

const persistEvents = (events: AnalyticsEvent[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.warn('No se pudo persistir analytics:', error);
  }
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<AnalyticsEvent[]>(() => safeParse());
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    persistEvents(events);
  }, [events]);

  useEffect(
    () => () => {
      timersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timersRef.current.clear();
    },
    [],
  );

  const trackEvent = useCallback((input: TrackEventInput) => {
    const event: AnalyticsEvent = {
      id: generateId(),
      name: input.name,
      category: input.category ?? 'custom',
      payload: input.payload,
      timestamp: input.timestamp ?? Date.now(),
      durationMs: input.durationMs,
      context: input.context,
    };

    setEvents((prev) => [...prev.slice(-(MAX_EVENTS - 1)), event]);
    return event.id;
  }, []);

  const trackTiming = useCallback(
    async <T,>(input: TrackEventInput, fn: () => Promise<T> | T): Promise<T> => {
      const start = performance.now();
      const result = await fn();
      const end = performance.now();
      trackEvent({
        ...input,
        durationMs: Math.round(end - start),
      });
      return result;
    },
    [trackEvent],
  );

  const clearAnalytics = useCallback(() => {
    setEvents([]);
    persistEvents([]);
  }, []);

  const exportAnalytics = useCallback(() => JSON.stringify(events, null, 2), [events]);

  const summary = useMemo<AnalyticsSummary>(() => {
    if (events.length === 0) {
      return defaultSummary;
    }

    const counts: AnalyticsSummary['eventsByCategory'] = {
      budget: 0,
      project: 0,
      export: 0,
      offline: 0,
      notification: 0,
      ui: 0,
      custom: 0,
    };

    events.forEach((event) => {
      counts[event.category] += 1;
    });

    const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);
    const recentEvents = sorted.slice(0, 10);

    return {
      totalEvents: events.length,
      eventsByCategory: counts,
      firstEventAt: events[0]?.timestamp ?? null,
      lastEventAt: sorted[0]?.timestamp ?? null,
      recentEvents,
    };
  }, [events]);

  const value: AnalyticsContextValue = {
    events,
    summary,
    trackEvent,
    trackTiming,
    clearAnalytics,
    exportAnalytics,
  };

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics debe usarse dentro de AnalyticsProvider');
  }
  return context;
};

interface AnalyticsPanelProps {
  className?: string;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ className }) => {
  const { summary, events, clearAnalytics, exportAnalytics } = useAnalytics();

  if (summary.totalEvents === 0) {
    return (
      <div className={`rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${className ?? ''}`}>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
          Actividad reciente
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aún no registramos eventos. Interactúa con la aplicación para generar métricas.
        </p>
      </div>
    );
  }

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleString('es-CL', {
      hour12: false,
    });

  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 ${className ?? ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Actividad reciente</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {summary.totalEvents} eventos registrados · Último: {summary.lastEventAt ? formatTime(summary.lastEventAt) : 'N/A'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const blob = new Blob([exportAnalytics()], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `analytics-${Date.now()}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Exportar JSON
          </button>
          <button
            onClick={clearAnalytics}
            className="px-3 py-1 text-xs rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {Object.entries(summary.eventsByCategory).map(([category, count]) => (
          <div
            key={category}
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900"
          >
            <div className="text-slate-500 dark:text-slate-400 capitalize">{category}</div>
            <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{count}</div>
          </div>
        ))}
      </div>

      <div>
        <table className="w-full text-xs text-left">
          <thead className="text-slate-500 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-2">Evento</th>
              <th className="py-2">Categoría</th>
              <th className="py-2">Hora</th>
              <th className="py-2 text-right">Duración</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {summary.recentEvents.map((event) => (
              <tr key={event.id}>
                <td className="py-2 text-slate-700 dark:text-slate-200">{event.name}</td>
                <td className="py-2 text-slate-500 dark:text-slate-400 capitalize">{event.category}</td>
                <td className="py-2 text-slate-500 dark:text-slate-400">{formatTime(event.timestamp)}</td>
                <td className="py-2 text-right text-slate-500 dark:text-slate-400">
                  {event.durationMs ? `${event.durationMs} ms` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="text-xs text-slate-500 dark:text-slate-400">
        <summary className="cursor-pointer">Ver todos ({events.length})</summary>
        <pre className="mt-2 max-h-48 overflow-y-auto bg-slate-50 dark:bg-slate-900/70 rounded-lg p-2 text-[11px] text-slate-600 dark:text-slate-300">
          {JSON.stringify(events, null, 2)}
        </pre>
      </details>
    </div>
  );
};
