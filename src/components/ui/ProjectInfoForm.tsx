import React from 'react';
import type { ProjectInfo } from '../../types';

type Props = {
  value: ProjectInfo;
  onChange: (next: ProjectInfo) => void;
};

export const ProjectInfoForm: React.FC<Props> = ({ value, onChange }) => {
  const v = value || {};
  const change = (k: keyof ProjectInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'number' ? Number(e.target.value) || 0 : e.target.value;
    onChange({ ...v, [k]: val });
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-4 shadow grid gap-3">
      <h3 className="font-medium">Información del Proyecto</h3>
      <div className="grid gap-3">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm text-slate-300 grid gap-1">
            <span>Nombre del Proyecto <span className="text-red-400">*</span></span>
            <input className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.nombreProyecto || ''} onChange={change('nombreProyecto')} />
          </label>
          <label className="text-sm text-slate-300 grid gap-1">
            <span>Propietario <span className="text-red-400">*</span></span>
            <input className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.propietario || ''} onChange={change('propietario')} />
          </label>
        </div>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Dirección</span>
          <input className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.direccion || ''} onChange={change('direccion')} />
        </label>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm text-slate-300 grid gap-1">
            <span>Ciudad</span>
            <input className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.ciudad || ''} onChange={change('ciudad')} />
          </label>
          <label className="text-sm text-slate-300 grid gap-1">
            <span>Comuna</span>
            <input className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.comuna || ''} onChange={change('comuna')} />
          </label>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm text-slate-300 grid gap-1">
            <span>Fecha entrega/apertura</span>
            <input type="date" className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.fecha || ''} onChange={change('fecha')} />
          </label>
          <label className="text-sm text-slate-300 grid gap-1">
            <span>Plazo de Ejecución (días)</span>
            <input type="number" className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.plazoDias || 0} onChange={change('plazoDias')} />
          </label>
        </div>
      </div>
    </div>
  );
};
