import { useState, useEffect, useCallback } from 'react';

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
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  // Estado para almacenar nuestro valor
  // Pasar función inicial a useState así que la lógica solo se ejecuta una vez
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Obtener del localStorage por key
      const item = window.localStorage.getItem(key);
      // Parsear JSON almacenado o si no existe devolver initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Si hay error también devolvemos initialValue
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Devolver una versión wrapped de la función setter de useState que persiste el nuevo valor en localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Permitir que value sea una función así que tenemos la misma API que useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Guardar en state
      setStoredValue(valueToStore);
      // Guardar en localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // Una implementación más avanzada manejaría el caso de error
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Función para eliminar el item del localStorage
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
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

// ====== Componente para mostrar estado de conexión ======
export const ConnectionStatus: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Mostrar estado cuando cambie
    setShowStatus(true);
    const timer = setTimeout(() => setShowStatus(false), 3000);
    return () => clearTimeout(timer);
  }, [isOnline]);

  if (!showStatus) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
      isOnline 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`}>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-green-200' : 'bg-red-200'
        }`} />
        <span className="text-sm font-medium">
          {isOnline ? 'Conectado' : 'Sin conexión'}
        </span>
      </div>
    </div>
  );
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
      const key = localStorage.key(i);
      if (key?.startsWith(`${key}_backup_`)) {
        try {
          const backup = JSON.parse(localStorage.getItem(key)!);
          backups.push({
            key: key,
            date: key.split('_backup_')[1],
            timestamp: backup.timestamp
          });
        } catch (error) {
          console.warn('Error parsing backup:', error);
        }
      }
    }
    
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }, []);

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