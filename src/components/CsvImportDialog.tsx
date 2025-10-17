import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CsvImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: Array<{ apuId: string; metrados: number }>) => void;
  apusCatalog: Array<{ id: string; descripcion: string; unidadSalida: string }>
}

type MappedRow = {
  apuDescripcion?: string;
  apuId?: string;
  unidad?: string;
  cantidad?: number;
}

const parseCSV = (text: string): string[][] => {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  return lines.map(l => {
    // CSV simple separado por coma; sin comillas escapadas avanzadas para mantenerlo ligero
    return l.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
  });
};

export const CsvImportDialog: React.FC<CsvImportDialogProps> = ({ isOpen, onClose, onImport, apusCatalog }) => {
  const [raw, setRaw] = useState<string>('');
  const [delimiter, setDelimiter] = useState<string>(',');
  const [headerRow, setHeaderRow] = useState<boolean>(true);
  const [colMap, setColMap] = useState<{ descripcion?: number; unidad?: number; cantidad?: number }>({});
  const [error, setError] = useState<string>('');

  const rows = useMemo(() => {
    try {
      if (!raw) return [];
      const parsed = parseCSV(raw.replace(/;/g, delimiter));
      return parsed;
    } catch (e) {
      setError('No se pudo parsear el CSV');
      return [];
    }
  }, [raw, delimiter]);

  const headers = rows[0] || [];
  const dataRows = headerRow ? rows.slice(1) : rows;

  const mapped: MappedRow[] = useMemo(() => {
    return dataRows.map(cols => ({
      apuDescripcion: colMap.descripcion != null ? cols[colMap.descripcion] : undefined,
      unidad: colMap.unidad != null ? cols[colMap.unidad] : undefined,
      cantidad: colMap.cantidad != null ? Number(cols[colMap.cantidad] || 0) : undefined,
    }));
  }, [dataRows, colMap]);

  const resolveApuId = (row: MappedRow): string | undefined => {
    if (row.apuDescripcion) {
      const found = apusCatalog.find(a => a.descripcion.toLowerCase() === row.apuDescripcion!.toLowerCase());
      if (found) return found.id;
    }
    return undefined;
  };

  const canImport = mapped.length > 0 && mapped.some(m => resolveApuId(m) && (m.cantidad ?? 0) > 0);

  const handleImport = () => {
    const rows = mapped
      .map(m => ({ apuId: resolveApuId(m)!, metrados: Number(m.cantidad || 0) }))
      .filter(r => !!r.apuId && r.metrados > 0);
    onImport(rows);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-3xl rounded-2xl bg-white p-6 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Importar CSV</h2>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700">✖️</button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Pega tu CSV</label>
                <textarea
                  className="h-48 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder="Código,Descripción,Unidad,Cantidad\n03-020,Hormigón...,m3,8"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm">Delimitador</label>
                <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)} className="rounded-lg border px-2 py-1 dark:bg-slate-700 dark:border-slate-600">
                  <option value=",">,</option>
                  <option value=";">;</option>
                </select>
                <label className="ml-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={headerRow} onChange={(e) => setHeaderRow(e.target.checked)} />
                  Primera fila es encabezado
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Mapeo de columnas</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['descripcion','unidad','cantidad'] as const).map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="w-28 text-sm capitalize">{key}</span>
                      <select 
                        className="flex-1 rounded-lg border px-2 py-1 text-sm dark:bg-slate-700 dark:border-slate-600"
                        value={(colMap as any)[key] ?? ''}
                        onChange={(e) => setColMap({ ...colMap, [key]: e.target.value === '' ? undefined : Number(e.target.value) })}
                      >
                        <option value="">—</option>
                        {headers.map((h, idx) => (
                          <option key={idx} value={idx}>{h || `Col ${idx+1}`}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border p-2 text-xs dark:border-slate-600">
                <div className="mb-1 font-medium">Vista previa</div>
                <div className="max-h-40 overflow-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        
                        <th className="border-b p-1 text-left">Descripción</th>
                        <th className="border-b p-1 text-left">Unidad</th>
                        <th className="border-b p-1 text-right">Cantidad</th>
                        <th className="border-b p-1 text-left">APU resuelto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mapped.slice(0, 50).map((m, i) => (
                        <tr key={i}>
                          <td className="border-b p-1">{m.apuDescripcion || ''}</td>
                          <td className="border-b p-1">{m.unidad || ''}</td>
                          <td className="border-b p-1 text-right">{m.cantidad ?? ''}</td>
                          <td className="border-b p-1">{resolveApuId(m) || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="mt-3 text-sm text-red-500">{error}</div>}

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700">Cancelar</button>
            <button onClick={handleImport} disabled={!canImport} className={`rounded-xl px-4 py-2 border ${canImport ? 'border-slate-600 hover:bg-slate-700/30' : 'border-slate-600/40 cursor-not-allowed opacity-60'}`}>Importar</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
