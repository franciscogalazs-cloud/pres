import React, { useState } from 'react';
import { unitCost } from '../utils/calculations';
import type { Apu, Resource } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

// ====== Tipos para exportación ======
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json' | 'html';
  includeHeader: boolean;
  includeLogo: boolean;
  includeSignature: boolean;
  includeDate: boolean;
  customTitle?: string;
  projectName?: string;
  clientName?: string;
  watermark?: string;
  template: 'standard' | 'detailed' | 'summary' | 'professional';
  // Profesional
  logoDataUrl?: string;
  signer1Name?: string;
  signer1Role?: string;
  signer2Name?: string;
  signer2Role?: string;
  // Anexos
  annexes?: Array<{ title: string; href: string }>; // enlaces a cotizaciones, fotos, documentos
  // Verificación
  includeVerification?: boolean;
  verificationCode?: string;
  verificationLabel?: string;
  showVerificationQR?: boolean; // (placeholder visual, sin renderizar QR real por ahora)
  // Desglose jerárquico de APUs
  includeApuHierarchy?: boolean;
  hierarchyDepth?: number; // 1-3
}

export interface ExportData {
  apus: Apu[];
  resources?: Record<string, Resource>;
  budgetItems: any[];
  totals: any;
  financialParams: any;
  metadata: {
    exportDate: string;
    appVersion: string;
    user?: string;
  };
}

// ====== Hook para exportación ======
export const useAdvancedExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Exportar a CSV mejorado
  const exportToCSV = async (data: ExportData, options: ExportOptions) => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      let csvContent = '';
      
      // Header
      if (options.includeHeader) {
        csvContent += `Presupuesto: ${options.projectName || 'Sin nombre'}\n`;
        csvContent += `Cliente: ${options.clientName || 'Sin especificar'}\n`;
        csvContent += `Fecha: ${options.includeDate ? new Date().toLocaleDateString('es-CL') : ''}\n`;
        csvContent += `Generado por: APU Presupuestos v${data.metadata.appVersion}\n\n`;
      }
      
      setExportProgress(25);

      // Budget items
  csvContent += 'APU,Descripción,Unidad,Cantidad,Precio Unitario,Precio Total\n';
      
      data.budgetItems.forEach((item: any) => {
        const apu = data.apus.find(a => a.id === item.apuId);
        if (apu) {
          const unidad = (apu as any).unidadSalida || '';
          csvContent += `"${apu.id || ''}","${apu.descripcion}","${unidad}",${item.cantidad},${item.precioUnitario || 0},${item.precioTotal || 0}\n`;
        }
      });
      
      setExportProgress(75);

      // Totals
      csvContent += '\nResumen Financiero\n';
      csvContent += `Subtotal,${data.totals.subtotal || 0}\n`;
      csvContent += `Gastos Generales,${data.totals.gastosGenerales || 0}\n`;
      csvContent += `Utilidad,${data.totals.utilidad || 0}\n`;
      csvContent += `IVA,${data.totals.iva || 0}\n`;
      csvContent += `Total Final,${data.totals.total || 0}\n`;

      setExportProgress(100);

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `presupuesto_${options.projectName || 'sin_nombre'}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error exportando CSV:', error);
      throw error;
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Exportar a JSON estructurado
  const exportToJSON = async (data: ExportData, options: ExportOptions) => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      const jsonData = {
        metadata: {
          ...data.metadata,
          exportOptions: options,
          generatedAt: new Date().toISOString()
        },
        project: {
          name: options.projectName,
          client: options.clientName,
          title: options.customTitle
        },
        apus: data.apus,
        budget: {
          items: data.budgetItems,
          totals: data.totals,
          financialParams: data.financialParams
        }
      };

      setExportProgress(50);

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `presupuesto_${options.projectName || 'sin_nombre'}_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportProgress(100);
    } catch (error) {
      console.error('Error exportando JSON:', error);
      throw error;
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Exportar a HTML profesional
  const exportToHTML = async (data: ExportData, options: ExportOptions) => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // robust totals mapping
      const t = data.totals || {};
      const totals = {
        subtotal: t.subtotal ?? t.bSub1 ?? t.subtotal ?? 0,
        gastosGenerales: t.gastosGenerales ?? t.bGG ?? 0,
        utilidad: t.utilidad ?? t.bUtil ?? 0,
        iva: t.iva ?? t.bIVA ?? 0,
        total: t.total ?? t.bTotal ?? 0,
      };

      let htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Presupuesto - ${options.projectName || 'Sin nombre'}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 20px;
              background: #f9fafb;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .cover {
              page-break-after: always;
              display: grid;
              place-items: center;
              min-height: 90vh;
              text-align: center;
            }
            .logo {
              max-width: 220px;
              max-height: 120px;
              object-fit: contain;
              margin-bottom: 24px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .project-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-group {
              background: #f3f4f6;
              padding: 15px;
              border-radius: 6px;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .table th, .table td {
              text-align: left;
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            .table th {
              background-color: #f9fafb;
              font-weight: 600;
              color: #374151;
            }
            .table tbody tr:hover {
              background-color: #f9fafb;
            }
            .totals {
              background: #f3f4f6;
              padding: 20px;
              border-radius: 6px;
              margin-top: 20px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .total-final {
              font-size: 1.2em;
              font-weight: bold;
              border-top: 2px solid #374151;
              padding-top: 8px;
            }
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-top: 60px;
            }
            .sign {
              text-align: center;
            }
            .line {
              border-top: 1px solid #374151;
              margin-top: 48px;
              padding-top: 6px;
            }
            .annexes {
              margin-top: 24px;
              padding: 16px;
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
            }
            .verify {
              margin-top: 24px;
              padding: 16px;
              background: #ecfeff;
              border: 1px solid #a5f3fc;
              border-radius: 6px;
            }
            .qr-placeholder {
              width: 140px; height: 140px; border: 2px dashed #94a3b8; display: grid; place-items: center; color:#64748b; font-size: 12px; margin-top: 8px;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 4em;
              color: rgba(0, 0, 0, 0.05);
              z-index: -1;
              pointer-events: none;
            }
            @media print {
              body { margin: 0; padding: 0; background: white; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>`;

      setExportProgress(20);

      // Watermark
      if (options.watermark) {
        htmlContent += `<div class="watermark">${options.watermark}</div>`;
      }

      if (options.template === 'professional') {
        // Portada
        htmlContent += `
          <div class="container cover">
            <div>
              ${options.includeLogo && options.logoDataUrl ? `<img class="logo" src="${options.logoDataUrl}" alt="Logo" />` : ''}
              <h1>${options.customTitle || 'Presupuesto de Obra'}</h1>
              ${options.projectName ? `<p><strong>Proyecto:</strong> ${options.projectName}</p>` : ''}
              ${options.clientName ? `<p><strong>Cliente:</strong> ${options.clientName}</p>` : ''}
              ${options.includeDate ? `<p class="muted">Fecha: ${new Date().toLocaleDateString('es-CL')}</p>` : ''}
            </div>
          </div>`;
      }

      htmlContent += `
        <div class="container">
          <div class="header">
            <h1>${options.customTitle || 'Presupuesto de Obra'}</h1>
            ${options.includeDate ? `<p>Fecha: ${new Date().toLocaleDateString('es-CL')}</p>` : ''}
          </div>`;

      setExportProgress(40);

      // Project info
      if (options.projectName || options.clientName || options.includeLogo) {
        htmlContent += `
          <div class="project-info">
            <div class="info-group">
              <h3>Información del Proyecto</h3>
              <p><strong>Proyecto:</strong> ${options.projectName || 'Sin especificar'}</p>
              <p><strong>Cliente:</strong> ${options.clientName || 'Sin especificar'}</p>
            </div>
            <div class="info-group">
              <h3>Parámetros Financieros</h3>
              <p><strong>Gastos Generales:</strong> ${(data.financialParams.gg * 100).toFixed(1)}%</p>
              <p><strong>Utilidad:</strong> ${(data.financialParams.util * 100).toFixed(1)}%</p>
              <p><strong>IVA:</strong> ${(data.financialParams.iva * 100).toFixed(1)}%</p>
            </div>
            ${options.includeLogo && options.logoDataUrl ? `
            <div class="info-group" style="grid-column: 1 / -1; text-align:center;">
              <img class="logo" src="${options.logoDataUrl}" alt="Logo" />
            </div>` : ''}
          </div>`;
      }

      setExportProgress(60);

      // Budget table
      htmlContent += `
        <table class="table">
          <thead>
            <tr>
              <th>APU</th>
              <th>Descripción</th>
              <th>Unidad</th>
              <th>Cantidad</th>
              <th>Precio Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>`;

      data.budgetItems.forEach((item: any) => {
        const apu = data.apus.find((a: any) => a.id === item.apuId);
        if (apu) {
          htmlContent += `
            <tr>
              <td>${apu.id}</td>
              <td>${apu.descripcion}</td>
              <td>${(apu as any).unidadSalida || ''}</td>
              <td>${(item.cantidad ?? 0).toLocaleString('es-CL')}</td>
              <td>$${(item.precioUnitario || 0).toLocaleString('es-CL')}</td>
              <td>$${(item.precioTotal || 0).toLocaleString('es-CL')}</td>
            </tr>`;
        }
      });

      htmlContent += `
          </tbody>
        </table>`;

      setExportProgress(80);

      // Desglose jerárquico de APUs (opcional)
      if (options.includeApuHierarchy) {
        const apusIndex: Record<string, Apu> = Object.fromEntries((data.apus || []).map(a => [a.id, a]));
        const resources = (data.resources || {}) as Record<string, Resource>;
        const maxDepth = Math.min(Math.max(options.hierarchyDepth || 2, 1), 3);

        const renderApuRows = (apu: Apu, factor: number, depth: number): string => {
          if (!apu || depth > maxDepth) return '';
          let rows = '';
          for (const it of (apu.items as any[])) {
            if (it.tipo === 'coef' || it.tipo === 'rendimiento') {
              const r = resources[it.resourceId as string];
              if (!r) continue;
              const base = it.tipo === 'coef'
                ? (it.coef ?? 0) * r.precio * (1 + (it.merma ?? 0))
                : r.precio / (it.rendimiento || 1);
              rows += `
                <tr>
                  <td style="padding-left:${depth * 20}px">↳ ${r.nombre}</td>
                  <td>${it.tipo}</td>
                  <td>${it.tipo === 'coef' ? (it.coef ?? 0) : (it.rendimiento ?? '')}</td>
                  <td>${it.tipo === 'coef' ? (it.merma ?? 0) : '-'}</td>
                  <td>$${(r.precio || 0).toLocaleString('es-CL')}</td>
                  <td>$${(factor * base).toLocaleString('es-CL')}</td>
                </tr>`;
            } else if (it.tipo === 'subapu') {
              const sub = apusIndex[it.apuRefId as string];
              const subRes = sub ? unitCost(sub, resources, apusIndex) : { unit: 0 } as any;
              const c = typeof it.coef === 'number' ? it.coef : (it.rendimiento ? 1 / it.rendimiento : 1);
              rows += `
                <tr>
                  <td style="padding-left:${depth * 20}px">↳ SubAPU ${sub ? `${sub.id} · ${sub.descripcion}` : (it.apuRefId || '')}</td>
                  <td>subapu</td>
                  <td>${it.coef ?? (it.rendimiento ? `1/${it.rendimiento}` : 1)}</td>
                  <td>-</td>
                  <td>$${(subRes.unit || 0).toLocaleString('es-CL')}</td>
                  <td>$${(factor * c * (subRes.unit || 0)).toLocaleString('es-CL')}</td>
                </tr>`;
              if (sub && depth < maxDepth) {
                rows += renderApuRows(sub, factor * c, depth + 1);
              }
            }
          }
          return rows;
        };

        htmlContent += `
          <div style="page-break-inside: avoid; margin-top:24px;">
            <h3>Análisis de APUs</h3>
          </div>`;

        for (const item of data.budgetItems as any[]) {
          const apu = data.apus.find(a => a.id === item.apuId);
          if (!apu) continue;
          htmlContent += `
            <div style="margin: 12px 0 24px;">
              <div><strong>${apu.id}</strong> — ${apu.descripcion}</div>
              <table class="table">
                <thead>
                  <tr>
                    <th>Recurso</th>
                    <th>Tipo</th>
                    <th>Coef/Rend</th>
                    <th>Merma</th>
                    <th>Tarifa</th>
                    <th>Costo unit.</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderApuRows(apu, 1, 1)}
                </tbody>
              </table>
            </div>`;
        }
      }

      // Totals
      htmlContent += `
        <div class="totals">
          <h3>Resumen Financiero</h3>
          <div class="total-row">
            <span>Subtotal:</span>
            <span>$${(totals.subtotal || 0).toLocaleString('es-CL')}</span>
          </div>
          <div class="total-row">
            <span>Gastos Generales:</span>
            <span>$${(totals.gastosGenerales || 0).toLocaleString('es-CL')}</span>
          </div>
          <div class="total-row">
            <span>Utilidad:</span>
            <span>$${(totals.utilidad || 0).toLocaleString('es-CL')}</span>
          </div>
          <div class="total-row">
            <span>IVA:</span>
            <span>$${(totals.iva || 0).toLocaleString('es-CL')}</span>
          </div>
          <div class="total-row total-final">
            <span>Total Final:</span>
            <span>$${(totals.total || 0).toLocaleString('es-CL')}</span>
          </div>
        </div>`;

      // Anexos
      if (options.annexes && options.annexes.length > 0) {
        htmlContent += `
          <div class="annexes">
            <h3>Anexos</h3>
            <ul>
              ${options.annexes.map(a => `<li><a href="${a.href}" target="_blank" rel="noopener noreferrer">${a.title || a.href}</a></li>`).join('')}
            </ul>
          </div>`;
      }

      // Verificación
      if (options.includeVerification && options.verificationCode) {
        htmlContent += `
          <div class="verify">
            <strong>Verificación</strong>
            <div>${options.verificationLabel || 'Código de verificación del presupuesto'}:</div>
            <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all;">${options.verificationCode}</div>
            ${options.showVerificationQR ? `<div class="qr-placeholder">QR</div>` : ''}
          </div>`;
      }

      // Firmas y pie
      if (options.includeSignature) {
        htmlContent += `
          <div class="signatures">
            <div class="sign">
              <div class="line">${options.signer1Name || ''}${options.signer1Role ? ` — ${options.signer1Role}` : ''}</div>
            </div>
            <div class="sign">
              <div class="line">${options.signer2Name || ''}${options.signer2Role ? ` — ${options.signer2Role}` : ''}</div>
            </div>
          </div>
          <div style="margin-top: 24px; text-align: center; color:#64748b;">
            <p><em>Generado por APU Presupuestos v${data.metadata.appVersion}</em></p>
          </div>`;
      }

      htmlContent += `
        </div>
        </body>
        </html>`;

      setExportProgress(100);

      // Download
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `presupuesto_${options.projectName || 'sin_nombre'}_${new Date().toISOString().split('T')[0]}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error exportando HTML:', error);
      throw error;
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return {
    isExporting,
    exportProgress,
    exportToCSV,
    exportToJSON,
    exportToHTML
  };
};

// ====== Componente de configuración de exportación ======
interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  isExporting?: boolean;
  exportProgress?: number;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  isExporting = false,
  exportProgress = 0
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'html',
    includeHeader: true,
    includeLogo: false,
    includeSignature: true,
    includeDate: true,
    template: 'standard',
    projectName: '',
    clientName: '',
    customTitle: '',
    watermark: '',
    annexes: [],
    includeVerification: false,
    verificationLabel: 'Código de verificación',
    showVerificationQR: false,
    includeApuHierarchy: false,
    hierarchyDepth: 2
  });

  const handleExport = () => {
    onExport(options);
  };

  const formatLabels = {
    csv: 'CSV (Excel)',
    json: 'JSON (Datos)',
    html: 'HTML (Web)',
    pdf: 'PDF (Próximamente)',
    excel: 'Excel (Próximamente)'
  };

  const templateLabels = {
    standard: 'Estándar',
    detailed: 'Detallado',
    summary: 'Resumen',
    professional: 'Profesional'
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Exportar Presupuesto
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                disabled={isExporting}
                title="Cerrar"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {isExporting ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400 mb-2">Generando exportación...</p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{exportProgress}%</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Formato */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Formato de Exportación
                  </label>
                  <select
                    value={options.format}
                    onChange={(e) => setOptions({...options, format: e.target.value as any})}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                  >
                    {Object.entries(formatLabels).map(([value, label]) => (
                      <option key={value} value={value} disabled={value === 'pdf' || value === 'excel'}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Información del proyecto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Nombre del Proyecto
                    </label>
                    <input
                      type="text"
                      value={options.projectName}
                      onChange={(e) => setOptions({...options, projectName: e.target.value})}
                      className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                      placeholder="Ej: Edificio Residencial"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Cliente
                    </label>
                    <input
                      type="text"
                      value={options.clientName}
                      onChange={(e) => setOptions({...options, clientName: e.target.value})}
                      className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                      placeholder="Ej: Constructora ABC"
                    />
                  </div>
                </div>

                {/* Plantilla y elementos profesionales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Plantilla
                    </label>
                    <select
                      value={options.template}
                      onChange={(e) => setOptions({...options, template: e.target.value as any})}
                      className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                    >
                      {Object.entries(templateLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={options.includeLogo}
                        onChange={(e) => setOptions({...options, includeLogo: e.target.checked})}
                        className="w-4 h-4 text-sky-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Incluir logo</span>
                    </label>
                    {options.includeLogo && (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => setOptions({...options, logoDataUrl: String(reader.result || '')});
                            reader.readAsDataURL(file);
                          }}
                          className="block w-full text-sm text-slate-600 dark:text-slate-300"
                        />
                        {options.logoDataUrl && (
                          <img src={options.logoDataUrl} alt="Logo" className="mt-2 h-12 object-contain" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Título Personalizado (Opcional)
                  </label>
                  <input
                    type="text"
                    value={options.customTitle}
                    onChange={(e) => setOptions({...options, customTitle: e.target.value})}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                    placeholder="Ej: Presupuesto Definitivo - Fase 1"
                  />
                </div>

                {/* Anexos */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Anexos (títulos y enlaces)</label>
                    <button
                      onClick={() => setOptions({ ...options, annexes: [...(options.annexes||[]), { title: '', href: '' }] })}
                      className="rounded-lg bg-slate-200 px-2 py-1 text-xs hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                      title="Agregar anexo"
                      aria-label="Agregar anexo"
                    >
                      ➕ Agregar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(options.annexes||[]).map((a, idx) => (
                      <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-5">
                        <input
                          type="text"
                          value={a.title}
                          onChange={(e) => {
                            const next = [...(options.annexes||[])];
                            next[idx] = { ...next[idx], title: e.target.value };
                            setOptions({ ...options, annexes: next });
                          }}
                          placeholder="Título"
                          className="md:col-span-2 w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                        />
                        <input
                          type="url"
                          value={a.href}
                          onChange={(e) => {
                            const next = [...(options.annexes||[])];
                            next[idx] = { ...next[idx], href: e.target.value };
                            setOptions({ ...options, annexes: next });
                          }}
                          placeholder="https://..."
                          className="md:col-span-3 w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Opciones */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Opciones de Inclusión
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={options.includeHeader}
                        onChange={(e) => setOptions({...options, includeHeader: e.target.checked})}
                        className="w-4 h-4 text-sky-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Incluir encabezado</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={options.includeDate}
                        onChange={(e) => setOptions({...options, includeDate: e.target.checked})}
                        className="w-4 h-4 text-sky-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Incluir fecha</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={options.includeSignature}
                        onChange={(e) => setOptions({...options, includeSignature: e.target.checked})}
                        className="w-4 h-4 text-sky-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Incluir firma digital</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!options.includeApuHierarchy}
                        onChange={(e) => setOptions({...options, includeApuHierarchy: e.target.checked})}
                        className="w-4 h-4 text-sky-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Desglose jerárquico de APUs</span>
                    </label>
                  </div>
                  {options.includeApuHierarchy && (
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Profundidad (1–3)</label>
                        <input
                          type="number"
                          min={1}
                          max={3}
                          value={options.hierarchyDepth || 2}
                          onChange={(e) => setOptions({...options, hierarchyDepth: Math.max(1, Math.min(3, parseInt(e.target.value||'2', 10)))})}
                          className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {options.includeSignature && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Firmante 1 - Nombre</label>
                      <input
                        type="text"
                        value={options.signer1Name || ''}
                        onChange={(e) => setOptions({...options, signer1Name: e.target.value})}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                        placeholder="Ej: Ing. Juan Pérez"
                      />
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mt-2 mb-2">Firmante 1 - Cargo</label>
                      <input
                        type="text"
                        value={options.signer1Role || ''}
                        onChange={(e) => setOptions({...options, signer1Role: e.target.value})}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                        placeholder="Ej: Jefe de Proyecto"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Firmante 2 - Nombre</label>
                      <input
                        type="text"
                        value={options.signer2Name || ''}
                        onChange={(e) => setOptions({...options, signer2Name: e.target.value})}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                        placeholder="Ej: Arq. María López"
                      />
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mt-2 mb-2">Firmante 2 - Cargo</label>
                      <input
                        type="text"
                        value={options.signer2Role || ''}
                        onChange={(e) => setOptions({...options, signer2Role: e.target.value})}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                        placeholder="Ej: Director de Obra"
                      />
                    </div>
                  </div>
                )}

                {/* Watermark */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Marca de Agua (Opcional)
                  </label>
                  <input
                    type="text"
                    value={options.watermark}
                    onChange={(e) => setOptions({...options, watermark: e.target.value})}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                    placeholder="Ej: BORRADOR, CONFIDENCIAL"
                  />
                </div>

                {/* Verificación */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!options.includeVerification}
                      onChange={(e) => setOptions({ ...options, includeVerification: e.target.checked })}
                      className="w-4 h-4 text-sky-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-sky-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Incluir verificación</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!options.showVerificationQR}
                      onChange={(e) => setOptions({ ...options, showVerificationQR: e.target.checked })}
                      className="w-4 h-4 text-sky-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-sky-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Mostrar QR (placeholder)</span>
                  </label>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Etiqueta</label>
                    <input
                      type="text"
                      value={options.verificationLabel || ''}
                      onChange={(e) => setOptions({ ...options, verificationLabel: e.target.value })}
                      className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
                      placeholder="Código de verificación"
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 py-2 px-4 rounded-lg font-medium transition-colors"
                    title="Cancelar"
                    aria-label="Cancelar"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    title={`Exportar ${formatLabels[options.format]}`}
                    aria-label={`Exportar ${formatLabels[options.format]}`}
                  >
                    Exportar {formatLabels[options.format]}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};