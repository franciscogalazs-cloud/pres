import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/offline';

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

// ====== Componente para gestión de datos offline ======
interface OfflineDataManagerProps {
  lastSync: number;
  isLoading: boolean;
  error: string | null;
  onSync: () => void;
  onClearData: () => void;
}

export const OfflineDataManager: React.FC<OfflineDataManagerProps> = ({
  lastSync,
  isLoading,
  error,
  onSync,
  onClearData
}) => {
  const isOnline = useOnlineStatus();
  
  const formatLastSync = (timestamp: number) => {
    if (timestamp === 0) return 'Nunca';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Ahora mismo';
    if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;
    if (diffMinutes < 1440) return `Hace ${Math.floor(diffMinutes / 60)} horas`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <h3 className="text-lg font-semibold text-slate-100 mb-3">
        Gestión de Datos
      </h3>
      
      <div className="space-y-3">
        {/* Estado de conexión */}
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Estado:</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span className={`text-sm font-medium ${
              isOnline ? 'text-green-400' : 'text-red-400'
            }`}>
              {isOnline ? 'Conectado' : 'Sin conexión'}
            </span>
          </div>
        </div>

        {/* Última sincronización */}
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Última sync:</span>
          <span className="text-slate-400 text-sm">
            {formatLastSync(lastSync)}
          </span>
        </div>

        {/* Error si existe */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex space-x-2 pt-2">
          <button
            onClick={onSync}
            disabled={!isOnline || isLoading}
            className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-600 disabled:opacity-50 
                     text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors
                     focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            {isLoading ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          
          <button
            onClick={onClearData}
            className="px-3 py-2 text-slate-300 hover:text-slate-100 border border-slate-600 
                     hover:border-slate-500 rounded-lg text-sm font-medium transition-colors
                     focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
};

// ====== Banner de modo offline ======
export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  
  if (isOnline) return null;

  return (
    <div className="bg-amber-900/50 border-b border-amber-700 px-4 py-2">
      <div className="container mx-auto flex items-center justify-center space-x-2">
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-amber-200 text-sm font-medium">
          Modo offline - Los cambios se guardarán localmente
        </span>
      </div>
    </div>
  );
};