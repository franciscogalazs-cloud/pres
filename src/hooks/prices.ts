import { useCallback, useMemo, useRef, useState } from 'react';

export interface PriceUpdate {
  resourceId: string;
  oldPrice: number;
  newPrice: number;
  reason?: string;
}

export interface PriceSyncOptions {
  onlyMaterials?: boolean;
  maxChangePct?: number; // 0.0 - 1.0
  applyMarginPct?: number; // -1.0 - 1.0
}

export interface PriceProvider {
  id: string;
  name: string;
  country?: string;
  description?: string;
  fetch: (resources: Array<{ id: string; nombre: string; tipo: string; unidad: string; precio: number }>) => Promise<Record<string, number>>; // returns map resourceId -> suggestedPrice
}

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Proveedor mock CL con reglas simples por nombre
const mockCLProvider: PriceProvider = {
  id: 'mock-cl',
  name: 'Mock Chile 2025',
  country: 'CL',
  description: 'Valores simulados por rubros (cemento, áridos, acero, combustible).',
  async fetch(resources) {
    const namePatterns: Array<{ test: RegExp; factor: number }>= [
      { test: /(cemento|hormigon)/i, factor: 1.06 },
      { test: /(arena|grav(a|illa)|ripio|árido)/i, factor: 1.04 },
      { test: /(acero|enfierrad|a63|a44)/i, factor: 1.08 },
      { test: /(madera|tablon|pino)/i, factor: 1.03 },
      { test: /(diesel|di[eé]sel|combustible)/i, factor: 1.05 },
    ];
    const out: Record<string, number> = {};
    for (const r of resources) {
      const pat = namePatterns.find(p => p.test.test(r.nombre));
      const factor = pat ? pat.factor : 1.0;
      out[r.id] = Math.round(r.precio * factor);
    }
    await new Promise(res => setTimeout(res, 500));
    return out;
  }
};

// Proveedor índice INE demo (factores por tipo)
const ineIndexProvider: PriceProvider = {
  id: 'ine-index-demo',
  name: 'Índice INE CL (demo)',
  country: 'CL',
  description: 'Ajuste simplificado por tipo: material 2%, mano de obra 1%, equipo 1.5%.',
  async fetch(resources) {
    const typeFactor: Record<string, number> = {
      material: 1.02,
      mano_obra: 1.01,
      equipo: 1.015,
      servicio: 1.01
    };
    const out: Record<string, number> = {};
    for (const r of resources) {
      const f = typeFactor[r.tipo] ?? 1.0;
      out[r.id] = Math.round(r.precio * f);
    }
    await new Promise(res => setTimeout(res, 400));
    return out;
  }
};

// ===== Proveedor REST configurable =====
export interface RestProviderSettings {
  baseUrl: string; // endpoint que retorna una lista JSON con items
  apiKey?: string;
  apiKeyHeader?: string; // p.ej. 'Authorization'
  matchBy?: 'name' | 'id'; // cómo matchear los recursos locales
  idField?: string; // campo en el JSON remoto que representa el id/sku
  nameField?: string; // campo en el JSON remoto que representa el nombre
  priceField?: string; // campo en el JSON remoto que representa el precio
  extraHeadersJson?: string; // JSON con headers adicionales
}

// Hook de sincronización de precios
export function usePriceSync(
  resources: Record<string, any>,
  updateResourcePrice: (id: string, price: number) => void
) {
  const [selectedProviderId, setSelectedProviderId] = useState<string>(() => localStorage.getItem('price-sync-provider') || 'mock-cl');
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<{ updated: PriceUpdate[]; skipped: number } | null>(null);
  const lastSyncAtRef = useRef<number | null>(Number(localStorage.getItem('price-sync-last')) || null);
  const [lastKnownPrices, setLastKnownPrices] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('price-sync-last-prices') || '{}'); } catch { return {}; }
  });
  const [lastError, setLastError] = useState<string | null>(null);

  // Ajustes del proveedor REST configurable
  const [restSettings, setRestSettingsState] = useState<RestProviderSettings>(() => {
    try { return JSON.parse(localStorage.getItem('price-sync-rest-settings') || '{}'); } catch { return {} as any; }
  });
  const restSettingsRef = useRef(restSettings);
  const setRestSettings = useCallback((patch: Partial<RestProviderSettings>) => {
    restSettingsRef.current = { ...restSettingsRef.current, ...patch } as RestProviderSettings;
    setRestSettingsState(restSettingsRef.current);
    localStorage.setItem('price-sync-rest-settings', JSON.stringify(restSettingsRef.current));
  }, []);

  // Provider REST dinámico lee desde restSettingsRef
  const restProvider: PriceProvider = useMemo(() => ({
    id: 'custom-rest',
    name: 'REST configurable',
    description: 'Consulta un endpoint REST propio y mapea precios por nombre o id.',
    async fetch(resList) {
      const cfg = restSettingsRef.current;
      if (!cfg?.baseUrl) return {};
      try {
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (cfg.apiKey && cfg.apiKeyHeader) headers[cfg.apiKeyHeader] = cfg.apiKeyHeader.toLowerCase() === 'authorization' ? `Bearer ${cfg.apiKey}` : cfg.apiKey;
        if (cfg.extraHeadersJson) {
          try { Object.assign(headers, JSON.parse(cfg.extraHeadersJson)); } catch {}
        }
        const resp = await fetch(cfg.baseUrl, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        // Normalizar a array de registros
        const items: any[] = Array.isArray(data)
          ? data
          : typeof data === 'object' && data !== null
            ? Object.entries(data).map(([k, v]: any) => ({ key: k, value: v }))
            : [];
        const out: Record<string, number> = {};
        const matchBy = cfg.matchBy || 'name';
        const idField = cfg.idField || 'id';
        const nameField = cfg.nameField || 'name';
        const priceField = cfg.priceField || 'price';
        for (const r of resList) {
          let found: any | undefined;
          if (matchBy === 'id') {
            found = items.find(it => String(it[idField] ?? it.key).toLowerCase() === String(r.id).toLowerCase());
          } else {
            const rName = normalize(r.nombre);
            found = items.find(it => normalize(String(it[nameField] ?? '')) === rName);
          }
          const priceVal = found?.[priceField] ?? found?.value;
          const parsed = typeof priceVal === 'number' ? priceVal : Number(priceVal);
          if (!Number.isFinite(parsed)) continue;
          out[r.id] = Math.round(parsed);
        }
        setLastError(null);
        return out;
      } catch (e: any) {
        setLastError(e?.message || 'Error al consultar el proveedor REST');
        return {};
      }
    }
  }), []);

  const providers: PriceProvider[] = useMemo(() => [mockCLProvider, ineIndexProvider, restProvider], [restProvider]);
  const provider = useMemo(() => providers.find(p => p.id === selectedProviderId) || providers[0], [providers, selectedProviderId]);

  // Guardar lastKnownPrices
  const persistLastKnown = useCallback((prices: Record<string, number>) => {
    setLastKnownPrices(prices);
    localStorage.setItem('price-sync-last-prices', JSON.stringify(prices));
  }, []);

  // Previsualizar cambios sin aplicar
  const preview = useCallback(async (opts: PriceSyncOptions = {}) => {
    const list = Object.values(resources) as any[];
    const filtered = opts.onlyMaterials ? list.filter(r => r.tipo === 'material') : list;
    const suggested = await provider.fetch(filtered);
    const proposed: PriceUpdate[] = [];
    for (const r of filtered) {
      const next = suggested[r.id];
      if (typeof next !== 'number') continue;
      let newPrice = next;
      if (typeof opts.applyMarginPct === 'number') newPrice = Math.round(newPrice * (1 + opts.applyMarginPct));
      if (typeof opts.maxChangePct === 'number' && opts.maxChangePct >= 0) {
        const deltaPct = Math.abs(newPrice - r.precio) / (r.precio || 1);
        if (deltaPct > opts.maxChangePct) continue;
      }
      if (newPrice !== r.precio) proposed.push({ resourceId: r.id, oldPrice: r.precio, newPrice });
    }
    return proposed;
  }, [resources, provider]);

  // Aplicar conjunto de actualizaciones seleccionadas
  const applyUpdates = useCallback(async (updates: PriceUpdate[]) => {
    for (const u of updates) updateResourcePrice(u.resourceId, u.newPrice);
    const newLast: Record<string, number> = { ...lastKnownPrices };
    updates.forEach(u => { newLast[u.resourceId] = u.newPrice; });
    persistLastKnown(newLast);
    setLastResult({ updated: updates, skipped: 0 });
    lastSyncAtRef.current = Date.now();
    localStorage.setItem('price-sync-provider', provider.id);
    localStorage.setItem('price-sync-last', String(lastSyncAtRef.current));
  }, [updateResourcePrice, persistLastKnown, lastKnownPrices, provider.id]);

  const syncPrices = useCallback(async (opts: PriceSyncOptions = {}) => {
    if (isSyncing) return { updated: [], skipped: 0 };
    setIsSyncing(true);
    setProgress(0);
    try {
      const list = Object.values(resources) as any[];
      const filtered = opts.onlyMaterials ? list.filter(r => r.tipo === 'material') : list;
      const suggested = await provider.fetch(filtered);

      const updates: PriceUpdate[] = [];
      let processed = 0;
      for (const r of filtered) {
        processed++;
        setProgress(Math.round((processed / filtered.length) * 100));
        const next = suggested[r.id];
        if (typeof next !== 'number') continue;
        let newPrice = next;
        if (typeof opts.applyMarginPct === 'number') {
          newPrice = Math.round(newPrice * (1 + opts.applyMarginPct));
        }
        if (typeof opts.maxChangePct === 'number' && opts.maxChangePct >= 0) {
          const deltaPct = Math.abs(newPrice - r.precio) / (r.precio || 1);
          if (deltaPct > opts.maxChangePct) continue; // saltar cambios muy bruscos
        }
        if (newPrice !== r.precio) {
          updates.push({ resourceId: r.id, oldPrice: r.precio, newPrice });
          updateResourcePrice(r.id, newPrice);
        }
        await new Promise(res => setTimeout(res, 5));
      }

      const result = { updated: updates, skipped: filtered.length - updates.length };
      setLastResult(result);
      lastSyncAtRef.current = Date.now();
      localStorage.setItem('price-sync-provider', provider.id);
      localStorage.setItem('price-sync-last', String(lastSyncAtRef.current));
      // Actualizar lastKnown
      const newLast: Record<string, number> = { ...lastKnownPrices };
      updates.forEach(u => { newLast[u.resourceId] = u.newPrice; });
      persistLastKnown(newLast);
      return result;
    } finally {
      setIsSyncing(false);
      setProgress(100);
      setTimeout(() => setProgress(0), 600);
    }
  }, [resources, provider, isSyncing, updateResourcePrice, persistLastKnown, lastKnownPrices]);

  // Alertas por variación respecto a último sync
  const getAlerts = useCallback((thresholdPct: number = 0.1) => {
    const alerts: Array<{ id: string; nombre: string; oldPrice: number; currentPrice: number; deltaPct: number }>= [];
    const resList = Object.values(resources) as any[];
    for (const r of resList) {
      const old = lastKnownPrices[r.id];
      if (typeof old !== 'number') continue;
      const deltaPct = (r.precio - old) / (old || 1);
      if (Math.abs(deltaPct) >= thresholdPct) alerts.push({ id: r.id, nombre: r.nombre, oldPrice: old, currentPrice: r.precio, deltaPct });
    }
    return alerts;
  }, [resources, lastKnownPrices]);

  return {
    providers,
    selectedProviderId,
    setSelectedProviderId,
    isSyncing,
    progress,
    lastResult,
    lastSyncAt: lastSyncAtRef.current,
    lastError,
    providerSettings: restSettings,
    setProviderSettings: setRestSettings,
    syncPrices,
    preview,
    applyUpdates,
    getAlerts
  };
}
