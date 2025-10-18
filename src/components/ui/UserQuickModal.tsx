import React from 'react';

type UserDraft = {
  nombre?: string;
  email?: string;
  telefono?: string;
  profesion?: string;
  tipo?: 'admin' | 'normal';
  assignedProjectId?: string;
};

interface Props {
  open: boolean;
  initial?: UserDraft | null;
  onClose: () => void;
  onSave: (user: UserDraft) => void;
  projects?: Array<{ id: string; name: string; client?: string; location?: string }>;
}

export const UserQuickModal: React.FC<Props> = ({ open, initial, onClose, onSave, projects = [] }) => {
  const [v, setV] = React.useState<UserDraft>({
    nombre: '', email: '', telefono: '', profesion: '', tipo: 'admin', assignedProjectId: ''
  });

  React.useEffect(()=>{
    setV({
      nombre: initial?.nombre || '',
      email: initial?.email || '',
      telefono: initial?.telefono || '',
      profesion: initial?.profesion || '',
      tipo: (initial?.tipo || 'admin') as 'admin' | 'normal',
      assignedProjectId: initial?.assignedProjectId || ''
    });
  }, [initial, open]);

  if(!open) return null;

  const change = (k: keyof UserDraft) => (e: React.ChangeEvent<HTMLInputElement>)=>{
    setV(prev=> ({ ...prev, [k]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-700">
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <h2 className="text-base font-semibold">Usuario</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-200">×</button>
        </header>
        <div className="p-5 grid gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 grid gap-1">
            Nombre
            <input className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500" value={v.nombre||''} onChange={change('nombre')} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 grid gap-1">
            Email
            <input type="email" className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500" value={v.email||''} onChange={change('email')} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 grid gap-1">
            Teléfono
            <input className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500" value={v.telefono||''} onChange={change('telefono')} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 grid gap-1">
            Profesión
            <input className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500" value={v.profesion||''} onChange={change('profesion')} />
          </label>
          <div className="flex items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="tipoUserQuick" checked={(v.tipo||'admin')==='admin'} onChange={()=>setV(prev=>({...prev, tipo:'admin'}))} className="accent-slate-500" />
              Admin
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="tipoUserQuick" checked={(v.tipo||'admin')==='normal'} onChange={()=>setV(prev=>({...prev, tipo:'normal'}))} className="accent-slate-500" />
              Normal
            </label>
          </div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 grid gap-1">
            Proyecto asignado
            <select
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              value={v.assignedProjectId || ''}
              onChange={(e)=> setV(prev=> ({ ...prev, assignedProjectId: e.target.value }))}
            >
              <option value="">(Ninguno)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {[p.name, p.client, p.location].filter(Boolean).join(' — ')}
                </option>
              ))}
            </select>
          </label>
        </div>
        <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/30">Cerrar</button>
          <button type="button" onClick={()=> onSave(v)} className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700/30">Guardar</button>
        </footer>
      </div>
    </div>
  );
};

export default UserQuickModal;
