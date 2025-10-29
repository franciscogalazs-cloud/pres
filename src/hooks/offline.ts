import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage as useLocalStorageBase } from './useLocalStorage';

// ====== Hook para detectar estado de conexión ======
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// ====== Hook para localStorage con sincronización ======
// Nota: unificamos el hook de localStorage para evitar duplicados.
// Usa la implementación central de `./useLocalStorage` y añadimos un helper `removeValue` local.
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useLocalStorageBase<T>(key, initialValue);
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, setStoredValue]);
  return [storedValue, setStoredValue, removeValue] as const;
};

// ====== Hook para cache con expiración ======
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

export const useCache = <T>(key: string, expirationMinutes: number = 60) => {
  const getCachedData = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const item: CacheItem<T> = JSON.parse(cached);
      const now = Date.now();
      
      // Verificar si ha expirado
      if (now - item.timestamp > item.expiresIn * 60 * 1000) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn(`Error reading cache key "${key}":`, error);
      return null;
    }
  }, [key]);

  const setCachedData = useCallback((data: T) => {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresIn: expirationMinutes
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.error(`Error setting cache key "${key}":`, error);
    }
  }, [key, expirationMinutes]);

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.error(`Error clearing cache key "${key}":`, error);
    }
  }, [key]);

  return {
    getCachedData,
    setCachedData,
    clearCache
  };
};

// ====== Hook para manejo de datos offline ======
export const useOfflineData = <T>(
  key: string,
  initialData: T,
  syncFunction?: () => Promise<T>
) => {
  const [data, setData, removeData] = useLocalStorage(key, initialData);
  const [lastSync, setLastSync] = useLocalStorage(`${key}_lastSync`, 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  // Función para sincronizar datos cuando esté online
  const sync = useCallback(async () => {
    if (!isOnline || !syncFunction || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const freshData = await syncFunction();
      setData(freshData);
      setLastSync(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de sincronización');
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, syncFunction, isLoading, setData, setLastSync]);

  // Auto-sync cuando se recupera la conexión
  useEffect(() => {
    if (isOnline && syncFunction) {
      // Solo sync si han pasado más de 5 minutos desde la última sincronización
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (lastSync < fiveMinutesAgo) {
        sync();
      }
    }
  }, [isOnline, sync, lastSync, syncFunction]);

  return {
    data,
    setData,
    removeData,
    isOnline,
    isLoading,
    error,
    lastSync,
    sync
  };
};

// ====== Hook para backup automático ======
export const useAutoBackup = <T>(
  data: T, 
  key: string, 
  intervalMinutes: number = 5
) => {
  const [lastBackup, setLastBackup] = useLocalStorage(`${key}_backup_time`, 0);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const backupKey = `${key}_backup_${new Date().toISOString().split('T')[0]}`;
        localStorage.setItem(backupKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        setLastBackup(Date.now());
      } catch (error) {
        console.error('Error creating backup:', error);
      }
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [data, key, intervalMinutes, setLastBackup]);

  const getBackups = useCallback(() => {
    const backups: Array<{ key: string; date: string; timestamp: number }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey?.startsWith(`${key}_backup_`)) {
        try {
          const backup = JSON.parse(localStorage.getItem(storageKey)!);
          backups.push({
            key: storageKey,
            date: storageKey.split('_backup_')[1],
            timestamp: backup.timestamp
          });
        } catch (error) {
          console.warn('Error parsing backup:', error);
        }
      }
    }
    
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }, [key]);

  const restoreBackup = useCallback((backupKey: string) => {
    try {
      const backup = localStorage.getItem(backupKey);
      if (backup) {
        return JSON.parse(backup).data;
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
    }
    return null;
  }, []);

  return {
    lastBackup,
    getBackups,
    restoreBackup
  };
};