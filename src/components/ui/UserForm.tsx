import React from 'react';
import type { UserInfo } from '../../types';

type Props = {
  value: UserInfo;
  onChange: (next: UserInfo) => void;
  onSubmit: () => void;
};

export const UserForm: React.FC<Props> = ({ value, onChange, onSubmit }) => {
  const v = value || { tipo: 'admin' } as UserInfo;
  const change = (k: keyof UserInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...v, [k]: e.target.value });
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-4 shadow grid gap-3">
      <h3 className="font-medium">Creación de Usuarios</h3>
      <div className="grid gap-3">
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Nombre</span>
          <input className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.nombre || ''} onChange={change('nombre')} />
        </label>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Email</span>
          <input placeholder="Será usado como NOMBRE DE USUARIO" className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.email || ''} onChange={change('email')} />
        </label>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Teléfono</span>
          <input className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.telefono || ''} onChange={change('telefono')} />
        </label>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Password</span>
          <input type="password" className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.password || ''} onChange={change('password')} />
        </label>
        <label className="text-sm text-slate-300 grid gap-1">
          <span>Ciudad</span>
          <input className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.ciudad || ''} onChange={change('ciudad')} />
        </label>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="tipoUsuario_inline" checked={(v.tipo||'admin')==='admin'} onChange={()=>onChange({ ...v, tipo: 'admin' })} />
              Administrador
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="tipoUsuario_inline" checked={(v.tipo||'admin')==='normal'} onChange={()=>onChange({ ...v, tipo: 'normal' })} />
              Usuario normal
            </label>
          </div>
          <label className="text-sm text-slate-300 grid gap-1">
            <span>Profesión</span>
            <input placeholder="Seleccione" className="bg-slate-900 border border-slate-700 rounded-xl p-2" value={v.profesion || ''} onChange={change('profesion')} />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onSubmit} className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-700/30">Guardar</button>
        </div>
      </div>
    </div>
  );
};
