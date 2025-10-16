import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { UserInfo } from '../../types';

type Props = {
  users: UserInfo[];
  onDelete: (index: number) => void;
};

export const UsersTable: React.FC<Props> = ({ users, onDelete }) => {
  if (!Array.isArray(users) || users.length === 0) return null;

  return (
    <div className="bg-slate-800 rounded-2xl p-4 shadow grid gap-3">
      <h3 className="font-medium">Usuarios</h3>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-300">
            <th className="py-2 px-3">Nombre</th>
            <th className="py-2 px-3">Email</th>
            <th className="py-2 px-3">Teléfono</th>
            <th className="py-2 px-3">Ciudad</th>
            <th className="py-2 px-3">Tipo</th>
            <th className="py-2 px-3">Profesión</th>
            <th className="py-2 px-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => (
            <tr key={idx} className="border-t border-slate-700">
              <td className="py-2 px-3">{u.nombre}</td>
              <td className="py-2 px-3">{u.email}</td>
              <td className="py-2 px-3">{u.telefono}</td>
              <td className="py-2 px-3">{u.ciudad}</td>
              <td className="py-2 px-3">{u.tipo}</td>
              <td className="py-2 px-3">{u.profesion}</td>
              <td className="py-2 px-3 text-right">
                <button
                  title="Eliminar"
                  onClick={() => onDelete(idx)}
                  className="p-2 rounded-lg bg-red-800 hover:bg-red-700 text-xs"
                  aria-label="Eliminar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
